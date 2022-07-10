import { initMixin } from "./init";
import { stateMixin } from "./state";
import { lifecycleMixin } from "./lifecycle";
import { renderMixin } from "./render";

function Vue(options) {
    this._init(options);
}

initMixin(Vue);
stateMixin(Vue);
lifecycleMixin(Vue);
renderMixin(Vue);

export default Vue;
