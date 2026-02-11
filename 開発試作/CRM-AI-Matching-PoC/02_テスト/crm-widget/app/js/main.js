/**
 * CRM×AI Matching Widget（テスト/スタンドアロン用エントリ）
 * 本番ウィジェットは widget.html + widget.js を使用。
 * 外部APIは CONNECTION.invoke 経由でのみ呼び出す（fetch は CORS でブロックされる）。
 */

let currentContext = null;

const CONFIG = {
  CONNECTION_NAME: 'catalyst_matching_api',
  SEARCH_URL: 'https://ai-matching-poc-90002038385.development.catalystserverless.jp/server/ai_matching/search',
  MOCK_MODE: true
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
 * 初期化
 */
function initialize() {
  // CRM外でのテストモード検出
  const isStandalone = !window.ZOHO || !window.ZOHO.embeddedApp;
  
  if (isStandalone) {
    console.log("Standalone mode detected - using mock data");
    // モックデータで直接表示
    showLoading();
    setTimeout(() => {
      const mockMatches = getMockMatches('jobseeker');
      renderMatches(mockMatches, 'jobseeker');
      showResults();
    }, 1000);
    return;
  }
  
  // イベントリスナー登録（init()の前に必須）
  ZOHO.embeddedApp.on("PageLoad", function(data) {
    console.log("PageLoad event received:", data);
    currentContext = data;
    handlePageLoad(data);
  });

  // SDK初期化
  ZOHO.embeddedApp.init();
}

/**
 * ページ読み込み時の処理
 */
async function handlePageLoad(context) {
  try {
    showLoading();
    
    // レコード詳細取得
    const record = await fetchRecordDetails(context.Entity, context.EntityId);
    if (!record) {
      showError('レコード情報を取得できませんでした');
      return;
    }
    
    // マッチング検索
    const recordType = getRecordType(context.Entity);
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
  // カスタムモジュール名に応じて調整
  if (entity.toLowerCase().includes('jobseeker') || 
      entity.toLowerCase().includes('求職者') ||
      entity.toLowerCase().includes('candidate')) {
    return 'jobseeker';
  }
  return 'job';
}

/**
 * マッチング検索（CONNECTION.invoke 経由。CRM外ではモック）
 */
async function searchMatches(recordId, record, recordType) {
  if (CONFIG.MOCK_MODE) {
    return getMockMatches(recordType);
  }
  if (typeof ZOHO === 'undefined' || !ZOHO.CRM || !ZOHO.CRM.CONNECTION || !ZOHO.CRM.CONNECTION.invoke) {
    console.warn('ZOHO.CRM.CONNECTION not available, using mock');
    return getMockMatches(recordType);
  }
  try {
    const requestBody = {
      record_id: recordId,
      record: transformRecordForAPI(record, recordType),
      record_type: recordType,
      top_k: 5,
      generate_summary: false
    };
    const response = await ZOHO.CRM.CONNECTION.invoke(CONFIG.CONNECTION_NAME, {
      url: CONFIG.SEARCH_URL,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      parameters: requestBody,
      param_type: 2
    });
    if (response && response.code === 'SUCCESS') {
      let data = response.details;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch (e) {
          return getMockMatches(recordType);
        }
      }
      const payload = (data && data.statusMessage != null)
        ? (typeof data.statusMessage === 'object' ? data.statusMessage : data)
        : data;
      return (payload && payload.matches) ? payload.matches : getMockMatches(recordType);
    }
    return getMockMatches(recordType);
  } catch (error) {
    console.error('Error searching matches:', error);
    return getMockMatches(recordType);
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
 * モックデータ（テスト用）
 */
function getMockMatches(recordType) {
  if (recordType === 'jobseeker') {
    // 求職者の場合、求人をマッチング
    return [
      {
        id: 'job_001',
        score: 92.5,
        metadata: {
          title: 'シニアバックエンドエンジニア',
          location: '東京（リモート可）',
          salary_min: '500',
          salary_max: '800',
          required_skills: 'Python, AWS, Kubernetes'
        }
      },
      {
        id: 'job_002',
        score: 85.3,
        metadata: {
          title: 'Webアプリケーションエンジニア',
          location: '東京',
          salary_min: '450',
          salary_max: '650',
          required_skills: 'Python, JavaScript, Docker'
        }
      },
      {
        id: 'job_003',
        score: 78.1,
        metadata: {
          title: 'フルスタックエンジニア',
          location: '大阪',
          salary_min: '400',
          salary_max: '600',
          required_skills: 'Python, React, AWS'
        }
      }
    ];
  } else {
    // 求人の場合、求職者をマッチング
    return [
      {
        id: 'jobseeker_001',
        score: 95.2,
        metadata: {
          name: '田中 太郎',
          desired_location: '東京',
          desired_salary: '600',
          skills: 'Python, AWS, Docker, Kubernetes'
        }
      },
      {
        id: 'jobseeker_002',
        score: 88.7,
        metadata: {
          name: '佐藤 花子',
          desired_location: '東京',
          desired_salary: '550',
          skills: 'Python, JavaScript, AWS'
        }
      },
      {
        id: 'jobseeker_003',
        score: 72.4,
        metadata: {
          name: '鈴木 一郎',
          desired_location: '東京（リモート希望）',
          desired_salary: '500',
          skills: 'Python, Django, PostgreSQL'
        }
      }
    ];
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
 */
function createMatchCard(match, recordType) {
  const card = document.createElement('div');
  card.className = 'match-card';
  card.onclick = () => openRecord(match.id, recordType);
  
  const scoreClass = match.score >= 80 ? 'high' : match.score >= 60 ? 'medium' : 'low';
  const metadata = match.metadata || {};
  
  if (recordType === 'jobseeker') {
    // 求人カード
    card.innerHTML = `
      <div class="match-header">
        <span class="match-title">${escapeHtml(metadata.title || '求人')}</span>
        <div class="match-score ${scoreClass === 'high' ? 'score-high' : scoreClass === 'medium' ? 'score-medium' : 'score-low'}">
          ${match.score}%
        </div>
      </div>
      <div class="score-bar">
        <div class="score-fill ${scoreClass}" style="width: ${match.score}%"></div>
      </div>
      <div class="match-details">
        ${metadata.location ? `<span class="detail-tag location">📍 ${escapeHtml(metadata.location)}</span>` : ''}
        ${metadata.salary_min && metadata.salary_max ? `<span class="detail-tag salary">💰 ${metadata.salary_min}〜${metadata.salary_max}万円</span>` : ''}
        ${metadata.required_skills ? `<span class="detail-tag">🔧 ${escapeHtml(metadata.required_skills.substring(0, 30))}...</span>` : ''}
      </div>
    `;
  } else {
    // 求職者カード
    card.innerHTML = `
      <div class="match-header">
        <span class="match-title">${escapeHtml(metadata.name || '候補者')}</span>
        <div class="match-score ${scoreClass === 'high' ? 'score-high' : scoreClass === 'medium' ? 'score-medium' : 'score-low'}">
          ${match.score}%
        </div>
      </div>
      <div class="score-bar">
        <div class="score-fill ${scoreClass}" style="width: ${match.score}%"></div>
      </div>
      <div class="match-details">
        ${metadata.desired_location ? `<span class="detail-tag location">📍 ${escapeHtml(metadata.desired_location)}</span>` : ''}
        ${metadata.desired_salary ? `<span class="detail-tag salary">💰 希望${metadata.desired_salary}万円</span>` : ''}
        ${metadata.skills ? `<span class="detail-tag">🔧 ${escapeHtml(metadata.skills.substring(0, 30))}...</span>` : ''}
      </div>
    `;
  }
  
  return card;
}

/**
 * レコードを開く
 */
function openRecord(recordId, currentRecordType) {
  // 現在のレコードタイプと逆のモジュールを開く
  const targetEntity = currentRecordType === 'jobseeker' ? 'Jobs' : 'JobSeekers';
  
  ZOHO.CRM.UI.Record.open({
    Entity: targetEntity,
    RecordID: recordId
  });
}

/**
 * 再試行
 */
function retrySearch() {
  if (currentContext) {
    handlePageLoad(currentContext);
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

// 初期化実行
initialize();
