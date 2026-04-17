import { defaultConfig, deepMerge, getSelector, resolveConfig } from "./config.js";
import {
  applyTransition,
  ensureContainer,
  ensureOverlay,
  ensureOverlayLayer,
  injectStyles,
  settleTransition,
  setContainerState
} from "./dom.js";
import { resolveAutoMode } from "./network.js";
import { builtinRenderers } from "./renderers/index.js";

let instanceId = 0;

function createDeferred() {
  let timeoutId = 0;

  return {
    schedule(task, delay) {
      if (typeof window === "undefined") {
        task();
        return;
      }

      timeoutId = window.setTimeout(task, delay);
    },
    cancel() {
      if (typeof window !== "undefined") {
        window.clearTimeout(timeoutId);
      }
    }
  };
}

function readSource(image, config) {
  const attr = image.getAttribute(`${config.targetAttribute}-${config.sourceAttributeSuffix}`);
  if (attr) {
    return attr;
  }

  return image.currentSrc || image.src;
}

function isIntersectionObserverSupported() {
  return typeof window !== "undefined" && "IntersectionObserver" in window;
}

export class Imgx {
  constructor(config = {}) {
    this.config = deepMerge(defaultConfig, config);
    this.config.selector = getSelector(this.config.targetAttribute);
    this.renderers = new Map(Object.entries(builtinRenderers));
    this.images = new WeakMap();
    this.plugins = new Set();
    this.started = false;
    this.autoInitAttached = false;
    this.instanceId = instanceId += 1;
    this.observer = null;
  }

  configure(nextConfig = {}) {
    this.config = deepMerge(this.config, nextConfig);
    this.config.selector = getSelector(this.config.targetAttribute);
    return this;
  }

  use(plugin) {
    if (!plugin) {
      return this;
    }

    if (typeof plugin === "function") {
      plugin(this);
      this.plugins.add(plugin);
      return this;
    }

    if (plugin.name && plugin.renderer) {
      this.registerRenderer(plugin.name, plugin.renderer);
    }

    if (typeof plugin.install === "function") {
      plugin.install(this);
    }

    this.plugins.add(plugin);
    return this;
  }

  registerRenderer(name, renderer) {
    if (!name || !renderer?.mount) {
      throw new Error("Renderer must have a name and a mount(context) method.");
    }

    this.renderers.set(name, renderer);
    return this;
  }

  init(root = document, overrides = {}) {
    if (typeof document === "undefined") {
      return [];
    }

    injectStyles(this.config.classes);
    const images = this.scan(root, overrides);
    this.started = true;
    return images;
  }

  rescan(root = document, overrides = {}) {
    return this.scan(root, overrides);
  }

  scan(root = document, overrides = {}) {
    const selector = overrides.targetAttribute
      ? `[${overrides.targetAttribute}]`
      : this.config.selector;
    const nodes = root.matches?.(selector) ? [root, ...root.querySelectorAll(selector)] : root.querySelectorAll(selector);

    return Array.from(nodes)
      .map((image) => this.prepareImage(image, overrides))
      .filter(Boolean);
  }

  enableAutoInit() {
    if (this.autoInitAttached || typeof document === "undefined") {
      return this;
    }

    this.autoInitAttached = true;

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.init(), { once: true });
    } else {
      this.init();
    }

    return this;
  }

  destroy(image) {
    const record = this.images.get(image);
    if (!record) {
      return;
    }

    record.cleanup?.();
    record.rendererInstance?.destroy?.();
    record.errorRendererInstance?.destroy?.();
    record.retryController?.cancel?.();
    this.observer?.unobserve(image);
    this.images.delete(image);
  }

  prepareImage(image, overrides = {}) {
    if (!(image instanceof HTMLImageElement) || this.images.has(image)) {
      return null;
    }

    const mergedConfig = resolveConfig(this.config, image, overrides);
    const source = readSource(image, mergedConfig);

    if (!source) {
      return null;
    }

    const autoMode = resolveAutoMode({
      image,
      config: mergedConfig
    });

    mergedConfig.placeholder.renderer = autoMode.renderer || mergedConfig.placeholder.renderer;
    mergedConfig.transition.type = autoMode.transition || mergedConfig.transition.type;

    const container = ensureContainer(image, mergedConfig.classes);
    const overlay = ensureOverlay(container, mergedConfig.classes);
    const placeholderLayer = ensureOverlayLayer(overlay, "placeholder");
    const errorLayer = ensureOverlayLayer(overlay, "error");
    errorLayer.style.opacity = "0";
    const renderer =
      this.renderers.get(mergedConfig.placeholder.renderer) || this.renderers.get("skeleton");
    const errorRenderer =
      this.renderers.get(mergedConfig.placeholder.errorRenderer) || this.renderers.get("fallback");
    const rendererInstance = renderer.mount({
      id: `${this.instanceId}-${Math.random().toString(36).slice(2)}`,
      image,
      overlay: placeholderLayer,
      rootOverlay: overlay,
      container,
      config: mergedConfig,
      state: "idle"
    });
    const errorRendererInstance = errorRenderer.mount({
      id: `${this.instanceId}-${Math.random().toString(36).slice(2)}`,
      image,
      overlay: errorLayer,
      rootOverlay: overlay,
      container,
      config: mergedConfig,
      state: "idle"
    });

    const retryController = createDeferred();
    const record = {
      state: "idle",
      config: mergedConfig,
      source,
      sourceCandidates: [source, ...(mergedConfig.errorFallbackSources || [])],
      sourceIndex: 0,
      attempts: 0,
      container,
      overlay,
      rendererInstance,
      errorRendererInstance,
      retryController,
      cleanup: null
    };

    this.images.set(image, record);
    image.loading = "eager";
    image.decoding = image.decoding || "async";
    image.style.opacity = "0";
    applyTransition(image, mergedConfig.transition);
    setContainerState(container, mergedConfig.classes, "idle");

    const cleanup = this.bindImage(image, record);
    record.cleanup = cleanup;

    const shouldLazyLoad =
      mergedConfig.priority !== mergedConfig.priorityAttributeValue &&
      autoMode.lazy &&
      mergedConfig.lazy?.enabled !== false;

    if (shouldLazyLoad) {
      this.observe(image);
    } else {
      this.load(image);
    }

    return image;
  }

  bindImage(image, record) {
    const handleLoad = () => this.handleLoad(image);
    const handleError = () => this.handleError(image);

    image.addEventListener("load", handleLoad);
    image.addEventListener("error", handleError);

    return () => {
      image.removeEventListener("load", handleLoad);
      image.removeEventListener("error", handleError);
    };
  }

  observe(image) {
    if (!isIntersectionObserverSupported()) {
      this.load(image);
      return;
    }

    if (!this.observer) {
      const { root, rootMargin, threshold } = this.config.lazy;
      this.observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              this.observer.unobserve(entry.target);
              this.load(entry.target);
            }
          }
        },
        { root, rootMargin, threshold }
      );
    }

    this.observer.observe(image);
  }

  updateState(image, nextState, payload = {}) {
    const record = this.images.get(image);
    if (!record || record.state === nextState) {
      return;
    }

    record.state = nextState;
    setContainerState(record.container, record.config.classes, nextState);
    const placeholderLayer = record.overlay.querySelector(':scope > [data-imgx-layer="placeholder"]');
    const errorLayer = record.overlay.querySelector(':scope > [data-imgx-layer="error"]');
    if (placeholderLayer) {
      placeholderLayer.style.opacity = nextState === "error" ? "0" : "1";
    }
    if (errorLayer) {
      errorLayer.style.opacity = nextState === "error" ? "1" : "0";
    }
    record.rendererInstance?.update?.(nextState, {
      ...payload,
      image
    });
    record.errorRendererInstance?.update?.(nextState, {
      ...payload,
      image
    });
  }

  load(image, force = false) {
    const record = this.images.get(image);
    if (!record || record.state === "loaded" || (!force && record.state === "loading")) {
      return;
    }

    this.updateState(image, "loading");

    const nextSource = record.sourceCandidates[record.sourceIndex];
    if (!nextSource) {
      this.handleError(image);
      return;
    }

    if (image.src !== nextSource) {
      image.src = nextSource;
    } else if (image.complete && image.naturalWidth > 0) {
      this.handleLoad(image);
    }
  }

  handleLoad(image) {
    const record = this.images.get(image);
    if (!record) {
      return;
    }

    this.updateState(image, "loaded");
    settleTransition(image, record.config.transition);

    const container = record.container;
    if (!container.style.height && image.naturalWidth > 0 && image.naturalHeight > 0) {
      const ratio = image.naturalHeight / image.naturalWidth;
      container.style.aspectRatio = `${image.naturalWidth} / ${image.naturalHeight}`;
      if (container.offsetWidth > 0) {
        container.style.height = `${container.offsetWidth * ratio}px`;
      }
    }
  }

  handleError(image) {
    const record = this.images.get(image);
    if (!record) {
      return;
    }

    const retries = record.config.retries || {};
    const nextCandidate = record.sourceCandidates[record.sourceIndex + 1];

    if (nextCandidate) {
      record.sourceIndex += 1;
      this.load(image, true);
      return;
    }

    if (record.attempts < (retries.attempts ?? 0)) {
      record.attempts += 1;
      const delay = Math.round((retries.delay ?? 0) * Math.pow(retries.backoff ?? 1, record.attempts - 1));
      record.retryController.schedule(() => {
        record.sourceIndex = 0;
        this.load(image, true);
      }, delay);
      return;
    }

    this.updateState(image, "error", {
      message: record.config.placeholder.rendererOptions.fallback.message
    });
  }
}
