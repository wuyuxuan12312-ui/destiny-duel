const fs = require('fs');
const path = require('path');

const CLIENT = path.join(__dirname, '..', 'client');
const html = fs.readFileSync(path.join(CLIENT, 'index.html'), 'utf8');

// 1. collect ids declared in html
const ids = [];
for (const m of html.matchAll(/\bid\s*=\s*["']([^"' ]+)["']/g)) ids.push(m[1]);
const dup = ids.filter((v, i) => ids.indexOf(v) !== i);
const idSet = new Set(ids);

// 2. collect ids referenced from JS
const jsFiles = [];
(function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.name.endsWith('.js') && !e.name.endsWith('.min.js')) jsFiles.push(p);
    }
})(CLIENT);

// ids injected from JS template strings are real ids, just not static ones
const runtimeIds = new Set();
for (const f of jsFiles) {
    for (const m of fs.readFileSync(f, 'utf8').matchAll(/\bid\s*=\s*["']([^"'\s$]+)["']/g)) runtimeIds.add(m[1]);
}

const missing = new Map();
for (const f of jsFiles) {
    const src = fs.readFileSync(f, 'utf8');
    const rel = path.relative(CLIENT, f).replace(/\\/g, '/');
    for (const m of src.matchAll(/getElementById\(\s*['"]([^'"]+)['"]\s*\)/g)) {
        if (!idSet.has(m[1]) && !runtimeIds.has(m[1])) {
            const line = src.slice(0, m.index).split('\n').length;
            missing.set(`${m[1]} @ ${rel}:${line}`, true);
        }
    }
    // template-literal id lookups are dynamic; report separately for manual check
}

// 3. clickables in html that no JS ever references by id
const refed = new Set();
for (const f of jsFiles) {
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(/['"`]([a-zA-Z][\w-]*)['"`]/g)) refed.add(m[1]);
}
const orphanBtns = [];
for (const m of html.matchAll(/<(button|a)\b[^>]*\bid\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/\1>/g)) {
    const label = m[3].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 28);
    if (!refed.has(m[2])) orphanBtns.push(`${m[2]} — “${label}”`);
}

// 4. duplicate ids
console.log('== index.html 中重复出现的 id ==');
console.log(dup.length ? [...new Set(dup)].join(', ') : '(无)');

console.log('\n== JS 里引用了 index.html 不存在的 id ==');
console.log(missing.size ? [...missing.keys()].join('\n') : '(无)');

console.log('\n== HTML 中按钮的 id 在任何 JS 里都没出现过（可能没接线） ==');
console.log(orphanBtns.length ? orphanBtns.join('\n') : '(无)');

// 5. querySelector literals whose target never appears anywhere. This is the silent-no-op class:
//    the code guards with `if (el)` so a typo'd selector just drops the feature without a trace.
const allText = [html, ...jsFiles.map(f => fs.readFileSync(f, 'utf8'))].join('\n');
const deadSelectors = new Set();
for (const f of jsFiles) {
    const src = fs.readFileSync(f, 'utf8');
    const rel = path.relative(CLIENT, f).replace(/\\/g, '/');
    for (const m of src.matchAll(/querySelector(?:All)?\(\s*(['"])((?:[^'"]*?))\1\s*\)/g)) {
        const selector = m[2];
        if (selector.includes('${') || selector.includes('+')) continue;   // built at runtime
        const tokens = selector.match(/[.#][A-Za-z][\w-]*/g) || [];
        for (const tok of tokens) {
            const name = tok.slice(1);
            if (!allText.includes(name)) {
                const line = src.slice(0, m.index).split('\n').length;
                deadSelectors.add(`${tok}  (selector "${selector}") @ ${rel}:${line}`);
            }
        }
    }
}
console.log('\n== querySelector 字面量指向了任何地方都不存在的类/ id（功能被静默丢弃） ==');
console.log(deadSelectors.size ? [...deadSelectors].join('\n') : '(无)');

