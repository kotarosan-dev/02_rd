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

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

export async function onRequestPost(context) {
  let body = {};
  try {
    body = await context.request.json();
  } catch (error) {
    body = {};
  }

  return jsonResponse({
    ...mockInsight,
    input: {
      entity: body.entity || "Deals",
      recordCount: Array.isArray(body.records) ? body.records.length : 0
    }
  });
}

export async function onRequestGet() {
  return jsonResponse(mockInsight);
}

