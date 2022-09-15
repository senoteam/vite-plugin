# @senojs/rollup-plugin-style-inject

Inject style to document head.

## Usage

```js
// vite.config.js
import styleInject from '@senojs/rollup-plugin-style-inject'

export default {
  plugins: [
    styleInject({
      insertAt: 'top',
    }),
  ],
}
```

## Options

### `insertAt`

- Type: `string`
- Default: `'top'`

Insert `<style>` tag to specific position of `<head>` element.
