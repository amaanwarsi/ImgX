/*! @amaanwarsi/imgx v0.1.0 | MIT License */
(function (global) {
"use strict";

// src/lib/config.js
const DEFAULT_ATTRIBUTE = "data-imgx";

const defaultConfig = {
  targetAttribute: DEFAULT_ATTRIBUTE,
  selector: `[${DEFAULT_ATTRIBUTE}]`,
  sourceAttributeSuffix: "src",
  lazy: {
    enabled: true,
    root: null,
    rootMargin: "200px 0px",
    threshold: 0.01
  },
  network: {
    enabled: true
  },
  autoMode: {
    enabled: true
  },
  retries: {
    attempts: 2,
    delay: 700,
    backoff: 1.8
  },
  transition: {
    type: "fade",
    duration: 420,
    easing: "ease"
  },
  placeholder: {
    renderer: "skeleton",
    errorRenderer: "fallback",
    rendererOptions: {
      skeleton: {
        mode: "shimmer",
        baseColor: "#e5e7eb",
        highlightColor: "#f8fafc",
        radius: "12px"
      },
      svgAnimation: {
        palette: ["#dbeafe", "#bfdbfe", "#eff6ff"],
        speed: 1.8
      },
      blurPreview: {
        scale: 1.1,
        opacity: 0.85
      },
      dominantColor: {
        fallbackColor: "#d1d5db",
        saturate: 1.05
      },
      fallback: {
        background: "#111827",
        color: "#ffffff",
        message: "Image unavailable"
      }
    }
  },
  priorityAttributeValue: "high",
  errorFallbackSources: [],
  classes: {
    container: "imgx",
    image: "imgx-image",
    overlay: "imgx-overlay",
    loaded: "is-loaded",
    loading: "is-loading",
    error: "is-error"
  }
};

const BOOLEAN_TRUE = new Set(["", "true", "1", "yes", "on"]);
const BOOLEAN_FALSE = new Set(["false", "0", "no", "off"]);

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function deepMerge(...parts) {
  const output = {};

  for (const part of parts) {
    if (!isObject(part)) {
      continue;
    }

    for (const [key, value] of Object.entries(part)) {
      if (value === undefined) {
        continue;
      }

      if (Array.isArray(value)) {
        output[key] = value.slice();
        continue;
      }

      if (isObject(value)) {
        output[key] = deepMerge(output[key], value);
        continue;
      }

      output[key] = value;
    }
  }

  return output;
}

function parseBoolean(value) {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (BOOLEAN_TRUE.has(normalized)) {
    return true;
  }
  if (BOOLEAN_FALSE.has(normalized)) {
    return false;
  }

  return undefined;
}

function parseNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseList(value) {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function getDataValue(element, name) {
  return element.getAttribute(name);
}

function getSelector(attribute = DEFAULT_ATTRIBUTE) {
  return `[${attribute}]`;
}

function readElementConfig(element, config) {
  const attribute = config.targetAttribute;
  const renderer = getDataValue(element, `${attribute}-renderer`);
  const transition = getDataValue(element, `${attribute}-transition`);
  const lazyValue = parseBoolean(getDataValue(element, `${attribute}-lazy`));
  const priority = getDataValue(element, `${attribute}-priority`);
  const preview = getDataValue(element, `${attribute}-preview`);
  const fallbackSources = parseList(getDataValue(element, `${attribute}-fallback`));
  const errorRenderer = getDataValue(element, `${attribute}-error-renderer`);
  const retryAttempts = parseNumber(getDataValue(element, `${attribute}-retry-attempts`));
  const retryDelay = parseNumber(getDataValue(element, `${attribute}-retry-delay`));
  const duration = parseNumber(getDataValue(element, `${attribute}-duration`));
  const skeletonMode = getDataValue(element, `${attribute}-skeleton`);
  const radius = getDataValue(element, `${attribute}-radius`);
  const dominantColor = getDataValue(element, `${attribute}-color`);
  const autoMode = parseBoolean(getDataValue(element, `${attribute}-auto`));

  return {
    lazy: lazyValue === undefined ? undefined : { enabled: lazyValue },
    autoMode: autoMode === undefined ? undefined : { enabled: autoMode },
    placeholder: {
      renderer,
      errorRenderer,
      rendererOptions: {
        skeleton: {
          mode: skeletonMode,
          radius
        },
        blurPreview: {
          src: preview
        },
        dominantColor: {
          color: dominantColor
        }
      }
    },
    transition: {
      type: transition,
      duration
    },
    retries: {
      attempts: retryAttempts,
      delay: retryDelay
    },
    priority,
    errorFallbackSources: fallbackSources
  };
}

function resolveConfig(baseConfig, element, overrides = {}) {
  const merged = deepMerge(baseConfig, readElementConfig(element, baseConfig), overrides);
  merged.selector = getSelector(merged.targetAttribute);
  return merged;
}

// src/lib/color.js
async function extractDominantColor(image, fallbackColor = "#d1d5db") {
  if (typeof document === "undefined") {
    return fallbackColor;
  }

  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });

    if (!context) {
      return fallbackColor;
    }

    const sampleSize = 24;
    canvas.width = sampleSize;
    canvas.height = sampleSize;
    context.drawImage(image, 0, 0, sampleSize, sampleSize);

    const { data } = context.getImageData(0, 0, sampleSize, sampleSize);
    let red = 0;
    let green = 0;
    let blue = 0;
    let count = 0;

    for (let index = 0; index < data.length; index += 4) {
      const alpha = data[index + 3];
      if (alpha < 64) {
        continue;
      }

      red += data[index];
      green += data[index + 1];
      blue += data[index + 2];
      count += 1;
    }

    if (count === 0) {
      return fallbackColor;
    }

    return `rgb(${Math.round(red / count)}, ${Math.round(green / count)}, ${Math.round(blue / count)})`;
  } catch {
    return fallbackColor;
  }
}

// src/lib/dom.js
let stylesInjected = false;

function injectStyles(classes) {
  if (stylesInjected || typeof document === "undefined") {
    return;
  }

  const style = document.createElement("style");
  style.type = "text/css";
  style.setAttribute("data-imgx-styles", "");
  style.textContent = `
    .${classes.container} {
      position: relative;
      display: inline-block;
      overflow: hidden;
      max-width: 100%;
      vertical-align: middle;
      background: transparent;
    }

    .${classes.image} {
      display: block;
      max-width: 100%;
      height: auto;
      transform-origin: center center;
      transition:
        opacity var(--imgx-duration, 420ms) var(--imgx-easing, ease),
        transform var(--imgx-duration, 420ms) var(--imgx-easing, ease),
        filter var(--imgx-duration, 420ms) var(--imgx-easing, ease);
    }

    .${classes.overlay} {
      position: absolute;
      inset: 0;
      pointer-events: none;
      overflow: hidden;
    }

    .${classes.overlay} > [data-imgx-layer] {
      position: absolute;
      inset: 0;
      transition: opacity var(--imgx-duration, 420ms) var(--imgx-easing, ease);
    }

    .${classes.container}.${classes.loading} .${classes.image} {
      opacity: 0;
    }

    .${classes.container}.${classes.loaded} .${classes.overlay} {
      opacity: 0;
      transition: opacity var(--imgx-duration, 420ms) var(--imgx-easing, ease);
    }

    .${classes.container}.${classes.error} .${classes.image} {
      opacity: 0;
    }

    @keyframes imgx-shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }

    @keyframes imgx-pulse {
      0%, 100% { opacity: 0.65; }
      50% { opacity: 1; }
    }
  `;

  document.head.appendChild(style);
  stylesInjected = true;
}

function ensureContainer(image, classes) {
  const parent = image.parentElement;

  if (parent && parent.classList.contains(classes.container)) {
    return parent;
  }

  const container = document.createElement("span");
  container.className = `${classes.container} ${classes.loading}`;

  const rect = image.getBoundingClientRect();
  const widthAttr = image.getAttribute("width");
  const heightAttr = image.getAttribute("height");

  if (widthAttr) {
    container.style.width = `${widthAttr}px`;
  } else if (rect.width > 0) {
    container.style.width = `${rect.width}px`;
  }

  if (heightAttr) {
    container.style.height = `${heightAttr}px`;
  } else if (rect.height > 0) {
    container.style.height = `${rect.height}px`;
  }

  parent?.insertBefore(container, image);
  container.appendChild(image);
  image.classList.add(classes.image);

  return container;
}

function ensureOverlay(container, classes) {
  const existing = container.querySelector(`:scope > .${classes.overlay}`);
  if (existing) {
    return existing;
  }

  const overlay = document.createElement("span");
  overlay.className = classes.overlay;
  container.appendChild(overlay);
  return overlay;
}

function ensureOverlayLayer(overlay, name) {
  const existing = overlay.querySelector(`:scope > [data-imgx-layer="${name}"]`);
  if (existing) {
    return existing;
  }

  const layer = document.createElement("span");
  layer.setAttribute("data-imgx-layer", name);
  layer.style.display = "block";
  layer.style.width = "100%";
  layer.style.height = "100%";
  overlay.appendChild(layer);
  return layer;
}

function setContainerState(container, classes, state) {
  container.classList.remove(classes.loading, classes.loaded, classes.error);

  if (state === "loading") {
    container.classList.add(classes.loading);
  }

  if (state === "loaded") {
    container.classList.add(classes.loaded);
  }

  if (state === "error") {
    container.classList.add(classes.error);
  }
}

function applyTransition(image, transition) {
  const duration = transition?.duration ?? 420;
  const easing = transition?.easing ?? "ease";
  image.style.setProperty("--imgx-duration", `${duration}ms`);
  image.style.setProperty("--imgx-easing", easing);

  const type = transition?.type ?? "fade";
  if (type === "blur") {
    image.style.filter = "blur(18px)";
    image.style.transform = "scale(1.02)";
  } else if (type === "scale") {
    image.style.filter = "none";
    image.style.transform = "scale(0.965)";
  } else {
    image.style.filter = "none";
    image.style.transform = "scale(1)";
  }
}

function settleTransition(image, transition) {
  const type = transition?.type ?? "fade";
  image.style.opacity = "1";
  image.style.filter = "none";
  image.style.transform = "scale(1)";

  if (type === "blur") {
    image.style.transform = "scale(1)";
  }
}

// src/lib/network.js
function getNetworkProfile() {
  if (typeof navigator === "undefined") {
    return {
      effectiveType: "unknown",
      saveData: false,
      downlink: 0,
      quality: "medium"
    };
  }

  const connection =
    navigator.connection ||
    navigator.mozConnection ||
    navigator.webkitConnection;

  const effectiveType = connection?.effectiveType || "unknown";
  const saveData = Boolean(connection?.saveData);
  const downlink = Number(connection?.downlink || 0);

  let quality = "medium";
  if (saveData || effectiveType.includes("2g")) {
    quality = "slow";
  } else if (effectiveType === "4g" || downlink >= 5) {
    quality = "fast";
  }

  return {
    effectiveType,
    saveData,
    downlink,
    quality
  };
}

function getCacheHint(src) {
  if (
    typeof performance === "undefined" ||
    typeof performance.getEntriesByName !== "function" ||
    !src
  ) {
    return "unknown";
  }

  const entry = performance.getEntriesByName(src).find(
    (candidate) => candidate.initiatorType === "img"
  );

  if (!entry) {
    return "unknown";
  }

  if (entry.transferSize === 0 && entry.decodedBodySize > 0) {
    return "cached";
  }

  return "network";
}

function resolveAutoMode({ image, config }) {
  const network = config.network?.enabled === false ? undefined : getNetworkProfile();
  const cache = getCacheHint(image.currentSrc || image.src || image.dataset.imgxSrc);
  const viewportReady = typeof window !== "undefined"
    ? image.getBoundingClientRect().top < window.innerHeight * 1.5
    : true;

  if (config.autoMode?.enabled === false) {
    return {
      renderer: config.placeholder.renderer,
      lazy: config.lazy?.enabled !== false,
      transition: config.transition?.type || "fade"
    };
  }

  if (cache === "cached") {
    return {
      renderer: "dominantColor",
      lazy: false,
      transition: "fade"
    };
  }

  if (network?.quality === "slow") {
    return {
      renderer: "dominantColor",
      lazy: config.priority !== config.priorityAttributeValue,
      transition: "fade"
    };
  }

  if (network?.quality === "fast" && viewportReady) {
    return {
      renderer: config.placeholder.renderer === "dominantColor" ? "svgAnimation" : config.placeholder.renderer,
      lazy: false,
      transition: config.transition?.type || "blur"
    };
  }

  return {
    renderer: config.placeholder.renderer,
    lazy: config.lazy?.enabled !== false,
    transition: config.transition?.type || "fade"
  };
}

// src/lib/renderers/index.js
function clearNode(node) {
  node.textContent = "";
  node.removeAttribute("style");
}

function createBaseRenderer(name, handlers) {
  return {
    name,
    mount(context) {
      return handlers.mount(context);
    }
  };
}

const skeletonRenderer = createBaseRenderer("skeleton", {
  mount({ overlay, config }) {
    const options = config.placeholder.rendererOptions.skeleton;
    const plate = document.createElement("span");
    plate.setAttribute("aria-hidden", "true");
    plate.style.display = "block";
    plate.style.width = "100%";
    plate.style.height = "100%";
    plate.style.borderRadius = options.radius || "12px";
    plate.style.background = options.baseColor;
    plate.style.position = "relative";
    plate.style.overflow = "hidden";

    if (options.mode === "pulse") {
      plate.style.animation = "imgx-pulse 1.35s ease-in-out infinite";
    } else if (options.mode === "static") {
      plate.style.background = options.baseColor;
    } else {
      const shimmer = document.createElement("span");
      shimmer.style.position = "absolute";
      shimmer.style.inset = "0";
      shimmer.style.background = `linear-gradient(90deg, transparent, ${options.highlightColor}, transparent)`;
      shimmer.style.animation = "imgx-shimmer 1.6s linear infinite";
      plate.appendChild(shimmer);
    }

    overlay.appendChild(plate);

    return {
      update(state) {
        plate.style.display = state === "error" ? "none" : "block";
      },
      destroy() {
        clearNode(overlay);
      }
    };
  }
});

const svgAnimationRenderer = createBaseRenderer("svgAnimation", {
  mount({ overlay, config, id }) {
    const options = config.placeholder.rendererOptions.svgAnimation;
    const gradientId = `imgx-grad-${id}`;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 400 300");
    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.innerHTML = `
      <defs>
        <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${options.palette[0]}">
            <animate attributeName="stop-color" values="${options.palette[0]};${options.palette[1]};${options.palette[2]};${options.palette[0]}" dur="${options.speed}s" repeatCount="indefinite" />
          </stop>
          <stop offset="100%" stop-color="${options.palette[2]}">
            <animate attributeName="stop-color" values="${options.palette[2]};${options.palette[0]};${options.palette[1]};${options.palette[2]}" dur="${options.speed}s" repeatCount="indefinite" />
          </stop>
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#${gradientId})"></rect>
      <circle cx="70" cy="70" r="34" fill="rgba(255,255,255,0.22)">
        <animate attributeName="cy" values="70;90;70" dur="${options.speed * 1.4}s" repeatCount="indefinite" />
      </circle>
      <path d="M0 215 C 75 160, 145 255, 230 205 S 330 120, 400 180 L 400 300 L 0 300 Z" fill="rgba(255,255,255,0.22)">
        <animate attributeName="d" values="
          M0 215 C 75 160, 145 255, 230 205 S 330 120, 400 180 L 400 300 L 0 300 Z;
          M0 205 C 85 175, 150 235, 240 195 S 325 135, 400 165 L 400 300 L 0 300 Z;
          M0 215 C 75 160, 145 255, 230 205 S 330 120, 400 180 L 400 300 L 0 300 Z" dur="${options.speed * 1.25}s" repeatCount="indefinite" />
      </path>
    `;
    overlay.appendChild(svg);

    return {
      update() {},
      destroy() {
        clearNode(overlay);
      }
    };
  }
});

const blurPreviewRenderer = createBaseRenderer("blurPreview", {
  mount({ overlay, image, config }) {
    const options = config.placeholder.rendererOptions.blurPreview;
    const previewSrc = options.src || image.getAttribute(`${config.targetAttribute}-preview`);

    if (!previewSrc) {
      return skeletonRenderer.mount({ overlay, image, config });
    }

    const preview = document.createElement("img");
    preview.alt = "";
    preview.decoding = "async";
    preview.src = previewSrc;
    preview.style.width = "100%";
    preview.style.height = "100%";
    preview.style.objectFit = image.style.objectFit || "cover";
    preview.style.filter = "blur(20px)";
    preview.style.transform = `scale(${options.scale || 1.1})`;
    preview.style.opacity = `${options.opacity || 0.85}`;
    overlay.appendChild(preview);

    return {
      update() {},
      destroy() {
        clearNode(overlay);
      }
    };
  }
});

const dominantColorRenderer = createBaseRenderer("dominantColor", {
  mount({ overlay, config }) {
    const options = config.placeholder.rendererOptions.dominantColor;
    const block = document.createElement("span");
    block.style.display = "block";
    block.style.width = "100%";
    block.style.height = "100%";
    block.style.background = options.color || options.fallbackColor || "#d1d5db";
    block.style.filter = `saturate(${options.saturate || 1})`;
    overlay.appendChild(block);

    return {
      async update(state, payload) {
        if (state !== "loaded" || !payload?.image) {
          return;
        }

        const color = await extractDominantColor(payload.image, block.style.background);
        block.style.background = color;
      },
      destroy() {
        clearNode(overlay);
      }
    };
  }
});

const fallbackRenderer = createBaseRenderer("fallback", {
  mount({ overlay, config }) {
    const options = config.placeholder.rendererOptions.fallback;
    const shell = document.createElement("span");
    shell.style.display = "none";
    shell.style.width = "100%";
    shell.style.height = "100%";
    shell.style.background = options.background;
    shell.style.color = options.color;
    shell.style.font = "600 0.875rem/1.4 system-ui, sans-serif";
    shell.style.alignItems = "center";
    shell.style.justifyContent = "center";
    shell.style.textAlign = "center";
    shell.style.padding = "1rem";
    shell.textContent = options.message;
    overlay.appendChild(shell);

    return {
      update(state, payload) {
        shell.style.display = state === "error" ? "flex" : "none";
        if (payload?.message && state === "error") {
          shell.textContent = payload.message;
        }
      },
      destroy() {
        clearNode(overlay);
      }
    };
  }
});

const builtinRenderers = {
  skeleton: skeletonRenderer,
  svgAnimation: svgAnimationRenderer,
  blurPreview: blurPreviewRenderer,
  dominantColor: dominantColorRenderer,
  fallback: fallbackRenderer
};

// src/lib/imgx.js
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

class Imgx {
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

function createImgx(config = {}) {
  return new Imgx(config);
}

const imgx = createImgx();

if (typeof window !== "undefined" && typeof document !== "undefined") {
  imgx.enableAutoInit();
}

const ImgxCDN = {
  Imgx,
  builtinRenderers,
  skeletonRenderer,
  svgAnimationRenderer,
  blurPreviewRenderer,
  dominantColorRenderer,
  fallbackRenderer,
  createImgx,
  imgx
};

global.Imgx = ImgxCDN;
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : this);
