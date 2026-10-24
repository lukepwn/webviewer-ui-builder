// Throwaway Modular UI test harness. Open /harness.html while running `npm run dev`.
// Not used by the builder. Safe to delete (harness.html + src/harness/).
import WebViewer from '@pdftron/webviewer';
import { TESTS } from './tests.js';

const $ = (id) => document.getElementById(id);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

let instance = null;
let defaultConfig = null;
const results = {};

// Capture errors thrown/logged during a test
let captured = [];
window.addEventListener('error', (e) =>
  captured.push(`window.error: ${e.message}`),
);
window.addEventListener('unhandledrejection', (e) =>
  captured.push(`unhandledrejection: ${e.reason?.message || e.reason}`),
);
const origError = console.error;
console.error = (...args) => {
  captured.push(
    `console.error: ${args.map((a) => a?.message || String(a)).join(' ')}`,
  );
  origError.apply(console, args);
};

const clone = (o) => JSON.parse(JSON.stringify(o));

// Helpers handed to each test
function makeCtx() {
  const UI = instance.UI;
  return {
    UI,
    base: () => clone(defaultConfig),
    importConfig: (cfg, functionMap = {}) =>
      UI.importModularComponents(cfg, functionMap),
    exportConfig: () => UI.exportModularComponents(),
    open: async (id) => {
      UI.openElements([id]);
      await wait(400);
      return {
        reportedOpen: UI.isElementOpen(id),
        inDom:
          !!document.querySelector(`[data-element="${id}"]`) ||
          !!instance.UI.iframeWindow?.document.querySelector(
            `[data-element="${id}"]`,
          ),
      };
    },
    close: async (id) => {
      UI.closeElements([id]);
      await wait(200);
    },
    isOpen: (id) => UI.isElementOpen(id),
    inDom: (id) =>
      !!instance.UI.iframeWindow?.document.querySelector(
        `[data-element="${id}"]`,
      ),
    wait,
  };
}

async function resetUI() {
  try {
    instance.UI.importModularComponents(clone(defaultConfig), {});
  } catch (e) {
    origError('reset failed', e);
  }
  await wait(300);
}

async function runTest(test, outEl) {
  captured = [];
  outEl.className = 'result';
  outEl.textContent = 'running...';
  await resetUI();
  captured = [];
  let status = 'ok';
  const lines = [];
  try {
    const ctx = makeCtx();
    const report = (label, value, flag) => {
      lines.push(
        `${flag === false ? '✗' : flag === 'warn' ? '!' : '✓'} ${label}: ${
          typeof value === 'string' ? value : JSON.stringify(value)
        }`,
      );
      if (flag === false) status = 'fail';
      else if (flag === 'warn' && status === 'ok') status = 'warn';
    };
    await test.run(ctx, report);
  } catch (e) {
    status = 'fail';
    lines.push(`✗ THREW: ${e?.message || e}`);
  }
  await wait(200);
  if (captured.length) {
    if (status === 'ok') status = 'warn';
    lines.push(`Captured errors (${captured.length}):`);
    captured.slice(0, 5).forEach((c) => lines.push(`  ${c}`));
  }
  outEl.className = `result ${status}`;
  outEl.textContent = lines.join('\n');
  results[test.id] = { title: test.title, status, lines };
}

function renderTests() {
  const root = $('tests');
  TESTS.forEach((t) => {
    const div = document.createElement('div');
    div.className = 'test';
    div.innerHTML = `<h4>${t.id}. ${t.title}</h4><div class="look">${t.question}</div><div class="look"><b>LOOK:</b> ${t.look}</div>`;
    const btn = document.createElement('button');
    btn.textContent = 'Run';
    const out = document.createElement('div');
    out.className = 'result';
    btn.onclick = () => runTest(t, out);
    div.appendChild(btn);
    div.appendChild(out);
    t.outEl = out;
    root.appendChild(div);
  });
}

WebViewer(
  {
    path: 'lib/webviewer',
    fullAPI: true,
    initialDoc:
      'https://pdftron.s3.amazonaws.com/downloads/pl/demo-annotated.pdf',
  },
  $('viewer'),
).then(async (inst) => {
  instance = inst;
  window.viewerInstance = inst;
  await new Promise((r) => inst.UI.addEventListener('viewerLoaded', r));
  defaultConfig = clone(inst.UI.exportModularComponents());
  renderTests();

  $('runAll').onclick = async () => {
    for (const t of TESTS) await runTest(t, t.outEl);
  };
  $('reset').onclick = resetUI;
  $('dump').onclick = () => {
    const w = window.open('', '_blank');
    w.document.write(`<pre>${JSON.stringify(defaultConfig, null, 2)}</pre>`);
  };
  $('copy').onclick = () => {
    const text = TESTS.map((t) => {
      const r = results[t.id];
      return r
        ? `${t.id}. ${t.title} [${r.status}]\n${r.lines.join('\n')}`
        : `${t.id}. ${t.title} [not run]`;
    }).join('\n\n');
    navigator.clipboard.writeText(text);
  };
});
