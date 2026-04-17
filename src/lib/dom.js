let stylesInjected = false;

export function injectStyles(classes) {
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

export function ensureContainer(image, classes) {
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

export function ensureOverlay(container, classes) {
  const existing = container.querySelector(`:scope > .${classes.overlay}`);
  if (existing) {
    return existing;
  }

  const overlay = document.createElement("span");
  overlay.className = classes.overlay;
  container.appendChild(overlay);
  return overlay;
}

export function ensureOverlayLayer(overlay, name) {
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

export function setContainerState(container, classes, state) {
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

export function applyTransition(image, transition) {
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

export function settleTransition(image, transition) {
  const type = transition?.type ?? "fade";
  image.style.opacity = "1";
  image.style.filter = "none";
  image.style.transform = "scale(1)";

  if (type === "blur") {
    image.style.transform = "scale(1)";
  }
}
