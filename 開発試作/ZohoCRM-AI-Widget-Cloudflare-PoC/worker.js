const mockInsight = {
  summary: "Negotiation の大型案件が目立ちます。今週は金額の大きい案件から次アクションと決裁者情報を確認してください。",
  risks: [
    {
      recordId: "D-1002",
      label: "新規導入 B",
      severity: "high",
      reason: "金額が大きく確度も高い一方で、次回接点や決裁者確認が不足している可能性があります。"
    },
    {
      recordId: "D-1003",
      label: "追加開発 C",
      severity: "medium",
      reason: "Qualification のまま停滞すると、見込み金額が forecast に残り続けるリスクがあります。"
    }
  ],
  questions: [
    "今週中に確認すべき決裁者は誰ですか。",
    "次回接点日が未設定の商談はありますか。",
    "確度70%以上の案件で、金額・時期・競合の情報は揃っていますか。"
  ],
  generatedAt: new Date().toISOString(),
  provider: "mock"
};

const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";
const MANAGED_AGENTS_BETA = "managed-agents-2026-04-01";

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function safeRecords(records) {
  if (!Array.isArray(records)) {
    return [];
  }
  return records.slice(0, 50).map((record) => {
    const result = {};
    Object.entries(record || {}).slice(0, 12).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        return;
      }
      result[key] = String(value).slice(0, 180);
    });
    return result;
  });
}

function buildMockInsight(entity, recordCount) {
  return {
    ...mockInsight,
    summary: `${entity} ${recordCount}件を受け取りました。Cloudflare Worker 経由で Zoho CRM の表示データを AI Insight API に渡せています。`,
    generatedAt: new Date().toISOString(),
    input: {
      entity,
      recordCount
    }
  };
}

function extractText(message) {
  if (!message || !Array.isArray(message.content)) {
    return "";
  }
  return message.content
    .filter((part) => part && part.type === "text")
    .map((part) => part.text || "")
    .join("\n")
    .trim();
}

function parseInsight(text) {
  const trimmed = String(text || "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Claude response did not contain JSON.");
  }
  const parsed = JSON.parse(trimmed.slice(start, end + 1));
  return {
    summary: String(parsed.summary || "").slice(0, 360),
    risks: Array.isArray(parsed.risks) ? parsed.risks.slice(0, 3).map((risk) => ({
      recordId: String(risk.recordId || "").slice(0, 80),
      label: String(risk.label || "Record").slice(0, 80),
      severity: String(risk.severity || "medium").slice(0, 20),
      reason: String(risk.reason || "").slice(0, 220)
    })) : [],
    questions: Array.isArray(parsed.questions) ? parsed.questions.slice(0, 3).map((question) => String(question).slice(0, 160)) : []
  };
}

async function callAnthropic(env, entity, records) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: env.ANTHROPIC_MODEL || ANTHROPIC_MODEL,
      max_tokens: 700,
      system: [
        "You are an assistant embedded in a Zoho CRM analytics widget.",
        "Return only compact JSON with keys summary, risks, and questions.",
        "Write Japanese business prose. Do not mention that you are an AI model.",
        "Do not suggest CRM writeback, automated email sending, or destructive actions.",
        "risks must be an array of up to 3 objects: recordId, label, severity, reason.",
        "questions must be an array of up to 3 short strings."
      ].join(" "),
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            task: "Review the CRM records and generate practical meeting insight.",
            entity,
            records
          })
        }
      ]
    })
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Anthropic API returned ${response.status}: ${text.slice(0, 240)}`);
  }
  const message = await response.json();
  return parseInsight(extractText(message));
}

async function anthropicJson(env, path, options = {}) {
  if (!env.ANTHROPIC_API_KEY) {
    return {
      ok: false,
      status: 400,
      data: { error: "ANTHROPIC_API_KEY is not configured." }
    };
  }
  const response = await fetch(`https://api.anthropic.com${path}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": MANAGED_AGENTS_BETA
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch (error) {
    data = { raw: text.slice(0, 500) };
  }
  return {
    ok: response.ok,
    status: response.status,
    data
  };
}

function summarizeApiError(result) {
  if (!result || result.ok) {
    return "";
  }
  return JSON.stringify(result.data || {}).slice(0, 500);
}

async function managedAgentProbe(env) {
  const [agents, environments] = await Promise.all([
    anthropicJson(env, "/v1/agents?limit=1"),
    anthropicJson(env, "/v1/environments?limit=1")
  ]);
  const ready = agents.ok && environments.ok;
  return jsonResponse({
    status: ready ? "ready" : "error",
    message: ready ? "Managed Agents beta API is available." : "Managed Agents beta API probe failed.",
    agents: {
      status: agents.status,
      error: agents.ok ? null : agents.data
    },
    environments: {
      status: environments.status,
      error: environments.ok ? null : environments.data
    }
  }, ready ? 200 : 502);
}

async function createManagedAgent(env) {
  if (env.MANAGED_AGENT_ID) {
    return {
      ok: true,
      status: 200,
      data: { id: env.MANAGED_AGENT_ID }
    };
  }
  return anthropicJson(env, "/v1/agents", {
    method: "POST",
    body: {
      name: "Zoho CRM Read-only Review",
      model: { id: env.ANTHROPIC_AGENT_MODEL || "claude-haiku-4-5-20251001" },
      system: [
        "You are a read-only Zoho CRM review agent.",
        "Use the provided CRM snapshot only.",
        "Do not write back to CRM, send email, create records, delete records, or call external systems.",
        "Produce a concise Japanese review with risks, questions, and draft actions that require human approval."
      ].join(" "),
      tools: [
        { type: "agent_toolset_20260401" }
      ]
    }
  });
}

async function createManagedEnvironment(env) {
  if (env.MANAGED_ENVIRONMENT_ID) {
    return {
      ok: true,
      status: 200,
      data: { id: env.MANAGED_ENVIRONMENT_ID }
    };
  }
  return anthropicJson(env, "/v1/environments", {
    method: "POST",
    body: {
      name: "zoho-crm-readonly-review-env",
      config: {
        type: "cloud",
        networking: { type: "none" }
      }
    }
  });
}

async function createManagedSession(env, agentId, environmentId) {
  return anthropicJson(env, "/v1/sessions", {
    method: "POST",
    body: {
      agent: agentId,
      environment_id: environmentId,
      title: "Zoho CRM read-only review"
    }
  });
}

async function sendManagedReviewEvent(env, sessionId, body) {
  return anthropicJson(env, `/v1/sessions/${sessionId}/events`, {
    method: "POST",
    body: {
      events: [
        {
          type: "user.message",
          content: [
            {
              type: "text",
              text: JSON.stringify({
                task: "Review this Zoho CRM snapshot. Return a short Japanese plan, draft actions, and questions. Do not perform writeback.",
                entity: body.entity,
                demo: body.demo,
                context: body.context,
                records: safeRecords(body.records)
              })
            }
          ]
        }
      ]
    }
  });
}

async function managedAgentReview(request, env) {
  let body = {};
  try {
    body = await request.json();
  } catch (error) {
    body = {};
  }

  const agent = await createManagedAgent(env);
  if (!agent.ok || !agent.data || !agent.data.id) {
    return jsonResponse({
      status: "error",
      message: `Agent creation failed: ${agent.status} ${summarizeApiError(agent)}`
    }, 502);
  }

  const environment = await createManagedEnvironment(env);
  if (!environment.ok || !environment.data || !environment.data.id) {
    return jsonResponse({
      status: "error",
      message: `Environment creation failed: ${environment.status} ${summarizeApiError(environment)}`
    }, 502);
  }

  const session = await createManagedSession(env, agent.data.id, environment.data.id);
  if (!session.ok || !session.data || !session.data.id) {
    return jsonResponse({
      status: "error",
      message: `Session creation failed: ${session.status} ${summarizeApiError(session)}`
    }, 502);
  }

  const event = await sendManagedReviewEvent(env, session.data.id, body);
  if (!event.ok) {
    return jsonResponse({
      status: "error",
      message: `Session event failed: ${event.status} ${summarizeApiError(event)}`,
      agentId: agent.data.id,
      environmentId: environment.data.id,
      sessionId: session.data.id
    }, 502);
  }

  return jsonResponse({
    status: "started",
    agentId: agent.data.id,
    environmentId: environment.data.id,
    sessionId: session.data.id,
    eventStatus: event.status
  });
}

async function insightResponse(request, env = {}) {
  let body = {};
  if (request.method === "POST") {
    try {
      body = await request.json();
    } catch (error) {
      body = {};
    }
  }
  const entity = body.entity || "Deals";
  const records = safeRecords(body.records);
  const recordCount = records.length;

  if (request.method === "GET" || (!request.cf && !request.headers.get("cf-ray"))) {
    return jsonResponse(buildMockInsight(entity, recordCount));
  }

  let insight = null;
  let provider = "mock";
  try {
    if (env.ANTHROPIC_API_KEY) {
      insight = await callAnthropic(env, entity, records);
      provider = env.ANTHROPIC_MODEL || ANTHROPIC_MODEL;
    }
  } catch (error) {
    insight = {
      ...buildMockInsight(entity, recordCount),
      summary: `${entity} ${recordCount}件を受け取りました。Anthropic API 呼び出しに失敗したため mock insight を表示しています。`,
      error: String(error && error.message ? error.message : error).slice(0, 240)
    };
    provider = "mock-fallback";
  }

  return jsonResponse({
    ...(insight || buildMockInsight(entity, recordCount)),
    generatedAt: new Date().toISOString(),
    provider,
    input: {
      entity,
      recordCount
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/insight") {
      if (request.method === "GET" || request.method === "POST") {
        return insightResponse(request, env);
      }
      return jsonResponse({ error: "Method Not Allowed" }, 405);
    }
    if (url.pathname === "/api/managed-agent/probe") {
      if (request.method === "POST") {
        return managedAgentProbe(env);
      }
      return jsonResponse({ error: "Method Not Allowed" }, 405);
    }
    if (url.pathname === "/api/managed-agent/review") {
      if (request.method === "POST") {
        return managedAgentReview(request, env);
      }
      return jsonResponse({ error: "Method Not Allowed" }, 405);
    }

    return env.ASSETS.fetch(request);
  }
};
