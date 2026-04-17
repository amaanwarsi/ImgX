const DEFAULT_ATTRIBUTE = "data-imgx";

export const defaultConfig = {
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

export function deepMerge(...parts) {
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

export function getSelector(attribute = DEFAULT_ATTRIBUTE) {
  return `[${attribute}]`;
}

export function readElementConfig(element, config) {
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

export function resolveConfig(baseConfig, element, overrides = {}) {
  const merged = deepMerge(baseConfig, readElementConfig(element, baseConfig), overrides);
  merged.selector = getSelector(merged.targetAttribute);
  return merged;
}
