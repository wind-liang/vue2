import { initMixin } from "./init";
import { stateMixin } from "./state";

function Vue(options) {
    this._init(options);
}

initMixin(Vue);
stateMixin(Vue);

export default Vue;
