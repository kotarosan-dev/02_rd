import { prop } from "@slyte/core";
import { Component } from "@slyte/component";

class Sample02 extends Component {

   constructor() {
        super()
        // document.querySelector('lyte-chart').component.draw()
    }

    data() {
        return {
            
        }
    }

    static methods() {
        return {
            sampleMethod() {
            },

            chartRerenderMethod() {
                const charts = document.querySelectorAll('lyte-chart');
                charts.forEach(function (item) {
                    item.setData("ltPropRedraw", true);
                });
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

        }
    }

    static observers() {
        return {

        }
    }
}

export { Sample02 }