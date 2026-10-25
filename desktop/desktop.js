import { clientRuntimeProblems, effectiveClientOperations } from './kotoba-client-runtime.js';
import { artifactPins, deviceProfile } from './artifact-pins.js';

const runtime = Object.freeze({ schema: 'kotoba.app.client-runtime.v1', target: 'browser', profile: 'trusted-page-v1', entry: 'index.html', 'local-state': { adapter: 'localstorage', schema: 'murakumo.workspace.v1', version: 1 }, workers: [{ id: 'judgment', entry: 'wasm-host.js', protocol: 'kotoba.wasm32-browser-static.v1' }], operations: [] });
const $ = id => document.getElementById(id);
const key = 'murakumo.workspace.v1';
const schema = 'murakumo.workspace.recovery.v1';
const modules = new Map();
let state = { schema, entries: [], tasks: [] };
let ready = false;
let stateValid = false;
function node(tag, text, className) { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (className) el.className = className; return el; }
function message(id, text, error = false) { $(id).textContent = text; $(id).classList.toggle('error', error); }
function failure(error) { $('global-error').hidden = false; $('global-error').textContent = `${error.message || error} Your existing saved data has been preserved.`; }
const money = n => new Intl.NumberFormat('en', { maximumFractionDigits: 0 }).format(n);
const safeText = (s, max) => typeof s === 'string' && s.trim().length > 0 && s.length <= max;
const amount = n => Number.isSafeInteger(n) && n > 0 && n <= 1_000_000_000_000;
function validState(s) {
  if (!s || Object.keys(s).sort().join() !== 'entries,schema,tasks' || s.schema !== schema || !Array.isArray(s.entries) || !Array.isArray(s.tasks) || s.entries.length > 1000 || s.tasks.length > 1000) return false;
  const ids = new Set();
  for (const e of s.entries) {
    if (!e || Object.keys(e).sort().join() !== 'amount,credit,debit,description,id' || !safeText(e.id, 64) || ids.has(e.id) || !safeText(e.description, 120) || !safeText(e.debit, 64) || !safeText(e.credit, 64) || !amount(e.amount)) return false;
    ids.add(e.id);
  }
  for (const t of s.tasks) {
    if (!t || Object.keys(t).sort().join() !== 'id,priority,state,title' || !safeText(t.id, 64) || ids.has(t.id) || !safeText(t.title, 160) || !Number.isInteger(t.priority) || t.priority < 0 || t.priority > 4 || ![2, 3, 4].includes(t.state)) return false;
    ids.add(t.id);
  }
  return true;
}
async function commit(update) {
  if (!navigator.locks || !stateValid) throw Error('Safe local storage is unavailable.');
  await navigator.locks.request(key, () => {
    const saved = localStorage.getItem(key);
    const current = saved === null ? { schema, entries: [], tasks: [] } : JSON.parse(saved);
    if (!validState(current)) throw Error('Existing saved data failed validation.');
    const next = update(current);
    if (!validState(next)) throw Error('Invalid local state refused.');
    localStorage.setItem(key, JSON.stringify(next));
    state = next;
    render();
  });
}
function route() {
  const view = location.hash.slice(1) || 'overview';
  const chosen = document.querySelector(`[data-view="${['overview', 'apps', 'kaikei', 'dandori', 'node', 'recovery'].includes(view) ? view : 'overview'}"]`);
  document.querySelectorAll('[data-view]').forEach(section => { section.hidden = section !== chosen; });
  const nav = ['kaikei', 'dandori'].includes(chosen.dataset.view) ? 'apps' : chosen.dataset.view;
  document.querySelectorAll('[data-nav]').forEach(link => { if (link.dataset.nav === nav) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current'); });
  document.title = `${chosen.querySelector('h1').textContent} — Murakumo NixOS`;
  chosen.querySelector('h1').focus({ preventScroll: true });
}
async function bytes(path, expected, max) {
  const url = new URL(path, location.href);
  if (url.origin !== location.origin || !/^[a-f0-9]{64}$/.test(expected)) throw Error('Undeclared artifact refused.');
  const response = await fetch(url, { credentials: 'omit', redirect: 'error', cache: 'no-store' });
  if (!response.ok || response.url !== url.href) throw Error(`Artifact unavailable: ${path}`);
  const data = await response.arrayBuffer();
  if (data.byteLength > max) throw Error(`Artifact too large: ${path}`);
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', data))].map(n => n.toString(16).padStart(2, '0')).join('');
  if (hash !== expected) throw Error(`Artifact digest mismatch: ${path}`);
  return data;
}
async function judgment(app, args) {
  const module = modules.get(app);
  if (!module) throw Error('The verified app core is not available.');
  return new Promise((resolve, reject) => {
    const worker = new Worker('./wasm-host.js');
    const finish = (error, result) => { clearTimeout(timer); worker.terminate(); error ? reject(error) : resolve(result); };
    const timer = setTimeout(() => finish(Error('The app core exceeded its execution budget.')), 5000);
    worker.onerror = () => finish(Error('The app Worker failed.'));
    worker.onmessage = ({ data }) => {
      const match = /:status :ok :result (-?\d+) /.exec(data?.report || '');
      if (data?.exit !== 0 || data.wasmTrap || !match) return finish(Error('The app core refused this operation.'));
      const result = Number(match[1]);
      if (!Number.isSafeInteger(result)) return finish(Error('Invalid core result refused.'));
      finish(null, result);
    };
    worker.postMessage({ module, fuel: 1_000_000, allow: [38], args: args.map(String) });
  });
}
function render() {
  $('journal-total').textContent = money(state.entries.reduce((n, e) => n + e.amount, 0));
  $('journal-count').textContent = `${state.entries.length} balanced ${state.entries.length === 1 ? 'entry' : 'entries'}`;
  const rows = $('journal-rows'); rows.replaceChildren();
  if (!state.entries.length) { const td = node('td', 'Your first entry will appear here.'); td.colSpan = 4; const tr = node('tr'); tr.append(td); rows.append(tr); }
  for (const e of [...state.entries].reverse()) { const tr = node('tr'); for (const value of [e.description, e.debit, e.credit, money(e.amount)]) tr.append(node('td', value)); rows.append(tr); }
  const board = $('board'); board.replaceChildren();
  for (const [code, title] of [[2, 'To do'], [3, 'In progress'], [4, 'Done']]) {
    const column = node('article', undefined, 'board-column'); const h = node('h2', title);
    const tasks = state.tasks.filter(t => t.state === code).sort((a, b) => ([1, 2, 3, 4, 0].indexOf(a.priority) - [1, 2, 3, 4, 0].indexOf(b.priority)));
    h.append(node('span', String(tasks.length))); column.append(h);
    if (!tasks.length) column.append(node('p', 'Nothing here yet.', 'empty'));
    for (const task of tasks) {
      const card = node('div', undefined, 'task'); card.append(node('small', ['No priority', 'Urgent', 'High', 'Medium', 'Low'][task.priority]), node('p', task.title));
      const actions = node('div', undefined, 'task-actions');
      for (const [to, label] of (code === 2 ? [[3, 'Start']] : code === 3 ? [[4, 'Complete'], [2, 'Return to do']] : [[2, 'Reopen']])) {
        const button = node('button', label); button.type = 'button'; button.disabled = !ready; button.setAttribute('aria-label', `${label}: ${task.title}`);
        button.addEventListener('click', async () => {
          button.disabled = true;
          try {
            const current = state.tasks.find(t => t.id === task.id);
            if (!current || current.state !== code) throw Error('The task changed. Please try again.');
            const decision = await judgment('dandori', ['transition', code, to]);
            if (!([1, 2, 4, 5].includes(decision))) throw Error('Workflow transition refused.');
            // Check again after the Worker returns; avoid stale concurrent UI writes.
            if (state.tasks.find(t => t.id === task.id)?.state !== code) throw Error('The task changed. Please try again.');
            await commit(current => {
              if (current.tasks.find(t => t.id === task.id)?.state !== code) throw Error('The task changed. Please try again.');
              return { ...current, tasks: current.tasks.map(t => t.id === task.id ? { ...t, state: to } : t) };
            });
            message('task-message', `${task.title}: moved to ${to === 2 ? 'To do' : to === 3 ? 'In progress' : 'Done'}.`);
          } catch (error) { message('task-message', error.message, true); button.disabled = !ready; }
        });
        actions.append(button);
      }
      card.append(actions); column.append(card);
    }
    board.append(column);
  }
}
const appCatalog = document.querySelector('[data-view="overview"] .app-grid').cloneNode(true);
$('app-catalog').replaceWith(appCatalog);
document.addEventListener('submit', async event => {
  const form = event.target;
  if (!['journal-form', 'task-form'].includes(form.id)) return;
  event.preventDefault();
  const button = form.querySelector('button[type="submit"]');
  const messageId = form.id === 'journal-form' ? 'journal-message' : 'task-message';
  if (!ready) return message(messageId, 'The verified app runtime is not ready.', true);
  button.disabled = true;
  try {
    if (form.id === 'journal-form') {
      const debit = Number($('debit-amount').value), credit = Number($('credit-amount').value);
      if (!amount(debit) || !amount(credit)) throw Error('Use positive whole minor units, up to 1,000,000,000,000.');
      const entry = { id: crypto.randomUUID(), description: $('journal-description').value.trim(), debit: $('debit-account').value.trim(), credit: $('credit-account').value.trim(), amount: debit };
      const verdict = await judgment('kaikei', ['validate', 4, debit, 0, 0, credit]);
      if (verdict !== 0) throw Error(verdict === 32 ? 'Debit and credit must balance. Nothing was saved.' : `The journal core refused this entry (${verdict}).`);
      await commit(current => ({ ...current, entries: [...current.entries, entry] })); form.reset();
      message(messageId, 'Balanced entry saved in this browser.');
    } else {
      const title = $('task-title').value.trim(), priority = Number($('task-priority').value);
      const rank = await judgment('dandori', ['priority', priority]);
      if (rank < 0) throw Error('The Dandori core refused this priority.');
      await commit(current => ({ ...current, tasks: [...current.tasks, { id: crypto.randomUUID(), title, priority, state: 2 }] }));
      $('task-title').value = ''; message(messageId, 'Task added to your local board.');
    }
  } catch (error) { message(messageId, error.message, true); }
  finally { button.disabled = !ready; }
});
$('export-data').addEventListener('click', () => {
  if (!stateValid) return message('recovery-message', 'Existing data could not be validated. Export was refused.', true);
  const blob = new Blob([JSON.stringify(state, null, 2) + '\n'], { type: 'application/json' });
  const url = URL.createObjectURL(blob), link = node('a'); link.href = url; link.download = 'murakumo-workspace-recovery.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  message('recovery-message', 'Recovery copy downloaded. Store this plain-text copy somewhere you trust.');
});
async function selectedJSON(input, limit = 1_048_576) {
  const file = input.files?.[0]; if (!file) return null;
  if (file.size > limit) throw Error('This file is too large.');
  return JSON.parse(await file.text());
}
$('restore-data').addEventListener('change', async event => {
  try {
    const imported = await selectedJSON(event.target); if (imported === null) return;
    if (!validState(imported)) throw Error('Invalid recovery copy refused.');
    if (state.entries.length || state.tasks.length) throw Error('Restore needs an empty workspace. Existing work was preserved.');
    await commit(current => {
      if (current.entries.length || current.tasks.length) throw Error('Restore needs an empty workspace. Existing work was preserved.');
      return imported;
    }); message('recovery-message', 'Recovery copy restored locally.');
  } catch (error) { message('recovery-message', error.message, true); }
  finally { event.target.value = ''; }
});
$('observation-file').addEventListener('change', async event => {
  try {
    const observation = await selectedJSON(event.target); if (!observation) return;
    if (observation.schema !== 'itonami.node.local-observation.v1' || !/^[a-z0-9-]{1,64}$/.test(observation.hostLabel) || !['nixos-vm', 'nixos-host'].includes(observation.scope) || observation.source !== 'native-procfs' || observation.signed !== false || observation.enrollment !== 'unregistered' || observation.cellRuntime !== false) throw Error('This file is not a supported unsigned NixOS observation.');
    for (const field of ['observedAtMs', 'sequence', 'memoryTotalKiB', 'memoryAvailableKiB', 'linuxUptimeSeconds']) if (!Number.isSafeInteger(observation[field]) || observation[field] < 0) throw Error('Invalid observation measurements refused.');
    if (observation.memoryAvailableKiB > observation.memoryTotalKiB || observation.observedAtMs > Date.now() + 5000) throw Error('Inconsistent observation refused.');
    const fresh = Date.now() - observation.observedAtMs <= 30_000;
    const panel = $('observation-detail'); panel.replaceChildren(node('h2', observation.hostLabel), node('p', `${fresh ? 'Recent snapshot' : 'Historical snapshot'} · ${new Date(observation.observedAtMs).toLocaleString()} · ${observation.scope}`));
    const facts = node('dl', undefined, 'facts');
    for (const [label, value] of [['Memory available', `${(observation.memoryAvailableKiB / 1048576).toFixed(2)} GiB`], ['Memory total', `${(observation.memoryTotalKiB / 1048576).toFixed(2)} GiB`], ['Uptime', `${Math.floor(observation.linuxUptimeSeconds / 60)} minutes`], ['Sample', String(observation.sequence)], ['Admission', 'Unregistered'], ['Authority', 'Unsigned observation']]) { const group = node('div'); group.append(node('dt', label), node('dd', value)); facts.append(group); }
    panel.append(facts, node('p', 'This imported file is a point-in-time observation. It is not browser-verified admission or permission to run work. Import a new file to refresh.'));
    $('node-summary').textContent = fresh ? 'Recent snapshot' : 'Historical snapshot'; $('node-detail').textContent = `${observation.hostLabel} · unsigned · unregistered`;
    message('observation-message', 'Snapshot imported locally. No network request or node control was performed.');
  } catch (error) { message('observation-message', error.message, true); }
  finally { event.target.value = ''; }
});
window.addEventListener('hashchange', route);
window.addEventListener('storage', event => {
  if (event.key !== key) return;
  try { const next = JSON.parse(event.newValue); if (!validState(next)) throw Error('Another tab changed local storage to an invalid state.'); state = next; render(); } catch (error) { ready = false; stateValid = false; failure(error); }
});
try {
  $('live-notice').hidden = !deviceProfile.liveSession;
  const problems = clientRuntimeProblems(runtime, []);
  if (problems.length || effectiveClientOperations(runtime, { requestedCapabilities: [], approvedOperations: [], hostSupportedOperations: [] }).length) throw Error('The shared client-runtime contract refused this workspace.');
  const stored = localStorage.getItem(key);
  if (stored !== null) { const parsed = JSON.parse(stored); if (!validState(parsed)) throw Error('Saved local data failed validation.'); state = parsed; }
  stateValid = true;
  render(); route();
  for (const app of ['kaikei', 'dandori']) {
    const data = await bytes(`${app}.wasm`, artifactPins[`${app}.wasm`], 1_048_576);
    modules.set(app, await WebAssembly.compile(data));
    const expected = app === 'kaikei' ? 511 : 255;
    if (await judgment(app, ['test']) !== expected) throw Error(`${app} core self-check failed.`);
  }
  ready = true; $('runtime-status').textContent = 'Local runtime ready'; $('runtime-summary').textContent = '2 apps ready'; $('runtime-detail').textContent = 'Verified Wasm · browser Worker'; render();
} catch (error) { ready = false; $('runtime-status').textContent = 'Runtime unavailable'; $('runtime-summary').textContent = 'Needs attention'; failure(error); }
