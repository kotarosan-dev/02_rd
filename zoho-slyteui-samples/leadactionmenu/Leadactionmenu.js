import { prop } from "@slyte/core";
import { Component } from "@slyte/component";

class Leadactionmenu extends Component {

    constructor() {
        super()
    }

    data() {
        return {
            currentStatus: prop("string", { default: "" })
        }
    }

    static methods() {
        return {
            sampleMethod() {
            }
        }
    }

    static helpers() {
        return {
            sampleHelper() {
            },
            canMarkContacted(s) { return ["Not Contacted","Attempted to Contact","Contact in Future","-None-",""].includes(s); },
            canPreQualify(s)    { return s === "Contacted"; },
            canConvert(s)       { return s === "Pre-Qualified"; },
            canMarkLost(s)      { return ["Contacted","Pre-Qualified"].includes(s); },
            canReopen(s)        { return ["Not Qualified","Lost Lead","Junk Lead"].includes(s); }
        }
    }

    static actions() {
        return {
            loadStatus() {
                try {
                    const v = ZDK.Page.getField("Lead_Status").getValue();
                    console.log("[loadStatus] Lead_Status =", v);
                    console.log("[loadStatus] $Page.record_id =", typeof $Page !== "undefined" ? $Page.record_id : "($Page undefined)");
                    this.setData("currentStatus", v || "");
                } catch (e) {
                    ZDK.Client.showAlert("ステータス取得エラー: " + e.message, "失敗", "OK");
                }
            },

            async markContacted() {
                const self = this;
                try {
                    const recordId = $Page.record_id;
                    console.log("[markContacted] recordId =", recordId);
                    const res = await zrc.put(`/crm/v8/Leads/${recordId}`, {
                        data: [{ Lead_Status: "Contacted" }]
                    });
                    console.log("[markContacted] response =", res);
                    self.setData("currentStatus", "Contacted");
                    ZDK.Client.showAlert("ステータスを「Contacted」に更新しました", "完了", "OK");
                } catch (e) {
                    console.error(e);
                    ZDK.Client.showAlert("更新エラー: " + (e.message || JSON.stringify(e)), "失敗", "OK");
                }
            },

            async markPreQualified() {
                const self = this;
                try {
                    const recordId = $Page.record_id;
                    await zrc.put(`/crm/v8/Leads/${recordId}`, {
                        data: [{ Lead_Status: "Pre-Qualified" }]
                    });
                    self.setData("currentStatus", "Pre-Qualified");
                    ZDK.Client.showAlert("ステータスを「Pre-Qualified」に更新しました", "完了", "OK");
                } catch (e) {
                    console.error(e);
                    ZDK.Client.showAlert("更新エラー: " + (e.message || JSON.stringify(e)), "失敗", "OK");
                }
            },

            async markLost() {
                const self = this;
                try {
                    const recordId = $Page.record_id;
                    await zrc.put(`/crm/v8/Leads/${recordId}`, {
                        data: [{ Lead_Status: "Lost Lead" }]
                    });
                    self.setData("currentStatus", "Lost Lead");
                    ZDK.Client.showAlert("ステータスを「Lost Lead」に更新しました", "完了", "OK");
                } catch (e) {
                    console.error(e);
                    ZDK.Client.showAlert("更新エラー: " + (e.message || JSON.stringify(e)), "失敗", "OK");
                }
            },

            async reopenLead() {
                const self = this;
                try {
                    const recordId = $Page.record_id;
                    await zrc.put(`/crm/v8/Leads/${recordId}`, {
                        data: [{ Lead_Status: "Contacted" }]
                    });
                    self.setData("currentStatus", "Contacted");
                    ZDK.Client.showAlert("Lead を再オープンしました（Contacted）", "完了", "OK");
                } catch (e) {
                    console.error(e);
                    ZDK.Client.showAlert("更新エラー: " + (e.message || JSON.stringify(e)), "失敗", "OK");
                }
            },

            convertToDeal() {
                ZDK.Client.showAlert("Deal 変換は次フェーズで実装します", "情報", "OK");
            }
        }
    }

    static observers() {
        return {
            currentStatus() {
                console.log("[observer] currentStatus →", this.getData("currentStatus"));
            }
        }
    }
}

export { Leadactionmenu }
