# Renderers

Renderers control what the user sees before an image loads and when loading fails.

## Built-In Renderers

### Skeleton Renderer

Name: `skeleton`

Useful for:

- generic content placeholders
- neutral loading UI
- low-cost loading visuals

Modes:

- `static`
- `pulse`
- `shimmer`

Example:

```html
<img
  data-imgx
  data-imgx-src="/images/photo.jpg"
  data-imgx-renderer="skeleton"
  data-imgx-skeleton="shimmer"
  alt="Photo"
/>
```

## SVG Animation Renderer

Name: `svgAnimation`

Useful for:

- richer loading moments
- visually expressive placeholders
- inline asset-free animation

Example:

```html
<img
  data-imgx
  data-imgx-src="/images/banner.jpg"
  data-imgx-renderer="svgAnimation"
  alt="Banner"
/>
```

## Blur Preview Renderer

Name: `blurPreview`

Useful for:

- low-quality image previews
- smooth blur-to-sharp transitions

Example:

```html
<img
  data-imgx
  data-imgx-src="/images/card.jpg"
  data-imgx-preview="/images/card-preview.jpg"
  data-imgx-renderer="blurPreview"
  data-imgx-transition="blur"
  alt="Card"
/>
```

## Dominant Color Renderer

Name: `dominantColor`

Useful for:

- lightweight placeholders
- color-based previews
- slower network conditions

Example:

```html
<img
  data-imgx
  data-imgx-src="/images/cover.jpg"
  data-imgx-renderer="dominantColor"
  alt="Cover"
/>
```

## Fallback Renderer

Name: `fallback`

Useful for:

- meaningful error states
- avoiding the browser broken-image default

Example:

```html
<img
  data-imgx
  data-imgx-src="/images/missing.jpg"
  data-imgx-error-renderer="fallback"
  data-imgx-fallback="/images/fallback.jpg"
  alt="Fallback example"
/>
```

## Writing a Custom Renderer

Custom renderers must provide a `mount(context)` method.

Example:

```js
const customRenderer = {
  name: "dots",
  mount({ overlay }) {
    overlay.innerHTML = `<div style="width:100%;height:100%">Loading</div>`;

    return {
      update(state, payload) {
        void state;
        void payload;
      },
      destroy() {
        overlay.textContent = "";
      }
    };
  }
};
```

Register it with:

```js
imgx.registerRenderer("dots", customRenderer);
```
