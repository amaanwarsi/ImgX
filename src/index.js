import { Imgx } from "./lib/imgx.js";
import { builtinRenderers } from "./lib/renderers/index.js";

export { Imgx, builtinRenderers };
export {
  skeletonRenderer,
  svgAnimationRenderer,
  blurPreviewRenderer,
  dominantColorRenderer,
  fallbackRenderer
} from "./lib/renderers/index.js";

export function createImgx(config = {}) {
  return new Imgx(config);
}

export const imgx = createImgx();

if (typeof window !== "undefined" && typeof document !== "undefined") {
  imgx.enableAutoInit();
}

export default imgx;
