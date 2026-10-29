// Real renderer with a canvas/context spy: validates backing pixels, not visual quality.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function setup(cssWidth = 1280, cssHeight = 720, dpr = 1, fit = 'contain') {
  const rect = { width: cssWidth, height: cssHeight };
  const writes = [], transforms = [], clears = [];
  let width = 1280, height = 720;
  const gradient = () => ({ addColorStop() {} });
  const ctx = new Proxy({
    globalAlpha: 1,
    setTransform: (...args) => transforms.push(args),
    clearRect: (...args) => clears.push(args),
    createLinearGradient: gradient,
    createRadialGradient: gradient,
    measureText: text => ({ width: String(text).length * 7 }),
  }, { get: (target, key) => key in target ? target[key] : () => {} });
  const canvas = {
    style: { objectFit: fit },
    getBoundingClientRect: () => ({ ...rect }),
    getContext: () => ctx,
    get width() { return width; },
    set width(value) { width = value; writes.push(['width', value]); },
    get height() { return height; },
    set height(value) { height = value; writes.push(['height', value]); },
  };
  const context = vm.createContext({
    console, Math, Date, JSON, devicePixelRatio: dpr,
    getComputedStyle: element => ({ objectFit: element.style.objectFit }),
  });
  vm.runInContext('window = globalThis;', context);
  for (const name of ['engine.js', 'render.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../dist', name), 'utf8'), context);
  }
  const renderer = new context.CM.Renderer(canvas);
  return { context, renderer, canvas, rect, writes, transforms, clears };
}

function size(canvas) { return [canvas.width, canvas.height]; }

for (const [width, height, dpr] of [[3840, 2160, 1], [1920, 1080, 2], [2560, 1440, 1.5]]) {
  test(`${width}×${height} CSS at DPR ${dpr} renders at native 4K with unchanged logical coordinates`, () => {
    const h = setup(width, height, dpr);
    h.renderer.begin();
    assert.deepEqual(size(h.canvas), [3840, 2160]);
    assert.deepEqual(h.transforms.at(-1), [3, 0, 0, 3, 0, 0]);
    assert.deepEqual(h.clears.at(-1), [0, 0, 1280, 720]);
    assert.deepEqual([h.renderer.width, h.renderer.height], [1280, 720]);
  });
}

test('larger screens and density changes above the 4K ceiling do not allocate larger buffers', () => {
  const h = setup(7680, 4320, 2);
  h.renderer.begin();
  assert.deepEqual(size(h.canvas), [3840, 2160]);
  const count = h.writes.length;
  h.context.devicePixelRatio = 4;
  h.renderer.begin();
  assert.deepEqual(size(h.canvas), [3840, 2160]);
  assert.equal(h.writes.length, count, 'same capped size must not reset the canvas');
});

test('wide and portrait viewports allocate for the contained 16:9 picture without distortion', () => {
  for (const [width, height, dpr, expected] of [
    [2560, 1080, 1, [1920, 1080]],
    [1080, 1920, 2, [2160, 1215]],
  ]) {
    const h = setup(width, height, dpr);
    h.renderer.begin();
    assert.deepEqual(size(h.canvas), expected);
    assert.equal(h.canvas.width * 9, h.canvas.height * 16);
    assert.equal(h.transforms.at(-1)[0], h.transforms.at(-1)[3]);
  }
});

test('fractional dimensions preserve exact aspect ratio and cover previews retain their crop', () => {
  const h = setup(1001, 701, 1.25);
  h.renderer.begin();
  assert.deepEqual(size(h.canvas), [1264, 711]);
  assert.equal(h.canvas.width * 9, h.canvas.height * 16);
  const preview = setup(320, 170, 2, 'cover');
  preview.renderer.begin();
  assert.deepEqual(size(preview.canvas), [640, 360]);
});

test('stable frames do not reset the buffer; CSS and DPR-only changes resize on the next draw', () => {
  const h = setup(960, 540, 1);
  h.renderer.begin();
  assert.deepEqual(size(h.canvas), [960, 540]);
  assert.equal(h.writes.length, 2);
  for (let frame = 0; frame < 180; frame++) h.renderer.begin();
  assert.equal(h.writes.length, 2, 'setting width or height again would erase canvas state');
  Object.assign(h.rect, { width: 1920, height: 1080 });
  h.renderer.begin();
  assert.deepEqual(size(h.canvas), [1920, 1080]);
  assert.equal(h.writes.length, 4);
  h.context.devicePixelRatio = 2;
  h.renderer.begin();
  assert.deepEqual(size(h.canvas), [3840, 2160]);
  assert.equal(h.writes.length, 6);
  assert.deepEqual(h.transforms.at(-1), [3, 0, 0, 3, 0, 0]);
  h.context.devicePixelRatio = 1;
  h.renderer.begin();
  assert.deepEqual(size(h.canvas), [1920, 1080], 'lower density releases the larger backing buffer');
});

test('hidden canvases and contexts without layout measurements preserve their existing buffers', () => {
  const h = setup(1920, 1080, 2);
  h.renderer.begin();
  const count = h.writes.length;
  Object.assign(h.rect, { width: 0, height: 0 });
  assert.equal(h.renderer.resizeToDisplaySize(), false);
  h.renderer.begin();
  assert.deepEqual(size(h.canvas), [3840, 2160]);
  assert.equal(h.writes.length, count);
  delete h.canvas.getBoundingClientRect;
  assert.equal(h.renderer.resizeToDisplaySize(), false);
  assert.deepEqual(size(h.canvas), [3840, 2160]);
});

test('title and gameplay draws use adaptive pixels without changing engine or camera state', () => {
  const h = setup(1920, 1080, 2);
  const game = new h.context.CM.Engine();
  const before = JSON.stringify(game.snapshot());
  const camera = JSON.stringify(game.camera);
  h.renderer.drawTitle(0);
  assert.deepEqual(size(h.canvas), [3840, 2160]);
  const count = h.writes.length;
  h.renderer.draw(game, 1 / 60);
  h.renderer.draw(game, 1 / 60);
  assert.equal(h.writes.length, count);
  Object.assign(h.rect, { width: 1280, height: 720 });
  h.context.devicePixelRatio = 1;
  h.renderer.draw(game, 1 / 60);
  assert.deepEqual(size(h.canvas), [1280, 720]);
  assert.deepEqual(h.transforms.at(-1), [1, 0, 0, 1, 0, 0]);
  assert.equal(JSON.stringify(game.snapshot()), before);
  assert.equal(JSON.stringify(game.camera), camera);
});
