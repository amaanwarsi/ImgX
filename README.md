<div align="center">
  <img src="./logo.png" alt="mpm logo" width="120" />
  <h1>Imgx</h1>
  <p><strong>Smarter image loading for the web</strong></p>

  [![npm version](https://img.shields.io/npm/v/@amaanwarsi/imgx.svg)](https://www.npmjs.com/package/@amaanwarsi/imgx)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Docs](https://img.shields.io/badge/docs-website-blue)](https://amaanwarsi.thedev.id/ImgX/)


  Imgx is a lightweight, framework-agnostic image loading library for the web.
  It only enhances images you explicitly opt into with a configurable `data-*` attribute such as `data-imgx`, and leaves every other `<img>` untouched.

</div>


## Why Imgx

Modern image loading often becomes a mix of one-off lazy-loading code, placeholder CSS, fallback logic, and component-specific behavior. Imgx packages those concerns into a reusable ES module with a small public API and a pluggable renderer system.


## What It Does

- Selectively targets marked images only
- Auto-initializes on `DOMContentLoaded`
- Supports manual `init()` and `rescan()`
- Tracks a clear lifecycle: `idle -> loading -> loaded -> error`
- Uses `IntersectionObserver` for lazy loading with fallback behavior
- Supports global config, per-image overrides, and programmatic overrides
- Includes built-in renderers:
- skeleton
- svgAnimation
- blurPreview
- dominantColor
- fallback
- Supports transitions, retry logic, fallback sources, and a plugin API

## Install

```bash
npm install @amaanwarsi/imgx
```

## Quick Start

```html
<img
  data-imgx
  data-imgx-src="/images/photo-large.jpg"
  alt="Example photo"
  width="1200"
  height="800"
/>

<script type="module">
  import imgx from "@amaanwarsi/imgx";
</script>
```

That is enough for the default browser setup.

## Usage Examples

### 1. Default browser usage

```html
<img
  data-imgx
  data-imgx-src="/images/mountain.jpg"
  alt="Mountain"
  width="1600"
  height="900"
/>

<script type="module">
  import imgx from "@amaanwarsi/imgx";
</script>
```

### 2. Manual instance with custom defaults

```js
import { createImgx } from "@amaanwarsi/imgx";

const gallery = createImgx({
  placeholder: {
    renderer: "blurPreview"
  },
  transition: {
    type: "blur",
    duration: 500
  }
});

gallery.init();
```

### 3. Rescan dynamically added images

```js
const grid = document.querySelector("[data-gallery]");
gallery.rescan(grid);
```

### 4. Per-image overrides

```html
<img
  data-imgx
  data-imgx-src="/images/card.jpg"
  data-imgx-preview="/images/card-preview.jpg"
  data-imgx-renderer="blurPreview"
  data-imgx-transition="blur"
  data-imgx-fallback="/images/card-fallback.jpg"
  alt="Card"
  width="800"
  height="600"
/>
```

### 5. Priority image that skips lazy loading

```html
<img
  data-imgx
  data-imgx-src="/images/hero.jpg"
  data-imgx-priority="high"
  alt="Hero"
  width="1600"
  height="900"
/>
```

### 6. Custom target attribute

```js
import { createImgx } from "@amaanwarsi/imgx";

const productImages = createImgx({
  targetAttribute: "data-product-img"
});

productImages.init();
```

```html
<img
  data-product-img
  data-product-img-src="/images/product.jpg"
  alt="Product"
  width="900"
  height="900"
/>
```

### 7. Custom renderer

```js
import { createImgx } from "@amaanwarsi/imgx";

const imgx = createImgx();

imgx.registerRenderer("dots", {
  mount({ overlay }) {
    overlay.innerHTML = `
      <div style="display:grid;place-items:center;width:100%;height:100%;background:#111;color:#fff">
        Loading...
      </div>
    `;

    return {
      update() {},
      destroy() {
        overlay.textContent = "";
      }
    };
  }
});

imgx.init();
```

## Common Per-Image Attributes

- `data-imgx-src`
- `data-imgx-renderer`
- `data-imgx-error-renderer`
- `data-imgx-transition`
- `data-imgx-lazy`
- `data-imgx-priority`
- `data-imgx-preview`
- `data-imgx-fallback`
- `data-imgx-retry-attempts`
- `data-imgx-retry-delay`
- `data-imgx-skeleton`
- `data-imgx-radius`
- `data-imgx-color`
- `data-imgx-auto`

If you change `targetAttribute`, the same pattern applies to that new prefix.

## CDN Build

Build browser-ready files locally:

```bash
npm run build:cdn
```

This generates:

- `dist/imgx.js`
- `dist/imgx.min.js`

Usage:

```html
<script src="./dist/imgx.min.js"></script>
<script>
  const gallery = Imgx.createImgx();
  gallery.init();
</script>
```

## API

Exports:

- `Imgx`
- `createImgx(config?)`
- `imgx`
- `builtinRenderers`
- `skeletonRenderer`
- `svgAnimationRenderer`
- `blurPreviewRenderer`
- `dominantColorRenderer`
- `fallbackRenderer`

Instance methods:

- `init(root?, overrides?)`
- `rescan(root?, overrides?)`
- `configure(nextConfig)`
- `registerRenderer(name, renderer)`
- `use(plugin)`
- `enableAutoInit()`
- `destroy(image)`

## Docs

- [Documentation](https://amaanwarsi.thedev.id/ImgX)
- [Getting Started](https://github.com/amaanwarsi/ImgX/tree/main/docs/getting-started.md)
- [API Reference](https://github.com/amaanwarsi/ImgX/tree/main/docs/api.md)
- [Renderers](https://github.com/amaanwarsi/ImgX/tree/main/docs/renderers.md)

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](https://github.com/amaanwarsi/ImgX/tree/main/CONTRIBUTING.md).

## License

MIT. See [LICENSE](https://github.com/amaanwarsi/ImgX/tree/main/LICENSE).
