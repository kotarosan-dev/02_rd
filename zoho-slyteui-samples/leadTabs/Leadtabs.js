import { prop } from "@slyte/core";
import { Component } from "@slyte/component";

class Leadtabs extends Component {

    constructor() {
        super()
    }

    data() {
        return {
            // タブ状態
            isBasic: prop("boolean", { default: true }),
            isNotes: prop("boolean", { default: false }),
            isTasks: prop("boolean", { default: false }),
            activeLabel: prop("string", { default: "基本情報" }),

            // 基本情報
            leadName: prop("string", { default: "(未取得)" }),
            leadCompany: prop("string", { default: "(未取得)" }),
            leadEmail: prop("string", { default: "(未取得)" }),
            leadPhone: prop("string", { default: "(未取得)" }),
            leadIndustry: prop("string", { default: "(未取得)" }),
            leadStatus: prop("string", { default: "(未取得)" }),

            // メモ
            notesCountText: prop("string", { default: "0" }),
            notesText: prop("string", { default: "(まだ取得していません)" }),

            // タスク
            tasksCountText: prop("string", { default: "0" }),
            tasksText: prop("string", { default: "(まだ取得していません)" })
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
            // ===== タブ切替 =====
            showBasic() {
                this.setData("isBasic", true);
                this.setData("isNotes", false);
                this.setData("isTasks", false);
                this.setData("activeLabel", "基本情報");
            },
            showNotes() {
                this.setData("isBasic", false);
                this.setData("isNotes", true);
                this.setData("isTasks", false);
                this.setData("activeLabel", "メモ");
            },
            showTasks() {
                this.setData("isBasic", false);
                this.setData("isNotes", false);
                this.setData("isTasks", true);
                this.setData("activeLabel", "タスク");
            },

            // ===== データ取得 =====
            async loadBasic() {
                const self = this;
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
                            console.warn("[loadBasic] fallback getEntityId failed", e);
                        }
                    }
                    if (!recordId) {
                        throw new Error("record_id が取得できません。Lead 詳細ページの関連リスト上で実行してください（プレビューでは関連データ設定で Lead を選択）。");
                    }
                    console.log("[loadBasic] recordId =", recordId);

                    const res = await zrc.get(`/crm/v8/Leads/${recordId}`);
                    const lead = res.data && res.data.data && res.data.data[0];
                    if (!lead) throw new Error("Lead が取得できませんでした");

                    self.setData("leadName",     `${lead.First_Name || ""} ${lead.Last_Name || "(no name)"}`.trim());
                    self.setData("leadCompany",  lead.Company || "(なし)");
                    self.setData("leadEmail",    lead.Email || "(なし)");
                    self.setData("leadPhone",    lead.Phone || lead.Mobile || "(なし)");
                    self.setData("leadIndustry", lead.Industry || "(なし)");
                    self.setData("leadStatus",   lead.Lead_Status || "(なし)");
                } catch (e) {
                    console.error(e);
                    const msg = (e && e.message) ? e.message : JSON.stringify(e);
                    ZDK.Client.showAlert("基本情報の取得に失敗: " + msg, "失敗", "OK");
                }
            },

            async loadNotes() {
                const self = this;
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
                            console.warn("[loadNotes] fallback getEntityId failed", e);
                        }
                    }
                    if (!recordId) {
                        throw new Error("record_id が取得できません。Lead 詳細ページ上で実行してください。");
                    }
                    console.log("[loadNotes] recordId =", recordId);

                    const res = await zrc.get(`/crm/v8/Leads/${recordId}/Notes`, {
                        params: { fields: "Note_Title,Note_Content,Created_Time,Modified_Time" }
                    });
                    const notes = (res.data && res.data.data) || [];
                    self.setData("notesCountText", String(notes.length));
                    if (notes.length === 0) {
                        self.setData("notesText", "(メモなし)");
                    } else {
                        const txt = notes.map((n) => {
                            const title = n.Note_Title || "(タイトルなし)";
                            const body = (n.Note_Content || "").replace(/\s+/g, " ").trim() || "(本文なし)";
                            const when = n.Created_Time ? n.Created_Time.substring(0, 16).replace("T", " ") : "";
                            return `■ ${title}` + (when ? `  (${when})` : "") + `\n   ${body}`;
                        }).join("\n\n");
                        self.setData("notesText", txt);
                    }
                } catch (e) {
                    console.error(e);
                    const msg = (e && e.message) ? e.message : JSON.stringify(e);
                    ZDK.Client.showAlert("メモ取得に失敗: " + msg, "失敗", "OK");
                }
            },

            async loadTasks() {
                const self = this;
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
                            console.warn("[loadTasks] fallback getEntityId failed", e);
                        }
                    }
                    if (!recordId) {
                        throw new Error("record_id が取得できません。Lead 詳細ページ上で実行してください。");
                    }
                    console.log("[loadTasks] recordId =", recordId);

                    const res = await zrc.get(`/crm/v8/Leads/${recordId}/Tasks`, {
                        params: { fields: "Subject,Due_Date,Status,Priority,Description" }
                    });
                    const tasks = (res.data && res.data.data) || [];
                    self.setData("tasksCountText", String(tasks.length));
                    if (tasks.length === 0) {
                        self.setData("tasksText", "(タスクなし)");
                    } else {
                        const txt = tasks.map((t) => {
                            const subj = t.Subject || "(件名なし)";
                            const due = t.Due_Date || "(期限なし)";
                            const st = t.Status || "(ステータス不明)";
                            const pri = t.Priority ? ` / 優先度:${t.Priority}` : "";
                            return `□ ${subj}\n   期限: ${due}  ステータス: ${st}${pri}`;
                        }).join("\n\n");
                        self.setData("tasksText", txt);
                    }
                } catch (e) {
                    console.error(e);
                    const msg = (e && e.message) ? e.message : JSON.stringify(e);
                    ZDK.Client.showAlert("タスク取得に失敗: " + msg, "失敗", "OK");
                }
            }
        }
    }

    static observers() {
        return {
            activeLabel() {
                console.log("[observer] activeLabel =", this.getData("activeLabel"));
            }
        }
    }
}

export { Leadtabs }
