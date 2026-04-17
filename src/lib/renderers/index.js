import { extractDominantColor } from "../color.js";

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

export const skeletonRenderer = createBaseRenderer("skeleton", {
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

export const svgAnimationRenderer = createBaseRenderer("svgAnimation", {
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

export const blurPreviewRenderer = createBaseRenderer("blurPreview", {
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

export const dominantColorRenderer = createBaseRenderer("dominantColor", {
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

export const fallbackRenderer = createBaseRenderer("fallback", {
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

export const builtinRenderers = {
  skeleton: skeletonRenderer,
  svgAnimation: svgAnimationRenderer,
  blurPreview: blurPreviewRenderer,
  dominantColor: dominantColorRenderer,
  fallback: fallbackRenderer
};
