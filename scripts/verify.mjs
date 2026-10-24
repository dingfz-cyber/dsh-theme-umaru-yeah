import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script, createContext } from 'node:vm';

// This exercises plugin lifecycle against a deliberately narrow DOM contract.
// It does not replace the separate visual and native-interaction acceptance pass.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(resolve(root, path), 'utf8');
const [bundle, source, css, manifestText, patch] = await Promise.all([
  read('lib/client.js'), read('src/client.js'), read('src/theme.css'),
  read('package.json'), read('cordis.patch.yml'),
]);
const manifest = JSON.parse(manifestText);
const ID = 'dsh-theme-umaru-yeah';
const ATTRIBUTE = 'data-umaru-yeah';
const TARGETS = '[data-slot="main"] [data-phase]:has(> [data-conversation-content])';
const LOGO = '[data-slot="sidebar"] .wtg9ga_root:not(.wtg9ga_collapsed) .wtg9ga_logoRow';
const SHELL = '[class$="_frame"]:has(> [class$="_sidebarCol"])';
let passed = 0;
function check(name, run) {
  run();
  passed += 1;
  console.log(`PASS ${name}`);
}

const artMatch = bundle.match(/const ART = (\{[^\n]*\});/);
const cssMatch = bundle.match(/const CSS = ("(?:\\.|[^"\\])*");/);
assert.ok(artMatch && cssMatch, 'Run the build first; the client must contain concrete assets and CSS.');
const art = JSON.parse(artMatch[1]);
const assetFiles = { source: 'design-source.png', room: 'room-clean.png' };
const pngs = {};
for (const [key, file] of Object.entries(assetFiles)) {
  pngs[key] = await readFile(resolve(root, 'assets', file));
}
check('the distributable contains the current source, CSS, and exact PNG bytes', () => {
  assert.deepEqual(Object.keys(art).sort(), Object.keys(assetFiles).sort());
  for (const key of Object.keys(assetFiles)) {
    const bytes = pngs[key];
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${key}: PNG signature`);
    assert.equal(bytes.subarray(12, 16).toString(), 'IHDR', `${key}: PNG header`);
    assert.ok(bytes.readUInt32BE(16) > 0 && bytes.readUInt32BE(20) > 0, `${key}: PNG dimensions`);
    assert.equal(art[key], `data:image/png;base64,${bytes.toString('base64')}`, `${key}: embedded data is current`);
  }
  assert.equal(pngs.source.readUInt32BE(16), 1487, 'source-crop coordinates require the approved canvas width');
  assert.equal(pngs.source.readUInt32BE(20), 1058, 'source-crop coordinates require the approved canvas height');
  assert.equal(JSON.parse(cssMatch[1]), css, 'CSS was rebuilt after the last source edit');
  const expanded = source.replace('/*__UMARU_ASSETS__*/ {}', () => JSON.stringify(art))
    .replace('/*__UMARU_CSS__*/ ""', () => JSON.stringify(css));
  assert.equal(bundle, expanded, 'client code was rebuilt after the last edit');
  assert.ok(!bundle.includes('/*__UMARU_'), 'no build marker survives');
  new Script(bundle, { filename: 'lib/client.js' });
});

for (const file of [manifest.main, manifest.exports['./client'], manifest.icon,
  manifest.dsh.bundle.patch, 'locale/zh.json', 'locale/en.json']) {
  await access(resolve(root, file));
}
check('package metadata resolves the plugin entry points and bundle name', () => {
  assert.equal(manifest.name, ID);
  assert.equal(manifest.exports['.'], './lib/index.js');
  assert.equal(manifest.exports['./client'], './lib/client.js');
  assert.match(patch, new RegExp(`name:\\s*${ID}(?:\\s|$)`));
  assert.equal(manifest.dsh.client.platform, 'web');
  assert.equal(manifest.dsh.client.immediately, true);
  for (const name of ['@deepseek-ai/dsh-client-ui-theme', '@deepseek-ai/dsh-client-ui-renderer', '@deepseek-ai/dsh-client-ui-sidebar']) {
    assert.ok(manifest.dsh.client.inject.includes(name), `declares ${name}`);
  }
});

function harness({ previous = null, scale = '', withTargets = true,
  withShortcuts = true, withCatalog = true, withSnapshot = true, withSubscribe = true,
  withInvoke = true, withModalSelector = true, missingIcons = [],
} = {}) {
  const created = [];
  const observers = [];
  const frames = new Map();
  const listeners = new Map();
  const networkCalls = [];
  const commandCalls = [];
  const warnings = [];
  const catalogSubscribers = new Set();
  const serviceInjections = [];
  let commands = [
    { id: 'session.rename', label: 'Rename current session', aria: 'Control+Shift+R' },
    { id: 'session.search', label: 'Search sessions', aria: 'Control+P' },
  ];
  const catalog = {};
  if (withSnapshot) catalog.getSnapshot = () => commands;
  if (withSubscribe) catalog.subscribe = (callback) => {
    catalogSubscribers.add(callback);
    return () => catalogSubscribers.delete(callback);
  };
  const registry = {};
  if (withInvoke) registry.invoke = function (id, context) {
    assert.equal(this, registry, 'dispatch preserves the native registry receiver');
    commandCalls.push({ id, context });
  };
  const shortcuts = { registry, ...(withCatalog ? { catalog } : {}) };
  const primitives = {
    ...(withModalSelector ? { modalSelector: '[data-test-shortcut-modal]' } : {}),
    ...Object.fromEntries(['IconEditOutlineRegular', 'IconSearchOutlineRegular']
      .filter((name) => !missingIcons.includes(name)).map((name) => [name, function Icon() {}])),
  };
  let frameId = 0;
  let nodeId = 0;
  let module;
  const fixture = { height: 1058, chrome: 0, targets: [], logo: null, shell: null, modals: [], modalQueries: 0 };
  const forbidNetwork = (kind) => (...args) => {
    networkCalls.push({ kind, args: args.length });
    throw new Error(`Unexpected network capability: ${kind}`);
  };
  class Style {
    constructor() { this.values = new Map(); }
    getPropertyValue(name) { return this.values.get(name) ?? ''; }
    setProperty(name, value) {
      assert.equal(name, '--umaru-scale', 'the theme only changes its own inline custom property');
      this.values.set(name, String(value));
    }
    removeProperty(name) {
      assert.equal(name, '--umaru-scale');
      const old = this.getPropertyValue(name);
      this.values.delete(name);
      return old;
    }
  }
  class Element {
    constructor(tagName, native = false) {
      this.id = ++nodeId;
      this.tagName = tagName;
      this.native = native;
      this.children = [];
      this.parentElement = null;
      this.attributes = new Map();
      this.dataset = {};
      this.style = new Style();
      this.className = '';
      this._text = '';
      created.push(this);
    }
    get isConnected() { return this === docRoot || Boolean(this.parentElement?.isConnected); }
    get textContent() {
      assert.ok(!this.native, 'the theme must not read native messages, titles, or account text');
      return this._text;
    }
    set textContent(value) {
      assert.ok(!this.native, 'the theme must not replace native content');
      this._text = value;
    }
    get innerHTML() { throw new Error('The theme must not inspect native markup.'); }
    set innerHTML(value) { throw new Error('The theme must not replace native markup.'); }
    setAttribute(name, value) {
      assert.ok(!this.native || (this === body && name === ATTRIBUTE), `unexpected native attribute write: ${name}`);
      this.attributes.set(name, String(value));
    }
    getAttribute(name) { return this.attributes.get(name) ?? null; }
    removeAttribute(name) {
      assert.ok(!this.native || (this === body && name === ATTRIBUTE));
      this.attributes.delete(name);
    }
    prepend(child) {
      assert.equal(child.tagName, 'div');
      assert.ok(Object.hasOwn(child.dataset, 'umaruOwned'), 'only owned decoration can enter native containers');
      assert.ok(!child.native);
      child.parentElement = this;
      this.children.unshift(child);
    }
    appendChild(child) {
      assert.equal(this, head, 'runtime DOM insertion is restricted to stylesheet and owned decoration');
      assert.equal(child.tagName, 'style');
      child.parentElement = this;
      this.children.push(child);
      return child;
    }
    remove() {
      assert.ok(!this.native, 'the theme must not remove native controls or messages');
      if (this.parentElement) {
        const parent = this.parentElement;
        parent.children = parent.children.filter((child) => child !== this);
        this.parentElement = null;
      }
    }
    getBoundingClientRect() { return { width: 1487, height: fixture.height }; }
    matches(selector) {
      if (selector === 'webview[data-sidebar-browser-frame]') {
        return this.tagName === 'webview' && this.attributes.has('data-sidebar-browser-frame');
      }
      if (selector === 'input, textarea, select, [contenteditable="true"], [contenteditable=""]') {
        return ['input', 'textarea', 'select'].includes(this.tagName)
          || ['true', ''].includes(this.getAttribute('contenteditable'));
      }
      if (selector === '.xterm') return this.className.split(/\s+/).includes('xterm');
      throw new Error(`Unexpected focus selector: ${selector}`);
    }
    closest(selector) {
      for (let node = this; node; node = node.parentElement) if (node.matches(selector)) return node;
      return null;
    }
  }
  const docRoot = new Element('#document', true);
  const nativeChild = (parent, name) => {
    const element = new Element(name, true);
    element.parentElement = parent;
    parent.children.push(element);
    return element;
  };
  const head = nativeChild(docRoot, 'head');
  const body = nativeChild(docRoot, 'body');
  const app = nativeChild(body, 'app-root');
  const shell = nativeChild(app, 'layout');
  const sidebar = nativeChild(shell, 'sidebar');
  const main = nativeChild(shell, 'main');
  const logo = nativeChild(sidebar, 'logo');
  nativeChild(sidebar, 'native-history-and-account');
  const conversation = nativeChild(main, 'conversation');
  const header = nativeChild(conversation, 'native-header');
  const transcript = nativeChild(conversation, 'native-transcript');
  const message = nativeChild(transcript, 'native-message');
  message._text = 'sentinel: native content must remain untouched';
  nativeChild(conversation, 'native-composer');
  if (withTargets) Object.assign(fixture, { targets: [conversation], logo, shell });
  if (previous !== null) body.attributes.set(ATTRIBUTE, previous);
  if (scale) body.style.values.set('--umaru-scale', scale);
  const nativeSnapshot = () => JSON.stringify([sidebar, header, transcript, message].map((n) => ({
    id: n.id, parent: n.parentElement?.id, text: n._text,
    children: n.children.filter((c) => c.native).map((c) => c.id), attrs: [...n.attributes],
  })));
  const initialSnapshot = nativeSnapshot();
  const document = {
    head, body, activeElement: body,
    createElement: (name) => {
      assert.ok(['style', 'div'].includes(name), `unexpected DOM creation: ${name}`);
      return new Element(name);
    },
    getElementById: (id) => { assert.equal(id, 'root'); return app; },
    querySelector: (selector) => {
      if (selector === SHELL) return fixture.shell;
      if (selector === TARGETS) return fixture.targets[0] ?? null;
      if (selector === LOGO) return fixture.logo;
      throw new Error(`Unexpected document query (possible native-content access): ${selector}`);
    },
    querySelectorAll: (selector) => {
      if (selector === TARGETS) return [...fixture.targets];
      assert.equal(selector, primitives.modalSelector, 'only native shortcut modal context is queried');
      fixture.modalQueries += 1;
      return [...fixture.modals];
    },
  };
  class Observer {
    constructor(callback) { this.callback = callback; this.active = false; observers.push(this); }
    observe(target, options) {
      assert.equal(target, app);
      assert.equal(options.childList, true);
      assert.equal(options.subtree, true);
      assert.deepEqual(Array.from(options.attributeFilter), ['data-sidebar-collapsed']);
      this.active = true;
    }
    disconnect() { this.active = false; }
  }
  const window = {
    innerHeight: 1058, innerWidth: 1487,
    addEventListener: (name, callback) => {
      assert.equal(name, 'resize');
      const entries = listeners.get(name) ?? new Set();
      entries.add(callback); listeners.set(name, entries);
    },
    removeEventListener: (name, callback) => listeners.get(name)?.delete(callback),
    __ModuleLoader__: { load: (definition) => {
      assert.equal(module, undefined, 'one client registration');
      module = definition;
    } },
  };
  const requestAnimationFrame = (callback) => { frames.set(++frameId, callback); return frameId; };
  const cancelAnimationFrame = (id) => frames.delete(id);
  Object.assign(window, { fetch: forbidNetwork('window.fetch') });
  const context = createContext({
    window, document, MutationObserver: Observer, requestAnimationFrame, cancelAnimationFrame,
    getComputedStyle: (element) => {
      assert.equal(element, shell, 'only shell chrome measurement is needed');
      return { paddingTop: `${fixture.chrome}px` };
    },
    fetch: forbidNetwork('fetch'), XMLHttpRequest: forbidNetwork('XMLHttpRequest'),
    WebSocket: forbidNetwork('WebSocket'), EventSource: forbidNetwork('EventSource'),
    navigator: { sendBeacon: forbidNetwork('sendBeacon') },
    console: { warn: (...args) => warnings.push(args) },
  });
  new Script(bundle, { filename: 'lib/client.js' }).runInContext(context, { timeout: 2000 });
  assert.equal(module.id, ID);
  const plugin = module.factory((name) => {
    if (name === 'react') return { createElement: (type, props, ...children) => ({ type, props, children }) };
    assert.equal(name, '@deepseek-ai/dsh-client-ui-primitives', 'only host React and native UI primitives are required');
    return primitives;
  });
  assert.deepEqual(Array.from(plugin.inject), ['theme', 'slots']);
  const palettes = new Map();
  const slots = new Map();
  const cleanups = [];
  const expectedSlots = {
    'umaru-polaroid': ['sidebar.footer.action', 15],
    'umaru-rename': ['conversation.session.header.actions', -100],
    'umaru-search': ['conversation.session.header.utilities', -1],
  };
  const makeSlots = (cleanupBucket) => ({
    inject: (name, factory) => {
      assert.ok(Object.values(expectedSlots).some(([slot]) => slot === name), `unexpected slot injection: ${name}`);
      const stop = factory();
      assert.equal(typeof stop, 'function'); cleanupBucket.push(stop);
    },
    register: (options, component) => {
      assert.deepEqual([options.name, options.order], expectedSlots[options.id], 'native slot and order are preserved');
      assert.ok(!slots.has(options.id), 'no duplicate registration');
      const subscriptions = new Map();
      const record = { options, component, active: true, props: {}, tree: undefined };
      // This models the renderer's declarative spec.inject hooks contract, not
      // React internals. Native React rendering remains part of live acceptance.
      record.render = (props = record.props) => {
        assert.ok(record.active, 'unmounted slots cannot render');
        record.props = props;
        const { hooks = {}, ...injected } = options.inject?.() ?? {};
        const hookProps = {};
        for (const [name, store] of Object.entries(hooks)) {
          const hookName = `use${name[0].toUpperCase()}${name.slice(1)}`;
          hookProps[hookName] = (select) => {
            assert.equal(typeof select, 'function');
            if (!subscriptions.has(name)) {
              subscriptions.set(name, store.subscribe(() => { if (record.active) record.render(); }));
            }
            return select(store.getSnapshot());
          };
        }
        record.tree = component({ ...injected, ...hookProps, ...props });
        return record.tree;
      };
      slots.set(options.id, record);
      return () => {
        record.active = false;
        for (const unsubscribe of subscriptions.values()) unsubscribe();
        subscriptions.clear();
        slots.delete(options.id);
      };
    },
  });
  const ctx = {
    inject: (names, factory) => {
      assert.deepEqual(Array.from(names), ['shortcuts'], 'the header bridge is optional');
      const childCleanups = [];
      const injection = { active: true };
      serviceInjections.push(injection);
      cleanups.push(() => {
        injection.active = false;
        while (childCleanups.length) childCleanups.pop()();
      });
      if (withShortcuts) {
        const stop = factory({ shortcuts, slots: makeSlots(childCleanups) });
        if (stop !== undefined) { assert.equal(typeof stop, 'function'); childCleanups.push(stop); }
      }
    },
    effect: (effect) => { const stop = effect(); assert.equal(typeof stop, 'function'); cleanups.push(stop); },
    theme: { overrideTokens: (name, values) => {
      assert.equal(name, ID);
      assert.ok(!palettes.has(name), 'one palette layer per activation');
      for (const [key, value] of Object.entries(values)) {
        assert.match(key, /^--dsw-/);
        assert.deepEqual(Object.keys(value).sort(), ['dark', 'light']);
        assert.match(value.light, /^#[\da-f]{6}$/i);
        assert.match(value.dark, /^#[\da-f]{6}$/i);
      }
      assert.equal(values['--dsw-alias-bg-base'].light, '#fdfaf3');
      assert.equal(values['--dsw-alias-bg-base'].dark, '#29211d');
      palettes.set(name, values);
      return () => palettes.delete(name);
    } },
    slots: makeSlots(cleanups),
  };
  const flush = () => {
    let turns = 0;
    while (frames.size) {
      assert.ok(++turns <= 5, 'observer/rAF must settle without a feedback loop');
      const pending = [...frames.values()]; frames.clear();
      for (const callback of pending) callback();
    }
    assert.equal(nativeSnapshot(), initialSnapshot, 'native messages and controls are unchanged');
  };
  const emit = (record = { type: 'childList' }) => {
    for (const observer of observers) if (observer.active) observer.callback([record]);
  };
  const owned = () => created.filter((n) => Object.hasOwn(n.dataset, 'umaruOwned') && n.parentElement);
  const styles = () => head.children.filter((n) => n.tagName === 'style');
  const dispose = () => { while (cleanups.length) cleanups.pop()(); };
  const assertClean = () => {
    assert.equal(owned().length, 0, 'all decorations removed, including detached targets');
    assert.equal(styles().length, 0, 'stylesheet removed');
    assert.equal(palettes.size, 0, 'palette override released');
    assert.equal(slots.size, 0, 'all footer and header slot registrations released');
    assert.equal(catalogSubscribers.size, 0, 'command catalog hook subscriptions released');
    assert.equal(serviceInjections.filter((entry) => entry.active).length, 0, 'optional service scopes released');
    assert.equal(observers.filter((o) => o.active).length, 0, 'observers disconnected');
    assert.equal(listeners.get('resize')?.size ?? 0, 0, 'resize listener removed');
    assert.equal(frames.size, 0, 'queued animation frame cancelled');
    assert.equal(nativeSnapshot(), initialSnapshot, 'native content preserved after disposal');
    assert.equal(networkCalls.length, 0, 'no network request attempted');
  };
  const setCommands = (rows) => {
    commands = rows;
    for (const subscriber of [...catalogSubscribers]) subscriber();
  };
  const renderSlot = (id, props) => slots.get(id)?.render(props) ?? null;
  const clickButton = (button, expectStop = false) => {
    let stopped = 0;
    const before = commandCalls.length;
    button.props.onClick({ stopPropagation: () => {
      stopped += 1;
      assert.equal(commandCalls.length, before, 'search stops the originating click before opening native search');
    } });
    assert.equal(stopped, expectStop ? 1 : 0, 'only session search stops propagation to the native outside-click listener');
  };
  return { plugin, ctx, fixture, document, body, main, nativeChild, conversation, logo, shell, window,
    frames, observers, listeners, palettes, slots, owned, styles, emit, flush, dispose, assertClean,
    shortcuts, primitives, commandCalls, warnings, catalogSubscribers, setCommands, renderSlot, clickButton };
}

check('apply mounts one palette, stylesheet, slot, and decorative pair per target without network', () => {
  const h = harness(); h.plugin.apply(h.ctx); h.flush();
  assert.equal(h.palettes.size, 1); assert.equal(h.styles().length, 1);
  assert.equal(h.body.getAttribute(ATTRIBUTE), '1');
  assert.equal(h.body.style.getPropertyValue('--umaru-scale'), '1.00000');
  assert.equal(h.owned().length, 4);
  assert.equal(h.observers.filter((o) => o.active).length, 1);
  assert.equal(h.listeners.get('resize').size, 1);
  const sidebar = (props) => h.renderSlot('umaru-polaroid', props);
  assert.equal(sidebar({ wide: false }), null, 'collapsed sidebar has no artwork');
  const tree = sidebar({ wide: true });
  assert.equal(tree.props['aria-hidden'], true);
  assert.equal(tree.children[0].children[0].props.src, art.source);
  assert.equal(tree.children[0].children[0].props.alt, '');
  assert.equal(tree.children[0].children[0].props.draggable, false);
  assert.doesNotMatch(h.styles()[0]._text, /@import\b|url\(\s*["']?(?:https?:|\/\/)/i);
  h.dispose(); h.assertClean();
  assert.equal(h.body.getAttribute(ATTRIBUTE), null);
  assert.equal(h.body.style.getPropertyValue('--umaru-scale'), '');
});

check('repeated mutation and resize notifications coalesce without duplicate decoration', () => {
  const h = harness(); h.plugin.apply(h.ctx);
  for (let i = 0; i < 40; i++) h.emit();
  for (const callback of h.listeners.get('resize')) callback();
  assert.equal(h.frames.size, 1, 'one queued frame for a mutation burst');
  h.flush(); assert.equal(h.owned().length, 4); assert.equal(h.styles().length, 1);
  h.emit({ type: 'attributes', attributeName: 'class' });
  assert.equal(h.frames.size, 0, 'irrelevant attributes do not schedule work');
  h.fixture.height = 300; h.window.innerWidth = 640; h.emit(); h.flush();
  assert.equal(h.body.style.getPropertyValue('--umaru-scale'), '0.62000');
  h.fixture.height = 1800; h.window.innerWidth = 2400; h.emit(); h.flush();
  assert.equal(h.body.style.getPropertyValue('--umaru-scale'), '1.20000');
  h.dispose(); h.assertClean();
});

check('navigation, multiple conversation targets, and sidebar collapse release stale decoration', () => {
  const h = harness(); h.plugin.apply(h.ctx);
  const replacement = h.nativeChild(h.main, 'second-conversation');
  h.fixture.targets = [h.conversation, replacement]; h.emit(); h.flush();
  assert.equal(h.owned().length, 6);
  h.fixture.targets = [replacement]; h.emit(); h.flush();
  assert.equal(h.conversation.children.filter((n) => !n.native).length, 0);
  assert.equal(h.owned().length, 4);
  h.fixture.logo = null;
  h.emit({ type: 'attributes', attributeName: 'data-sidebar-collapsed' }); h.flush();
  assert.equal(h.owned().length, 2);
  h.fixture.logo = h.logo; h.emit(); h.flush();
  assert.equal(h.owned().length, 4);
  replacement.parentElement = null; h.fixture.targets = []; h.emit(); h.flush();
  assert.equal(h.owned().length, 2, 'detached conversation decoration is removed');
  h.dispose(); h.assertClean();
});

check('dispose cancels pending work, restores pre-existing state, and permits clean reactivation', () => {
  const h = harness({ previous: 'existing-owner', scale: '0.75' });
  h.plugin.apply(h.ctx); h.emit();
  const pending = [...h.frames.values()];
  h.dispose(); h.assertClean();
  assert.equal(h.body.getAttribute(ATTRIBUTE), 'existing-owner');
  assert.equal(h.body.style.getPropertyValue('--umaru-scale'), '0.75');
  for (const callback of pending) callback();
  for (const observer of h.observers) observer.callback([{ type: 'childList' }]);
  h.assertClean();
  h.plugin.apply(h.ctx); h.flush();
  assert.equal(h.owned().length, 4); assert.equal(h.styles().length, 1);
  h.dispose(); h.assertClean();
  h.dispose(); h.assertClean();
});

check('a temporarily empty layout activates later without touching native data', () => {
  const h = harness({ withTargets: false }); h.plugin.apply(h.ctx); h.flush();
  assert.equal(h.owned().length, 0);
  Object.assign(h.fixture, { shell: h.shell, height: 1090, chrome: 32 });
  h.emit(); h.flush();
  assert.equal(h.body.style.getPropertyValue('--umaru-scale'), '1.00000', 'shell fallback excludes native window chrome');
  Object.assign(h.fixture, { height: 1058, chrome: 0 });
  Object.assign(h.fixture, { targets: [h.conversation], logo: h.logo, shell: h.shell });
  h.emit(); h.flush(); assert.equal(h.owned().length, 4);
  h.body.attributes.set(ATTRIBUTE, 'later-owner');
  h.dispose(); h.assertClean();
  assert.equal(h.body.getAttribute(ATTRIBUTE), 'later-owner', 'do not remove a later owner attribute');
});

check('header actions use native catalog labels and dispatch commands only when clicked', () => {
  const h = harness(); h.plugin.apply(h.ctx); h.flush();
  assert.equal(h.slots.size, 3, 'one artwork slot and two native-command slots');
  for (const [id, commandId, label, shortcut] of [
    ['umaru-rename', 'session.rename', 'Rename current session', 'Control+Shift+R'],
    ['umaru-search', 'session.search', 'Search sessions', 'Control+P'],
  ]) {
    const before = h.commandCalls.length;
    const button = h.renderSlot(id);
    h.renderSlot(id); h.emit(); h.flush();
    assert.equal(h.commandCalls.length, before, 'registration, render, and layout updates do not execute commands');
    assert.equal(button.type, 'button');
    assert.equal(button.props.type, 'button', 'header actions cannot submit the composer');
    assert.equal(button.props['aria-label'], label);
    assert.equal(button.props.title, label);
    assert.equal(button.props['aria-keyshortcuts'], shortcut);
    assert.equal(button.children[0].props['aria-hidden'], true);
    h.clickButton(button, commandId === 'session.search');
    assert.equal(h.commandCalls.length, before + 1, 'one click dispatches exactly once');
    assert.equal(h.commandCalls.at(-1).id, commandId);
    assert.equal(h.commandCalls.at(-1).context.target, h.body);
    assert.equal(h.commandCalls.at(-1).context.region, 'page');
    assert.equal(h.commandCalls.at(-1).context.modal, null);
  }
  assert.equal(h.fixture.modalQueries, 2, 'focus/modal context is read on clicks only');
  h.dispose(); h.assertClean();
});

check('catalog updates hide unavailable commands, refresh labels, and reject stale button clicks', () => {
  const h = harness(); h.plugin.apply(h.ctx);
  const staleRename = h.renderSlot('umaru-rename');
  h.renderSlot('umaru-search');
  assert.equal(h.catalogSubscribers.size, 2, 'each rendered command reads the injected live catalog');
  h.setCommands([{ id: 'session.search', label: '查找会话', aria: 'Meta+P' }]);
  assert.equal(h.slots.get('umaru-rename').tree, null, 'removed commands have no inert button');
  assert.equal(h.slots.get('umaru-search').tree.props['aria-label'], '查找会话');
  assert.equal(h.slots.get('umaru-search').tree.props['aria-keyshortcuts'], 'Meta+P');
  h.clickButton(staleRename);
  assert.equal(h.commandCalls.length, 0, 'click rechecks the catalog after a prior render');
  h.setCommands([{ id: 'session.rename', label: '重命名当前会话', aria: 'Meta+Shift+R' }]);
  assert.equal(h.slots.get('umaru-search').tree, null);
  const restored = h.slots.get('umaru-rename').tree;
  assert.equal(restored.props['aria-label'], '重命名当前会话');
  h.clickButton(restored);
  assert.equal(h.commandCalls[0].id, 'session.rename');
  h.dispose(); h.assertClean();
});

check('missing optional services, API methods, modal contract, or icons leave the theme usable', () => {
  const cases = [
    { withShortcuts: false }, { withCatalog: false }, { withSnapshot: false },
    { withSubscribe: false }, { withInvoke: false }, { withModalSelector: false },
    { missingIcons: ['IconEditOutlineRegular', 'IconSearchOutlineRegular'] },
  ];
  for (const options of cases) {
    const h = harness(options); h.plugin.apply(h.ctx); h.flush();
    assert.equal(h.renderSlot('umaru-rename'), null, JSON.stringify(options));
    assert.equal(h.renderSlot('umaru-search'), null, JSON.stringify(options));
    assert.equal(h.owned().length, 4, 'optional header bridge does not gate decoration');
    assert.equal(h.palettes.size, 1); assert.equal(h.styles().length, 1);
    assert.ok(h.renderSlot('umaru-polaroid', { wide: true }));
    assert.equal(h.commandCalls.length, 0);
    h.dispose(); h.assertClean();
  }
  const h = harness({ missingIcons: ['IconEditOutlineRegular'] }); h.plugin.apply(h.ctx);
  assert.equal(h.renderSlot('umaru-rename'), null);
  assert.equal(h.renderSlot('umaru-search').type, 'button', 'one missing icon does not disable the other native command');
  h.dispose(); h.assertClean();
});

check('click context preserves editable, terminal, shadow-root, browser-frame, and top-modal semantics', () => {
  const h = harness(); h.plugin.apply(h.ctx);
  const button = h.renderSlot('umaru-search');
  const click = (target, region, modals = [], expectedModal = null) => {
    h.document.activeElement = target; h.fixture.modals = modals;
    h.clickButton(button, true);
    const call = h.commandCalls.at(-1);
    assert.equal(call.id, 'session.search');
    assert.equal(call.context.target, target, 'the current focused element is passed through');
    assert.equal(call.context.region, region);
    assert.equal(call.context.modal, expectedModal);
  };
  for (const tag of ['input', 'textarea', 'select']) click(h.nativeChild(h.main, tag), 'editable');
  for (const value of ['true', '']) {
    const editor = h.nativeChild(h.main, 'div'); editor.attributes.set('contenteditable', value);
    click(editor, 'editable');
  }
  const readOnly = h.nativeChild(h.main, 'div'); readOnly.attributes.set('contenteditable', 'false');
  click(readOnly, 'page');
  const terminal = h.nativeChild(h.main, 'div'); terminal.className = 'xterm';
  const terminalInput = h.nativeChild(terminal, 'textarea');
  click(terminalInput, 'terminal');
  const shadowHost = h.nativeChild(h.main, 'div');
  const innerHost = h.nativeChild(h.main, 'div');
  const shadowInput = h.nativeChild(h.main, 'input');
  shadowHost.shadowRoot = { activeElement: innerHost };
  innerHost.shadowRoot = { activeElement: shadowInput };
  h.document.activeElement = shadowHost; h.fixture.modals = [];
  h.clickButton(button, true);
  assert.equal(h.commandCalls.at(-1).context.target, shadowInput, 'nested shadow focus is resolved at click time');
  assert.equal(h.commandCalls.at(-1).context.region, 'editable');
  const browser = h.nativeChild(h.main, 'webview');
  browser.attributes.set('data-sidebar-browser-frame', '');
  browser.shadowRoot = { activeElement: shadowInput };
  click(browser, 'page');
  const underneath = { dataset: { shortcutModal: 'settings' } };
  const top = { dataset: { shortcutModal: 'shortcuts' } };
  click(h.body, 'page', [underneath, top], 'shortcuts');
  click(h.body, 'page', [underneath, { dataset: {} }], 'other');
  click(h.body, 'page');
  h.dispose(); h.assertClean();
});

check('a bridge removed after render does not dispatch and native command errors remain contained', () => {
  const h = harness(); h.plugin.apply(h.ctx);
  const button = h.renderSlot('umaru-rename');
  const originalInvoke = h.shortcuts.registry.invoke;
  delete h.shortcuts.registry.invoke;
  h.clickButton(button);
  assert.equal(h.commandCalls.length, 0);
  assert.equal(h.renderSlot('umaru-rename'), null);
  h.shortcuts.registry.invoke = originalInvoke;
  delete h.primitives.modalSelector;
  h.clickButton(button);
  assert.equal(h.commandCalls.length, 0);
  assert.equal(h.renderSlot('umaru-rename'), null);
  h.primitives.modalSelector = '[data-test-shortcut-modal]';
  h.shortcuts.registry.invoke = () => { throw new Error('Simulated changed native bridge'); };
  assert.doesNotThrow(() => h.clickButton(button));
  assert.equal(h.warnings.length, 1, 'a native error gives one bounded diagnostic');
  assert.equal(h.warnings[0][1], 'session.rename');
  h.dispose(); h.assertClean();
});

check('rendered header slots unsubscribe on disposal and reactivate without stale handlers or duplicate slots', () => {
  const h = harness(); h.plugin.apply(h.ctx);
  h.renderSlot('umaru-rename'); h.renderSlot('umaru-search');
  const oldSlots = [...h.slots.values()];
  const queuedNotifications = [...h.catalogSubscribers];
  assert.equal(queuedNotifications.length, 2);
  h.dispose(); h.assertClean();
  for (const callback of queuedNotifications) callback();
  h.setCommands([{ id: 'session.search', label: 'Search after reactivation' }]);
  h.assertClean();
  assert.ok(oldSlots.every((slot) => !slot.active));
  h.plugin.apply(h.ctx); h.flush();
  assert.equal(h.slots.size, 3);
  assert.equal(h.renderSlot('umaru-rename'), null);
  const search = h.renderSlot('umaru-search');
  assert.equal(search.props['aria-label'], 'Search after reactivation');
  assert.equal(h.catalogSubscribers.size, 2);
  assert.equal(h.commandCalls.length, 0, 'catalog updates and reactivation do not execute commands');
  h.clickButton(search, true);
  assert.equal(h.commandCalls.length, 1);
  h.dispose(); h.assertClean();
});

console.log(`Verified ${passed} checks. Visual layout and native controls still require live acceptance.`);
