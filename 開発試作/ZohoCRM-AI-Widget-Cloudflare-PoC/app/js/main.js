import THREE from "../lib/three-adapter.js";

const DEMOS = [
  { id: "deal-orbit", label: "Deals Orbit", entity: "Deals", title: "案件ステージ軌道", resizeHeight: 650 },
  { id: "account-towers", label: "Account Towers", entity: "Accounts", title: "取引先タワーマップ", resizeHeight: 650 },
  { id: "activity-pulse", label: "Activity Pulse", entity: "Tasks", title: "活動パルス", resizeHeight: 620 },
  { id: "lead-focus", label: "Lead Focus", entity: "Leads", title: "見込み客フォーカス", resizeHeight: 620 },
  { id: "forecast-grid", label: "Forecast Grid", entity: "Deals", title: "売上見込みグリッド", resizeHeight: 650 }
];

const palette = {
  teal: 0x0f766e,
  orange: 0xf97316,
  blue: 0x2563eb,
  yellow: 0xeab308,
  red: 0xdc2626,
  green: 0x16a34a,
  ink: 0x1d2630,
  line: 0xc9d6ce,
  soft: 0xe7efe9
};

const state = {
  context: { Entity: "Deals", EntityId: "D-1002" },
  user: null,
  activeDemo: DEMOS[0],
  records: { Deals: [], Accounts: [], Leads: [], Tasks: [] },
  tickers: [],
  aiRequestId: 0,
  root: null,
  renderer: null,
  camera: null,
  scene: null,
  pointer: { down: false, x: 0, y: 0 }
};

const el = {
  tabs: document.getElementById("demoTabs"),
  refresh: document.getElementById("refreshButton"),
  canvas: document.getElementById("crmCanvas"),
  stage: document.querySelector(".stage-panel"),
  sceneTitle: document.getElementById("sceneTitle"),
  sceneStatus: document.getElementById("sceneStatus"),
  contextList: document.getElementById("contextList"),
  metricList: document.getElementById("metricList"),
  recordList: document.getElementById("recordList"),
  aiInsightStatus: document.getElementById("aiInsightStatus"),
  aiInsightSummary: document.getElementById("aiInsightSummary"),
  aiRiskList: document.getElementById("aiRiskList"),
  aiQuestionList: document.getElementById("aiQuestionList")
};

function formatMoney(value) {
  const amount = Number(value || 0);
  if (amount >= 1000000) {
    return `${Math.round(amount / 10000).toLocaleString("ja-JP")}万円`;
  }
  return `${amount.toLocaleString("ja-JP")}円`;
}

function safeValue(value, fallback = "-") {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  return String(value);
}

function normalizeContext(data) {
  if (!data || typeof data !== "object") {
    return { Entity: "Deals", EntityId: "D-1002" };
  }
  return {
    Entity: safeValue(data.Entity, "Deals"),
    EntityId: Array.isArray(data.EntityId) ? safeValue(data.EntityId[0], "D-1002") : safeValue(data.EntityId, "D-1002"),
    ButtonPosition: safeValue(data.ButtonPosition, "DetailView")
  };
}

function waitForPageLoad() {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (data) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(normalizeContext(data));
    };

    if (!window.ZOHO || !window.ZOHO.embeddedApp) {
      finish({ Entity: "Deals", EntityId: "D-1002" });
      return;
    }

    window.ZOHO.embeddedApp.on("PageLoad", finish);
    const initResult = window.ZOHO.embeddedApp.init();
    if (initResult && typeof initResult.catch === "function") {
      initResult.catch(() => finish({ Entity: "Deals", EntityId: "D-1002" }));
    }
    window.setTimeout(() => finish({ Entity: "Deals", EntityId: "D-1002" }), 1400);
  });
}

async function fetchRecords(entity) {
  if (!window.ZOHO || !window.ZOHO.CRM || !window.ZOHO.CRM.API) {
    return [];
  }

  try {
    const response = await window.ZOHO.CRM.API.getAllRecords({ Entity: entity, page: 1, per_page: 50 });
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    return [];
  }
}

async function loadCrmData() {
  const [deals, accounts, leads, tasks] = await Promise.all([
    fetchRecords("Deals"),
    fetchRecords("Accounts"),
    fetchRecords("Leads"),
    fetchRecords("Tasks")
  ]);
  state.records = { Deals: deals, Accounts: accounts, Leads: leads, Tasks: tasks };
}

async function applyZohoTheme() {
  if (!window.ZOHO || !window.ZOHO.CRM || !window.ZOHO.CRM.CONFIG) {
    return;
  }
  try {
    const pref = await window.ZOHO.CRM.CONFIG.getUserPreference();
    document.documentElement.dataset.theme = pref && pref.theme === "Night" ? "dark" : "light";
  } catch (error) {
    document.documentElement.dataset.theme = "light";
  }
}

async function loadCurrentUser() {
  if (!window.ZOHO || !window.ZOHO.CRM || !window.ZOHO.CRM.CONFIG) {
    return null;
  }
  try {
    const response = await window.ZOHO.CRM.CONFIG.getCurrentUser();
    return response && response.users && response.users[0] ? response.users[0] : null;
  } catch (error) {
    return null;
  }
}

function requestZohoResize(height) {
  if (!window.ZOHO || !window.ZOHO.CRM || !window.ZOHO.CRM.UI || !window.ZOHO.CRM.UI.Resize) {
    return;
  }
  const result = window.ZOHO.CRM.UI.Resize({ height: String(height), width: "1000" });
  if (result && typeof result.catch === "function") {
    result.catch(() => {});
  }
}

function makeRenderer() {
  state.scene = new THREE.Scene();
  state.scene.background = null;
  state.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  state.camera.position.set(0, 6.4, 12);
  state.camera.lookAt(0, 0, 0);

  state.renderer = new THREE.WebGLRenderer({
    canvas: el.canvas,
    antialias: false,
    alpha: true,
    powerPreference: "low-power"
  });
  state.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

  const ambient = new THREE.AmbientLight(0xffffff, 0.82);
  const key = new THREE.DirectionalLight(0xffffff, 0.95);
  key.position.set(5, 8, 6);
  state.scene.add(ambient, key);

  state.root = new THREE.Group();
  state.scene.add(state.root);
  resizeRenderer();
}

function resizeRenderer() {
  const rect = el.stage.getBoundingClientRect();
  const width = Math.max(320, Math.floor(rect.width));
  const height = Math.max(320, Math.floor(rect.height));
  state.renderer.setSize(width, height, false);
  state.camera.aspect = width / height;
  state.camera.updateProjectionMatrix();
}

function disposeObject(object) {
  object.traverse((child) => {
    if (child.geometry) {
      child.geometry.dispose();
    }
    if (child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach((material) => material.dispose());
      } else {
        child.material.dispose();
      }
    }
  });
}

function clearScene() {
  state.tickers = [];
  if (state.root) {
    disposeObject(state.root);
    state.scene.remove(state.root);
  }
  state.root = new THREE.Group();
  state.scene.add(state.root);
}

function createMaterial(color, opacity = 1) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.72,
    metalness: 0.05,
    transparent: opacity < 1,
    opacity
  });
}

function addGround(size = 13) {
  const geometry = new THREE.CircleGeometry(size, 64);
  const material = new THREE.MeshBasicMaterial({ color: palette.soft, transparent: true, opacity: 0.48 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.06;
  state.root.add(mesh);
}

function addRing(radius, color, opacity = 0.35) {
  const geometry = new THREE.RingGeometry(radius - 0.015, radius + 0.015, 96);
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(geometry, material);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  state.root.add(ring);
  return ring;
}

function metricPairs(pairs) {
  el.metricList.replaceChildren();
  pairs.forEach(([name, value]) => {
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = name;
    dd.textContent = safeValue(value);
    el.metricList.append(dt, dd);
  });
}

function renderContext() {
  const pairs = [
    ["Entity", state.context.Entity],
    ["RecordID", state.context.EntityId],
    ["User", state.user ? state.user.full_name : "Local"],
    ["Mode", state.activeDemo.label]
  ];
  el.contextList.replaceChildren();
  pairs.forEach(([name, value]) => {
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = name;
    dd.textContent = safeValue(value);
    el.contextList.append(dt, dd);
  });
}

function renderRecords(records, mapRecord) {
  el.recordList.replaceChildren();
  records.slice(0, 6).forEach((record, index) => {
    const mapped = mapRecord(record, index);
    const item = document.createElement("li");
    item.className = "record-item";

    const dot = document.createElement("span");
    dot.className = "record-dot";
    dot.style.backgroundColor = mapped.color;

    const body = document.createElement("div");
    const title = document.createElement("p");
    const meta = document.createElement("p");
    title.className = "record-title";
    meta.className = "record-meta";
    title.textContent = mapped.title;
    meta.textContent = mapped.meta;
    body.append(title, meta);

    const value = document.createElement("span");
    value.className = "record-value";
    value.textContent = mapped.value;

    item.append(dot, body, value);
    el.recordList.append(item);
  });
}

function compactRecord(record, entity) {
  const result = {};
  const fieldMap = {
    Deals: ["id", "Deal_Name", "Stage", "Amount", "Probability", "Closing_Date", "Next_Step"],
    Accounts: ["id", "Account_Name", "Industry", "Annual_Revenue", "Employees"],
    Leads: ["id", "Company", "Lead_Status", "Lead_Source"],
    Tasks: ["id", "Status", "Priority", "Due_Date"]
  };
  (fieldMap[entity] || ["id"]).forEach((key) => {
    const value = record ? record[key] : null;
    if (value === null || value === undefined) {
      return;
    }
    if (typeof value === "object") {
      try {
        result[key] = value.name || value.id || JSON.stringify(value).slice(0, 140);
      } catch (error) {
        result[key] = "[object]";
      }
      return;
    }
    result[key] = String(value).slice(0, 140);
  });
  if (entity === "Leads") {
    result.hasEmail = safeValue(record && record.Email, "") !== "";
    result.hasPhone = safeValue(record && record.Phone, "") !== "";
  }
  return result;
}

function setInsightStatus(label) {
  el.aiInsightStatus.textContent = label;
}

function renderInsightList(container, items, mapItem) {
  container.replaceChildren();
  items.slice(0, 3).forEach((item, index) => {
    const mapped = mapItem(item, index);
    const li = document.createElement("li");
    li.className = "ai-item";

    const title = document.createElement("p");
    title.className = "ai-item-title";
    title.textContent = mapped.title;

    const body = document.createElement("p");
    body.className = "ai-item-body";
    body.textContent = mapped.body;

    li.append(title, body);
    container.append(li);
  });
}

function renderInsight(insight) {
  el.aiInsightSummary.textContent = safeValue(insight.summary, "No insight returned.");
  renderInsightList(el.aiRiskList, Array.isArray(insight.risks) ? insight.risks : [], (risk) => ({
    title: `${safeValue(risk.severity, "risk").toUpperCase()} / ${safeValue(risk.label || risk.recordId, "Record")}`,
    body: safeValue(risk.reason, "-")
  }));
  renderInsightList(el.aiQuestionList, Array.isArray(insight.questions) ? insight.questions : [], (question, index) => ({
    title: `Question ${index + 1}`,
    body: safeValue(question, "-")
  }));
  if (insight.error) {
    renderInsightList(el.aiQuestionList, [insight.error], () => ({
      title: "API Error",
      body: safeValue(insight.error, "-")
    }));
  }
}

async function loadAiInsight() {
  const requestId = state.aiRequestId + 1;
  state.aiRequestId = requestId;
  const entity = state.activeDemo.entity;
  const records = state.records[entity] || [];
  setInsightStatus("Loading");
  el.aiInsightSummary.textContent = "Loading insight...";
  el.aiRiskList.replaceChildren();
  el.aiQuestionList.replaceChildren();

  try {
    const response = await fetch("/api/insight", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        entity,
        context: state.context,
        demo: state.activeDemo.id,
        records: records.slice(0, 50).map((record) => compactRecord(record, entity))
      })
    });
    if (!response.ok) {
      throw new Error(`AI Insight API returned ${response.status}`);
    }
    const insight = await response.json();
    if (requestId !== state.aiRequestId) {
      return;
    }
    renderInsight(insight);
    setInsightStatus(safeValue(insight.provider, "Ready"));
  } catch (error) {
    if (requestId !== state.aiRequestId) {
      return;
    }
    el.aiInsightSummary.textContent = "AI Insight API に接続できませんでした。Cloudflare Worker の /api/insight を確認してください。";
    el.aiRiskList.replaceChildren();
    el.aiQuestionList.replaceChildren();
    setInsightStatus("Error");
  }
}

function buildTabs() {
  el.tabs.replaceChildren();
  DEMOS.forEach((demo) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tab-button";
    button.textContent = demo.label;
    button.setAttribute("aria-selected", demo.id === state.activeDemo.id ? "true" : "false");
    button.addEventListener("click", () => activateDemo(demo.id));
    el.tabs.append(button);
  });
}

function setSceneHeader(status) {
  el.sceneTitle.textContent = state.activeDemo.title;
  el.sceneStatus.textContent = status;
}

function sum(values) {
  return values.reduce((total, value) => total + Number(value || 0), 0);
}

function getStageColor(stage, index) {
  if (/won/i.test(stage)) {
    return palette.green;
  }
  if (/negotiation/i.test(stage)) {
    return palette.orange;
  }
  if (/proposal/i.test(stage)) {
    return palette.blue;
  }
  return [palette.teal, palette.yellow, palette.red, palette.ink][index % 4];
}

function buildDealOrbit() {
  const deals = state.records.Deals;
  addGround(8.6);
  addRing(3.3, palette.teal);
  addRing(5.4, palette.orange, 0.28);

  const stages = [...new Set(deals.map((deal) => safeValue(deal.Stage, "Unknown")))];
  const totals = stages.map((stage) => sum(deals.filter((deal) => safeValue(deal.Stage, "Unknown") === stage).map((deal) => deal.Amount)));
  const maxTotal = Math.max(...totals, 1);

  stages.forEach((stage, index) => {
    const angle = (index / Math.max(stages.length, 1)) * Math.PI * 2;
    const height = 0.65 + (totals[index] / maxTotal) * 2.9;
    const geometry = new THREE.BoxGeometry(0.5, height, 0.5);
    const material = createMaterial(getStageColor(stage, index), 0.9);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(Math.cos(angle) * 3.3, height / 2, Math.sin(angle) * 3.3);
    mesh.userData.baseY = mesh.position.y;
    state.root.add(mesh);
    state.tickers.push((time) => {
      mesh.position.y = mesh.userData.baseY + Math.sin(time * 0.0017 + index) * 0.04;
    });
  });

  deals.forEach((deal, index) => {
    const amount = Number(deal.Amount || 0);
    const radius = 4.5 + (index % 3) * 0.38;
    const angle = (index / Math.max(deals.length, 1)) * Math.PI * 2;
    const size = 0.14 + Math.min(amount / 10000000, 1) * 0.26;
    const geometry = new THREE.IcosahedronGeometry(size, 1);
    const material = createMaterial(getStageColor(safeValue(deal.Stage), index));
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(Math.cos(angle) * radius, 1.1 + (index % 4) * 0.32, Math.sin(angle) * radius);
    state.root.add(mesh);
  });

  metricPairs([
    ["Deals", deals.length],
    ["Pipeline", formatMoney(sum(deals.map((deal) => deal.Amount)))],
    ["Stages", stages.length],
    ["Objects", state.root.children.length]
  ]);
  renderRecords(deals, (deal, index) => ({
    title: safeValue(deal.Deal_Name),
    meta: safeValue(deal.Stage),
    value: formatMoney(deal.Amount),
    color: `#${getStageColor(safeValue(deal.Stage), index).toString(16).padStart(6, "0")}`
  }));
  setSceneHeader(`${deals.length} records / ${stages.length} stages`);
}

function buildAccountTowers() {
  const accounts = state.records.Accounts;
  addGround(7.4);

  const maxRevenue = Math.max(...accounts.map((account) => Number(account.Annual_Revenue || 0)), 1);
  accounts.forEach((account, index) => {
    const x = (index % 3 - 1) * 2.2;
    const z = (Math.floor(index / 3) - 0.5) * 2.2;
    const height = 0.7 + (Number(account.Annual_Revenue || 0) / maxRevenue) * 3.4;
    const width = 0.58 + Math.min(Number(account.Employees || 0) / 140, 1) * 0.8;
    const color = [palette.teal, palette.blue, palette.orange, palette.yellow, palette.green][index % 5];
    const tower = new THREE.Mesh(new THREE.BoxGeometry(width, height, width), createMaterial(color, 0.88));
    tower.position.set(x, height / 2, z);
    state.root.add(tower);

    const cap = new THREE.Mesh(new THREE.CylinderGeometry(width * 0.62, width * 0.62, 0.08, 6), createMaterial(palette.ink, 0.72));
    cap.position.set(x, height + 0.08, z);
    state.root.add(cap);
  });

  metricPairs([
    ["Accounts", accounts.length],
    ["Revenue", formatMoney(sum(accounts.map((account) => account.Annual_Revenue)))],
    ["Employees", sum(accounts.map((account) => account.Employees))],
    ["Objects", state.root.children.length]
  ]);
  renderRecords(accounts, (account, index) => ({
    title: safeValue(account.Account_Name),
    meta: safeValue(account.Industry),
    value: `${Number(account.Employees || 0)}名`,
    color: ["#0f766e", "#2563eb", "#f97316", "#eab308", "#16a34a"][index % 5]
  }));
  setSceneHeader(`${accounts.length} accounts / low-poly towers`);
}

function buildActivityPulse() {
  const tasks = state.records.Tasks;
  addGround(6.4);
  const statusColor = { Completed: palette.green, "In Progress": palette.blue, Deferred: palette.orange, "Not Started": palette.red };

  [1.4, 2.6, 3.8, 5.0].forEach((radius, index) => {
    const ring = addRing(radius, [palette.green, palette.blue, palette.orange, palette.red][index], 0.24);
    state.tickers.push((time) => {
      ring.scale.setScalar(1 + Math.sin(time * 0.001 + index) * 0.012);
    });
  });

  tasks.forEach((task, index) => {
    const angle = (index / Math.max(tasks.length, 1)) * Math.PI * 2;
    const radius = 1.8 + (index % 4) * 0.76;
    const color = statusColor[safeValue(task.Status)] || palette.teal;
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.18 + (safeValue(task.Priority) === "Highest" ? 0.1 : 0), 16, 12), createMaterial(color));
    sphere.position.set(Math.cos(angle) * radius, 0.45 + (index % 3) * 0.22, Math.sin(angle) * radius);
    state.root.add(sphere);
    state.tickers.push((time) => {
      sphere.position.y = 0.45 + (index % 3) * 0.22 + Math.sin(time * 0.003 + index) * 0.12;
    });
  });

  const openTasks = tasks.filter((task) => safeValue(task.Status) !== "Completed").length;
  metricPairs([
    ["Tasks", tasks.length],
    ["Open", openTasks],
    ["Completed", tasks.length - openTasks],
    ["Objects", state.root.children.length]
  ]);
  renderRecords(tasks, (task) => ({
    title: safeValue(task.Subject),
    meta: `${safeValue(task.Status)} / ${safeValue(task.Due_Date)}`,
    value: safeValue(task.Priority),
    color: `#${(statusColor[safeValue(task.Status)] || palette.teal).toString(16).padStart(6, "0")}`
  }));
  setSceneHeader(`${openTasks} open activities`);
}

function buildLeadFocus() {
  const leads = state.records.Leads;
  addGround(6.1);
  const center = new THREE.Mesh(new THREE.IcosahedronGeometry(0.86, 2), createMaterial(palette.teal, 0.92));
  center.position.y = 1.25;
  state.root.add(center);
  state.tickers.push((time) => {
    center.rotation.y = time * 0.0008;
    center.rotation.x = Math.sin(time * 0.0007) * 0.12;
  });

  leads.forEach((lead, index) => {
    const completeness = ["Full_Name", "Company", "Email", "Phone"].filter((key) => safeValue(lead[key], "") !== "").length / 4;
    const angle = (index / Math.max(leads.length, 1)) * Math.PI * 2;
    const radius = 3.2 + completeness * 1.4;
    const point = new THREE.Vector3(Math.cos(angle) * radius, 0.55 + completeness * 2.2, Math.sin(angle) * radius);
    const node = new THREE.Mesh(new THREE.OctahedronGeometry(0.18 + completeness * 0.16, 1), createMaterial(completeness > 0.74 ? palette.green : palette.orange));
    node.position.copy(point);
    state.root.add(node);

    const lineGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 1.25, 0), point]);
    const lineMaterial = new THREE.LineBasicMaterial({ color: completeness > 0.74 ? palette.green : palette.orange, transparent: true, opacity: 0.42 });
    state.root.add(new THREE.Line(lineGeometry, lineMaterial));
  });

  const completeCount = leads.filter((lead) => safeValue(lead.Email, "") && safeValue(lead.Phone, "")).length;
  metricPairs([
    ["Leads", leads.length],
    ["Complete", completeCount],
    ["Need Touch", leads.length - completeCount],
    ["Objects", state.root.children.length]
  ]);
  renderRecords(leads, (lead) => ({
    title: safeValue(lead.Full_Name),
    meta: `${safeValue(lead.Company)} / ${safeValue(lead.Lead_Status)}`,
    value: safeValue(lead.Email, "No email"),
    color: safeValue(lead.Email, "") && safeValue(lead.Phone, "") ? "#16a34a" : "#f97316"
  }));
  setSceneHeader(`${completeCount} contact-ready leads`);
}

function buildForecastGrid() {
  const deals = state.records.Deals;
  addGround(8.1);
  const probabilityBuckets = [
    { label: "0-39", min: 0, max: 39, color: palette.red },
    { label: "40-59", min: 40, max: 59, color: palette.orange },
    { label: "60-79", min: 60, max: 79, color: palette.blue },
    { label: "80-100", min: 80, max: 100, color: palette.green }
  ];

  probabilityBuckets.forEach((bucket, bucketIndex) => {
    const bucketDeals = deals.filter((deal) => Number(deal.Probability || 0) >= bucket.min && Number(deal.Probability || 0) <= bucket.max);
    const total = sum(bucketDeals.map((deal) => deal.Amount));
    const height = 0.35 + Math.min(total / 12000000, 1) * 3.2;
    const x = (bucketIndex - 1.5) * 1.9;
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.1, height, 1.1), createMaterial(bucket.color, 0.9));
    bar.position.set(x, height / 2, 0);
    state.root.add(bar);

    bucketDeals.forEach((deal, index) => {
      const size = 0.14 + Math.min(Number(deal.Amount || 0) / 9000000, 1) * 0.18;
      const marker = new THREE.Mesh(new THREE.TetrahedronGeometry(size, 0), createMaterial(bucket.color));
      marker.position.set(x + (index - 1) * 0.28, height + 0.38 + index * 0.18, 0.88);
      state.root.add(marker);
    });
  });

  const weighted = sum(deals.map((deal) => Number(deal.Amount || 0) * Number(deal.Probability || 0) / 100));
  metricPairs([
    ["Deals", deals.length],
    ["Weighted", formatMoney(weighted)],
    ["Best Prob.", `${Math.max(...deals.map((deal) => Number(deal.Probability || 0)), 0)}%`],
    ["Objects", state.root.children.length]
  ]);
  renderRecords(deals, (deal) => ({
    title: safeValue(deal.Deal_Name),
    meta: `${safeValue(deal.Stage)} / ${Number(deal.Probability || 0)}%`,
    value: formatMoney(Number(deal.Amount || 0) * Number(deal.Probability || 0) / 100),
    color: Number(deal.Probability || 0) >= 70 ? "#16a34a" : "#f97316"
  }));
  setSceneHeader(`${formatMoney(weighted)} weighted forecast`);
}

const builders = {
  "deal-orbit": buildDealOrbit,
  "account-towers": buildAccountTowers,
  "activity-pulse": buildActivityPulse,
  "lead-focus": buildLeadFocus,
  "forecast-grid": buildForecastGrid
};

function activateDemo(demoId) {
  const nextDemo = DEMOS.find((demo) => demo.id === demoId) || DEMOS[0];
  state.activeDemo = nextDemo;
  clearScene();
  buildTabs();
  renderContext();
  requestZohoResize(nextDemo.resizeHeight);
  builders[nextDemo.id]();
  loadAiInsight();
}

function bindPointerRotation() {
  el.stage.addEventListener("pointerdown", (event) => {
    state.pointer.down = true;
    state.pointer.x = event.clientX;
    state.pointer.y = event.clientY;
    el.stage.setPointerCapture(event.pointerId);
  });
  el.stage.addEventListener("pointermove", (event) => {
    if (!state.pointer.down || !state.root) {
      return;
    }
    const dx = event.clientX - state.pointer.x;
    const dy = event.clientY - state.pointer.y;
    state.root.rotation.y += dx * 0.006;
    state.root.rotation.x = Math.max(-0.45, Math.min(0.45, state.root.rotation.x + dy * 0.004));
    state.pointer.x = event.clientX;
    state.pointer.y = event.clientY;
  });
  el.stage.addEventListener("pointerup", (event) => {
    state.pointer.down = false;
    el.stage.releasePointerCapture(event.pointerId);
  });
  el.stage.addEventListener("pointerleave", () => {
    state.pointer.down = false;
  });
}

function renderLoop(time) {
  resizeRenderer();
  if (state.root && !state.pointer.down) {
    state.root.rotation.y += 0.0012;
  }
  state.tickers.forEach((ticker) => ticker(time));
  state.renderer.render(state.scene, state.camera);
  window.requestAnimationFrame(renderLoop);
}

async function refreshData() {
  el.refresh.disabled = true;
  await loadCrmData();
  activateDemo(state.activeDemo.id);
  el.refresh.disabled = false;
}

async function boot() {
  makeRenderer();
  bindPointerRotation();
  buildTabs();
  state.context = await waitForPageLoad();
  await Promise.all([applyZohoTheme(), loadCrmData(), loadCurrentUser().then((user) => { state.user = user; })]);
  activateDemo(state.activeDemo.id);
  el.refresh.addEventListener("click", refreshData);
  window.addEventListener("resize", resizeRenderer);
  window.requestAnimationFrame(renderLoop);
}

boot();
