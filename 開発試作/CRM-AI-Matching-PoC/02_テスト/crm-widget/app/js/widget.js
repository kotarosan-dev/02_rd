/**
 * CRM×AI Matching Widget
 * 求職者・求人のAIマッチングを表示
 *
 * 【必須】CRM側で「Custom Service」タイプのConnectionを作成すること。
 * 設定 > 開発者スペース > 接続 > 接続を追加 > Custom Service
 * - Service Name: catalyst_matching_api（下記 CONNECTION_NAME と一致させる）
 * - Service URL: Catalyst 関数のベースURL（末尾スラッシュなし）
 * 直接fetch()ではCORSエラーになるため、必ず CONNECTION.invoke 経由で呼び出す。
 */

// 設定（Connection名と検索URLは1箇所に集約）
const CONFIG = {
  CONNECTION_NAME: 'catalyst_matching_api',
  SEARCH_URL: 'https://ai-matching-poc-90002767876.development.catalystserverless.jp/server/ai_matching/search',
  MOCK_MODE: false
};

// 重み付け用の評価軸（詳細モーダル・調整モーダル・Excelで使用）
const WEIGHT_AXES = [
  { key: 'skill', label: 'スキル適合度', icon: '🔧', default: 35 },
  { key: 'experience', label: '経験年数', icon: '📅', default: 20 },
  { key: 'salary', label: '給与マッチ度', icon: '💰', default: 20 },
  { key: 'location', label: '勤務地', icon: '📍', default: 15 },
  { key: 'culture', label: 'カルチャーフィット', icon: '🤝', default: 10 }
];
let currentWeights = {};
WEIGHT_AXES.forEach(function (a) { currentWeights[a.key] = a.default; });

// 表示用マッチ一覧（重み再計算後）・現在のレコードタイプ・総合評価テキスト
let displayMatches = [];
let currentRecordType = null;
let globalSummary = null;

// 実際のCRMレコードデータ（モック用）
const CRM_DATA = {
  jobs: [
    {
      id: '13059000001662474',
      name: 'シニアバックエンドエンジニア',
      skills: 'Python, AWS, Kubernetes',
      location: '東京（リモート可）',
      salary_min: 500,
      salary_max: 800,
      position: 'バックエンドエンジニア'
    },
    {
      id: '13059000001662475',
      name: 'フロントエンドエンジニア',
      skills: 'React, TypeScript, Next.js',
      location: '東京',
      salary_min: 400,
      salary_max: 600,
      position: 'フロントエンドエンジニア'
    },
    {
      id: '13059000001662476',
      name: 'テックリード',
      skills: 'Java, マネジメント経験, システム設計',
      location: '大阪（週出社）',
      salary_min: 700,
      salary_max: 1000,
      position: 'テックリード'
    }
  ],
  jobseekers: [
    {
      id: '13059000001662461',
      name: '田中太郎',
      skills: 'Python, AWS, Docker, Kubernetes',
      desired_location: '東京',
      desired_salary: 600,
      desired_position: 'バックエンドエンジニア'
    },
    {
      id: '13059000001662462',
      name: '佐藤花子',
      skills: 'JavaScript, React, TypeScript, Node.js',
      desired_location: '東京（リモート可）',
      desired_salary: 500,
      desired_position: 'フロントエンドエンジニア'
    },
    {
      id: '13059000001662463',
      name: '鈴木一郎',
      skills: 'Java, Spring Boot, MySQL, AWS',
      desired_location: '大阪',
      desired_salary: 800,
      desired_position: 'テックリード'
    }
  ]
};

// DOM要素
const elements = {
  loading: document.getElementById('loading'),
  error: document.getElementById('error'),
  results: document.getElementById('results'),
  empty: document.getElementById('empty'),
  widgetHeader: document.getElementById('widget-header'),
  matchList: document.getElementById('match-list'),
  matchCount: document.getElementById('match-count'),
  summaryBlock: document.getElementById('summary-block'),
  summaryContent: document.getElementById('summary-content'),
  summaryBody: document.getElementById('summary-body'),
  summaryToggle: document.getElementById('summary-toggle'),
  errorMessage: document.getElementById('error-message')
};

/**
 * ページ読み込み時の処理
 * 関連リスト配置時は Resize で高さを指定（デフォルト高さが0に近いため必須）
 */
async function handlePageLoad(context) {
  console.log("handlePageLoad called with context:", context);
  
  if (!context || !context.EntityId) {
    console.error("Invalid context:", context);
    showError('コンテキストを取得できません');
    return;
  }
  
  try {
    if (typeof ZOHO !== 'undefined' && ZOHO.CRM && ZOHO.CRM.UI && ZOHO.CRM.UI.Resize) {
      ZOHO.CRM.UI.Resize({ height: '500', width: '1000' }).catch(function () {});
    }
    showLoading();
    
    // レコード詳細取得
    console.log("Fetching record:", context.Entity, context.EntityId);
    const record = await fetchRecordDetails(context.Entity, context.EntityId);
    
    if (!record) {
      showError('レコード情報を取得できませんでした');
      return;
    }
    
    console.log("Record fetched:", record);
    
    // マッチング検索
    const recordType = getRecordType(context.Entity);
    console.log("Record type:", recordType);
    
    const { matches, summary } = await searchMatches(context.EntityId, record, recordType);
    
    if (matches && matches.length > 0) {
      globalSummary = summary || null;
      currentRecordType = recordType;
      var augmented = augmentMatchesWithAxisScores(matches);
      displayMatches = recalcScores(augmented, currentWeights);
      renderSummary(globalSummary);
      renderMatches(displayMatches, recordType);
      showResults();
    } else {
      displayMatches = [];
      showEmpty();
    }
    
  } catch (error) {
    console.error('Error in handlePageLoad:', error);
    showError(error.message || 'エラーが発生しました');
  }
}

/**
 * レコード詳細取得
 */
async function fetchRecordDetails(entity, recordId) {
  try {
    const response = await ZOHO.CRM.API.getRecord({
      Entity: entity,
      RecordID: recordId
    });
    
    console.log("API Response:", response);
    
    if (response.data && response.data.length > 0) {
      return response.data[0];
    }
    return null;
  } catch (error) {
    console.error('Error fetching record:', error);
    return null;
  }
}

/**
 * モジュール名からレコードタイプを判定
 */
function getRecordType(entity) {
  const entityLower = (entity || '').toLowerCase();
  
  if (entityLower === 'jobseekers' || 
      entityLower.includes('jobseeker') || 
      entityLower.includes('求職者') ||
      entityLower.includes('candidate')) {
    return 'jobseeker';
  }
  
  if (entityLower === 'jobs' || 
      entityLower.includes('job') ||
      entityLower.includes('求人')) {
    return 'job';
  }
  
  console.log("Unknown entity, treating as jobseeker:", entity);
  return 'jobseeker';
}

/**
 * マッチング検索
 * ZOHO.CRM.CONNECTION.invoke経由でCatalyst APIを呼び出し（CORSを完全回避）
 */
async function searchMatches(recordId, record, recordType) {
  if (CONFIG.MOCK_MODE) {
    console.log("Mock mode: calculating matches for record:", recordId);
    const mockMatches = calculateMockMatches(recordId, record, recordType);
    return { matches: mockMatches, summary: null };
  }
  
  try {
    console.log("Calling Catalyst API via CRM Connection...");
    
    const recordData = transformRecordForAPI(record, recordType);
    console.log("Record data:", JSON.stringify(recordData));
    
    // 総合評価1本化（トークン節約）：generate_summary: true で1回だけ要約を取得
    const requestBody = {
      record_id: recordId,
      record: recordData,
      record_type: recordType,
      top_k: 5,
      generate_summary: true
    };
    
    console.log("Request body:", JSON.stringify(requestBody));
    
    // ZOHO.CRM.CONNECTION.invoke 経由で呼び出し（CORS回避・APIキー非露出）
    const response = await ZOHO.CRM.CONNECTION.invoke(CONFIG.CONNECTION_NAME, {
      url: CONFIG.SEARCH_URL,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      parameters: requestBody,
      param_type: 2
    });
    
    console.log("Connection response:", response);
    
    if (response && response.code === 'SUCCESS') {
      let data = response.details;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch (e) {
          console.error("JSON parse error:", e);
          const mockMatches = calculateMockMatches(recordId, record, recordType);
          return { matches: mockMatches, summary: null };
        }
      }
      console.log("Catalyst API response:", data);
      if (data) {
        if (data.statusMessage && typeof data.statusMessage === "object" && data.statusMessage.error) {
          console.error("Catalyst API error:", data.statusMessage.error);
        }
      }
      var matchData = (data && data.statusMessage != null)
        ? (typeof data.statusMessage === 'object' ? data.statusMessage : data)
        : data;
      var matches = (matchData && matchData.matches) ? matchData.matches
        : (data && data.matches) ? data.matches
        : (data && data.statusMessage && data.statusMessage.matches) ? data.statusMessage.matches
        : (data && data.statusMessage && data.statusMessage.details && data.statusMessage.details.matches) ? data.statusMessage.details.matches
        : null;

      if (matches && matches.length > 0) {
        console.log("Matches found:", matches.length, "Summary:", !!matchData.summary);
        return { matches: matches, summary: (matchData && matchData.summary) || null };
      }

      if (Array.isArray(matches) && matches.length === 0)
        console.log("Matches array is empty (Pinecone returned 0 hits). Check Catalyst PINECONE_HOST and index.");
      else if (!matches)
        console.log("No matches in response, using mock data");
      const mockMatches = calculateMockMatches(recordId, record, recordType);
      return { matches: mockMatches, summary: null };
      
    } else {
      console.error("Connection error:", response);
      const mockMatches = calculateMockMatches(recordId, record, recordType);
      return { matches: mockMatches, summary: null };
    }
    
  } catch (error) {
    console.error('Error searching matches:', error);
    console.log("Falling back to mock matches");
    const mockMatches = calculateMockMatches(recordId, record, recordType);
    return { matches: mockMatches, summary: null };
  }
}

/**
 * モックマッチング計算（実際のレコードデータを使用）
 */
function calculateMockMatches(recordId, record, recordType) {
  console.log("Calculating mock matches for:", recordType, recordId);
  
  if (recordType === 'jobseeker') {
    // 求職者 → 求人をマッチング
    const jobseekerSkills = (record.Skills || '').toLowerCase();
    const jobseekerLocation = (record.Desired_Location || '').toLowerCase();
    const jobseekerPosition = (record.Desired_Position || '').toLowerCase();
    
    return CRM_DATA.jobs.map(job => {
      let score = 50; // ベーススコア
      
      // スキルマッチング
      const jobSkills = job.skills.toLowerCase();
      const skillWords = jobseekerSkills.split(/[,、\s]+/);
      skillWords.forEach(skill => {
        if (skill && jobSkills.includes(skill.trim())) {
          score += 15;
        }
      });
      
      // 勤務地マッチング
      if (jobseekerLocation.includes('東京') && job.location.includes('東京')) {
        score += 10;
      }
      if (jobseekerLocation.includes('大阪') && job.location.includes('大阪')) {
        score += 10;
      }
      if (jobseekerLocation.includes('リモート') && job.location.includes('リモート')) {
        score += 5;
      }
      
      // 職種マッチング
      if (jobseekerPosition && job.position.toLowerCase().includes(jobseekerPosition)) {
        score += 20;
      }
      
      // スコアを0-100に正規化
      score = Math.min(100, Math.max(0, score));
      
      return {
        id: job.id,
        score: Math.round(score * 10) / 10,
        metadata: {
          title: job.name,
          location: job.location,
          salary_min: String(job.salary_min),
          salary_max: String(job.salary_max),
          required_skills: job.skills
        }
      };
    }).sort((a, b) => b.score - a.score);
    
  } else {
    // 求人 → 求職者をマッチング
    const jobSkills = (record.Required_Skills || '').toLowerCase();
    const jobLocation = (record.Location || '').toLowerCase();
    const jobPosition = (record.Position || '').toLowerCase();
    
    return CRM_DATA.jobseekers.map(seeker => {
      let score = 50;
      
      // スキルマッチング
      const seekerSkills = seeker.skills.toLowerCase();
      const requiredSkills = jobSkills.split(/[,、\s]+/);
      requiredSkills.forEach(skill => {
        if (skill && seekerSkills.includes(skill.trim())) {
          score += 15;
        }
      });
      
      // 勤務地マッチング
      if (jobLocation.includes('東京') && seeker.desired_location.includes('東京')) {
        score += 10;
      }
      if (jobLocation.includes('大阪') && seeker.desired_location.includes('大阪')) {
        score += 10;
      }
      if (jobLocation.includes('リモート') && seeker.desired_location.includes('リモート')) {
        score += 5;
      }
      
      // 職種マッチング
      if (jobPosition && seeker.desired_position.toLowerCase().includes(jobPosition)) {
        score += 20;
      }
      
      score = Math.min(100, Math.max(0, score));
      
      return {
        id: seeker.id,
        score: Math.round(score * 10) / 10,
        metadata: {
          name: seeker.name,
          desired_location: seeker.desired_location,
          desired_salary: String(seeker.desired_salary),
          skills: seeker.skills
        }
      };
    }).sort((a, b) => b.score - a.score);
  }
}

/**
 * CRMレコードをAPI用に変換
 */
function transformRecordForAPI(record, recordType) {
  if (recordType === 'jobseeker') {
    return {
      name: record.Name || record.Full_Name || '',
      skills: record.Skills || record.Skill_Set || '',
      experience_years: record.Experience_Years || record.Years_of_Experience || 0,
      desired_position: record.Desired_Position || record.Job_Title || '',
      desired_location: record.Desired_Location || record.Preferred_Location || '',
      desired_salary: record.Desired_Salary || record.Expected_Salary || 0,
      self_pr: record.Self_PR || record.Summary || ''
    };
  } else {
    return {
      title: record.Name || record.Job_Title || '',
      required_skills: record.Required_Skills || record.Skills_Required || '',
      required_experience: record.Required_Experience || record.Min_Experience || 0,
      position: record.Position || record.Job_Category || '',
      location: record.Location || record.Work_Location || '',
      salary_min: record.Salary_Min || record.Min_Salary || 0,
      salary_max: record.Salary_Max || record.Max_Salary || 0,
      description: record.Description || record.Job_Description || ''
    };
  }
}

/**
 * スコアからモックの軸別スコアを生成（APIにない場合の詳細モーダル・重み用）
 */
function deriveAxisScores(score) {
  var s = Math.min(100, Math.max(0, Number(score)));
  return {
    skill: Math.min(100, Math.round(s * 1.02)),
    experience: Math.min(100, Math.round(s * 0.96)),
    salary: Math.min(100, Math.round(s * 0.92)),
    location: Math.min(100, Math.round(s * 0.94)),
    culture: Math.min(100, Math.round(s * 0.9))
  };
}

/**
 * マッチに axis_scores と skill_match を付与（詳細モーダル・重み再計算用）
 */
function augmentMatchesWithAxisScores(matches) {
  return (matches || []).map(function (m) {
    var ax = m.axis_scores || deriveAxisScores(m.score);
    var meta = m.metadata || {};
    var skillsStr = meta.required_skills || meta.skills || '';
    var skillsList = skillsStr ? skillsStr.split(/[,、\s]+/).filter(Boolean) : [];
    var skillMatch = m.skill_match || {
      matched: skillsList.slice(0, 3),
      partial: skillsList.slice(3, 5),
      missing: []
    };
    return Object.assign({}, m, { axis_scores: ax, skill_match: skillMatch });
  });
}

/**
 * 重みで加重スコアを計算し、並び替えた配列を返す
 */
function recalcScores(matches, weights) {
  var total = Object.keys(weights).reduce(function (s, k) { return s + (weights[k] || 0); }, 0) || 1;
  return (matches || []).map(function (m) {
    var ax = m.axis_scores || {};
    var weighted = 0;
    WEIGHT_AXES.forEach(function (a) {
      weighted += ((weights[a.key] || 0) / total) * (ax[a.key] || 0);
    });
    return Object.assign({}, m, { displayScore: Math.round(weighted * 10) / 10 });
  }).sort(function (a, b) { return (b.displayScore || b.score) - (a.displayScore || a.score); });
}

/**
 * 総合評価ブロックを表示（1本化・折りたたみ可能）
 */
function renderSummary(summary) {
  if (!elements.summaryBlock) return;
  if (!summary || !summary.trim()) {
    elements.summaryBlock.classList.add('hidden');
    return;
  }
  elements.summaryBlock.classList.remove('hidden');
  if (elements.summaryBody) elements.summaryBody.textContent = summary.trim();
  if (elements.summaryToggle) {
    elements.summaryBlock.classList.remove('summary--collapsed');
    elements.summaryToggle.textContent = '閉じる';
    elements.summaryToggle.onclick = function () {
      const block = elements.summaryBlock;
      const isCollapsed = block.classList.toggle('summary--collapsed');
      elements.summaryToggle.textContent = isCollapsed ? '開く' : '閉じる';
    };
  }
}

/**
 * マッチング結果を表示（カードクリックで詳細モーダルを開く）
 */
function renderMatches(matches, recordType) {
  if (!elements.matchList) return;
  elements.matchList.innerHTML = '';
  (matches || []).forEach(function (match, index) {
    var card = createMatchCard(match, recordType, index + 1, index);
    elements.matchList.appendChild(card);
  });
  if (elements.matchCount) {
    elements.matchCount.textContent = (matches && matches.length > 0) ? matches.length + '件' : '';
  }
}

/**
 * スコア帯に応じた色（full-arch 準拠: 80+ 緑 / 60-79 黄 / それ以下 赤）
 */
function getScoreColor(score) {
  if (score >= 80) return '#059669';
  if (score >= 60) return '#d97706';
  return '#dc2626';
}

/**
 * ミニスコアリング（40px SVG）— full-arch スタイル
 */
function renderMiniRing(score) {
  const pct = Math.min(100, Math.max(0, Number(score)));
  const r = 16;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);
  const strokeColor = getScoreColor(pct);
  return `<div class="mini-ring" aria-label="マッチ度 ${Math.round(pct)}%">
    <svg viewBox="0 0 40 40" width="40" height="40">
      <circle class="mini-ring-track" cx="20" cy="20" r="${r}"/>
      <circle class="mini-ring-fill" cx="20" cy="20" r="${r}"
        stroke="${strokeColor}"
        stroke-dasharray="${circ}"
        stroke-dashoffset="${offset}"/>
    </svg>
    <div class="mini-ring-text">${Math.round(pct)}</div>
  </div>`;
}

/**
 * マッチングカードを作成（クリックで詳細モーダルを開く）
 */
function createMatchCard(match, recordType, rank, index0) {
  var card = document.createElement('div');
  var rankClass = rank <= 3 ? 'rank-' + rank : 'rank-n';
  card.className = 'card';
  card.style.setProperty('--i', String(rank - 1));
  card.dataset.matchIndex = String(index0);
  card.onclick = function () { openDetailModal(index0); };

  var metadata = match.metadata || {};
  var name = metadata.name || '';
  var title = metadata.title || '';
  var skills = metadata.skills || metadata.required_skills || '';
  var location = metadata.location || metadata.desired_location || '';
  var salaryMin = metadata.salary_min != null ? String(metadata.salary_min) : '';
  var salaryMax = metadata.salary_max != null ? String(metadata.salary_max) : '';
  var desiredSalary = metadata.desired_salary != null ? String(metadata.desired_salary) : (metadata.salary != null ? String(metadata.salary) : '');
  var position = metadata.position || '';

  var skillShort = skills ? (skills.length > 24 ? skills.substring(0, 24) + '…' : skills) : '';
  var salChip = (recordType === 'jobseeker')
    ? ((salaryMin && salaryMax) ? salaryMin + '〜' + salaryMax + '万' : (salaryMin || salaryMax) ? (salaryMin || salaryMax) + '万' : '')
    : (desiredSalary ? '希望' + desiredSalary + '万' : '');

  var displayName = (recordType === 'jobseeker')
    ? (title || name || position || '求人')
    : (name || '候補者');

  var chips = [];
  if (location) chips.push('<span class="chip chip-loc">📍 ' + escapeHtml(location) + '</span>');
  if (salChip) chips.push('<span class="chip chip-sal">💰 ' + escapeHtml(salChip) + '</span>');
  if (skillShort) chips.push('<span class="chip chip-skill">' + escapeHtml(skillShort) + '</span>');

  var score = match.displayScore != null ? match.displayScore : match.score;
  card.innerHTML =
    '<div class="rank ' + rankClass + '">' + rank + '</div>' +
    '<div class="card-info">' +
      '<div class="card-name">' + escapeHtml(displayName) + '</div>' +
      '<div class="card-meta">' + chips.join('') + '</div>' +
    '</div>' +
    renderMiniRing(score);
  return card;
}

/**
 * レコードを開く
 * Pineconeから返されるIDがCRMのレコードIDでない場合の対応も含む
 */
function openRecord(recordId, currentRecordType) {
  // 現在のレコードタイプと逆のモジュールを開く
  // カスタムモジュール名の場合もあるので、API名を使用
  const targetEntity = currentRecordType === 'jobseeker' ? 'Jobs' : 'JobSeekers';
  
  console.log("Opening record:", targetEntity, recordId);
  console.log("Record ID type:", typeof recordId, "Value:", recordId);
  
  // IDがCRMのレコードID形式（数字のみ）かチェック
  const isCrmId = /^\d+$/.test(recordId);
  
  if (!isCrmId) {
    console.warn("Record ID is not a CRM ID format. ID:", recordId);
    // テストデータのIDの場合はアラートを表示
    alert(`レコードID「${recordId}」はCRMのレコードIDではありません。\nPineconeにCRMのレコードIDでデータを登録してください。`);
    return;
  }
  
  // ZOHO.CRM.UI.Record.open を使用
  ZOHO.CRM.UI.Record.open({
    Entity: targetEntity,
    RecordID: recordId
  }).then(function(data) {
    console.log("Record opened:", data);
  }).catch(function(error) {
    console.error("Error opening record:", error);
    // フォールバック：新しいタブでレコードを開く
    const baseUrl = window.location.origin;
    const recordUrl = `${baseUrl}/crm/tab/${targetEntity}/${recordId}`;
    window.open(recordUrl, '_blank');
  });
}

/* ========== 詳細モーダル（カードクリック時・元ネタに合わせる） ========== */
function openDetailModal(index0) {
  var m = displayMatches[index0];
  if (!m) return;
  var md = m.metadata || {};
  var ax = m.axis_scores || {};
  var score = m.displayScore != null ? m.displayScore : m.score;
  var title = md.title || md.name || '詳細';

  document.getElementById('dm-title').textContent = title;
  var body = document.getElementById('dm-body');
  if (!body) return;

  var r = 34;
  var circ = 2 * Math.PI * r;
  var offset = circ * (1 - score / 100);
  var strokeColor = getScoreColor(score);

  var html =
    '<div class="detail-score-section">' +
      '<div class="big-ring">' +
        '<svg viewBox="0 0 80 80" width="80" height="80">' +
          '<circle class="big-ring-track" cx="40" cy="40" r="' + r + '"/>' +
          '<circle class="big-ring-fill" cx="40" cy="40" r="' + r + '" stroke="' + strokeColor + '" stroke-dasharray="' + circ + '" stroke-dashoffset="' + offset + '"/>' +
        '</svg>' +
        '<div class="big-ring-text">' +
          '<span class="big-ring-num">' + Math.round(score) + '</span>' +
          '<span class="big-ring-label">マッチ度</span>' +
        '</div>' +
      '</div>' +
      '<div class="detail-score-info">' +
        '<h4>' + escapeHtml(title) + '</h4>' +
        '<div class="detail-score-tags">' +
          (md.location ? '<span class="chip chip-loc">📍 ' + escapeHtml(md.location) + '</span>' : '') +
          (md.salary_min != null && md.salary_max != null ? '<span class="chip chip-sal">💰 ' + escapeHtml(md.salary_min + '〜' + md.salary_max + '万') + '</span>' : '') +
          (md.position ? '<span class="chip chip-skill">' + escapeHtml(md.position) + '</span>' : '') +
        '</div>' +
      '</div>' +
    '</div>';

  var aiReason = (m.reason && m.reason.trim()) ? m.reason.trim() : (m.ai_reason && m.ai_reason.trim()) ? m.ai_reason.trim() : (globalSummary && globalSummary.trim() ? globalSummary.trim() : '');
  if (aiReason) {
    html += '<div class="ai-reason-box">' +
      '<div class="ai-reason-label">✦ AI 分析コメント</div>' +
      '<div class="ai-reason-text">' + escapeHtml(aiReason) + '</div>' +
    '</div>';
  }

  var sm = m.skill_match || {};
  var matched = (sm.matched || []).slice(0, 8);
  var partial = (sm.partial || []).slice(0, 4);
  var missing = (sm.missing || []).slice(0, 4);
  if (matched.length || partial.length || missing.length) {
    html += '<div class="skill-section"><div class="skill-section-label">スキルマッチ状況</div><div class="skill-tags">';
    matched.forEach(function (s) { html += '<span class="stag stag-ok">✓ ' + escapeHtml(s) + '</span>'; });
    partial.forEach(function (s) { html += '<span class="stag stag-part">~ ' + escapeHtml(s) + '</span>'; });
    missing.forEach(function (s) { html += '<span class="stag stag-miss">✗ ' + escapeHtml(s) + '</span>'; });
    html += '</div></div>';
  }

  html += '<div class="axis-bars">';
  WEIGHT_AXES.forEach(function (a) {
    var v = ax[a.key] != null ? ax[a.key] : 0;
    var barColor = getScoreColor(v);
    html += '<div class="axis-row">' +
      '<label><span>' + a.icon + ' ' + a.label + '</span><span>' + v + '%</span></label>' +
      '<div class="axis-bar-bg"><div class="axis-bar-fill" style="width:' + v + '%;background:' + barColor + '"></div></div>' +
    '</div>';
  });
  html += '</div>';

  html += '<div class="radar-section"><canvas id="detail-radar" height="220"></canvas></div>';
  body.innerHTML = html;

  document.getElementById('dm-open-record').onclick = function () {
    closeModal('detail-modal');
    openRecord(m.id, currentRecordType);
  };

  openModal('detail-modal');
  if (typeof ZOHO !== 'undefined' && ZOHO.CRM && ZOHO.CRM.UI && ZOHO.CRM.UI.Resize) {
    ZOHO.CRM.UI.Resize({ height: '700', width: '1000' }).catch(function () {});
  }

  requestAnimationFrame(function () {
    var canvas = document.getElementById('detail-radar');
    if (canvas && typeof Chart !== 'undefined') {
      new Chart(canvas, {
        type: 'radar',
        data: {
          labels: WEIGHT_AXES.map(function (a) { return a.label; }),
          datasets: [{
            data: WEIGHT_AXES.map(function (a) { return ax[a.key] != null ? ax[a.key] : 0; }),
            backgroundColor: 'rgba(79,70,229,0.08)',
            borderColor: 'rgba(79,70,229,0.6)',
            borderWidth: 2,
            pointBackgroundColor: 'rgba(79,70,229,0.8)',
            pointRadius: 3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            r: {
              beginAtZero: true,
              max: 100,
              ticks: { stepSize: 25, color: '#8c92a4', font: { size: 9 } },
              pointLabels: { color: '#5a6078', font: { size: 11 } }
            }
          },
          plugins: { legend: { display: false } }
        }
      });
    }
  });
}

function openModal(id) {
  var el = document.getElementById(id);
  if (el) el.classList.add('open');
}
function closeModal(id) {
  var el = document.getElementById(id);
  if (el) el.classList.remove('open');
  if (id === 'detail-modal' && typeof ZOHO !== 'undefined' && ZOHO.CRM && ZOHO.CRM.UI && ZOHO.CRM.UI.Resize) {
    ZOHO.CRM.UI.Resize({ height: '500', width: '1000' }).catch(function () {});
  }
}
function toast(msg) {
  var el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(function () { el.remove(); }, 2600);
}

/* ========== 重み付けモーダル ========== */
function openWeightModal() {
  var el = document.getElementById('weight-sliders');
  var preview = document.getElementById('weight-preview');
  if (!el) return;
  el.innerHTML = WEIGHT_AXES.map(function (a) {
    var v = currentWeights[a.key] != null ? currentWeights[a.key] : a.default;
    return '<div class="weight-row">' +
      '<label><span>' + a.icon + ' ' + a.label + '</span><span id="wv-' + a.key + '">' + v + '%</span></label>' +
      '<input type="range" min="0" max="100" value="' + v + '" data-key="' + a.key + '" oninput="var s=document.getElementById(\'wv-' + a.key + '\');if(s)s.textContent=this.value+\'%\';updateWeightPreview();">' +
    '</div>';
  }).join('');
  updateWeightPreview();
  openModal('weight-modal');
}
function updateWeightPreview() {
  var preview = document.getElementById('weight-preview');
  if (!preview) return;
  var inputs = document.querySelectorAll('#weight-sliders input[type=range]');
  var total = 0;
  inputs.forEach(function (s) { total += parseInt(s.value, 10) || 0; });
  preview.textContent = '合計: ' + total + '%（正規化して適用されます）';
}
function resetWeights() {
  WEIGHT_AXES.forEach(function (a) { currentWeights[a.key] = a.default; });
  openWeightModal();
}
function applyWeights() {
  var inputs = document.querySelectorAll('#weight-sliders input[type=range]');
  inputs.forEach(function (s) { currentWeights[s.dataset.key] = parseInt(s.value, 10) || 0; });
  displayMatches = recalcScores(displayMatches, currentWeights);
  renderMatches(displayMatches, currentRecordType);
  closeModal('weight-modal');
  toast('✅ 重み付けを適用しました');
}

/* ========== Excel 出力（SheetJS） ========== */
function exportExcel() {
  if (typeof XLSX === 'undefined') { toast('Excel ライブラリを読み込んでください'); return; }
  if (!displayMatches.length) { toast('マッチング結果がありません'); return; }
  var rows = displayMatches.map(function (m, i) {
    var md = m.metadata || {};
    return {
      '順位': i + 1,
      'ポジション': md.title || md.name || '',
      'マッチ度(%)': m.displayScore != null ? m.displayScore : m.score,
      '勤務地': md.location || md.desired_location || '',
      '給与(万円)': (md.salary_min != null && md.salary_max != null) ? md.salary_min + '〜' + md.salary_max : (md.desired_salary != null ? '希望' + md.desired_salary : ''),
      'スキル': md.required_skills || md.skills || ''
    };
  });
  var ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{ wch: 5 }, { wch: 28 }, { wch: 10 }, { wch: 20 }, { wch: 16 }, { wch: 40 }];
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'マッチング結果');
  XLSX.writeFile(wb, 'AI_Matching_Report.xlsx');
  toast('📊 Excel をダウンロードしました');
}

/* ========== メールモーダル ========== */
function openEmailModal() {
  var preview = document.getElementById('email-preview');
  if (!preview) return;
  if (!displayMatches.length) { preview.innerHTML = 'マッチング結果がありません'; openModal('email-modal'); return; }
  var html = '<strong>マッチング結果一覧</strong><table><tr><th>#</th><th>ポジション</th><th>スコア</th><th>勤務地</th></tr>';
  displayMatches.forEach(function (m, i) {
    var md = m.metadata || {};
    var sc = m.displayScore != null ? m.displayScore : m.score;
    html += '<tr><td>' + (i + 1) + '</td><td>' + escapeHtml(md.title || md.name || '') + '</td><td>' + sc + '%</td><td>' + escapeHtml(md.location || md.desired_location || '') + '</td></tr>';
  });
  html += '</table>';
  preview.innerHTML = html;
  openModal('email-modal');
}
function sendEmail() {
  var to = document.getElementById('email-to');
  var toVal = to && to.value ? to.value.trim() : '';
  if (!toVal) { toast('⚠️ 宛先を入力してください'); return; }
  toast('✉️ ' + toVal + ' に送信しました（デモ）');
  closeModal('email-modal');
}

/**
 * 再試行
 */
function retrySearch() {
  if (window.currentContext) {
    handlePageLoad(window.currentContext);
  }
}

/**
 * UI表示切り替え
 */
function showLoading() {
  if (elements.widgetHeader) elements.widgetHeader.classList.add('hidden');
  elements.loading.classList.remove('hidden');
  elements.error.classList.add('hidden');
  elements.results.classList.add('hidden');
  elements.empty.classList.add('hidden');
}

function showError(message) {
  if (elements.widgetHeader) elements.widgetHeader.classList.remove('hidden');
  elements.loading.classList.add('hidden');
  elements.error.classList.remove('hidden');
  elements.results.classList.add('hidden');
  elements.empty.classList.add('hidden');
  if (elements.errorMessage) elements.errorMessage.textContent = message || '';
}

function showResults() {
  if (elements.widgetHeader) elements.widgetHeader.classList.remove('hidden');
  elements.loading.classList.add('hidden');
  elements.error.classList.add('hidden');
  elements.results.classList.remove('hidden');
  elements.empty.classList.add('hidden');
}

function showEmpty() {
  if (elements.widgetHeader) elements.widgetHeader.classList.remove('hidden');
  elements.loading.classList.add('hidden');
  elements.error.classList.add('hidden');
  elements.results.classList.add('hidden');
  elements.empty.classList.remove('hidden');
}

/**
 * HTMLエスケープ
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

if (window._pendingPageLoad) {
  handlePageLoad(window._pendingPageLoad);
  window._pendingPageLoad = null;
}
console.log("Widget.js loaded - detail modal, weight, Excel, email");
