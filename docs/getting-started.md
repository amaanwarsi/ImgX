# Getting Started

## What Imgx Does

Imgx enhances only the images you opt into with a configurable `data-*` attribute. It adds a loading lifecycle, lazy loading, placeholders, transitions, fallback behavior, and extension hooks without requiring a framework.

## Basic Example

```html
<img
  data-imgx
  data-imgx-src="/images/photo-large.jpg"
  alt="Example photo"
  width="1200"
  height="800"
/>

<script type="module">
  import imgx from "./src/index.js";
</script>
```

## Usage Examples

### 1. Manual setup

```js
import { createImgx } from "./src/index.js";

const imgx = createImgx({
  placeholder: {
    renderer: "skeleton"
  },
  transition: {
    type: "fade",
    duration: 400
  }
});

imgx.init();
```

### 2. Blur preview image

```html
<img
  data-imgx
  data-imgx-src="/images/card.jpg"
  data-imgx-preview="/images/card-preview.jpg"
  data-imgx-renderer="blurPreview"
  data-imgx-transition="blur"
  alt="Card image"
/>
```

### 3. Priority image

```html
<img
  data-imgx
  data-imgx-src="/images/hero.jpg"
  data-imgx-priority="high"
  alt="Hero image"
  width="1600"
  height="900"
/>
```

### 4. Retry and fallback sources

```html
<img
  data-imgx
  data-imgx-src="/images/primary.jpg"
  data-imgx-fallback="/images/fallback-a.jpg,/images/fallback-b.jpg"
  data-imgx-retry-attempts="2"
  data-imgx-retry-delay="800"
  alt="Example"
/>
```

### 5. Rescanning dynamic content

```js
imgx.rescan(document.querySelector("#dynamic-content"));
```

### 6. Changing the target attribute

```js
const imgx = createImgx({
  targetAttribute: "data-photox"
});
```

This changes the source attribute pattern as well:

- `data-photox`
- `data-photox-src`
- `data-photox-renderer`

### 7. Custom renderer

```js
import { createImgx } from "./src/index.js";

const imgx = createImgx({
  placeholder: {
    renderer: "dots"
  }
});

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

## Common Per-Image Overrides

```html
<img
  data-imgx
  data-imgx-src="/images/card.jpg"
  data-imgx-renderer="blurPreview"
  data-imgx-preview="/images/card-preview.jpg"
  data-imgx-transition="blur"
  alt="Card image"
/>
```
