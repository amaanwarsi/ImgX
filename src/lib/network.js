export function getNetworkProfile() {
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

export function getCacheHint(src) {
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

export function resolveAutoMode({ image, config }) {
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
