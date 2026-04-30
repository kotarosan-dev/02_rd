(function () {
  if (window.ZOHO && window.ZOHO.embeddedApp) {
    return;
  }

  const handlers = {};
  const records = {
    Deals: [
      { id: "D-1001", Deal_Name: "更新契約 A", Stage: "Proposal", Amount: 4600000, Probability: 55, Account_Name: { name: "Izumida Foods" } },
      { id: "D-1002", Deal_Name: "新規導入 B", Stage: "Negotiation", Amount: 8200000, Probability: 72, Account_Name: { name: "Etika Logistics" } },
      { id: "D-1003", Deal_Name: "追加開発 C", Stage: "Qualification", Amount: 2300000, Probability: 38, Account_Name: { name: "Nagasaki Works" } },
      { id: "D-1004", Deal_Name: "保守移行 D", Stage: "Closed Won", Amount: 3100000, Probability: 100, Account_Name: { name: "Central Clinic" } },
      { id: "D-1005", Deal_Name: "業務改善 E", Stage: "Needs Analysis", Amount: 5400000, Probability: 48, Account_Name: { name: "Sakura Retail" } }
    ],
    Accounts: [
      { id: "A-2101", Account_Name: "Izumida Foods", Industry: "Manufacturing", Annual_Revenue: 180000000, Employees: 86 },
      { id: "A-2102", Account_Name: "Etika Logistics", Industry: "Logistics", Annual_Revenue: 260000000, Employees: 124 },
      { id: "A-2103", Account_Name: "Nagasaki Works", Industry: "Construction", Annual_Revenue: 96000000, Employees: 41 },
      { id: "A-2104", Account_Name: "Central Clinic", Industry: "Healthcare", Annual_Revenue: 132000000, Employees: 58 },
      { id: "A-2105", Account_Name: "Sakura Retail", Industry: "Retail", Annual_Revenue: 74000000, Employees: 27 }
    ],
    Leads: [
      { id: "L-3001", Full_Name: "山田 太郎", Company: "Yamada Studio", Lead_Status: "Contacted", Email: "taro@example.test", Phone: "095-000-0001" },
      { id: "L-3002", Full_Name: "佐藤 花子", Company: "Sato Design", Lead_Status: "Pre-Qualified", Email: "hanako@example.test", Phone: "" },
      { id: "L-3003", Full_Name: "田中 一郎", Company: "Tanaka Craft", Lead_Status: "New", Email: "", Phone: "095-000-0003" },
      { id: "L-3004", Full_Name: "中村 美咲", Company: "Nakamura Lab", Lead_Status: "Working", Email: "misaki@example.test", Phone: "095-000-0004" }
    ],
    Tasks: [
      { id: "T-4001", Subject: "提案書レビュー", Status: "In Progress", Priority: "High", Due_Date: "2026-05-01" },
      { id: "T-4002", Subject: "初回ヒアリング", Status: "Not Started", Priority: "Highest", Due_Date: "2026-05-02" },
      { id: "T-4003", Subject: "契約条件確認", Status: "Deferred", Priority: "Normal", Due_Date: "2026-05-04" },
      { id: "T-4004", Subject: "導入後フォロー", Status: "Completed", Priority: "Normal", Due_Date: "2026-04-28" },
      { id: "T-4005", Subject: "見積更新", Status: "In Progress", Priority: "High", Due_Date: "2026-05-07" }
    ]
  };

  window.ZOHO = {
    embeddedApp: {
      on(eventName, callback) {
        handlers[eventName] = callback;
      },
      init() {
        return new Promise((resolve) => {
          window.setTimeout(() => {
            if (handlers.PageLoad) {
              handlers.PageLoad({ Entity: "Deals", EntityId: "D-1002", ButtonPosition: "DetailView" });
            }
            resolve();
          }, 120);
        });
      }
    },
    CRM: {
      API: {
        getAllRecords(config) {
          const entity = config && config.Entity ? config.Entity : "Deals";
          return Promise.resolve({ data: records[entity] || [] });
        },
        getRecord(config) {
          const entity = config && config.Entity ? config.Entity : "Deals";
          const recordId = config && config.RecordID ? config.RecordID : "";
          const found = (records[entity] || []).find((record) => record.id === recordId);
          return Promise.resolve({ data: found ? [found] : [] });
        }
      },
      UI: {
        Resize() {
          return Promise.resolve(true);
        }
      },
      CONFIG: {
        getCurrentUser() {
          return Promise.resolve({ users: [{ id: "U-1", full_name: "ローカルデモユーザー", profile: { name: "Administrator" } }] });
        },
        getUserPreference() {
          return Promise.resolve({ theme: "Day" });
        }
      }
    }
  };
})();

