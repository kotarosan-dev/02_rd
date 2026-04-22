import { prop } from "@slyte/core";
import { Component } from "@slyte/component";

class Sample01 extends Component {

	constructor() {
		super()
	}

	data() {
		return {
			count: prop("number", { default: 10 })
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
            sampleAction() {
            }
		}
	}

	static observers() {
		return {

		}
	}
}

export { Sample01 }