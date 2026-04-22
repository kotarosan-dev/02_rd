import { prop } from "@slyte/core";
import { Component } from "@slyte/component";

class Leaddelugerunner extends Component {

    constructor() {
        super()
    }

    data() {
        return {
            isLoading: prop("boolean", { default: false }),
            hasResult: prop("boolean", { default: false }),
            hasError: prop("boolean", { default: false }),

            statusText: prop("string", { default: "未実行" }),
            scoreText: prop("string", { default: "0" }),
            label: prop("string", { default: "" }),
            reason: prop("string", { default: "" }),
            recommendations: prop("string", { default: "" }),
            errorMessage: prop("string", { default: "" })
        }
    }

    static methods() {
        return {
            sampleMethod() { }
        }
    }

    static helpers() {
        return {
            sampleHelper() { }
        }
    }

    static actions() {
        return {
            async runScore() {
                const self = this;
                self.setData("isLoading", true);
                self.setData("hasResult", false);
                self.setData("hasError", false);
                self.setData("statusText", "実行中");

                try {
                    let recordId = "";
                    if (typeof $Page !== "undefined" && $Page && $Page.record_id) {
                        recordId = $Page.record_id;
                    }
                    if (!recordId) {
                        try {
                            if (typeof ZDK !== "undefined" && ZDK.Page && typeof ZDK.Page.getEntityId === "function") {
                                recordId = ZDK.Page.getEntityId() || "";
                            }
                        } catch (e) {
                            console.warn("[runScore] fallback getEntityId failed", e);
                        }
                    }
                    if (!recordId) {
                        throw new Error("record_id が取得できません。Lead 詳細ページの関連リスト上で実行してください。");
                    }
                    console.log("[runScore] recordId =", recordId);

                    const res = await zrc.post(
                        "/crm/v7/functions/calculate_lead_score/actions/execute?auth_type=oauth",
                        { record_id: recordId }
                    );
                    console.log("[runScore] response =", res);

                    const output = res.data && res.data.details && res.data.details.output;
                    if (!output) {
                        throw new Error("Deluge から output が返りませんでした: " + JSON.stringify(res.data));
                    }

                    let payload = output;
                    if (typeof payload === "string") {
                        try { payload = JSON.parse(payload); } catch (e) { /* keep as string */ }
                    }

                    if (payload && payload.error) {
                        throw new Error(payload.error);
                    }

                    const score = (payload && payload.score != null) ? payload.score : 0;
                    self.setData("scoreText", String(score));
                    self.setData("label", (payload && payload.label) ? payload.label : "(no label)");
                    self.setData("reason", (payload && payload.reason) ? payload.reason : "(no reason)");

                    let recsTxt = "";
                    if (payload && Array.isArray(payload.recommendations)) {
                        recsTxt = payload.recommendations.map((r, i) => `${i + 1}. ${r}`).join("\n");
                    } else if (payload && payload.recommendations) {
                        recsTxt = String(payload.recommendations);
                    }
                    self.setData("recommendations", recsTxt || "(なし)");
                    self.setData("hasResult", true);
                    self.setData("statusText", "完了");

                } catch (e) {
                    console.error(e);
                    const msg = (e && e.message) ? e.message : JSON.stringify(e);
                    self.setData("errorMessage", msg);
                    self.setData("hasError", true);
                    self.setData("statusText", "失敗");
                } finally {
                    self.setData("isLoading", false);
                }
            }
        }
    }

    static observers() {
        return {
            scoreText() {
                console.log("[observer] scoreText =", this.getData("scoreText"));
            }
        }
    }
}

export { Leaddelugerunner }
