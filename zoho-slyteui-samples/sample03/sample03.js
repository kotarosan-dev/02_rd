import { prop } from "@slyte/core";
import { Component } from "@slyte/component";

class Sample03 extends Component {

    constructor() {
        super()
    }

    data() {
        return {
            
        }
    }

    static methods() {
        return {
            sampleMethod() {
            },

            showOnListViewRowClickLyteModal1() {
                console.log("row clicked")
                console.log(arguments)
                document.querySelector("lyte-modal[node-id='lyteModal1']").ltProp('show',true)
            }
        };
    }

    static helpers() {
        return {
            sampleHelper() {
            }
        }
    }

    static actions() {
        return {
            openModal: function () {
                console.log("open modal")
                document.querySelector("lyte-modal[node-id='lyteModal1']").ltProp('show',true)
            }
        };
    }

    static observers() {
        return {

        }
    }
}

export { Sample03 }