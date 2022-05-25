/* @flow */

import { initState } from './state'
import {mountComponent} from './lifecycle'
let uid = 0

export function initMixin (Vue) {
  Vue.prototype._init = function (options) {
    const vm = this
    // a uid
    vm._uid = uid++

    // a flag to avoid this being observed
    vm._isVue = true

    vm.$options = options


    // expose real self
    vm._self = vm
    initState(vm)

    vm.render = options.render;

    // if (vm.$options.el) {
      mountComponent(vm)
    // }
  }
}