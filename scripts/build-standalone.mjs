import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = name => readFile(path.join(root, 'dist', name), 'utf8');
let html = await read('index.html');
const css = await read('style.css');
html = html.replace('<link rel="stylesheet" href="style.css">', () => `<style>${css}</style>`);
for (const file of ['engine.js', 'render.js', 'app.js']) {
  const source = await read(file);
  html = html.replace(`<script src="${file}"></script>`, () => `<script>\n${source.replace(/<\/script/gi, '<\\/script')}\n</script>`);
}
const icon = Buffer.from(await read('icon.svg')).toString('base64');
html = html.replace('href="icon.svg"', `href="data:image/svg+xml;base64,${icon}"`);
await writeFile(path.join(root, 'dist', 'carlus-magnus.html'), html, 'utf8');
console.log(`Standalone game built (${Buffer.byteLength(html)} bytes, zero dependencies).`);
