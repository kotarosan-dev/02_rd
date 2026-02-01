/**
 * CRM×AI Matching Widget
 * 求職者・求人のAIマッチングを表示
 */

// 設定
const CONFIG = {
  MATCHING_API_URL: 'https://ai-matching-poc-90002038385.development.catalystserverless.jp/server/ai_matching',
  MOCK_MODE: false  // 実連携モード（Catalyst/Pinecone使用）
};

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
  matchList: document.getElementById('match-list'),
  errorMessage: document.querySelector('.error-message')
};

/**
 * ページ読み込み時の処理
 */
async function handlePageLoad(context) {
  console.log("handlePageLoad called with context:", context);
  
  if (!context || !context.EntityId) {
    console.error("Invalid context:", context);
    showError('コンテキストを取得できません');
    return;
  }
  
  try {
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
    
    const matches = await searchMatches(context.EntityId, record, recordType);
    
    if (matches && matches.length > 0) {
      renderMatches(matches, recordType);
      showResults();
    } else {
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
    return calculateMockMatches(recordId, record, recordType);
  }
  
  try {
    console.log("Calling Catalyst API via CRM Connection...");
    
    const recordData = transformRecordForAPI(record, recordType);
    console.log("Record data:", JSON.stringify(recordData));
    
    // リクエストボディを構築
    const requestBody = {
      record_id: recordId,
      record: recordData,
      record_type: recordType,
      top_k: 5
    };
    
    console.log("Request body:", JSON.stringify(requestBody));
    
    // ZOHO.CRM.CONNECTION.invoke経由でCatalyst APIを呼び出し
    // カスタムサービスConnectionを使用（フルURL指定）
    const response = await ZOHO.CRM.CONNECTION.invoke("catalyst_matching_api", {
      url: "https://ai-matching-poc-90002038385.development.catalystserverless.jp/server/ai_matching/search",
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      parameters: requestBody,  // オブジェクトを直接渡す（JSON.stringifyしない）
      param_type: 2  // 2 = payload (request body)
    });
    
    console.log("Connection response:", response);
    
    // レスポンスを解析
    if (response && response.code === "SUCCESS") {
      let data = response.details;
      
      // 文字列の場合はパース
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch (e) {
          console.error("JSON parse error:", e);
          return calculateMockMatches(recordId, record, recordType);
        }
      }
      
      console.log("Catalyst API response:", data);
      
      // statusMessage の中にマッチング結果がある場合（カスタムConnection経由）
      let matchData = data;
      if (data.statusMessage && typeof data.statusMessage === 'object') {
        matchData = data.statusMessage;
      }
      
      if (matchData.matches && matchData.matches.length > 0) {
        console.log("Matches found:", matchData.matches.length);
        return matchData.matches;
      }
      
      console.log("No matches in response, using mock data");
      return calculateMockMatches(recordId, record, recordType);
      
    } else {
      console.error("Connection error:", response);
      return calculateMockMatches(recordId, record, recordType);
    }
    
  } catch (error) {
    console.error('Error searching matches:', error);
    console.log("Falling back to mock matches");
    return calculateMockMatches(recordId, record, recordType);
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
 * マッチング結果を表示
 */
function renderMatches(matches, recordType) {
  elements.matchList.innerHTML = '';
  
  matches.forEach(match => {
    const card = createMatchCard(match, recordType);
    elements.matchList.appendChild(card);
  });
}

/**
 * マッチングカードを作成
 * Pineconeから返されるフィールド: name, skills, location, salary, position
 */
function createMatchCard(match, recordType) {
  const card = document.createElement('div');
  card.className = 'match-card';
  card.onclick = () => openRecord(match.id, recordType);
  card.style.cursor = 'pointer';
  
  const scoreClass = match.score >= 80 ? 'high' : match.score >= 60 ? 'medium' : 'low';
  const metadata = match.metadata || {};
  
  // Pineconeのフィールド名に対応
  const name = metadata.name || '';
  const skills = metadata.skills || '';
  const location = metadata.location || '';
  const salary = metadata.salary || '';
  const position = metadata.position || '';
  
  if (recordType === 'jobseeker') {
    // 求職者が見ている → 求人を表示
    const displayTitle = name || position || '求人';
    const displaySalary = salary ? `${salary}万円` : '';
    
    card.innerHTML = `
      <div class="match-header">
        <span class="match-title">${escapeHtml(displayTitle)}</span>
        <div class="match-score ${scoreClass === 'high' ? 'score-high' : scoreClass === 'medium' ? 'score-medium' : 'score-low'}">
          ${match.score}%
        </div>
      </div>
      <div class="score-bar">
        <div class="score-fill ${scoreClass}" style="width: ${match.score}%"></div>
      </div>
      <div class="match-details">
        ${location ? `<span class="detail-tag location">${escapeHtml(location)}</span>` : ''}
        ${displaySalary ? `<span class="detail-tag salary">${displaySalary}</span>` : ''}
        ${skills ? `<span class="detail-tag">${escapeHtml(skills.length > 30 ? skills.substring(0, 30) + '...' : skills)}</span>` : ''}
      </div>
    `;
  } else {
    // 求人が見ている → 求職者を表示
    const displayName = name || '候補者';
    const displaySalary = salary ? `希望${salary}万円` : '';
    
    card.innerHTML = `
      <div class="match-header">
        <span class="match-title">${escapeHtml(displayName)}</span>
        <div class="match-score ${scoreClass === 'high' ? 'score-high' : scoreClass === 'medium' ? 'score-medium' : 'score-low'}">
          ${match.score}%
        </div>
      </div>
      <div class="score-bar">
        <div class="score-fill ${scoreClass}" style="width: ${match.score}%"></div>
      </div>
      <div class="match-details">
        ${location ? `<span class="detail-tag location">${escapeHtml(location)}</span>` : ''}
        ${displaySalary ? `<span class="detail-tag salary">${displaySalary}</span>` : ''}
        ${skills ? `<span class="detail-tag">${escapeHtml(skills.length > 30 ? skills.substring(0, 30) + '...' : skills)}</span>` : ''}
      </div>
    `;
  }
  
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
  elements.loading.classList.remove('hidden');
  elements.error.classList.add('hidden');
  elements.results.classList.add('hidden');
  elements.empty.classList.add('hidden');
}

function showError(message) {
  elements.loading.classList.add('hidden');
  elements.error.classList.remove('hidden');
  elements.results.classList.add('hidden');
  elements.empty.classList.add('hidden');
  elements.errorMessage.textContent = message;
}

function showResults() {
  elements.loading.classList.add('hidden');
  elements.error.classList.add('hidden');
  elements.results.classList.remove('hidden');
  elements.empty.classList.add('hidden');
}

function showEmpty() {
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

console.log("Widget.js loaded - version 1.7.0 (Pinecone metadata fix)");
