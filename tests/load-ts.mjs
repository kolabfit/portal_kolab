import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
const nativeRequire = createRequire(import.meta.url);

// Load the actual TS/TSX component tree, with optional hook/API overrides.
export function loadTs(filename, overrides = {}, globals = {}, cache = new Map()) {
  filename = path.resolve(filename);
  if (cache.has(filename)) return cache.get(filename).exports;
  const module = { exports: {} }; cache.set(filename, module);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }
  }).outputText.replace(/import\.meta\.env/g, '({})'); // CommonJS tidak punya import.meta (Vite env kosong di tes)
  vm.runInNewContext(code, { module, exports: module.exports, console, ...globals, require(name) {
    if (name in overrides) return overrides[name];
    if (!name.startsWith('.')) return nativeRequire(name);
    const target = path.resolve(path.dirname(filename), name);
    const resolved = ['.ts', '.tsx', '.js'].map(ext => target + ext).find(file => fs.existsSync(file));
    return loadTs(resolved || target, overrides, globals, cache);
  } }, { filename });
  return module.exports;
}
