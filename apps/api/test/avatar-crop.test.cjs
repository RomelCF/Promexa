require('ts-node/register/transpile-only');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { squareCrop } = require('../../web/src/lib/avatar-crop');
test('centers landscape and portrait images without stretching', () => {
  assert.deepEqual(squareCrop(800, 600, 1, 0, 0), { x: 100, y: 0, side: 600 });
  assert.deepEqual(squareCrop(600, 800, 1, 0, 0), { x: 0, y: 100, side: 600 });
});
test('zoom and extreme drag positions never expose space outside the image', () => {
  for (const [width, height] of [[800, 600], [600, 800], [512, 512]]) {
    for (const zoom of [0, 1, 1.5, 3, 10]) {
      for (const position of [-20, -1, 0, 1, 20]) {
        const result = squareCrop(width, height, zoom, position, -position);
        assert.ok(result.x >= 0 && result.y >= 0);
        assert.ok(result.x + result.side <= width && result.y + result.side <= height);
      }
    }
  }
});
test('zoom selects the expected portion of the original image', () => {
  assert.deepEqual(squareCrop(800, 600, 2, -1, 1), { x: 0, y: 300, side: 300 });
});
