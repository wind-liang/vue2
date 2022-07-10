import * as nodeOps from "./node-ops";
import { createPatchFunction } from "@/core/vdom/patch";
import platformModules from "../modules/index";

export const patch = createPatchFunction({ nodeOps, modules: platformModules });
