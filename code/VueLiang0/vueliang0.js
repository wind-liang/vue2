import Vue from './src/core/index'

new Vue({
    data(){
        return {
            test: 1
        }
    },
    methods: {
        hello(){
            return 'hello'
        },
        click() {
            console.log('ylog:14-da9b7d-click')
            this.test = 3;
        }
    },
    render(){
        document.write(`<div id="test">${this.test} ${this.hello()}</div>`);
        document.getElementById('test').addEventListener("click",this.click)
    }
})