/* @flow */

import Watcher from '../observer/watcher'

import {
  noop,
} from '../util/index'


export function mountComponent (
  vm,
) {

  let updateComponent
    updateComponent = () => {
      vm.render()
    }
  // we set this to vm._watcher inside the watcher's constructor
  // since the watcher's initial patch may call $forceUpdate (e.g. inside child
  // component's mounted hook), which relies on vm._watcher being already defined
  new Watcher(vm, updateComponent, noop/* isRenderWatcher */)
  return vm
}