# API Reference

## Module Exports

- `default`
- `imgx`
- `Imgx`
- `createImgx`
- `builtinRenderers`
- `skeletonRenderer`
- `svgAnimationRenderer`
- `blurPreviewRenderer`
- `dominantColorRenderer`
- `fallbackRenderer`

## `createImgx(config?)`

Creates a new Imgx instance with merged defaults.

## `new Imgx(config?)`

Creates an instance directly.

## Usage Examples

### Create and initialize

```js
import { createImgx } from "./src/index.js";

const imgx = createImgx();
imgx.init();
```

### Configure then rescan

```js
imgx.configure({
  transition: {
    type: "scale",
    duration: 320
  }
});

imgx.rescan(document.querySelector("[data-gallery]"));
```

### Install a plugin-like function

```js
imgx.use((instance) => {
  instance.registerRenderer("dots", {
    mount({ overlay }) {
      overlay.innerHTML = "<div>Loading...</div>";

      return {
        update() {},
        destroy() {
          overlay.textContent = "";
        }
      };
    }
  });
});
```

## Instance Methods

### `init(root?, overrides?)`

Initializes all targeted images inside `root`.

### `rescan(root?, overrides?)`

Scans again for newly added targeted images.

### `configure(nextConfig)`

Merges new config into the instance.

### `registerRenderer(name, renderer)`

Registers a custom renderer.

### `use(plugin)`

Installs a plugin or plugin-like function.

### `enableAutoInit()`

Attaches browser auto-init behavior for `DOMContentLoaded`.

### `destroy(image)`

Removes Imgx behavior for a previously prepared image.

## Lifecycle States

- `idle`
- `loading`
- `loaded`
- `error`

## Main Config Areas

- `targetAttribute`
- `sourceAttributeSuffix`
- `lazy`
- `network`
- `autoMode`
- `retries`
- `transition`
- `placeholder`
- `priorityAttributeValue`
- `errorFallbackSources`
- `classes`
