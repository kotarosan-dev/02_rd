import { prop } from "@slyte/core";
import { Component } from "@slyte/component";

class Sample04 extends Component {

	constructor() {
		super()
	}

	data() {
		return {
			contactName: prop("string", { default: "" }),
            email: prop("string", { default: "" }),
            phone: prop("number"),
            pickupAddress: prop("string", { default: "" }),
            dropAddress: prop("string", { default: "" }),
            pickupTime: prop("string", { default: "12:00 AM" }),
            pickupDate: prop("string", { default: "04/16/2025" }),
            vendor: prop("string", { default: "" }),
            paymentMode: prop("string", { default: "" }),
            estimatedFees: prop("string", { default: "" }),
            splInstruction: prop("string", { default: "" }),
            instructionRecord: prop("string", { default: "" }),
            vehicleType: prop("string", {default:""}),
            stepCheck: prop("number", { default: 0 }),
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
			}
		}
	}

	static actions() {
		return {
            nextMethod() {
                let step = document.querySelector(".bookRideStep");
                let stepIndex = step.getData("ltPropSelected");
                step.setData("ltPropSelected", stepIndex + 1);
                this.setData("stepCheck", stepIndex + 1);
                console.log(this.getData("stepCheck"))
            },
            previousMethod() {
                let step = document.querySelector(".bookRideStep");
                let stepIndex = step.getData("ltPropSelected");
                step.setData("ltPropSelected", stepIndex - 1);
                this.setData("stepCheck", stepIndex - 1);
            }
		}
	}

	static observers() {
		return {

		}
	}
}

export { Sample04 }