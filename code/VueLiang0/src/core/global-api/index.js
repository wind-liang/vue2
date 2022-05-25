import { set, del } from '../observer/index'

import {
  nextTick,
} from '../util/index'

export function initGlobalAPI (Vue) {
  Vue.set = set
  Vue.delete = del
  Vue.nextTick = nextTick
}
