(function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) {
    return;
  }
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) {
    processPreload(link);
  }
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") {
        continue;
      }
      for (const node of mutation.addedNodes) {
        if (node.tagName === "LINK" && node.rel === "modulepreload")
          processPreload(node);
      }
    }
  }).observe(document, { childList: true, subtree: true });
  function getFetchOpts(link) {
    const fetchOpts = {};
    if (link.integrity)
      fetchOpts.integrity = link.integrity;
    if (link.referrerPolicy)
      fetchOpts.referrerPolicy = link.referrerPolicy;
    if (link.crossOrigin === "use-credentials")
      fetchOpts.credentials = "include";
    else if (link.crossOrigin === "anonymous")
      fetchOpts.credentials = "omit";
    else
      fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep)
      return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
})();
const app = "";
function noop() {
}
const identity$1 = (x) => x;
function run(fn) {
  return fn();
}
function blank_object() {
  return /* @__PURE__ */ Object.create(null);
}
function run_all(fns) {
  fns.forEach(run);
}
function is_function(thing) {
  return typeof thing === "function";
}
function safe_not_equal(a, b) {
  return a != a ? b == b : a !== b || (a && typeof a === "object" || typeof a === "function");
}
let src_url_equal_anchor;
function src_url_equal(element_src, url) {
  if (!src_url_equal_anchor) {
    src_url_equal_anchor = document.createElement("a");
  }
  src_url_equal_anchor.href = url;
  return element_src === src_url_equal_anchor.href;
}
function is_empty(obj) {
  return Object.keys(obj).length === 0;
}
function subscribe(store, ...callbacks) {
  if (store == null) {
    return noop;
  }
  const unsub = store.subscribe(...callbacks);
  return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
}
function get_store_value(store) {
  let value;
  subscribe(store, (_) => value = _)();
  return value;
}
function component_subscribe(component, store, callback) {
  component.$$.on_destroy.push(subscribe(store, callback));
}
function null_to_empty(value) {
  return value == null ? "" : value;
}
function set_store_value(store, ret, value) {
  store.set(value);
  return ret;
}
function split_css_unit(value) {
  const split = typeof value === "string" && value.match(/^\s*(-?[\d.]+)([^\s]*)\s*$/);
  return split ? [parseFloat(split[1]), split[2] || "px"] : [value, "px"];
}
const is_client = typeof window !== "undefined";
let now = is_client ? () => window.performance.now() : () => Date.now();
let raf = is_client ? (cb) => requestAnimationFrame(cb) : noop;
const tasks = /* @__PURE__ */ new Set();
function run_tasks(now2) {
  tasks.forEach((task) => {
    if (!task.c(now2)) {
      tasks.delete(task);
      task.f();
    }
  });
  if (tasks.size !== 0)
    raf(run_tasks);
}
function loop(callback) {
  let task;
  if (tasks.size === 0)
    raf(run_tasks);
  return {
    promise: new Promise((fulfill) => {
      tasks.add(task = { c: callback, f: fulfill });
    }),
    abort() {
      tasks.delete(task);
    }
  };
}
function append(target, node) {
  target.appendChild(node);
}
function get_root_for_style(node) {
  if (!node)
    return document;
  const root = node.getRootNode ? node.getRootNode() : node.ownerDocument;
  if (root && root.host) {
    return root;
  }
  return node.ownerDocument;
}
function append_empty_stylesheet(node) {
  const style_element = element("style");
  append_stylesheet(get_root_for_style(node), style_element);
  return style_element.sheet;
}
function append_stylesheet(node, style) {
  append(node.head || node, style);
  return style.sheet;
}
function insert(target, node, anchor) {
  target.insertBefore(node, anchor || null);
}
function detach(node) {
  if (node.parentNode) {
    node.parentNode.removeChild(node);
  }
}
function destroy_each(iterations, detaching) {
  for (let i = 0; i < iterations.length; i += 1) {
    if (iterations[i])
      iterations[i].d(detaching);
  }
}
function element(name) {
  return document.createElement(name);
}
function svg_element(name) {
  return document.createElementNS("http://www.w3.org/2000/svg", name);
}
function text$1(data) {
  return document.createTextNode(data);
}
function space() {
  return text$1(" ");
}
function empty() {
  return text$1("");
}
function listen(node, event, handler, options) {
  node.addEventListener(event, handler, options);
  return () => node.removeEventListener(event, handler, options);
}
function attr(node, attribute, value) {
  if (value == null)
    node.removeAttribute(attribute);
  else if (node.getAttribute(attribute) !== value)
    node.setAttribute(attribute, value);
}
function children(element2) {
  return Array.from(element2.childNodes);
}
function set_data(text2, data) {
  data = "" + data;
  if (text2.data === data)
    return;
  text2.data = data;
}
function set_style(node, key, value, important) {
  if (value == null) {
    node.style.removeProperty(key);
  } else {
    node.style.setProperty(key, value, important ? "important" : "");
  }
}
let crossorigin;
function is_crossorigin() {
  if (crossorigin === void 0) {
    crossorigin = false;
    try {
      if (typeof window !== "undefined" && window.parent) {
        void window.parent.document;
      }
    } catch (error) {
      crossorigin = true;
    }
  }
  return crossorigin;
}
function add_iframe_resize_listener(node, fn) {
  const computed_style = getComputedStyle(node);
  if (computed_style.position === "static") {
    node.style.position = "relative";
  }
  const iframe = element("iframe");
  iframe.setAttribute("style", "display: block; position: absolute; top: 0; left: 0; width: 100%; height: 100%; overflow: hidden; border: 0; opacity: 0; pointer-events: none; z-index: -1;");
  iframe.setAttribute("aria-hidden", "true");
  iframe.tabIndex = -1;
  const crossorigin2 = is_crossorigin();
  let unsubscribe;
  if (crossorigin2) {
    iframe.src = "data:text/html,<script>onresize=function(){parent.postMessage(0,'*')}<\/script>";
    unsubscribe = listen(window, "message", (event) => {
      if (event.source === iframe.contentWindow)
        fn();
    });
  } else {
    iframe.src = "about:blank";
    iframe.onload = () => {
      unsubscribe = listen(iframe.contentWindow, "resize", fn);
      fn();
    };
  }
  append(node, iframe);
  return () => {
    if (crossorigin2) {
      unsubscribe();
    } else if (unsubscribe && iframe.contentWindow) {
      unsubscribe();
    }
    detach(iframe);
  };
}
function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
  const e = document.createEvent("CustomEvent");
  e.initCustomEvent(type, bubbles, cancelable, detail);
  return e;
}
class HtmlTag {
  constructor(is_svg = false) {
    this.is_svg = false;
    this.is_svg = is_svg;
    this.e = this.n = null;
  }
  c(html) {
    this.h(html);
  }
  m(html, target, anchor = null) {
    if (!this.e) {
      if (this.is_svg)
        this.e = svg_element(target.nodeName);
      else
        this.e = element(target.nodeType === 11 ? "TEMPLATE" : target.nodeName);
      this.t = target.tagName !== "TEMPLATE" ? target : target.content;
      this.c(html);
    }
    this.i(anchor);
  }
  h(html) {
    this.e.innerHTML = html;
    this.n = Array.from(this.e.nodeName === "TEMPLATE" ? this.e.content.childNodes : this.e.childNodes);
  }
  i(anchor) {
    for (let i = 0; i < this.n.length; i += 1) {
      insert(this.t, this.n[i], anchor);
    }
  }
  p(html) {
    this.d();
    this.h(html);
    this.i(this.a);
  }
  d() {
    this.n.forEach(detach);
  }
}
const managed_styles = /* @__PURE__ */ new Map();
let active = 0;
function hash(str) {
  let hash2 = 5381;
  let i = str.length;
  while (i--)
    hash2 = (hash2 << 5) - hash2 ^ str.charCodeAt(i);
  return hash2 >>> 0;
}
function create_style_information(doc, node) {
  const info = { stylesheet: append_empty_stylesheet(node), rules: {} };
  managed_styles.set(doc, info);
  return info;
}
function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
  const step = 16.666 / duration;
  let keyframes = "{\n";
  for (let p = 0; p <= 1; p += step) {
    const t = a + (b - a) * ease(p);
    keyframes += p * 100 + `%{${fn(t, 1 - t)}}
`;
  }
  const rule = keyframes + `100% {${fn(b, 1 - b)}}
}`;
  const name = `__svelte_${hash(rule)}_${uid}`;
  const doc = get_root_for_style(node);
  const { stylesheet, rules } = managed_styles.get(doc) || create_style_information(doc, node);
  if (!rules[name]) {
    rules[name] = true;
    stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
  }
  const animation = node.style.animation || "";
  node.style.animation = `${animation ? `${animation}, ` : ""}${name} ${duration}ms linear ${delay}ms 1 both`;
  active += 1;
  return name;
}
function delete_rule(node, name) {
  const previous = (node.style.animation || "").split(", ");
  const next = previous.filter(
    name ? (anim) => anim.indexOf(name) < 0 : (anim) => anim.indexOf("__svelte") === -1
    // remove all Svelte animations
  );
  const deleted = previous.length - next.length;
  if (deleted) {
    node.style.animation = next.join(", ");
    active -= deleted;
    if (!active)
      clear_rules();
  }
}
function clear_rules() {
  raf(() => {
    if (active)
      return;
    managed_styles.forEach((info) => {
      const { ownerNode } = info.stylesheet;
      if (ownerNode)
        detach(ownerNode);
    });
    managed_styles.clear();
  });
}
let current_component;
function set_current_component(component) {
  current_component = component;
}
function get_current_component() {
  if (!current_component)
    throw new Error("Function called outside component initialization");
  return current_component;
}
function onMount(fn) {
  get_current_component().$$.on_mount.push(fn);
}
const dirty_components = [];
const binding_callbacks = [];
let render_callbacks = [];
const flush_callbacks = [];
const resolved_promise = /* @__PURE__ */ Promise.resolve();
let update_scheduled = false;
function schedule_update() {
  if (!update_scheduled) {
    update_scheduled = true;
    resolved_promise.then(flush);
  }
}
function add_render_callback(fn) {
  render_callbacks.push(fn);
}
const seen_callbacks = /* @__PURE__ */ new Set();
let flushidx = 0;
function flush() {
  if (flushidx !== 0) {
    return;
  }
  const saved_component = current_component;
  do {
    try {
      while (flushidx < dirty_components.length) {
        const component = dirty_components[flushidx];
        flushidx++;
        set_current_component(component);
        update(component.$$);
      }
    } catch (e) {
      dirty_components.length = 0;
      flushidx = 0;
      throw e;
    }
    set_current_component(null);
    dirty_components.length = 0;
    flushidx = 0;
    while (binding_callbacks.length)
      binding_callbacks.pop()();
    for (let i = 0; i < render_callbacks.length; i += 1) {
      const callback = render_callbacks[i];
      if (!seen_callbacks.has(callback)) {
        seen_callbacks.add(callback);
        callback();
      }
    }
    render_callbacks.length = 0;
  } while (dirty_components.length);
  while (flush_callbacks.length) {
    flush_callbacks.pop()();
  }
  update_scheduled = false;
  seen_callbacks.clear();
  set_current_component(saved_component);
}
function update($$) {
  if ($$.fragment !== null) {
    $$.update();
    run_all($$.before_update);
    const dirty = $$.dirty;
    $$.dirty = [-1];
    $$.fragment && $$.fragment.p($$.ctx, dirty);
    $$.after_update.forEach(add_render_callback);
  }
}
function flush_render_callbacks(fns) {
  const filtered = [];
  const targets = [];
  render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
  targets.forEach((c) => c());
  render_callbacks = filtered;
}
let promise;
function wait() {
  if (!promise) {
    promise = Promise.resolve();
    promise.then(() => {
      promise = null;
    });
  }
  return promise;
}
function dispatch(node, direction, kind) {
  node.dispatchEvent(custom_event(`${direction ? "intro" : "outro"}${kind}`));
}
const outroing = /* @__PURE__ */ new Set();
let outros;
function group_outros() {
  outros = {
    r: 0,
    c: [],
    p: outros
    // parent group
  };
}
function check_outros() {
  if (!outros.r) {
    run_all(outros.c);
  }
  outros = outros.p;
}
function transition_in(block, local) {
  if (block && block.i) {
    outroing.delete(block);
    block.i(local);
  }
}
function transition_out(block, local, detach2, callback) {
  if (block && block.o) {
    if (outroing.has(block))
      return;
    outroing.add(block);
    outros.c.push(() => {
      outroing.delete(block);
      if (callback) {
        if (detach2)
          block.d(1);
        callback();
      }
    });
    block.o(local);
  } else if (callback) {
    callback();
  }
}
const null_transition = { duration: 0 };
function create_bidirectional_transition(node, fn, params, intro) {
  const options = { direction: "both" };
  let config = fn(node, params, options);
  let t = intro ? 0 : 1;
  let running_program = null;
  let pending_program = null;
  let animation_name = null;
  function clear_animation() {
    if (animation_name)
      delete_rule(node, animation_name);
  }
  function init2(program, duration) {
    const d = program.b - t;
    duration *= Math.abs(d);
    return {
      a: t,
      b: program.b,
      d,
      duration,
      start: program.start,
      end: program.start + duration,
      group: program.group
    };
  }
  function go(b) {
    const { delay = 0, duration = 300, easing = identity$1, tick = noop, css } = config || null_transition;
    const program = {
      start: now() + delay,
      b
    };
    if (!b) {
      program.group = outros;
      outros.r += 1;
    }
    if (running_program || pending_program) {
      pending_program = program;
    } else {
      if (css) {
        clear_animation();
        animation_name = create_rule(node, t, b, duration, delay, easing, css);
      }
      if (b)
        tick(0, 1);
      running_program = init2(program, duration);
      add_render_callback(() => dispatch(node, b, "start"));
      loop((now2) => {
        if (pending_program && now2 > pending_program.start) {
          running_program = init2(pending_program, duration);
          pending_program = null;
          dispatch(node, running_program.b, "start");
          if (css) {
            clear_animation();
            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
          }
        }
        if (running_program) {
          if (now2 >= running_program.end) {
            tick(t = running_program.b, 1 - t);
            dispatch(node, running_program.b, "end");
            if (!pending_program) {
              if (running_program.b) {
                clear_animation();
              } else {
                if (!--running_program.group.r)
                  run_all(running_program.group.c);
              }
            }
            running_program = null;
          } else if (now2 >= running_program.start) {
            const p = now2 - running_program.start;
            t = running_program.a + running_program.d * easing(p / running_program.duration);
            tick(t, 1 - t);
          }
        }
        return !!(running_program || pending_program);
      });
    }
  }
  return {
    run(b) {
      if (is_function(config)) {
        wait().then(() => {
          config = config(options);
          go(b);
        });
      } else {
        go(b);
      }
    },
    end() {
      clear_animation();
      running_program = pending_program = null;
    }
  };
}
function create_component(block) {
  block && block.c();
}
function mount_component(component, target, anchor, customElement) {
  const { fragment, after_update } = component.$$;
  fragment && fragment.m(target, anchor);
  if (!customElement) {
    add_render_callback(() => {
      const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
      if (component.$$.on_destroy) {
        component.$$.on_destroy.push(...new_on_destroy);
      } else {
        run_all(new_on_destroy);
      }
      component.$$.on_mount = [];
    });
  }
  after_update.forEach(add_render_callback);
}
function destroy_component(component, detaching) {
  const $$ = component.$$;
  if ($$.fragment !== null) {
    flush_render_callbacks($$.after_update);
    run_all($$.on_destroy);
    $$.fragment && $$.fragment.d(detaching);
    $$.on_destroy = $$.fragment = null;
    $$.ctx = [];
  }
}
function make_dirty(component, i) {
  if (component.$$.dirty[0] === -1) {
    dirty_components.push(component);
    schedule_update();
    component.$$.dirty.fill(0);
  }
  component.$$.dirty[i / 31 | 0] |= 1 << i % 31;
}
function init(component, options, instance2, create_fragment2, not_equal, props, append_styles, dirty = [-1]) {
  const parent_component = current_component;
  set_current_component(component);
  const $$ = component.$$ = {
    fragment: null,
    ctx: [],
    // state
    props,
    update: noop,
    not_equal,
    bound: blank_object(),
    // lifecycle
    on_mount: [],
    on_destroy: [],
    on_disconnect: [],
    before_update: [],
    after_update: [],
    context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
    // everything else
    callbacks: blank_object(),
    dirty,
    skip_bound: false,
    root: options.target || parent_component.$$.root
  };
  append_styles && append_styles($$.root);
  let ready = false;
  $$.ctx = instance2 ? instance2(component, options.props || {}, (i, ret, ...rest) => {
    const value = rest.length ? rest[0] : ret;
    if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
      if (!$$.skip_bound && $$.bound[i])
        $$.bound[i](value);
      if (ready)
        make_dirty(component, i);
    }
    return ret;
  }) : [];
  $$.update();
  ready = true;
  run_all($$.before_update);
  $$.fragment = create_fragment2 ? create_fragment2($$.ctx) : false;
  if (options.target) {
    if (options.hydrate) {
      const nodes = children(options.target);
      $$.fragment && $$.fragment.l(nodes);
      nodes.forEach(detach);
    } else {
      $$.fragment && $$.fragment.c();
    }
    if (options.intro)
      transition_in(component.$$.fragment);
    mount_component(component, options.target, options.anchor, options.customElement);
    flush();
  }
  set_current_component(parent_component);
}
class SvelteComponent {
  $destroy() {
    destroy_component(this, 1);
    this.$destroy = noop;
  }
  $on(type, callback) {
    if (!is_function(callback)) {
      return noop;
    }
    const callbacks = this.$$.callbacks[type] || (this.$$.callbacks[type] = []);
    callbacks.push(callback);
    return () => {
      const index = callbacks.indexOf(callback);
      if (index !== -1)
        callbacks.splice(index, 1);
    };
  }
  $set($$props) {
    if (this.$$set && !is_empty($$props)) {
      this.$$.skip_bound = true;
      this.$$set($$props);
      this.$$.skip_bound = false;
    }
  }
}
const subscriber_queue = [];
function readable(value, start) {
  return {
    subscribe: writable(value, start).subscribe
  };
}
function writable(value, start = noop) {
  let stop;
  const subscribers = /* @__PURE__ */ new Set();
  function set(new_value) {
    if (safe_not_equal(value, new_value)) {
      value = new_value;
      if (stop) {
        const run_queue = !subscriber_queue.length;
        for (const subscriber of subscribers) {
          subscriber[1]();
          subscriber_queue.push(subscriber, value);
        }
        if (run_queue) {
          for (let i = 0; i < subscriber_queue.length; i += 2) {
            subscriber_queue[i][0](subscriber_queue[i + 1]);
          }
          subscriber_queue.length = 0;
        }
      }
    }
  }
  function update2(fn) {
    set(fn(value));
  }
  function subscribe2(run2, invalidate = noop) {
    const subscriber = [run2, invalidate];
    subscribers.add(subscriber);
    if (subscribers.size === 1) {
      stop = start(set) || noop;
    }
    run2(value);
    return () => {
      subscribers.delete(subscriber);
      if (subscribers.size === 0 && stop) {
        stop();
        stop = null;
      }
    };
  }
  return { set, update: update2, subscribe: subscribe2 };
}
function derived(stores, fn, initial_value) {
  const single = !Array.isArray(stores);
  const stores_array = single ? [stores] : stores;
  const auto = fn.length < 2;
  return readable(initial_value, (set) => {
    let started = false;
    const values = [];
    let pending = 0;
    let cleanup = noop;
    const sync = () => {
      if (pending) {
        return;
      }
      cleanup();
      const result = fn(single ? values[0] : values, set);
      if (auto) {
        set(result);
      } else {
        cleanup = is_function(result) ? result : noop;
      }
    };
    const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
      values[i] = value;
      pending &= ~(1 << i);
      if (started) {
        sync();
      }
    }, () => {
      pending |= 1 << i;
    }));
    started = true;
    sync();
    return function stop() {
      run_all(unsubscribers);
      cleanup();
      started = false;
    };
  });
}
var EOL = {}, EOF = {}, QUOTE = 34, NEWLINE = 10, RETURN = 13;
function objectConverter(columns) {
  return new Function("d", "return {" + columns.map(function(name, i) {
    return JSON.stringify(name) + ": d[" + i + '] || ""';
  }).join(",") + "}");
}
function customConverter(columns, f) {
  var object = objectConverter(columns);
  return function(row, i) {
    return f(object(row), i, columns);
  };
}
function inferColumns(rows) {
  var columnSet = /* @__PURE__ */ Object.create(null), columns = [];
  rows.forEach(function(row) {
    for (var column in row) {
      if (!(column in columnSet)) {
        columns.push(columnSet[column] = column);
      }
    }
  });
  return columns;
}
function pad(value, width) {
  var s = value + "", length = s.length;
  return length < width ? new Array(width - length + 1).join(0) + s : s;
}
function formatYear(year) {
  return year < 0 ? "-" + pad(-year, 6) : year > 9999 ? "+" + pad(year, 6) : pad(year, 4);
}
function formatDate(date) {
  var hours = date.getUTCHours(), minutes = date.getUTCMinutes(), seconds = date.getUTCSeconds(), milliseconds = date.getUTCMilliseconds();
  return isNaN(date) ? "Invalid Date" : formatYear(date.getUTCFullYear()) + "-" + pad(date.getUTCMonth() + 1, 2) + "-" + pad(date.getUTCDate(), 2) + (milliseconds ? "T" + pad(hours, 2) + ":" + pad(minutes, 2) + ":" + pad(seconds, 2) + "." + pad(milliseconds, 3) + "Z" : seconds ? "T" + pad(hours, 2) + ":" + pad(minutes, 2) + ":" + pad(seconds, 2) + "Z" : minutes || hours ? "T" + pad(hours, 2) + ":" + pad(minutes, 2) + "Z" : "");
}
function dsvFormat(delimiter) {
  var reFormat = new RegExp('["' + delimiter + "\n\r]"), DELIMITER = delimiter.charCodeAt(0);
  function parse(text2, f) {
    var convert, columns, rows = parseRows(text2, function(row, i) {
      if (convert)
        return convert(row, i - 1);
      columns = row, convert = f ? customConverter(row, f) : objectConverter(row);
    });
    rows.columns = columns || [];
    return rows;
  }
  function parseRows(text2, f) {
    var rows = [], N = text2.length, I = 0, n = 0, t, eof = N <= 0, eol = false;
    if (text2.charCodeAt(N - 1) === NEWLINE)
      --N;
    if (text2.charCodeAt(N - 1) === RETURN)
      --N;
    function token() {
      if (eof)
        return EOF;
      if (eol)
        return eol = false, EOL;
      var i, j = I, c;
      if (text2.charCodeAt(j) === QUOTE) {
        while (I++ < N && text2.charCodeAt(I) !== QUOTE || text2.charCodeAt(++I) === QUOTE)
          ;
        if ((i = I) >= N)
          eof = true;
        else if ((c = text2.charCodeAt(I++)) === NEWLINE)
          eol = true;
        else if (c === RETURN) {
          eol = true;
          if (text2.charCodeAt(I) === NEWLINE)
            ++I;
        }
        return text2.slice(j + 1, i - 1).replace(/""/g, '"');
      }
      while (I < N) {
        if ((c = text2.charCodeAt(i = I++)) === NEWLINE)
          eol = true;
        else if (c === RETURN) {
          eol = true;
          if (text2.charCodeAt(I) === NEWLINE)
            ++I;
        } else if (c !== DELIMITER)
          continue;
        return text2.slice(j, i);
      }
      return eof = true, text2.slice(j, N);
    }
    while ((t = token()) !== EOF) {
      var row = [];
      while (t !== EOL && t !== EOF)
        row.push(t), t = token();
      if (f && (row = f(row, n++)) == null)
        continue;
      rows.push(row);
    }
    return rows;
  }
  function preformatBody(rows, columns) {
    return rows.map(function(row) {
      return columns.map(function(column) {
        return formatValue(row[column]);
      }).join(delimiter);
    });
  }
  function format(rows, columns) {
    if (columns == null)
      columns = inferColumns(rows);
    return [columns.map(formatValue).join(delimiter)].concat(preformatBody(rows, columns)).join("\n");
  }
  function formatBody(rows, columns) {
    if (columns == null)
      columns = inferColumns(rows);
    return preformatBody(rows, columns).join("\n");
  }
  function formatRows(rows) {
    return rows.map(formatRow).join("\n");
  }
  function formatRow(row) {
    return row.map(formatValue).join(delimiter);
  }
  function formatValue(value) {
    return value == null ? "" : value instanceof Date ? formatDate(value) : reFormat.test(value += "") ? '"' + value.replace(/"/g, '""') + '"' : value;
  }
  return {
    parse,
    parseRows,
    format,
    formatBody,
    formatRows,
    formatRow,
    formatValue
  };
}
var csv$1 = dsvFormat(",");
var csvParse = csv$1.parse;
function autoType(object) {
  for (var key in object) {
    var value = object[key].trim(), number, m;
    if (!value)
      value = null;
    else if (value === "true")
      value = true;
    else if (value === "false")
      value = false;
    else if (value === "NaN")
      value = NaN;
    else if (!isNaN(number = +value))
      value = number;
    else if (m = value.match(/^([-+]\d{2})?\d{4}(-\d{2}(-\d{2})?)?(T\d{2}:\d{2}(:\d{2}(\.\d{3})?)?(Z|[-+]\d{2}:\d{2})?)?$/)) {
      if (fixtz && !!m[4] && !m[7])
        value = value.replace(/-/g, "/").replace(/T/, " ");
      value = new Date(value);
    } else
      continue;
    object[key] = value;
  }
  return object;
}
const fixtz = (/* @__PURE__ */ new Date("2019-01-01T00:00")).getHours() || (/* @__PURE__ */ new Date("2019-07-01T00:00")).getHours();
function responseText(response) {
  if (!response.ok)
    throw new Error(response.status + " " + response.statusText);
  return response.text();
}
function text(input, init2) {
  return fetch(input, init2).then(responseText);
}
function dsvParse(parse) {
  return function(input, init2, row) {
    if (arguments.length === 2 && typeof init2 === "function")
      row = init2, init2 = void 0;
    return text(input, init2).then(function(response) {
      return parse(response, row);
    });
  };
}
var csv = dsvParse(csvParse);
class InternMap extends Map {
  constructor(entries, key = keyof) {
    super();
    Object.defineProperties(this, { _intern: { value: /* @__PURE__ */ new Map() }, _key: { value: key } });
    if (entries != null)
      for (const [key2, value] of entries)
        this.set(key2, value);
  }
  get(key) {
    return super.get(intern_get(this, key));
  }
  has(key) {
    return super.has(intern_get(this, key));
  }
  set(key, value) {
    return super.set(intern_set(this, key), value);
  }
  delete(key) {
    return super.delete(intern_delete(this, key));
  }
}
function intern_get({ _intern, _key }, value) {
  const key = _key(value);
  return _intern.has(key) ? _intern.get(key) : value;
}
function intern_set({ _intern, _key }, value) {
  const key = _key(value);
  if (_intern.has(key))
    return _intern.get(key);
  _intern.set(key, value);
  return value;
}
function intern_delete({ _intern, _key }, value) {
  const key = _key(value);
  if (_intern.has(key)) {
    value = _intern.get(key);
    _intern.delete(key);
  }
  return value;
}
function keyof(value) {
  return value !== null && typeof value === "object" ? value.valueOf() : value;
}
function identity(x) {
  return x;
}
function group(values, ...keys) {
  return nest(values, identity, identity, keys);
}
function nest(values, map, reduce, keys) {
  return function regroup(values2, i) {
    if (i >= keys.length)
      return reduce(values2);
    const groups = new InternMap();
    const keyof2 = keys[i++];
    let index = -1;
    for (const value of values2) {
      const key = keyof2(value, ++index, values2);
      const group2 = groups.get(key);
      if (group2)
        group2.push(value);
      else
        groups.set(key, [value]);
    }
    for (const [key, values3] of groups) {
      groups.set(key, regroup(values3, i));
    }
    return map(groups);
  }(values, 0);
}
const mobileBreak = readable(700);
const windowWidth = writable(window.innerWidth);
const isMobile = derived([mobileBreak, windowWidth], ([$mobileBreak, $windowWidth]) => $windowWidth < $mobileBreak);
const slideWidth = writable(0);
const legend_1_3 = readable([
  {
    label: "original report by the UK",
    colour: "#EDB83A",
    radius: "50%",
    label_colour: "#EDB83A"
  },
  {
    label: "our calculations",
    colour: "#01FFD8",
    radius: "50%",
    label_colour: "#01FFD8"
  }
]);
const legend_3_1 = readable([
  {
    label: "needs covered",
    colour: "#C2C2C2",
    radius: "10%",
    label_colour: "#FFFFFF"
  },
  {
    label: "needs not covered",
    colour: "#3E4247",
    radius: "10%",
    label_colour: "#FFFFFF"
  }
]);
function resize() {
  windowWidth.set(window.innerWidth);
}
window.addEventListener("resize", resize);
function getGridColWidth(width) {
  if (!get_store_value(isMobile)) {
    return `1fr ${width} 1fr`;
  }
  return `auto`;
}
function getExtendedWidthStyle(widthFactor, columnWidth, graphic = true) {
  const extendedWidth = widthFactor * columnWidth;
  let mobileStyle;
  if (graphic) {
    mobileStyle = get_store_value(windowWidth) < 500 ? `width: ${extendedWidth}px; max-width: ${columnWidth}px` : `width: ${extendedWidth}px; max-width: 60%`;
  } else {
    mobileStyle = `width: ${extendedWidth}px; max-width: ${columnWidth}px`;
  }
  const desktopStyle = `width: ${extendedWidth}px; max-width: 90%`;
  return get_store_value(isMobile) ? mobileStyle : desktopStyle;
}
function prepareText(copy) {
  return copy.map((obj) => {
    if (!obj.glossary) {
      return { ...obj, text_prepped: [{ type: "text", content: obj.text }] };
    }
    const glossary = JSON.parse(obj.glossary);
    const text_prepped = [];
    let lastIndex = 0;
    obj.text.replace(/¶(\d*)([^\d¶][^¶]*)¶/g, (match, p1, p2, index) => {
      if (index > lastIndex) {
        text_prepped.push({ type: "text", content: obj.text.slice(lastIndex, index) });
      }
      const glossaryIndex = p1 ? parseInt(p1, 10) : 0;
      const glossaryText = glossary[glossaryIndex];
      text_prepped.push({ type: "button", content: p2, glossaryText });
      lastIndex = index + match.length;
    });
    if (lastIndex < obj.text.length) {
      text_prepped.push({ type: "text", content: obj.text.slice(lastIndex) });
    }
    return { ...obj, text_prepped };
  });
}
const Progress_svelte_svelte_type_style_lang = "";
function create_fragment$p(ctx) {
  let div1;
  let div0;
  return {
    c() {
      div1 = element("div");
      div0 = element("div");
      attr(div0, "class", "progress svelte-4x2rwj");
      set_style(
        div0,
        "width",
        /*progress*/
        ctx[0] + "%"
      );
      attr(div1, "class", "progress-wrap svelte-4x2rwj");
    },
    m(target, anchor) {
      insert(target, div1, anchor);
      append(div1, div0);
    },
    p(ctx2, [dirty]) {
      if (dirty & /*progress*/
      1) {
        set_style(
          div0,
          "width",
          /*progress*/
          ctx2[0] + "%"
        );
      }
    },
    i: noop,
    o: noop,
    d(detaching) {
      if (detaching)
        detach(div1);
    }
  };
}
function instance$m($$self, $$props, $$invalidate) {
  let { progress = 0 } = $$props;
  $$self.$$set = ($$props2) => {
    if ("progress" in $$props2)
      $$invalidate(0, progress = $$props2.progress);
  };
  return [progress];
}
class Progress extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$m, create_fragment$p, safe_not_equal, { progress: 0 });
  }
}
function cubicOut(t) {
  const f = t - 1;
  return f * f * f + 1;
}
function fly(node, { delay = 0, duration = 400, easing = cubicOut, x = 0, y = 0, opacity = 0 } = {}) {
  const style = getComputedStyle(node);
  const target_opacity = +style.opacity;
  const transform = style.transform === "none" ? "" : style.transform;
  const od = target_opacity * (1 - opacity);
  const [xValue, xUnit] = split_css_unit(x);
  const [yValue, yUnit] = split_css_unit(y);
  return {
    delay,
    duration,
    easing,
    css: (t, u) => `
			transform: ${transform} translate(${(1 - t) * xValue}${xUnit}, ${(1 - t) * yValue}${yUnit});
			opacity: ${target_opacity - od * u}`
  };
}
function slide(node, { delay = 0, duration = 400, easing = cubicOut, axis = "y" } = {}) {
  const style = getComputedStyle(node);
  const opacity = +style.opacity;
  const primary_property = axis === "y" ? "height" : "width";
  const primary_property_value = parseFloat(style[primary_property]);
  const secondary_properties = axis === "y" ? ["top", "bottom"] : ["left", "right"];
  const capitalized_secondary_properties = secondary_properties.map((e) => `${e[0].toUpperCase()}${e.slice(1)}`);
  const padding_start_value = parseFloat(style[`padding${capitalized_secondary_properties[0]}`]);
  const padding_end_value = parseFloat(style[`padding${capitalized_secondary_properties[1]}`]);
  const margin_start_value = parseFloat(style[`margin${capitalized_secondary_properties[0]}`]);
  const margin_end_value = parseFloat(style[`margin${capitalized_secondary_properties[1]}`]);
  const border_width_start_value = parseFloat(style[`border${capitalized_secondary_properties[0]}Width`]);
  const border_width_end_value = parseFloat(style[`border${capitalized_secondary_properties[1]}Width`]);
  return {
    delay,
    duration,
    easing,
    css: (t) => `overflow: hidden;opacity: ${Math.min(t * 20, 1) * opacity};${primary_property}: ${t * primary_property_value}px;padding-${secondary_properties[0]}: ${t * padding_start_value}px;padding-${secondary_properties[1]}: ${t * padding_end_value}px;margin-${secondary_properties[0]}: ${t * margin_start_value}px;margin-${secondary_properties[1]}: ${t * margin_end_value}px;border-${secondary_properties[0]}-width: ${t * border_width_start_value}px;border-${secondary_properties[1]}-width: ${t * border_width_end_value}px;`
  };
}
const bookmark = "" + new URL("bookmark.svg", import.meta.url).href;
const Bookmarks_svelte_svelte_type_style_lang = "";
function get_each_context$4(ctx, list, i) {
  const child_ctx = ctx.slice();
  child_ctx[6] = list[i];
  child_ctx[8] = i;
  return child_ctx;
}
function create_if_block$a(ctx) {
  let ul;
  let ul_transition;
  let current;
  let if_block = (
    /*$chapters*/
    ctx[2].length && create_if_block_1$5(ctx)
  );
  return {
    c() {
      ul = element("ul");
      if (if_block)
        if_block.c();
      attr(ul, "class", "svelte-6gvisy");
    },
    m(target, anchor) {
      insert(target, ul, anchor);
      if (if_block)
        if_block.m(ul, null);
      current = true;
    },
    p(ctx2, dirty) {
      if (
        /*$chapters*/
        ctx2[2].length
      ) {
        if (if_block) {
          if_block.p(ctx2, dirty);
        } else {
          if_block = create_if_block_1$5(ctx2);
          if_block.c();
          if_block.m(ul, null);
        }
      } else if (if_block) {
        if_block.d(1);
        if_block = null;
      }
    },
    i(local) {
      if (current)
        return;
      add_render_callback(() => {
        if (!current)
          return;
        if (!ul_transition)
          ul_transition = create_bidirectional_transition(ul, slide, { duration: 500 }, true);
        ul_transition.run(1);
      });
      current = true;
    },
    o(local) {
      if (!ul_transition)
        ul_transition = create_bidirectional_transition(ul, slide, { duration: 500 }, false);
      ul_transition.run(0);
      current = false;
    },
    d(detaching) {
      if (detaching)
        detach(ul);
      if (if_block)
        if_block.d();
      if (detaching && ul_transition)
        ul_transition.end();
    }
  };
}
function create_if_block_1$5(ctx) {
  let each_1_anchor;
  let each_value = (
    /*$chapters*/
    ctx[2]
  );
  let each_blocks = [];
  for (let i = 0; i < each_value.length; i += 1) {
    each_blocks[i] = create_each_block$4(get_each_context$4(ctx, each_value, i));
  }
  return {
    c() {
      for (let i = 0; i < each_blocks.length; i += 1) {
        each_blocks[i].c();
      }
      each_1_anchor = empty();
    },
    m(target, anchor) {
      for (let i = 0; i < each_blocks.length; i += 1) {
        if (each_blocks[i]) {
          each_blocks[i].m(target, anchor);
        }
      }
      insert(target, each_1_anchor, anchor);
    },
    p(ctx2, dirty) {
      if (dirty & /*click, $chapters*/
      12) {
        each_value = /*$chapters*/
        ctx2[2];
        let i;
        for (i = 0; i < each_value.length; i += 1) {
          const child_ctx = get_each_context$4(ctx2, each_value, i);
          if (each_blocks[i]) {
            each_blocks[i].p(child_ctx, dirty);
          } else {
            each_blocks[i] = create_each_block$4(child_ctx);
            each_blocks[i].c();
            each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
          }
        }
        for (; i < each_blocks.length; i += 1) {
          each_blocks[i].d(1);
        }
        each_blocks.length = each_value.length;
      }
    },
    d(detaching) {
      destroy_each(each_blocks, detaching);
      if (detaching)
        detach(each_1_anchor);
    }
  };
}
function create_each_block$4(ctx) {
  let li;
  let button;
  let div0;
  let t0_value = (
    /*chapter*/
    ctx[6].title_short + ""
  );
  let t0;
  let t1;
  let div1;
  let t2_value = (
    /*i*/
    ctx[8] + 1 + ""
  );
  let t2;
  let t3;
  let mounted;
  let dispose;
  function click_handler() {
    return (
      /*click_handler*/
      ctx[4](
        /*chapter*/
        ctx[6]
      )
    );
  }
  return {
    c() {
      li = element("li");
      button = element("button");
      div0 = element("div");
      t0 = text$1(t0_value);
      t1 = space();
      div1 = element("div");
      t2 = text$1(t2_value);
      t3 = space();
      attr(div0, "class", "svelte-6gvisy");
      attr(div1, "class", "circle svelte-6gvisy");
      attr(button, "class", "svelte-6gvisy");
      attr(li, "class", "svelte-6gvisy");
    },
    m(target, anchor) {
      insert(target, li, anchor);
      append(li, button);
      append(button, div0);
      append(div0, t0);
      append(button, t1);
      append(button, div1);
      append(div1, t2);
      append(li, t3);
      if (!mounted) {
        dispose = listen(button, "click", click_handler);
        mounted = true;
      }
    },
    p(new_ctx, dirty) {
      ctx = new_ctx;
      if (dirty & /*$chapters*/
      4 && t0_value !== (t0_value = /*chapter*/
      ctx[6].title_short + ""))
        set_data(t0, t0_value);
    },
    d(detaching) {
      if (detaching)
        detach(li);
      mounted = false;
      dispose();
    }
  };
}
function create_fragment$o(ctx) {
  let div1;
  let div0;
  let t;
  let button;
  let img;
  let img_src_value;
  let button_class_value;
  let current;
  let mounted;
  let dispose;
  let if_block = (
    /*showBookmarks*/
    ctx[1] && create_if_block$a(ctx)
  );
  return {
    c() {
      div1 = element("div");
      div0 = element("div");
      if (if_block)
        if_block.c();
      t = space();
      button = element("button");
      img = element("img");
      if (!src_url_equal(img.src, img_src_value = bookmark))
        attr(img, "src", img_src_value);
      attr(img, "alt", "Bookmark");
      attr(img, "width", "100%");
      attr(img, "class", "svelte-6gvisy");
      attr(button, "class", button_class_value = null_to_empty(
        /*showBookmarks*/
        ctx[1] ? "highlight" : ""
      ) + " svelte-6gvisy");
      attr(div0, "class", "bookmark svelte-6gvisy");
      attr(div1, "class", "bookmark-wrap svelte-6gvisy");
    },
    m(target, anchor) {
      insert(target, div1, anchor);
      append(div1, div0);
      if (if_block)
        if_block.m(div0, null);
      append(div0, t);
      append(div0, button);
      append(button, img);
      current = true;
      if (!mounted) {
        dispose = listen(
          button,
          "click",
          /*click_handler_1*/
          ctx[5]
        );
        mounted = true;
      }
    },
    p(ctx2, [dirty]) {
      if (
        /*showBookmarks*/
        ctx2[1]
      ) {
        if (if_block) {
          if_block.p(ctx2, dirty);
          if (dirty & /*showBookmarks*/
          2) {
            transition_in(if_block, 1);
          }
        } else {
          if_block = create_if_block$a(ctx2);
          if_block.c();
          transition_in(if_block, 1);
          if_block.m(div0, t);
        }
      } else if (if_block) {
        group_outros();
        transition_out(if_block, 1, 1, () => {
          if_block = null;
        });
        check_outros();
      }
      if (!current || dirty & /*showBookmarks*/
      2 && button_class_value !== (button_class_value = null_to_empty(
        /*showBookmarks*/
        ctx2[1] ? "highlight" : ""
      ) + " svelte-6gvisy")) {
        attr(button, "class", button_class_value);
      }
    },
    i(local) {
      if (current)
        return;
      transition_in(if_block);
      current = true;
    },
    o(local) {
      transition_out(if_block);
      current = false;
    },
    d(detaching) {
      if (detaching)
        detach(div1);
      if (if_block)
        if_block.d();
      mounted = false;
      dispose();
    }
  };
}
function instance$l($$self, $$props, $$invalidate) {
  let $chapters, $$unsubscribe_chapters = noop, $$subscribe_chapters = () => ($$unsubscribe_chapters(), $$unsubscribe_chapters = subscribe(chapters, ($$value) => $$invalidate(2, $chapters = $$value)), chapters);
  $$self.$$.on_destroy.push(() => $$unsubscribe_chapters());
  let { chapters } = $$props;
  $$subscribe_chapters();
  let showBookmarks = false;
  function click(node) {
    node.scrollIntoView({ behavior: "smooth" });
    $$invalidate(1, showBookmarks = false);
  }
  const click_handler = (chapter) => click(chapter.node);
  const click_handler_1 = () => $$invalidate(1, showBookmarks = !showBookmarks);
  $$self.$$set = ($$props2) => {
    if ("chapters" in $$props2)
      $$subscribe_chapters($$invalidate(0, chapters = $$props2.chapters));
  };
  return [chapters, showBookmarks, $chapters, click, click_handler, click_handler_1];
}
class Bookmarks extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$l, create_fragment$o, safe_not_equal, { chapters: 0 });
  }
}
const heroImg = "" + new URL("hero.jpg", import.meta.url).href;
const Tag_svelte_svelte_type_style_lang = "";
function create_fragment$n(ctx) {
  let div;
  let t_value = (
    /*text*/
    ctx[0].toUpperCase() + ""
  );
  let t;
  return {
    c() {
      div = element("div");
      t = text$1(t_value);
      attr(div, "class", "svelte-pqikwf");
    },
    m(target, anchor) {
      insert(target, div, anchor);
      append(div, t);
    },
    p(ctx2, [dirty]) {
      if (dirty & /*text*/
      1 && t_value !== (t_value = /*text*/
      ctx2[0].toUpperCase() + ""))
        set_data(t, t_value);
    },
    i: noop,
    o: noop,
    d(detaching) {
      if (detaching)
        detach(div);
    }
  };
}
function instance$k($$self, $$props, $$invalidate) {
  let { text: text2 } = $$props;
  $$self.$$set = ($$props2) => {
    if ("text" in $$props2)
      $$invalidate(0, text2 = $$props2.text);
  };
  return [text2];
}
class Tag extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$k, create_fragment$n, safe_not_equal, { text: 0 });
  }
}
const ScrollCue_svelte_svelte_type_style_lang = "";
function create_fragment$m(ctx) {
  let div;
  let t;
  return {
    c() {
      div = element("div");
      t = text$1("Scroll ↓");
      attr(div, "class", "scroll-indicator svelte-x8op98");
      set_style(div, "transform", "translateY(" + /*y*/
      ctx[0] + "px)");
      set_style(
        div,
        "opacity",
        /*alpha*/
        ctx[1]
      );
    },
    m(target, anchor) {
      insert(target, div, anchor);
      append(div, t);
    },
    p(ctx2, [dirty]) {
      if (dirty & /*y*/
      1) {
        set_style(div, "transform", "translateY(" + /*y*/
        ctx2[0] + "px)");
      }
      if (dirty & /*alpha*/
      2) {
        set_style(
          div,
          "opacity",
          /*alpha*/
          ctx2[1]
        );
      }
    },
    i: noop,
    o: noop,
    d(detaching) {
      if (detaching)
        detach(div);
    }
  };
}
function instance$j($$self, $$props, $$invalidate) {
  let y = 0;
  let alpha = 0;
  let startTime;
  onMount(() => {
    startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      $$invalidate(0, y = 8 * Math.sin(elapsed * 2e-3));
      $$invalidate(1, alpha = 0.6 * (0.5 * (Math.sin(elapsed * 2e-3) + 1)));
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  });
  return [y, alpha];
}
class ScrollCue extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$j, create_fragment$m, safe_not_equal, {});
  }
}
const PressNote_svelte_svelte_type_style_lang = "";
function create_else_block$2(ctx) {
  let div;
  return {
    c() {
      div = element("div");
      div.textContent = "~ Embargoed press preview ~";
      attr(div, "class", "press-wrap svelte-13dtrfb");
      set_style(div, "font-weight", "700");
    },
    m(target, anchor) {
      insert(target, div, anchor);
    },
    p: noop,
    i: noop,
    o: noop,
    d(detaching) {
      if (detaching)
        detach(div);
    }
  };
}
function create_if_block$9(ctx) {
  let div2;
  let div1;
  let p0;
  let t5;
  let p1;
  let t9;
  let div0;
  let button;
  let div2_transition;
  let current;
  let mounted;
  let dispose;
  return {
    c() {
      div2 = element("div");
      div1 = element("div");
      p0 = element("p");
      p0.innerHTML = `This is a <b>press preview</b>, under
        <b>strict embargo until 00:01 CET on 30 November 2023</b>. Not all
        features may work as expected and small changes are still possible.`;
      t5 = space();
      p1 = element("p");
      p1.innerHTML = `This story will launch on <a href="https://datacommons.staging.one.org/climate-finance-files">datacommons.one.org/climate-finance-files</a> on 30 November at 00:01 CET.`;
      t9 = space();
      div0 = element("div");
      button = element("button");
      button.textContent = "close this note";
      attr(button, "class", "close");
      attr(div0, "class", "close-wrap svelte-13dtrfb");
      attr(div1, "class", "press-note svelte-13dtrfb");
      attr(div2, "class", "press-wrap svelte-13dtrfb");
    },
    m(target, anchor) {
      insert(target, div2, anchor);
      append(div2, div1);
      append(div1, p0);
      append(div1, t5);
      append(div1, p1);
      append(div1, t9);
      append(div1, div0);
      append(div0, button);
      current = true;
      if (!mounted) {
        dispose = listen(
          button,
          "click",
          /*click_handler*/
          ctx[1]
        );
        mounted = true;
      }
    },
    p: noop,
    i(local) {
      if (current)
        return;
      add_render_callback(() => {
        if (!current)
          return;
        if (!div2_transition)
          div2_transition = create_bidirectional_transition(div2, fly, { x: -200, duration: 300 }, true);
        div2_transition.run(1);
      });
      current = true;
    },
    o(local) {
      if (!div2_transition)
        div2_transition = create_bidirectional_transition(div2, fly, { x: -200, duration: 300 }, false);
      div2_transition.run(0);
      current = false;
    },
    d(detaching) {
      if (detaching)
        detach(div2);
      if (detaching && div2_transition)
        div2_transition.end();
      mounted = false;
      dispose();
    }
  };
}
function create_fragment$l(ctx) {
  let current_block_type_index;
  let if_block;
  let if_block_anchor;
  let current;
  const if_block_creators = [create_if_block$9, create_else_block$2];
  const if_blocks = [];
  function select_block_type(ctx2, dirty) {
    if (
      /*show*/
      ctx2[0]
    )
      return 0;
    return 1;
  }
  current_block_type_index = select_block_type(ctx);
  if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
  return {
    c() {
      if_block.c();
      if_block_anchor = empty();
    },
    m(target, anchor) {
      if_blocks[current_block_type_index].m(target, anchor);
      insert(target, if_block_anchor, anchor);
      current = true;
    },
    p(ctx2, [dirty]) {
      let previous_block_index = current_block_type_index;
      current_block_type_index = select_block_type(ctx2);
      if (current_block_type_index === previous_block_index) {
        if_blocks[current_block_type_index].p(ctx2, dirty);
      } else {
        group_outros();
        transition_out(if_blocks[previous_block_index], 1, 1, () => {
          if_blocks[previous_block_index] = null;
        });
        check_outros();
        if_block = if_blocks[current_block_type_index];
        if (!if_block) {
          if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx2);
          if_block.c();
        } else {
          if_block.p(ctx2, dirty);
        }
        transition_in(if_block, 1);
        if_block.m(if_block_anchor.parentNode, if_block_anchor);
      }
    },
    i(local) {
      if (current)
        return;
      transition_in(if_block);
      current = true;
    },
    o(local) {
      transition_out(if_block);
      current = false;
    },
    d(detaching) {
      if_blocks[current_block_type_index].d(detaching);
      if (detaching)
        detach(if_block_anchor);
    }
  };
}
function instance$i($$self, $$props, $$invalidate) {
  let show = true;
  const click_handler = () => $$invalidate(0, show = false);
  return [show, click_handler];
}
class PressNote extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$i, create_fragment$l, safe_not_equal, {});
  }
}
const Hero_svelte_svelte_type_style_lang = "";
function create_fragment$k(ctx) {
  let pressnote;
  let t0;
  let div1;
  let div0;
  let tag;
  let t1;
  let h1;
  let t3;
  let p;
  let t5;
  let scrollcue;
  let current;
  pressnote = new PressNote({});
  tag = new Tag({ props: { text: "climate financing" } });
  scrollcue = new ScrollCue({});
  return {
    c() {
      create_component(pressnote.$$.fragment);
      t0 = space();
      div1 = element("div");
      div0 = element("div");
      create_component(tag.$$.fragment);
      t1 = space();
      h1 = element("h1");
      h1.textContent = "CLIMATE FINANCE REPORTING IS A MESS. HERE’S HOW TO FIX IT.";
      t3 = space();
      p = element("p");
      p.textContent = "No one really knows how much is being spent to address climate change. So\n      ONE is launching The Climate Finance Files, a detailed account of what's\n      being spent, where.";
      t5 = space();
      create_component(scrollcue.$$.fragment);
      attr(h1, "class", "svelte-2bvi8e");
      attr(p, "class", "svelte-2bvi8e");
      attr(div0, "id", "hero-text");
      attr(div0, "class", "svelte-2bvi8e");
      attr(div1, "class", "img-wrap svelte-2bvi8e");
      set_style(div1, "background-image", "url(" + heroImg + ")");
    },
    m(target, anchor) {
      mount_component(pressnote, target, anchor);
      insert(target, t0, anchor);
      insert(target, div1, anchor);
      append(div1, div0);
      mount_component(tag, div0, null);
      append(div0, t1);
      append(div0, h1);
      append(div0, t3);
      append(div0, p);
      append(div0, t5);
      mount_component(scrollcue, div0, null);
      current = true;
    },
    p: noop,
    i(local) {
      if (current)
        return;
      transition_in(pressnote.$$.fragment, local);
      transition_in(tag.$$.fragment, local);
      transition_in(scrollcue.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(pressnote.$$.fragment, local);
      transition_out(tag.$$.fragment, local);
      transition_out(scrollcue.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      destroy_component(pressnote, detaching);
      if (detaching)
        detach(t0);
      if (detaching)
        detach(div1);
      destroy_component(tag);
      destroy_component(scrollcue);
    }
  };
}
class Hero extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, null, create_fragment$k, safe_not_equal, {});
  }
}
const womenImg = "" + new URL("women.jpg", import.meta.url).href;
const droughtImg = "" + new URL("drought.jpg", import.meta.url).href;
const TextSlide_svelte_svelte_type_style_lang = "";
function create_fragment$j(ctx) {
  let div2;
  let div1;
  let p;
  let t0;
  let div0;
  let div2_resize_listener;
  return {
    c() {
      div2 = element("div");
      div1 = element("div");
      p = element("p");
      t0 = space();
      div0 = element("div");
      div0.textContent = "Scroll →";
      attr(p, "class", "svelte-1naeslp");
      attr(div0, "class", "prompt svelte-1naeslp");
      attr(div1, "class", "slide svelte-1naeslp");
      attr(div2, "class", "slide-wrap svelte-1naeslp");
      add_render_callback(() => (
        /*div2_elementresize_handler*/
        ctx[2].call(div2)
      ));
    },
    m(target, anchor) {
      insert(target, div2, anchor);
      append(div2, div1);
      append(div1, p);
      p.innerHTML = /*text*/
      ctx[0];
      append(div1, t0);
      append(div1, div0);
      div2_resize_listener = add_iframe_resize_listener(
        div2,
        /*div2_elementresize_handler*/
        ctx[2].bind(div2)
      );
    },
    p(ctx2, [dirty]) {
      if (dirty & /*text*/
      1)
        p.innerHTML = /*text*/
        ctx2[0];
    },
    i: noop,
    o: noop,
    d(detaching) {
      if (detaching)
        detach(div2);
      div2_resize_listener();
    }
  };
}
function instance$h($$self, $$props, $$invalidate) {
  let $slideWidth;
  component_subscribe($$self, slideWidth, ($$value) => $$invalidate(1, $slideWidth = $$value));
  let { text: text2 } = $$props;
  function div2_elementresize_handler() {
    $slideWidth = this.clientWidth;
    slideWidth.set($slideWidth);
  }
  $$self.$$set = ($$props2) => {
    if ("text" in $$props2)
      $$invalidate(0, text2 = $$props2.text);
  };
  return [text2, $slideWidth, div2_elementresize_handler];
}
class TextSlide extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$h, create_fragment$j, safe_not_equal, { text: 0 });
  }
}
const MediaSlide_svelte_svelte_type_style_lang = "";
function create_if_block$8(ctx) {
  let video;
  let source;
  let source_src_value;
  let t;
  return {
    c() {
      video = element("video");
      source = element("source");
      t = text$1("\n        Your browser does not support the video tag.");
      if (!src_url_equal(source.src, source_src_value = /*url*/
      ctx[3]))
        attr(source, "src", source_src_value);
      attr(source, "type", "video/mp4");
      video.playsInline = true;
      video.autoplay = true;
      video.muted = true;
      video.loop = true;
      attr(video, "class", "background-video svelte-1anxn3q");
    },
    m(target, anchor) {
      insert(target, video, anchor);
      append(video, source);
      append(video, t);
      ctx[5](video);
    },
    p(ctx2, dirty) {
      if (dirty & /*url*/
      8 && !src_url_equal(source.src, source_src_value = /*url*/
      ctx2[3])) {
        attr(source, "src", source_src_value);
      }
    },
    d(detaching) {
      if (detaching)
        detach(video);
      ctx[5](null);
    }
  };
}
function create_fragment$i(ctx) {
  let div2;
  let div1;
  let t0;
  let div0;
  let tag_1;
  let t1;
  let p;
  let div1_style_value;
  let current;
  let if_block = (
    /*type*/
    ctx[0] === "video" && create_if_block$8(ctx)
  );
  tag_1 = new Tag({ props: { text: (
    /*tag*/
    ctx[1]
  ) } });
  return {
    c() {
      div2 = element("div");
      div1 = element("div");
      if (if_block)
        if_block.c();
      t0 = space();
      div0 = element("div");
      create_component(tag_1.$$.fragment);
      t1 = space();
      p = element("p");
      attr(div0, "class", "tag svelte-1anxn3q");
      attr(p, "class", "text svelte-1anxn3q");
      attr(div1, "class", "slide svelte-1anxn3q");
      attr(div1, "style", div1_style_value = /*type*/
      ctx[0] === "image" ? `background-image: url(${/*url*/
      ctx[3]});` : "");
      attr(div2, "class", "slide-wrap svelte-1anxn3q");
    },
    m(target, anchor) {
      insert(target, div2, anchor);
      append(div2, div1);
      if (if_block)
        if_block.m(div1, null);
      append(div1, t0);
      append(div1, div0);
      mount_component(tag_1, div0, null);
      append(div1, t1);
      append(div1, p);
      p.innerHTML = /*text*/
      ctx[2];
      current = true;
    },
    p(ctx2, [dirty]) {
      if (
        /*type*/
        ctx2[0] === "video"
      ) {
        if (if_block) {
          if_block.p(ctx2, dirty);
        } else {
          if_block = create_if_block$8(ctx2);
          if_block.c();
          if_block.m(div1, t0);
        }
      } else if (if_block) {
        if_block.d(1);
        if_block = null;
      }
      const tag_1_changes = {};
      if (dirty & /*tag*/
      2)
        tag_1_changes.text = /*tag*/
        ctx2[1];
      tag_1.$set(tag_1_changes);
      if (!current || dirty & /*text*/
      4)
        p.innerHTML = /*text*/
        ctx2[2];
      if (!current || dirty & /*type, url*/
      9 && div1_style_value !== (div1_style_value = /*type*/
      ctx2[0] === "image" ? `background-image: url(${/*url*/
      ctx2[3]});` : "")) {
        attr(div1, "style", div1_style_value);
      }
    },
    i(local) {
      if (current)
        return;
      transition_in(tag_1.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(tag_1.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      if (detaching)
        detach(div2);
      if (if_block)
        if_block.d();
      destroy_component(tag_1);
    }
  };
}
function instance$g($$self, $$props, $$invalidate) {
  let { type } = $$props;
  let { tag } = $$props;
  let { text: text2 } = $$props;
  let { url } = $$props;
  let videoNode;
  function video_binding($$value) {
    binding_callbacks[$$value ? "unshift" : "push"](() => {
      videoNode = $$value;
      $$invalidate(4, videoNode);
    });
  }
  $$self.$$set = ($$props2) => {
    if ("type" in $$props2)
      $$invalidate(0, type = $$props2.type);
    if ("tag" in $$props2)
      $$invalidate(1, tag = $$props2.tag);
    if ("text" in $$props2)
      $$invalidate(2, text2 = $$props2.text);
    if ("url" in $$props2)
      $$invalidate(3, url = $$props2.url);
  };
  $$self.$$.update = () => {
    if ($$self.$$.dirty & /*videoNode*/
    16) {
      if (videoNode) {
        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        prefersReducedMotion ? videoNode.pause() : videoNode.play();
      }
    }
  };
  return [type, tag, text2, url, videoNode, video_binding];
}
class MediaSlide extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$g, create_fragment$i, safe_not_equal, { type: 0, tag: 1, text: 2, url: 3 });
  }
}
const Pagination_svelte_svelte_type_style_lang = "";
function get_each_context$3(ctx, list, i) {
  const child_ctx = ctx.slice();
  child_ctx[4] = list[i];
  child_ctx[6] = i;
  return child_ctx;
}
function create_each_block$3(ctx) {
  let button;
  let button_class_value;
  let mounted;
  let dispose;
  function click_handler() {
    return (
      /*click_handler*/
      ctx[3](
        /*index*/
        ctx[6]
      )
    );
  }
  return {
    c() {
      button = element("button");
      attr(button, "class", button_class_value = "dot " + /*currentSlide*/
      (ctx[1] === /*index*/
      ctx[6] ? "active" : "") + " svelte-145nzsq");
      attr(button, "aria-label", `Go to slide ${/*index*/
      ctx[6] + 1}`);
    },
    m(target, anchor) {
      insert(target, button, anchor);
      if (!mounted) {
        dispose = listen(button, "click", click_handler);
        mounted = true;
      }
    },
    p(new_ctx, dirty) {
      ctx = new_ctx;
      if (dirty & /*currentSlide*/
      2 && button_class_value !== (button_class_value = "dot " + /*currentSlide*/
      (ctx[1] === /*index*/
      ctx[6] ? "active" : "") + " svelte-145nzsq")) {
        attr(button, "class", button_class_value);
      }
    },
    d(detaching) {
      if (detaching)
        detach(button);
      mounted = false;
      dispose();
    }
  };
}
function create_fragment$h(ctx) {
  let div;
  let each_value = Array.from({ length: (
    /*slideNumber*/
    ctx[0]
  ) }, func);
  let each_blocks = [];
  for (let i = 0; i < each_value.length; i += 1) {
    each_blocks[i] = create_each_block$3(get_each_context$3(ctx, each_value, i));
  }
  return {
    c() {
      div = element("div");
      for (let i = 0; i < each_blocks.length; i += 1) {
        each_blocks[i].c();
      }
      attr(div, "class", "pagination svelte-145nzsq");
    },
    m(target, anchor) {
      insert(target, div, anchor);
      for (let i = 0; i < each_blocks.length; i += 1) {
        if (each_blocks[i]) {
          each_blocks[i].m(div, null);
        }
      }
    },
    p(ctx2, [dirty]) {
      if (dirty & /*currentSlide, selectSlide, slideNumber*/
      7) {
        each_value = Array.from({ length: (
          /*slideNumber*/
          ctx2[0]
        ) }, func);
        let i;
        for (i = 0; i < each_value.length; i += 1) {
          const child_ctx = get_each_context$3(ctx2, each_value, i);
          if (each_blocks[i]) {
            each_blocks[i].p(child_ctx, dirty);
          } else {
            each_blocks[i] = create_each_block$3(child_ctx);
            each_blocks[i].c();
            each_blocks[i].m(div, null);
          }
        }
        for (; i < each_blocks.length; i += 1) {
          each_blocks[i].d(1);
        }
        each_blocks.length = each_value.length;
      }
    },
    i: noop,
    o: noop,
    d(detaching) {
      if (detaching)
        detach(div);
      destroy_each(each_blocks, detaching);
    }
  };
}
const func = (_, i) => i;
function instance$f($$self, $$props, $$invalidate) {
  let { slideNumber = 2 } = $$props;
  let { currentSlide = 0 } = $$props;
  let { selectSlide } = $$props;
  const click_handler = (index) => selectSlide(index);
  $$self.$$set = ($$props2) => {
    if ("slideNumber" in $$props2)
      $$invalidate(0, slideNumber = $$props2.slideNumber);
    if ("currentSlide" in $$props2)
      $$invalidate(1, currentSlide = $$props2.currentSlide);
    if ("selectSlide" in $$props2)
      $$invalidate(2, selectSlide = $$props2.selectSlide);
  };
  return [slideNumber, currentSlide, selectSlide, click_handler];
}
class Pagination extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$f, create_fragment$h, safe_not_equal, {
      slideNumber: 0,
      currentSlide: 1,
      selectSlide: 2
    });
  }
}
const Carousel_svelte_svelte_type_style_lang = "";
function create_if_block$7(ctx) {
  let pagination;
  let current;
  pagination = new Pagination({
    props: {
      slideNumber: totalSlides,
      currentSlide: (
        /*currentSlide*/
        ctx[1]
      ),
      selectSlide: (
        /*selectSlide*/
        ctx[3]
      )
    }
  });
  return {
    c() {
      create_component(pagination.$$.fragment);
    },
    m(target, anchor) {
      mount_component(pagination, target, anchor);
      current = true;
    },
    p(ctx2, dirty) {
      const pagination_changes = {};
      if (dirty & /*currentSlide*/
      2)
        pagination_changes.currentSlide = /*currentSlide*/
        ctx2[1];
      pagination.$set(pagination_changes);
    },
    i(local) {
      if (current)
        return;
      transition_in(pagination.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(pagination.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      destroy_component(pagination, detaching);
    }
  };
}
function create_fragment$g(ctx) {
  let div1;
  let div0;
  let textslide;
  let t0;
  let mediaslide0;
  let t1;
  let mediaslide1;
  let t2;
  let mediaslide2;
  let t3;
  let mediaslide3;
  let t4;
  let current;
  textslide = new TextSlide({
    props: {
      text: "<b>We’re in the fight of our lives and no one is adequately checking and publishing the receipts</b><br><br>Millions of people on the frontlines of climate change are fighting daily battles to protect their lives and livelihoods.<br><br>They did very little to cause the climate crisis. Yet they are paying the highest price."
    }
  });
  mediaslide0 = new MediaSlide({
    props: {
      type: "image",
      tag: "Climate costs in Africa",
      text: "<a href='https://library.wmo.int/viewer/58070/download?file=1300_State_of_the_Climate_in_Africa_2021_en.pdf&type=pdf&navigator=1' target='_blank'>Climate change is costing Africa</a> up to US$15 billion per year. That’s more than the individual GDPs of 26 African countries. By 2050, it could be US$50 billion",
      url: womenImg
    }
  });
  mediaslide1 = new MediaSlide({
    props: {
      type: "video",
      tag: "Cyclone Freddy",
      text: "Cyclone Freddy ravaged Malawi and Mozambique in early 2023, causing US$2 billion in damage. Nearly 1 million people were displaced. The storm fueled Malawi’s largest ever cholera outbreak.",
      url: "https://datacommons-cdn.one.org/freddy.mp4"
    }
  });
  mediaslide2 = new MediaSlide({
    props: {
      type: "image",
      tag: "Drought in East Africa",
      text: "More than 20 million people are facing acute hunger due to historic drought in East Africa. Climate change made the drought 100 times more likely.",
      url: droughtImg
    }
  });
  mediaslide3 = new MediaSlide({
    props: {
      type: "video",
      tag: "Storm Daniel",
      text: "Storm Daniel unloaded eight months of rain in two days in Libya in September 2023, killing thousands of people. Tens of thousands were displaced. Climate change made the floods 50 times more likely.",
      url: "https://datacommons-cdn.one.org/daniel.mp4"
    }
  });
  let if_block = (
    /*$isMobile*/
    ctx[2] && create_if_block$7(ctx)
  );
  return {
    c() {
      div1 = element("div");
      div0 = element("div");
      create_component(textslide.$$.fragment);
      t0 = space();
      create_component(mediaslide0.$$.fragment);
      t1 = space();
      create_component(mediaslide1.$$.fragment);
      t2 = space();
      create_component(mediaslide2.$$.fragment);
      t3 = space();
      create_component(mediaslide3.$$.fragment);
      t4 = space();
      if (if_block)
        if_block.c();
      attr(div0, "class", "carousel-wrap svelte-1qz1ken");
      attr(div1, "class", "carousel svelte-1qz1ken");
    },
    m(target, anchor) {
      insert(target, div1, anchor);
      append(div1, div0);
      mount_component(textslide, div0, null);
      append(div0, t0);
      mount_component(mediaslide0, div0, null);
      append(div0, t1);
      mount_component(mediaslide1, div0, null);
      append(div0, t2);
      mount_component(mediaslide2, div0, null);
      append(div0, t3);
      mount_component(mediaslide3, div0, null);
      ctx[4](div0);
      append(div1, t4);
      if (if_block)
        if_block.m(div1, null);
      current = true;
    },
    p(ctx2, [dirty]) {
      if (
        /*$isMobile*/
        ctx2[2]
      ) {
        if (if_block) {
          if_block.p(ctx2, dirty);
          if (dirty & /*$isMobile*/
          4) {
            transition_in(if_block, 1);
          }
        } else {
          if_block = create_if_block$7(ctx2);
          if_block.c();
          transition_in(if_block, 1);
          if_block.m(div1, null);
        }
      } else if (if_block) {
        group_outros();
        transition_out(if_block, 1, 1, () => {
          if_block = null;
        });
        check_outros();
      }
    },
    i(local) {
      if (current)
        return;
      transition_in(textslide.$$.fragment, local);
      transition_in(mediaslide0.$$.fragment, local);
      transition_in(mediaslide1.$$.fragment, local);
      transition_in(mediaslide2.$$.fragment, local);
      transition_in(mediaslide3.$$.fragment, local);
      transition_in(if_block);
      current = true;
    },
    o(local) {
      transition_out(textslide.$$.fragment, local);
      transition_out(mediaslide0.$$.fragment, local);
      transition_out(mediaslide1.$$.fragment, local);
      transition_out(mediaslide2.$$.fragment, local);
      transition_out(mediaslide3.$$.fragment, local);
      transition_out(if_block);
      current = false;
    },
    d(detaching) {
      if (detaching)
        detach(div1);
      destroy_component(textslide);
      destroy_component(mediaslide0);
      destroy_component(mediaslide1);
      destroy_component(mediaslide2);
      destroy_component(mediaslide3);
      ctx[4](null);
      if (if_block)
        if_block.d();
    }
  };
}
const totalSlides = 5;
function instance$e($$self, $$props, $$invalidate) {
  let $slideWidth;
  let $isMobile;
  component_subscribe($$self, slideWidth, ($$value) => $$invalidate(5, $slideWidth = $$value));
  component_subscribe($$self, isMobile, ($$value) => $$invalidate(2, $isMobile = $$value));
  let carousel;
  let currentSlide = 0;
  function selectSlide(index) {
    $$invalidate(1, currentSlide = index);
    carousel.scrollTo({
      left: index * $slideWidth,
      behavior: "smooth"
    });
  }
  function handleScroll() {
    $$invalidate(1, currentSlide = Math.round(carousel.scrollLeft / $slideWidth));
  }
  onMount(() => {
    carousel.addEventListener("scroll", handleScroll);
    return () => {
      carousel.removeEventListener("scroll", handleScroll);
    };
  });
  function div0_binding($$value) {
    binding_callbacks[$$value ? "unshift" : "push"](() => {
      carousel = $$value;
      $$invalidate(0, carousel);
    });
  }
  return [carousel, currentSlide, $isMobile, selectSlide, div0_binding];
}
class Carousel extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$e, create_fragment$g, safe_not_equal, {});
  }
}
const Title_svelte_svelte_type_style_lang = "";
function create_fragment$f(ctx) {
  let div2;
  let div1;
  let div0;
  let h3;
  return {
    c() {
      div2 = element("div");
      div1 = element("div");
      div0 = element("div");
      h3 = element("h3");
      set_style(
        h3,
        "color",
        /*colour*/
        ctx[1]
      );
      attr(div0, "class", "column svelte-11b5z9z");
      attr(div1, "class", "column-wrap");
      attr(div2, "class", "title");
    },
    m(target, anchor) {
      insert(target, div2, anchor);
      append(div2, div1);
      append(div1, div0);
      append(div0, h3);
      h3.innerHTML = /*title*/
      ctx[0];
    },
    p(ctx2, [dirty]) {
      if (dirty & /*title*/
      1)
        h3.innerHTML = /*title*/
        ctx2[0];
      if (dirty & /*colour*/
      2) {
        set_style(
          h3,
          "color",
          /*colour*/
          ctx2[1]
        );
      }
    },
    i: noop,
    o: noop,
    d(detaching) {
      if (detaching)
        detach(div2);
    }
  };
}
function instance$d($$self, $$props, $$invalidate) {
  let { title = "" } = $$props;
  let { colour = "#01ffd8" } = $$props;
  $$self.$$set = ($$props2) => {
    if ("title" in $$props2)
      $$invalidate(0, title = $$props2.title);
    if ("colour" in $$props2)
      $$invalidate(1, colour = $$props2.colour);
  };
  return [title, colour];
}
class Title extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$d, create_fragment$f, safe_not_equal, { title: 0, colour: 1 });
  }
}
const ChapterTitle_svelte_svelte_type_style_lang = "";
function create_fragment$e(ctx) {
  let div2;
  let div1;
  let div0;
  let p;
  let t0;
  let t1_value = (
    /*data*/
    ctx[0].chapter + ""
  );
  let t1;
  let t2;
  let h1;
  let t3_value = (
    /*data*/
    ctx[0].title.toUpperCase() + ""
  );
  let t3;
  let div1_data_chapter_value;
  return {
    c() {
      div2 = element("div");
      div1 = element("div");
      div0 = element("div");
      p = element("p");
      t0 = text$1("CHAPTER ");
      t1 = text$1(t1_value);
      t2 = space();
      h1 = element("h1");
      t3 = text$1(t3_value);
      attr(p, "class", "svelte-1fsrzu3");
      attr(h1, "class", "svelte-1fsrzu3");
      attr(div0, "class", "column");
      attr(div1, "class", "column-wrap");
      attr(div1, "data-chapter", div1_data_chapter_value = /*data*/
      ctx[0].chapter);
      attr(div2, "class", "chapter-title svelte-1fsrzu3");
    },
    m(target, anchor) {
      insert(target, div2, anchor);
      append(div2, div1);
      append(div1, div0);
      append(div0, p);
      append(p, t0);
      append(p, t1);
      append(div0, t2);
      append(div0, h1);
      append(h1, t3);
    },
    p(ctx2, [dirty]) {
      if (dirty & /*data*/
      1 && t1_value !== (t1_value = /*data*/
      ctx2[0].chapter + ""))
        set_data(t1, t1_value);
      if (dirty & /*data*/
      1 && t3_value !== (t3_value = /*data*/
      ctx2[0].title.toUpperCase() + ""))
        set_data(t3, t3_value);
      if (dirty & /*data*/
      1 && div1_data_chapter_value !== (div1_data_chapter_value = /*data*/
      ctx2[0].chapter)) {
        attr(div1, "data-chapter", div1_data_chapter_value);
      }
    },
    i: noop,
    o: noop,
    d(detaching) {
      if (detaching)
        detach(div2);
    }
  };
}
function instance$c($$self, $$props, $$invalidate) {
  let { data } = $$props;
  $$self.$$set = ($$props2) => {
    if ("data" in $$props2)
      $$invalidate(0, data = $$props2.data);
  };
  return [data];
}
class ChapterTitle extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$c, create_fragment$e, safe_not_equal, { data: 0 });
  }
}
const TextBlock_svelte_svelte_type_style_lang = "";
function get_each_context$2(ctx, list, i) {
  const child_ctx = ctx.slice();
  child_ctx[6] = list[i];
  return child_ctx;
}
function get_each_context_1(ctx, list, i) {
  const child_ctx = ctx.slice();
  child_ctx[9] = list[i];
  return child_ctx;
}
function create_if_block_2$3(ctx) {
  let div;
  let p;
  return {
    c() {
      div = element("div");
      p = element("p");
      attr(p, "class", "svelte-8yc1sq");
      attr(div, "class", "note link-potential svelte-8yc1sq");
    },
    m(target, anchor) {
      insert(target, div, anchor);
      append(div, p);
      p.innerHTML = /*note*/
      ctx[1];
    },
    p(ctx2, dirty) {
      if (dirty & /*note*/
      2)
        p.innerHTML = /*note*/
        ctx2[1];
    },
    d(detaching) {
      if (detaching)
        detach(div);
    }
  };
}
function create_if_block_1$4(ctx) {
  let div1;
  let button;
  let t0_value = (
    /*part*/
    ctx[9].content + ""
  );
  let t0;
  let t1;
  let div0;
  let t2_value = (
    /*part*/
    ctx[9].glossaryText + ""
  );
  let t2;
  let div0_class_value;
  let mounted;
  let dispose;
  function click_handler() {
    return (
      /*click_handler*/
      ctx[4](
        /*part*/
        ctx[9]
      )
    );
  }
  return {
    c() {
      div1 = element("div");
      button = element("button");
      t0 = text$1(t0_value);
      t1 = space();
      div0 = element("div");
      t2 = text$1(t2_value);
      attr(button, "class", "glossary svelte-8yc1sq");
      attr(div0, "class", div0_class_value = null_to_empty(`glossary-text ${/*activeGlossaryTerm*/
      ctx[2] === /*part*/
      ctx[9].content ? "show" : ""}`) + " svelte-8yc1sq");
      attr(div1, "class", "glossary-wrap svelte-8yc1sq");
    },
    m(target, anchor) {
      insert(target, div1, anchor);
      append(div1, button);
      append(button, t0);
      append(div1, t1);
      append(div1, div0);
      append(div0, t2);
      if (!mounted) {
        dispose = listen(button, "click", click_handler);
        mounted = true;
      }
    },
    p(new_ctx, dirty) {
      ctx = new_ctx;
      if (dirty & /*copy*/
      1 && t0_value !== (t0_value = /*part*/
      ctx[9].content + ""))
        set_data(t0, t0_value);
      if (dirty & /*copy*/
      1 && t2_value !== (t2_value = /*part*/
      ctx[9].glossaryText + ""))
        set_data(t2, t2_value);
      if (dirty & /*activeGlossaryTerm, copy*/
      5 && div0_class_value !== (div0_class_value = null_to_empty(`glossary-text ${/*activeGlossaryTerm*/
      ctx[2] === /*part*/
      ctx[9].content ? "show" : ""}`) + " svelte-8yc1sq")) {
        attr(div0, "class", div0_class_value);
      }
    },
    d(detaching) {
      if (detaching)
        detach(div1);
      mounted = false;
      dispose();
    }
  };
}
function create_if_block$6(ctx) {
  let html_tag;
  let raw_value = (
    /*part*/
    ctx[9].content + ""
  );
  let html_anchor;
  return {
    c() {
      html_tag = new HtmlTag(false);
      html_anchor = empty();
      html_tag.a = html_anchor;
    },
    m(target, anchor) {
      html_tag.m(raw_value, target, anchor);
      insert(target, html_anchor, anchor);
    },
    p(ctx2, dirty) {
      if (dirty & /*copy*/
      1 && raw_value !== (raw_value = /*part*/
      ctx2[9].content + ""))
        html_tag.p(raw_value);
    },
    d(detaching) {
      if (detaching)
        detach(html_anchor);
      if (detaching)
        html_tag.d();
    }
  };
}
function create_each_block_1(ctx) {
  let if_block_anchor;
  function select_block_type(ctx2, dirty) {
    if (
      /*part*/
      ctx2[9].type === "text"
    )
      return create_if_block$6;
    if (
      /*part*/
      ctx2[9].type === "button"
    )
      return create_if_block_1$4;
  }
  let current_block_type = select_block_type(ctx);
  let if_block = current_block_type && current_block_type(ctx);
  return {
    c() {
      if (if_block)
        if_block.c();
      if_block_anchor = empty();
    },
    m(target, anchor) {
      if (if_block)
        if_block.m(target, anchor);
      insert(target, if_block_anchor, anchor);
    },
    p(ctx2, dirty) {
      if (current_block_type === (current_block_type = select_block_type(ctx2)) && if_block) {
        if_block.p(ctx2, dirty);
      } else {
        if (if_block)
          if_block.d(1);
        if_block = current_block_type && current_block_type(ctx2);
        if (if_block) {
          if_block.c();
          if_block.m(if_block_anchor.parentNode, if_block_anchor);
        }
      }
    },
    d(detaching) {
      if (if_block) {
        if_block.d(detaching);
      }
      if (detaching)
        detach(if_block_anchor);
    }
  };
}
function create_each_block$2(ctx) {
  let p;
  let t;
  let each_value_1 = (
    /*paragraph*/
    ctx[6].text_prepped
  );
  let each_blocks = [];
  for (let i = 0; i < each_value_1.length; i += 1) {
    each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
  }
  return {
    c() {
      p = element("p");
      for (let i = 0; i < each_blocks.length; i += 1) {
        each_blocks[i].c();
      }
      t = space();
      attr(p, "class", "svelte-8yc1sq");
    },
    m(target, anchor) {
      insert(target, p, anchor);
      for (let i = 0; i < each_blocks.length; i += 1) {
        if (each_blocks[i]) {
          each_blocks[i].m(p, null);
        }
      }
      append(p, t);
    },
    p(ctx2, dirty) {
      if (dirty & /*copy, activeGlossaryTerm, toggleGlossary*/
      13) {
        each_value_1 = /*paragraph*/
        ctx2[6].text_prepped;
        let i;
        for (i = 0; i < each_value_1.length; i += 1) {
          const child_ctx = get_each_context_1(ctx2, each_value_1, i);
          if (each_blocks[i]) {
            each_blocks[i].p(child_ctx, dirty);
          } else {
            each_blocks[i] = create_each_block_1(child_ctx);
            each_blocks[i].c();
            each_blocks[i].m(p, t);
          }
        }
        for (; i < each_blocks.length; i += 1) {
          each_blocks[i].d(1);
        }
        each_blocks.length = each_value_1.length;
      }
    },
    d(detaching) {
      if (detaching)
        detach(p);
      destroy_each(each_blocks, detaching);
    }
  };
}
function create_fragment$d(ctx) {
  let div3;
  let div2;
  let t0;
  let div0;
  let t1;
  let div1;
  let if_block = (
    /*note*/
    ctx[1] && create_if_block_2$3(ctx)
  );
  let each_value = (
    /*copy*/
    ctx[0]
  );
  let each_blocks = [];
  for (let i = 0; i < each_value.length; i += 1) {
    each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
  }
  return {
    c() {
      div3 = element("div");
      div2 = element("div");
      if (if_block)
        if_block.c();
      t0 = space();
      div0 = element("div");
      for (let i = 0; i < each_blocks.length; i += 1) {
        each_blocks[i].c();
      }
      t1 = space();
      div1 = element("div");
      attr(div0, "class", "column svelte-8yc1sq");
      attr(div1, "class", "right");
      attr(div2, "class", "column-wrap");
      attr(div3, "class", "text-block");
    },
    m(target, anchor) {
      insert(target, div3, anchor);
      append(div3, div2);
      if (if_block)
        if_block.m(div2, null);
      append(div2, t0);
      append(div2, div0);
      for (let i = 0; i < each_blocks.length; i += 1) {
        if (each_blocks[i]) {
          each_blocks[i].m(div0, null);
        }
      }
      append(div2, t1);
      append(div2, div1);
    },
    p(ctx2, [dirty]) {
      if (
        /*note*/
        ctx2[1]
      ) {
        if (if_block) {
          if_block.p(ctx2, dirty);
        } else {
          if_block = create_if_block_2$3(ctx2);
          if_block.c();
          if_block.m(div2, t0);
        }
      } else if (if_block) {
        if_block.d(1);
        if_block = null;
      }
      if (dirty & /*copy, activeGlossaryTerm, toggleGlossary*/
      13) {
        each_value = /*copy*/
        ctx2[0];
        let i;
        for (i = 0; i < each_value.length; i += 1) {
          const child_ctx = get_each_context$2(ctx2, each_value, i);
          if (each_blocks[i]) {
            each_blocks[i].p(child_ctx, dirty);
          } else {
            each_blocks[i] = create_each_block$2(child_ctx);
            each_blocks[i].c();
            each_blocks[i].m(div0, null);
          }
        }
        for (; i < each_blocks.length; i += 1) {
          each_blocks[i].d(1);
        }
        each_blocks.length = each_value.length;
      }
    },
    i: noop,
    o: noop,
    d(detaching) {
      if (detaching)
        detach(div3);
      if (if_block)
        if_block.d();
      destroy_each(each_blocks, detaching);
    }
  };
}
function instance$b($$self, $$props, $$invalidate) {
  let $isMobile;
  component_subscribe($$self, isMobile, ($$value) => $$invalidate(5, $isMobile = $$value));
  let { copy } = $$props;
  let { note = "" } = $$props;
  let activeGlossaryTerm = null;
  function toggleGlossary(term) {
    if ($isMobile) {
      $$invalidate(2, activeGlossaryTerm = activeGlossaryTerm === term ? null : term);
    }
  }
  const click_handler = (part) => toggleGlossary(part.content);
  $$self.$$set = ($$props2) => {
    if ("copy" in $$props2)
      $$invalidate(0, copy = $$props2.copy);
    if ("note" in $$props2)
      $$invalidate(1, note = $$props2.note);
  };
  return [copy, note, activeGlossaryTerm, toggleGlossary, click_handler];
}
class TextBlock extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$b, create_fragment$d, safe_not_equal, { copy: 0, note: 1 });
  }
}
const Legend_svelte_svelte_type_style_lang = "";
function get_each_context$1(ctx, list, i) {
  const child_ctx = ctx.slice();
  child_ctx[1] = list[i];
  return child_ctx;
}
function create_each_block$1(ctx) {
  let div2;
  let div0;
  let t0;
  let div1;
  let t1_value = (
    /*category*/
    ctx[1].label + ""
  );
  let t1;
  let t2;
  return {
    c() {
      div2 = element("div");
      div0 = element("div");
      t0 = space();
      div1 = element("div");
      t1 = text$1(t1_value);
      t2 = space();
      attr(div0, "class", "mark svelte-ijgu57");
      set_style(
        div0,
        "background",
        /*category*/
        ctx[1].colour
      );
      set_style(
        div0,
        "border-radius",
        /*category*/
        ctx[1].radius
      );
      attr(div1, "class", "label svelte-ijgu57");
      set_style(
        div1,
        "color",
        /*category*/
        ctx[1].label_colour
      );
      attr(div2, "class", "category svelte-ijgu57");
    },
    m(target, anchor) {
      insert(target, div2, anchor);
      append(div2, div0);
      append(div2, t0);
      append(div2, div1);
      append(div1, t1);
      append(div2, t2);
    },
    p(ctx2, dirty) {
      if (dirty & /*legend_data*/
      1) {
        set_style(
          div0,
          "background",
          /*category*/
          ctx2[1].colour
        );
      }
      if (dirty & /*legend_data*/
      1) {
        set_style(
          div0,
          "border-radius",
          /*category*/
          ctx2[1].radius
        );
      }
      if (dirty & /*legend_data*/
      1 && t1_value !== (t1_value = /*category*/
      ctx2[1].label + ""))
        set_data(t1, t1_value);
      if (dirty & /*legend_data*/
      1) {
        set_style(
          div1,
          "color",
          /*category*/
          ctx2[1].label_colour
        );
      }
    },
    d(detaching) {
      if (detaching)
        detach(div2);
    }
  };
}
function create_fragment$c(ctx) {
  let div2;
  let div1;
  let div0;
  let each_value = (
    /*legend_data*/
    ctx[0]
  );
  let each_blocks = [];
  for (let i = 0; i < each_value.length; i += 1) {
    each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
  }
  return {
    c() {
      div2 = element("div");
      div1 = element("div");
      div0 = element("div");
      for (let i = 0; i < each_blocks.length; i += 1) {
        each_blocks[i].c();
      }
      attr(div0, "class", "categories svelte-ijgu57");
      attr(div1, "class", "column");
      attr(div2, "class", "column-wrap");
    },
    m(target, anchor) {
      insert(target, div2, anchor);
      append(div2, div1);
      append(div1, div0);
      for (let i = 0; i < each_blocks.length; i += 1) {
        if (each_blocks[i]) {
          each_blocks[i].m(div0, null);
        }
      }
    },
    p(ctx2, [dirty]) {
      if (dirty & /*legend_data*/
      1) {
        each_value = /*legend_data*/
        ctx2[0];
        let i;
        for (i = 0; i < each_value.length; i += 1) {
          const child_ctx = get_each_context$1(ctx2, each_value, i);
          if (each_blocks[i]) {
            each_blocks[i].p(child_ctx, dirty);
          } else {
            each_blocks[i] = create_each_block$1(child_ctx);
            each_blocks[i].c();
            each_blocks[i].m(div0, null);
          }
        }
        for (; i < each_blocks.length; i += 1) {
          each_blocks[i].d(1);
        }
        each_blocks.length = each_value.length;
      }
    },
    i: noop,
    o: noop,
    d(detaching) {
      if (detaching)
        detach(div2);
      destroy_each(each_blocks, detaching);
    }
  };
}
function instance$a($$self, $$props, $$invalidate) {
  let { legend_data } = $$props;
  $$self.$$set = ($$props2) => {
    if ("legend_data" in $$props2)
      $$invalidate(0, legend_data = $$props2.legend_data);
  };
  return [legend_data];
}
class Legend extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$a, create_fragment$c, safe_not_equal, { legend_data: 0 });
  }
}
const Graphic_svelte_svelte_type_style_lang = "";
function create_if_block_2$2(ctx) {
  let legend;
  let current;
  legend = new Legend({
    props: { legend_data: (
      /*legend_data*/
      ctx[5]
    ) }
  });
  return {
    c() {
      create_component(legend.$$.fragment);
    },
    m(target, anchor) {
      mount_component(legend, target, anchor);
      current = true;
    },
    p(ctx2, dirty) {
      const legend_changes = {};
      if (dirty & /*legend_data*/
      32)
        legend_changes.legend_data = /*legend_data*/
        ctx2[5];
      legend.$set(legend_changes);
    },
    i(local) {
      if (current)
        return;
      transition_in(legend.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(legend.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      destroy_component(legend, detaching);
    }
  };
}
function create_if_block_1$3(ctx) {
  let p;
  let t;
  let html_tag;
  return {
    c() {
      p = element("p");
      t = text$1("Note: ");
      html_tag = new HtmlTag(false);
      html_tag.a = null;
      attr(p, "class", "notes");
    },
    m(target, anchor) {
      insert(target, p, anchor);
      append(p, t);
      html_tag.m(
        /*notes*/
        ctx[3],
        p
      );
    },
    p(ctx2, dirty) {
      if (dirty & /*notes*/
      8)
        html_tag.p(
          /*notes*/
          ctx2[3]
        );
    },
    d(detaching) {
      if (detaching)
        detach(p);
    }
  };
}
function create_if_block$5(ctx) {
  let p;
  let t;
  let html_tag;
  return {
    c() {
      p = element("p");
      t = text$1("Sources: ");
      html_tag = new HtmlTag(false);
      html_tag.a = null;
      attr(p, "class", "sources");
    },
    m(target, anchor) {
      insert(target, p, anchor);
      append(p, t);
      html_tag.m(
        /*sources*/
        ctx[4],
        p
      );
    },
    p(ctx2, dirty) {
      if (dirty & /*sources*/
      16)
        html_tag.p(
          /*sources*/
          ctx2[4]
        );
    },
    d(detaching) {
      if (detaching)
        detach(p);
    }
  };
}
function create_fragment$b(ctx) {
  let div6;
  let div1;
  let div0;
  let header;
  let h3;
  let t0;
  let t1;
  let p;
  let t2;
  let div0_resize_listener;
  let t3;
  let t4;
  let div3;
  let div2;
  let img;
  let img_src_value;
  let t5;
  let div5;
  let div4;
  let t6;
  let current;
  let if_block0 = (
    /*legend_data*/
    ctx[5].length && create_if_block_2$2(ctx)
  );
  let if_block1 = (
    /*notes*/
    ctx[3] && create_if_block_1$3(ctx)
  );
  let if_block2 = (
    /*sources*/
    ctx[4] && create_if_block$5(ctx)
  );
  return {
    c() {
      div6 = element("div");
      div1 = element("div");
      div0 = element("div");
      header = element("header");
      h3 = element("h3");
      t0 = text$1(
        /*title*/
        ctx[1]
      );
      t1 = space();
      p = element("p");
      t2 = text$1(
        /*subtitle*/
        ctx[2]
      );
      t3 = space();
      if (if_block0)
        if_block0.c();
      t4 = space();
      div3 = element("div");
      div2 = element("div");
      img = element("img");
      t5 = space();
      div5 = element("div");
      div4 = element("div");
      if (if_block1)
        if_block1.c();
      t6 = space();
      if (if_block2)
        if_block2.c();
      attr(div0, "class", "column");
      add_render_callback(() => (
        /*div0_elementresize_handler*/
        ctx[9].call(div0)
      ));
      attr(div1, "class", "column-wrap");
      if (!src_url_equal(img.src, img_src_value = /*url*/
      ctx[0]))
        attr(img, "src", img_src_value);
      attr(img, "alt", "Graphic");
      attr(img, "width", "100%");
      attr(div2, "class", "visual-wrap");
      attr(
        div2,
        "style",
        /*style*/
        ctx[7]
      );
      attr(div3, "class", "extended-wrap svelte-1dvqfow");
      attr(div4, "class", "column");
      attr(div5, "class", "column-wrap");
      attr(div6, "class", "graphic svelte-1dvqfow");
    },
    m(target, anchor) {
      insert(target, div6, anchor);
      append(div6, div1);
      append(div1, div0);
      append(div0, header);
      append(header, h3);
      append(h3, t0);
      append(header, t1);
      append(header, p);
      append(p, t2);
      div0_resize_listener = add_iframe_resize_listener(
        div0,
        /*div0_elementresize_handler*/
        ctx[9].bind(div0)
      );
      append(div6, t3);
      if (if_block0)
        if_block0.m(div6, null);
      append(div6, t4);
      append(div6, div3);
      append(div3, div2);
      append(div2, img);
      append(div6, t5);
      append(div6, div5);
      append(div5, div4);
      if (if_block1)
        if_block1.m(div4, null);
      append(div4, t6);
      if (if_block2)
        if_block2.m(div4, null);
      current = true;
    },
    p(ctx2, [dirty]) {
      if (!current || dirty & /*title*/
      2)
        set_data(
          t0,
          /*title*/
          ctx2[1]
        );
      if (!current || dirty & /*subtitle*/
      4)
        set_data(
          t2,
          /*subtitle*/
          ctx2[2]
        );
      if (
        /*legend_data*/
        ctx2[5].length
      ) {
        if (if_block0) {
          if_block0.p(ctx2, dirty);
          if (dirty & /*legend_data*/
          32) {
            transition_in(if_block0, 1);
          }
        } else {
          if_block0 = create_if_block_2$2(ctx2);
          if_block0.c();
          transition_in(if_block0, 1);
          if_block0.m(div6, t4);
        }
      } else if (if_block0) {
        group_outros();
        transition_out(if_block0, 1, 1, () => {
          if_block0 = null;
        });
        check_outros();
      }
      if (!current || dirty & /*url*/
      1 && !src_url_equal(img.src, img_src_value = /*url*/
      ctx2[0])) {
        attr(img, "src", img_src_value);
      }
      if (!current || dirty & /*style*/
      128) {
        attr(
          div2,
          "style",
          /*style*/
          ctx2[7]
        );
      }
      if (
        /*notes*/
        ctx2[3]
      ) {
        if (if_block1) {
          if_block1.p(ctx2, dirty);
        } else {
          if_block1 = create_if_block_1$3(ctx2);
          if_block1.c();
          if_block1.m(div4, t6);
        }
      } else if (if_block1) {
        if_block1.d(1);
        if_block1 = null;
      }
      if (
        /*sources*/
        ctx2[4]
      ) {
        if (if_block2) {
          if_block2.p(ctx2, dirty);
        } else {
          if_block2 = create_if_block$5(ctx2);
          if_block2.c();
          if_block2.m(div4, null);
        }
      } else if (if_block2) {
        if_block2.d(1);
        if_block2 = null;
      }
    },
    i(local) {
      if (current)
        return;
      transition_in(if_block0);
      current = true;
    },
    o(local) {
      transition_out(if_block0);
      current = false;
    },
    d(detaching) {
      if (detaching)
        detach(div6);
      div0_resize_listener();
      if (if_block0)
        if_block0.d();
      if (if_block1)
        if_block1.d();
      if (if_block2)
        if_block2.d();
    }
  };
}
function instance$9($$self, $$props, $$invalidate) {
  let { url } = $$props;
  let { width_factor = 1.8 } = $$props;
  let { title = "" } = $$props;
  let { subtitle = "" } = $$props;
  let { notes = "" } = $$props;
  let { sources = "" } = $$props;
  let { legend_data = [] } = $$props;
  let columnWidth = 0;
  let style = "";
  function div0_elementresize_handler() {
    columnWidth = this.clientWidth;
    $$invalidate(6, columnWidth);
  }
  $$self.$$set = ($$props2) => {
    if ("url" in $$props2)
      $$invalidate(0, url = $$props2.url);
    if ("width_factor" in $$props2)
      $$invalidate(8, width_factor = $$props2.width_factor);
    if ("title" in $$props2)
      $$invalidate(1, title = $$props2.title);
    if ("subtitle" in $$props2)
      $$invalidate(2, subtitle = $$props2.subtitle);
    if ("notes" in $$props2)
      $$invalidate(3, notes = $$props2.notes);
    if ("sources" in $$props2)
      $$invalidate(4, sources = $$props2.sources);
    if ("legend_data" in $$props2)
      $$invalidate(5, legend_data = $$props2.legend_data);
  };
  $$self.$$.update = () => {
    if ($$self.$$.dirty & /*columnWidth, width_factor*/
    320) {
      if (columnWidth)
        $$invalidate(7, style = getExtendedWidthStyle(width_factor, columnWidth));
    }
  };
  return [
    url,
    title,
    subtitle,
    notes,
    sources,
    legend_data,
    columnWidth,
    style,
    width_factor,
    div0_elementresize_handler
  ];
}
class Graphic extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$9, create_fragment$b, safe_not_equal, {
      url: 0,
      width_factor: 8,
      title: 1,
      subtitle: 2,
      notes: 3,
      sources: 4,
      legend_data: 5
    });
  }
}
const Visual_svelte_svelte_type_style_lang = "";
function create_if_block_4$1(ctx) {
  let h3;
  let t;
  return {
    c() {
      h3 = element("h3");
      t = text$1(
        /*title*/
        ctx[0]
      );
    },
    m(target, anchor) {
      insert(target, h3, anchor);
      append(h3, t);
    },
    p(ctx2, dirty) {
      if (dirty & /*title*/
      1)
        set_data(
          t,
          /*title*/
          ctx2[0]
        );
    },
    d(detaching) {
      if (detaching)
        detach(h3);
    }
  };
}
function create_if_block_3$1(ctx) {
  let p;
  let t;
  return {
    c() {
      p = element("p");
      t = text$1(
        /*subtitle*/
        ctx[1]
      );
    },
    m(target, anchor) {
      insert(target, p, anchor);
      append(p, t);
    },
    p(ctx2, dirty) {
      if (dirty & /*subtitle*/
      2)
        set_data(
          t,
          /*subtitle*/
          ctx2[1]
        );
    },
    d(detaching) {
      if (detaching)
        detach(p);
    }
  };
}
function create_if_block_2$1(ctx) {
  let legend;
  let current;
  legend = new Legend({
    props: { legend_data: (
      /*legend_data*/
      ctx[6]
    ) }
  });
  return {
    c() {
      create_component(legend.$$.fragment);
    },
    m(target, anchor) {
      mount_component(legend, target, anchor);
      current = true;
    },
    p(ctx2, dirty) {
      const legend_changes = {};
      if (dirty & /*legend_data*/
      64)
        legend_changes.legend_data = /*legend_data*/
        ctx2[6];
      legend.$set(legend_changes);
    },
    i(local) {
      if (current)
        return;
      transition_in(legend.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(legend.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      destroy_component(legend, detaching);
    }
  };
}
function create_if_block_1$2(ctx) {
  let p;
  let t;
  let html_tag;
  return {
    c() {
      p = element("p");
      t = text$1("Note: ");
      html_tag = new HtmlTag(false);
      html_tag.a = null;
      attr(p, "class", "notes");
    },
    m(target, anchor) {
      insert(target, p, anchor);
      append(p, t);
      html_tag.m(
        /*notes*/
        ctx[2],
        p
      );
    },
    p(ctx2, dirty) {
      if (dirty & /*notes*/
      4)
        html_tag.p(
          /*notes*/
          ctx2[2]
        );
    },
    d(detaching) {
      if (detaching)
        detach(p);
    }
  };
}
function create_if_block$4(ctx) {
  let p;
  let t;
  let html_tag;
  return {
    c() {
      p = element("p");
      t = text$1("Sources: ");
      html_tag = new HtmlTag(false);
      html_tag.a = null;
      attr(p, "class", "sources");
    },
    m(target, anchor) {
      insert(target, p, anchor);
      append(p, t);
      html_tag.m(
        /*sources*/
        ctx[3],
        p
      );
    },
    p(ctx2, dirty) {
      if (dirty & /*sources*/
      8)
        html_tag.p(
          /*sources*/
          ctx2[3]
        );
    },
    d(detaching) {
      if (detaching)
        detach(p);
    }
  };
}
function create_fragment$a(ctx) {
  let div7;
  let div1;
  let div0;
  let header;
  let t0;
  let div0_resize_listener;
  let t1;
  let t2;
  let div4;
  let div3;
  let div2;
  let script;
  let script_src_value;
  let div2_data_src_value;
  let t3;
  let div6;
  let div5;
  let t4;
  let current;
  let if_block0 = (
    /*title*/
    ctx[0] && create_if_block_4$1(ctx)
  );
  let if_block1 = (
    /*subtitle*/
    ctx[1] && create_if_block_3$1(ctx)
  );
  let if_block2 = (
    /*legend_data*/
    ctx[6].length && create_if_block_2$1(ctx)
  );
  let if_block3 = (
    /*notes*/
    ctx[2] && create_if_block_1$2(ctx)
  );
  let if_block4 = (
    /*sources*/
    ctx[3] && create_if_block$4(ctx)
  );
  return {
    c() {
      div7 = element("div");
      div1 = element("div");
      div0 = element("div");
      header = element("header");
      if (if_block0)
        if_block0.c();
      t0 = space();
      if (if_block1)
        if_block1.c();
      t1 = space();
      if (if_block2)
        if_block2.c();
      t2 = space();
      div4 = element("div");
      div3 = element("div");
      div2 = element("div");
      script = element("script");
      t3 = space();
      div6 = element("div");
      div5 = element("div");
      if (if_block3)
        if_block3.c();
      t4 = space();
      if (if_block4)
        if_block4.c();
      attr(div0, "class", "column");
      add_render_callback(() => (
        /*div0_elementresize_handler*/
        ctx[10].call(div0)
      ));
      attr(div1, "class", "column-wrap");
      if (!src_url_equal(script.src, script_src_value = "https://public.flourish.studio/resources/embed.js"))
        attr(script, "src", script_src_value);
      attr(div2, "class", "flourish-embed flourish-chart");
      attr(div2, "data-src", div2_data_src_value = `${/*type*/
      ctx[4]}/${/*id*/
      ctx[5]}?123`);
      attr(div3, "class", "visual-wrap");
      attr(
        div3,
        "style",
        /*style*/
        ctx[8]
      );
      attr(div4, "class", "extended-wrap svelte-apxglq");
      attr(div5, "class", "column");
      attr(div6, "class", "column-wrap");
      attr(div7, "class", "visual svelte-apxglq");
    },
    m(target, anchor) {
      insert(target, div7, anchor);
      append(div7, div1);
      append(div1, div0);
      append(div0, header);
      if (if_block0)
        if_block0.m(header, null);
      append(header, t0);
      if (if_block1)
        if_block1.m(header, null);
      div0_resize_listener = add_iframe_resize_listener(
        div0,
        /*div0_elementresize_handler*/
        ctx[10].bind(div0)
      );
      append(div7, t1);
      if (if_block2)
        if_block2.m(div7, null);
      append(div7, t2);
      append(div7, div4);
      append(div4, div3);
      append(div3, div2);
      append(div2, script);
      append(div7, t3);
      append(div7, div6);
      append(div6, div5);
      if (if_block3)
        if_block3.m(div5, null);
      append(div5, t4);
      if (if_block4)
        if_block4.m(div5, null);
      current = true;
    },
    p(ctx2, [dirty]) {
      if (
        /*title*/
        ctx2[0]
      ) {
        if (if_block0) {
          if_block0.p(ctx2, dirty);
        } else {
          if_block0 = create_if_block_4$1(ctx2);
          if_block0.c();
          if_block0.m(header, t0);
        }
      } else if (if_block0) {
        if_block0.d(1);
        if_block0 = null;
      }
      if (
        /*subtitle*/
        ctx2[1]
      ) {
        if (if_block1) {
          if_block1.p(ctx2, dirty);
        } else {
          if_block1 = create_if_block_3$1(ctx2);
          if_block1.c();
          if_block1.m(header, null);
        }
      } else if (if_block1) {
        if_block1.d(1);
        if_block1 = null;
      }
      if (
        /*legend_data*/
        ctx2[6].length
      ) {
        if (if_block2) {
          if_block2.p(ctx2, dirty);
          if (dirty & /*legend_data*/
          64) {
            transition_in(if_block2, 1);
          }
        } else {
          if_block2 = create_if_block_2$1(ctx2);
          if_block2.c();
          transition_in(if_block2, 1);
          if_block2.m(div7, t2);
        }
      } else if (if_block2) {
        group_outros();
        transition_out(if_block2, 1, 1, () => {
          if_block2 = null;
        });
        check_outros();
      }
      if (!current || dirty & /*type, id*/
      48 && div2_data_src_value !== (div2_data_src_value = `${/*type*/
      ctx2[4]}/${/*id*/
      ctx2[5]}?123`)) {
        attr(div2, "data-src", div2_data_src_value);
      }
      if (!current || dirty & /*style*/
      256) {
        attr(
          div3,
          "style",
          /*style*/
          ctx2[8]
        );
      }
      if (
        /*notes*/
        ctx2[2]
      ) {
        if (if_block3) {
          if_block3.p(ctx2, dirty);
        } else {
          if_block3 = create_if_block_1$2(ctx2);
          if_block3.c();
          if_block3.m(div5, t4);
        }
      } else if (if_block3) {
        if_block3.d(1);
        if_block3 = null;
      }
      if (
        /*sources*/
        ctx2[3]
      ) {
        if (if_block4) {
          if_block4.p(ctx2, dirty);
        } else {
          if_block4 = create_if_block$4(ctx2);
          if_block4.c();
          if_block4.m(div5, null);
        }
      } else if (if_block4) {
        if_block4.d(1);
        if_block4 = null;
      }
    },
    i(local) {
      if (current)
        return;
      transition_in(if_block2);
      current = true;
    },
    o(local) {
      transition_out(if_block2);
      current = false;
    },
    d(detaching) {
      if (detaching)
        detach(div7);
      if (if_block0)
        if_block0.d();
      if (if_block1)
        if_block1.d();
      div0_resize_listener();
      if (if_block2)
        if_block2.d();
      if (if_block3)
        if_block3.d();
      if (if_block4)
        if_block4.d();
    }
  };
}
function instance$8($$self, $$props, $$invalidate) {
  let { title = "" } = $$props;
  let { subtitle = "" } = $$props;
  let { notes = "" } = $$props;
  let { sources = "" } = $$props;
  let { width_factor = 1 } = $$props;
  let { type = "visualisation" } = $$props;
  let { id } = $$props;
  let { legend_data = [] } = $$props;
  let columnWidth = 0;
  let style = "";
  function div0_elementresize_handler() {
    columnWidth = this.clientWidth;
    $$invalidate(7, columnWidth);
  }
  $$self.$$set = ($$props2) => {
    if ("title" in $$props2)
      $$invalidate(0, title = $$props2.title);
    if ("subtitle" in $$props2)
      $$invalidate(1, subtitle = $$props2.subtitle);
    if ("notes" in $$props2)
      $$invalidate(2, notes = $$props2.notes);
    if ("sources" in $$props2)
      $$invalidate(3, sources = $$props2.sources);
    if ("width_factor" in $$props2)
      $$invalidate(9, width_factor = $$props2.width_factor);
    if ("type" in $$props2)
      $$invalidate(4, type = $$props2.type);
    if ("id" in $$props2)
      $$invalidate(5, id = $$props2.id);
    if ("legend_data" in $$props2)
      $$invalidate(6, legend_data = $$props2.legend_data);
  };
  $$self.$$.update = () => {
    if ($$self.$$.dirty & /*columnWidth, width_factor*/
    640) {
      if (columnWidth) {
        $$invalidate(8, style = getExtendedWidthStyle(width_factor, columnWidth, false));
      }
    }
  };
  return [
    title,
    subtitle,
    notes,
    sources,
    type,
    id,
    legend_data,
    columnWidth,
    style,
    width_factor,
    div0_elementresize_handler
  ];
}
class Visual extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$8, create_fragment$a, safe_not_equal, {
      title: 0,
      subtitle: 1,
      notes: 2,
      sources: 3,
      width_factor: 9,
      type: 4,
      id: 5,
      legend_data: 6
    });
  }
}
const Callout_svelte_svelte_type_style_lang = "";
function create_if_block$3(ctx) {
  let cite;
  return {
    c() {
      cite = element("cite");
      attr(cite, "class", "link-potential svelte-ovujoe");
    },
    m(target, anchor) {
      insert(target, cite, anchor);
      cite.innerHTML = /*note*/
      ctx[1];
    },
    p(ctx2, dirty) {
      if (dirty & /*note*/
      2)
        cite.innerHTML = /*note*/
        ctx2[1];
    },
    d(detaching) {
      if (detaching)
        detach(cite);
    }
  };
}
function create_fragment$9(ctx) {
  let div2;
  let div1;
  let div0;
  let blockquote;
  let t0;
  let t1;
  let if_block = (
    /*note*/
    ctx[1] && create_if_block$3(ctx)
  );
  return {
    c() {
      div2 = element("div");
      div1 = element("div");
      div0 = element("div");
      blockquote = element("blockquote");
      t0 = text$1(
        /*text*/
        ctx[0]
      );
      t1 = space();
      if (if_block)
        if_block.c();
      set_style(
        blockquote,
        "margin-bottom",
        /*note*/
        ctx[1] ? "2rem" : "0"
      );
      attr(blockquote, "class", "svelte-ovujoe");
      attr(div0, "class", "column svelte-ovujoe");
      attr(div1, "class", "column-wrap");
      attr(div2, "class", "callout svelte-ovujoe");
    },
    m(target, anchor) {
      insert(target, div2, anchor);
      append(div2, div1);
      append(div1, div0);
      append(div0, blockquote);
      append(blockquote, t0);
      append(div0, t1);
      if (if_block)
        if_block.m(div0, null);
    },
    p(ctx2, [dirty]) {
      if (dirty & /*text*/
      1)
        set_data(
          t0,
          /*text*/
          ctx2[0]
        );
      if (dirty & /*note*/
      2) {
        set_style(
          blockquote,
          "margin-bottom",
          /*note*/
          ctx2[1] ? "2rem" : "0"
        );
      }
      if (
        /*note*/
        ctx2[1]
      ) {
        if (if_block) {
          if_block.p(ctx2, dirty);
        } else {
          if_block = create_if_block$3(ctx2);
          if_block.c();
          if_block.m(div0, null);
        }
      } else if (if_block) {
        if_block.d(1);
        if_block = null;
      }
    },
    i: noop,
    o: noop,
    d(detaching) {
      if (detaching)
        detach(div2);
      if (if_block)
        if_block.d();
    }
  };
}
function instance$7($$self, $$props, $$invalidate) {
  let { text: text2 = "" } = $$props;
  let { note = "" } = $$props;
  $$self.$$set = ($$props2) => {
    if ("text" in $$props2)
      $$invalidate(0, text2 = $$props2.text);
    if ("note" in $$props2)
      $$invalidate(1, note = $$props2.note);
  };
  return [text2, note];
}
class Callout extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$7, create_fragment$9, safe_not_equal, { text: 0, note: 1 });
  }
}
const KeyResults_svelte_svelte_type_style_lang = "";
function create_fragment$8(ctx) {
  let div4;
  let div1;
  let div0;
  let div0_resize_listener;
  let t5;
  let div3;
  let div2;
  let section0;
  let t12;
  let section1;
  let t17;
  let section2;
  return {
    c() {
      div4 = element("div");
      div1 = element("div");
      div0 = element("div");
      div0.innerHTML = `<header class="svelte-12zud6l"><h2 class="svelte-12zud6l">Here&#39;s what we found</h2> 
        <p class="svelte-12zud6l">Climate finance commitments from donor countries and international
          institutions are <b>vastly</b> overstated.</p></header>`;
      t5 = space();
      div3 = element("div");
      div2 = element("div");
      section0 = element("section");
      section0.innerHTML = `<h1 class="svelte-12zud6l">2/3</h1> 
        <p class="svelte-12zud6l"><b>Nearly two-thirds</b> of climate finance commitments counted by the
          OECD aren’t recorded as disbursed or have little to do with climate.
          That’s an <b>eye-popping US$343 billion</b> between 2013 and 2021.</p>`;
      t12 = space();
      section1 = element("section");
      section1.innerHTML = `<h1 class="svelte-12zud6l">43%</h1> 
        <p class="svelte-12zud6l"><b>43% of countries</b> suffering severe debt problems paid more in debt
          payments to lenders than they received in climate finance between 2019
          and 2021.</p>`;
      t17 = space();
      section2 = element("section");
      section2.innerHTML = `<h1 class="svelte-12zud6l">7%</h1> 
        <p class="svelte-12zud6l">In 2021, the world’s 20 most climate-vulnerable countries <b>received just 6.5%</b> of the climate finance they need each year to address climate change.</p>`;
      attr(div0, "class", "column");
      add_render_callback(() => (
        /*div0_elementresize_handler*/
        ctx[3].call(div0)
      ));
      attr(div1, "class", "column-wrap");
      attr(section0, "class", "svelte-12zud6l");
      attr(section1, "class", "svelte-12zud6l");
      attr(section2, "class", "svelte-12zud6l");
      attr(div2, "class", "results svelte-12zud6l");
      attr(
        div2,
        "style",
        /*style*/
        ctx[1]
      );
      attr(div3, "class", "extended-wrap svelte-12zud6l");
      attr(div4, "class", "key-results svelte-12zud6l");
    },
    m(target, anchor) {
      insert(target, div4, anchor);
      append(div4, div1);
      append(div1, div0);
      div0_resize_listener = add_iframe_resize_listener(
        div0,
        /*div0_elementresize_handler*/
        ctx[3].bind(div0)
      );
      append(div4, t5);
      append(div4, div3);
      append(div3, div2);
      append(div2, section0);
      append(div2, t12);
      append(div2, section1);
      append(div2, t17);
      append(div2, section2);
    },
    p(ctx2, [dirty]) {
      if (dirty & /*style*/
      2) {
        attr(
          div2,
          "style",
          /*style*/
          ctx2[1]
        );
      }
    },
    i: noop,
    o: noop,
    d(detaching) {
      if (detaching)
        detach(div4);
      div0_resize_listener();
    }
  };
}
function instance$6($$self, $$props, $$invalidate) {
  let { width_factor = 1.8 } = $$props;
  let columnWidth = 0;
  let style = "";
  function div0_elementresize_handler() {
    columnWidth = this.clientWidth;
    $$invalidate(0, columnWidth);
  }
  $$self.$$set = ($$props2) => {
    if ("width_factor" in $$props2)
      $$invalidate(2, width_factor = $$props2.width_factor);
  };
  $$self.$$.update = () => {
    if ($$self.$$.dirty & /*columnWidth, width_factor*/
    5) {
      if (columnWidth)
        $$invalidate(1, style = getExtendedWidthStyle(width_factor, columnWidth, false));
    }
  };
  return [columnWidth, style, width_factor, div0_elementresize_handler];
}
class KeyResults extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$6, create_fragment$8, safe_not_equal, { width_factor: 2 });
  }
}
const Image_svelte_svelte_type_style_lang = "";
function create_if_block_4(ctx) {
  let div2;
  let div1;
  let div0;
  let h3;
  let t;
  return {
    c() {
      div2 = element("div");
      div1 = element("div");
      div0 = element("div");
      h3 = element("h3");
      t = text$1(
        /*title*/
        ctx[2]
      );
      attr(div0, "class", "column");
      attr(div1, "class", "column-wrap");
      attr(div2, "class", "header-wrap svelte-1kwccrh");
    },
    m(target, anchor) {
      insert(target, div2, anchor);
      append(div2, div1);
      append(div1, div0);
      append(div0, h3);
      append(h3, t);
    },
    p(ctx2, dirty) {
      if (dirty & /*title*/
      4)
        set_data(
          t,
          /*title*/
          ctx2[2]
        );
    },
    d(detaching) {
      if (detaching)
        detach(div2);
    }
  };
}
function create_else_block$1(ctx) {
  let img;
  let img_src_value;
  return {
    c() {
      img = element("img");
      if (!src_url_equal(img.src, img_src_value = /*url*/
      ctx[0]))
        attr(img, "src", img_src_value);
      attr(img, "alt", "Graphic");
      attr(img, "width", "100%");
    },
    m(target, anchor) {
      insert(target, img, anchor);
    },
    p(ctx2, dirty) {
      if (dirty & /*url*/
      1 && !src_url_equal(img.src, img_src_value = /*url*/
      ctx2[0])) {
        attr(img, "src", img_src_value);
      }
    },
    d(detaching) {
      if (detaching)
        detach(img);
    }
  };
}
function create_if_block_2(ctx) {
  let div;
  let div_class_value;
  let if_block = (
    /*text*/
    ctx[3] && create_if_block_3(ctx)
  );
  return {
    c() {
      div = element("div");
      if (if_block)
        if_block.c();
      attr(div, "class", div_class_value = "img-wrap " + /*text*/
      (ctx[3] ? "has-text" : "") + " svelte-1kwccrh");
      set_style(div, "background-image", "url(" + /*url*/
      ctx[0] + ")");
      set_style(
        div,
        "height",
        /*height*/
        ctx[1]
      );
    },
    m(target, anchor) {
      insert(target, div, anchor);
      if (if_block)
        if_block.m(div, null);
    },
    p(ctx2, dirty) {
      if (
        /*text*/
        ctx2[3]
      ) {
        if (if_block) {
          if_block.p(ctx2, dirty);
        } else {
          if_block = create_if_block_3(ctx2);
          if_block.c();
          if_block.m(div, null);
        }
      } else if (if_block) {
        if_block.d(1);
        if_block = null;
      }
      if (dirty & /*text*/
      8 && div_class_value !== (div_class_value = "img-wrap " + /*text*/
      (ctx2[3] ? "has-text" : "") + " svelte-1kwccrh")) {
        attr(div, "class", div_class_value);
      }
      if (dirty & /*url*/
      1) {
        set_style(div, "background-image", "url(" + /*url*/
        ctx2[0] + ")");
      }
      if (dirty & /*height*/
      2) {
        set_style(
          div,
          "height",
          /*height*/
          ctx2[1]
        );
      }
    },
    d(detaching) {
      if (detaching)
        detach(div);
      if (if_block)
        if_block.d();
    }
  };
}
function create_if_block_3(ctx) {
  let p;
  let t;
  return {
    c() {
      p = element("p");
      t = text$1(
        /*text*/
        ctx[3]
      );
      attr(p, "class", "text svelte-1kwccrh");
    },
    m(target, anchor) {
      insert(target, p, anchor);
      append(p, t);
    },
    p(ctx2, dirty) {
      if (dirty & /*text*/
      8)
        set_data(
          t,
          /*text*/
          ctx2[3]
        );
    },
    d(detaching) {
      if (detaching)
        detach(p);
    }
  };
}
function create_if_block_1$1(ctx) {
  let p;
  let t;
  let html_tag;
  return {
    c() {
      p = element("p");
      t = text$1("Note: ");
      html_tag = new HtmlTag(false);
      html_tag.a = null;
      attr(p, "class", "notes");
    },
    m(target, anchor) {
      insert(target, p, anchor);
      append(p, t);
      html_tag.m(
        /*notes*/
        ctx[4],
        p
      );
    },
    p(ctx2, dirty) {
      if (dirty & /*notes*/
      16)
        html_tag.p(
          /*notes*/
          ctx2[4]
        );
    },
    d(detaching) {
      if (detaching)
        detach(p);
    }
  };
}
function create_if_block$2(ctx) {
  let p;
  let t;
  let html_tag;
  return {
    c() {
      p = element("p");
      t = text$1("Sources: ");
      html_tag = new HtmlTag(false);
      html_tag.a = null;
      attr(p, "class", "sources");
    },
    m(target, anchor) {
      insert(target, p, anchor);
      append(p, t);
      html_tag.m(
        /*sources*/
        ctx[5],
        p
      );
    },
    p(ctx2, dirty) {
      if (dirty & /*sources*/
      32)
        html_tag.p(
          /*sources*/
          ctx2[5]
        );
    },
    d(detaching) {
      if (detaching)
        detach(p);
    }
  };
}
function create_fragment$7(ctx) {
  let div5;
  let t0;
  let div2;
  let div1;
  let div0;
  let t1;
  let div4;
  let div3;
  let t2;
  let if_block0 = (
    /*title*/
    ctx[2] && create_if_block_4(ctx)
  );
  function select_block_type(ctx2, dirty) {
    if (
      /*bgImg*/
      ctx2[6]
    )
      return create_if_block_2;
    return create_else_block$1;
  }
  let current_block_type = select_block_type(ctx);
  let if_block1 = current_block_type(ctx);
  let if_block2 = (
    /*notes*/
    ctx[4] && create_if_block_1$1(ctx)
  );
  let if_block3 = (
    /*sources*/
    ctx[5] && create_if_block$2(ctx)
  );
  return {
    c() {
      div5 = element("div");
      if (if_block0)
        if_block0.c();
      t0 = space();
      div2 = element("div");
      div1 = element("div");
      div0 = element("div");
      if_block1.c();
      t1 = space();
      div4 = element("div");
      div3 = element("div");
      if (if_block2)
        if_block2.c();
      t2 = space();
      if (if_block3)
        if_block3.c();
      attr(div0, "class", "column svelte-1kwccrh");
      attr(div1, "class", "column-wrap");
      set_style(
        div1,
        "grid-template-columns",
        /*gridColWidths*/
        ctx[7]
      );
      attr(div2, "class", "visual-wrap svelte-1kwccrh");
      attr(div3, "class", "column");
      attr(div4, "class", "column-wrap");
      attr(div5, "class", "image svelte-1kwccrh");
    },
    m(target, anchor) {
      insert(target, div5, anchor);
      if (if_block0)
        if_block0.m(div5, null);
      append(div5, t0);
      append(div5, div2);
      append(div2, div1);
      append(div1, div0);
      if_block1.m(div0, null);
      append(div5, t1);
      append(div5, div4);
      append(div4, div3);
      if (if_block2)
        if_block2.m(div3, null);
      append(div3, t2);
      if (if_block3)
        if_block3.m(div3, null);
    },
    p(ctx2, [dirty]) {
      if (
        /*title*/
        ctx2[2]
      ) {
        if (if_block0) {
          if_block0.p(ctx2, dirty);
        } else {
          if_block0 = create_if_block_4(ctx2);
          if_block0.c();
          if_block0.m(div5, t0);
        }
      } else if (if_block0) {
        if_block0.d(1);
        if_block0 = null;
      }
      if (current_block_type === (current_block_type = select_block_type(ctx2)) && if_block1) {
        if_block1.p(ctx2, dirty);
      } else {
        if_block1.d(1);
        if_block1 = current_block_type(ctx2);
        if (if_block1) {
          if_block1.c();
          if_block1.m(div0, null);
        }
      }
      if (dirty & /*gridColWidths*/
      128) {
        set_style(
          div1,
          "grid-template-columns",
          /*gridColWidths*/
          ctx2[7]
        );
      }
      if (
        /*notes*/
        ctx2[4]
      ) {
        if (if_block2) {
          if_block2.p(ctx2, dirty);
        } else {
          if_block2 = create_if_block_1$1(ctx2);
          if_block2.c();
          if_block2.m(div3, t2);
        }
      } else if (if_block2) {
        if_block2.d(1);
        if_block2 = null;
      }
      if (
        /*sources*/
        ctx2[5]
      ) {
        if (if_block3) {
          if_block3.p(ctx2, dirty);
        } else {
          if_block3 = create_if_block$2(ctx2);
          if_block3.c();
          if_block3.m(div3, null);
        }
      } else if (if_block3) {
        if_block3.d(1);
        if_block3 = null;
      }
    },
    i: noop,
    o: noop,
    d(detaching) {
      if (detaching)
        detach(div5);
      if (if_block0)
        if_block0.d();
      if_block1.d();
      if (if_block2)
        if_block2.d();
      if (if_block3)
        if_block3.d();
    }
  };
}
function instance$5($$self, $$props, $$invalidate) {
  let { url } = $$props;
  let { width = "600px" } = $$props;
  let { height = "100vh" } = $$props;
  let { title = "" } = $$props;
  let { text: text2 = "" } = $$props;
  let { notes = "" } = $$props;
  let { sources = "" } = $$props;
  let { bgImg = false } = $$props;
  let gridColWidths;
  $$self.$$set = ($$props2) => {
    if ("url" in $$props2)
      $$invalidate(0, url = $$props2.url);
    if ("width" in $$props2)
      $$invalidate(8, width = $$props2.width);
    if ("height" in $$props2)
      $$invalidate(1, height = $$props2.height);
    if ("title" in $$props2)
      $$invalidate(2, title = $$props2.title);
    if ("text" in $$props2)
      $$invalidate(3, text2 = $$props2.text);
    if ("notes" in $$props2)
      $$invalidate(4, notes = $$props2.notes);
    if ("sources" in $$props2)
      $$invalidate(5, sources = $$props2.sources);
    if ("bgImg" in $$props2)
      $$invalidate(6, bgImg = $$props2.bgImg);
  };
  $$self.$$.update = () => {
    if ($$self.$$.dirty & /*width*/
    256) {
      $$invalidate(7, gridColWidths = getGridColWidth(width));
    }
  };
  return [url, height, title, text2, notes, sources, bgImg, gridColWidths, width];
}
class Image extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$5, create_fragment$7, safe_not_equal, {
      url: 0,
      width: 8,
      height: 1,
      title: 2,
      text: 3,
      notes: 4,
      sources: 5,
      bgImg: 6
    });
  }
}
const plus = "" + new URL("plus.svg", import.meta.url).href;
const Collapsible_svelte_svelte_type_style_lang = "";
function get_each_context(ctx, list, i) {
  const child_ctx = ctx.slice();
  child_ctx[4] = list[i];
  return child_ctx;
}
function create_if_block$1(ctx) {
  let current_block_type_index;
  let if_block;
  let if_block_anchor;
  let current;
  const if_block_creators = [create_if_block_1, create_else_block];
  const if_blocks = [];
  function select_block_type(ctx2, dirty) {
    if (
      /*detail*/
      ctx2[1].length < 2
    )
      return 0;
    return 1;
  }
  current_block_type_index = select_block_type(ctx);
  if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
  return {
    c() {
      if_block.c();
      if_block_anchor = empty();
    },
    m(target, anchor) {
      if_blocks[current_block_type_index].m(target, anchor);
      insert(target, if_block_anchor, anchor);
      current = true;
    },
    p(ctx2, dirty) {
      let previous_block_index = current_block_type_index;
      current_block_type_index = select_block_type(ctx2);
      if (current_block_type_index === previous_block_index) {
        if_blocks[current_block_type_index].p(ctx2, dirty);
      } else {
        group_outros();
        transition_out(if_blocks[previous_block_index], 1, 1, () => {
          if_blocks[previous_block_index] = null;
        });
        check_outros();
        if_block = if_blocks[current_block_type_index];
        if (!if_block) {
          if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx2);
          if_block.c();
        } else {
          if_block.p(ctx2, dirty);
        }
        transition_in(if_block, 1);
        if_block.m(if_block_anchor.parentNode, if_block_anchor);
      }
    },
    i(local) {
      if (current)
        return;
      transition_in(if_block);
      current = true;
    },
    o(local) {
      transition_out(if_block);
      current = false;
    },
    d(detaching) {
      if_blocks[current_block_type_index].d(detaching);
      if (detaching)
        detach(if_block_anchor);
    }
  };
}
function create_else_block(ctx) {
  let ul;
  let ul_transition;
  let current;
  let each_value = (
    /*detail*/
    ctx[1]
  );
  let each_blocks = [];
  for (let i = 0; i < each_value.length; i += 1) {
    each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
  }
  return {
    c() {
      ul = element("ul");
      for (let i = 0; i < each_blocks.length; i += 1) {
        each_blocks[i].c();
      }
      attr(ul, "class", "svelte-15jbbo");
    },
    m(target, anchor) {
      insert(target, ul, anchor);
      for (let i = 0; i < each_blocks.length; i += 1) {
        if (each_blocks[i]) {
          each_blocks[i].m(ul, null);
        }
      }
      current = true;
    },
    p(ctx2, dirty) {
      if (dirty & /*detail*/
      2) {
        each_value = /*detail*/
        ctx2[1];
        let i;
        for (i = 0; i < each_value.length; i += 1) {
          const child_ctx = get_each_context(ctx2, each_value, i);
          if (each_blocks[i]) {
            each_blocks[i].p(child_ctx, dirty);
          } else {
            each_blocks[i] = create_each_block(child_ctx);
            each_blocks[i].c();
            each_blocks[i].m(ul, null);
          }
        }
        for (; i < each_blocks.length; i += 1) {
          each_blocks[i].d(1);
        }
        each_blocks.length = each_value.length;
      }
    },
    i(local) {
      if (current)
        return;
      add_render_callback(() => {
        if (!current)
          return;
        if (!ul_transition)
          ul_transition = create_bidirectional_transition(ul, slide, { duration: 500 }, true);
        ul_transition.run(1);
      });
      current = true;
    },
    o(local) {
      if (!ul_transition)
        ul_transition = create_bidirectional_transition(ul, slide, { duration: 500 }, false);
      ul_transition.run(0);
      current = false;
    },
    d(detaching) {
      if (detaching)
        detach(ul);
      destroy_each(each_blocks, detaching);
      if (detaching && ul_transition)
        ul_transition.end();
    }
  };
}
function create_if_block_1(ctx) {
  let p;
  let raw_value = (
    /*detail*/
    ctx[1][0] + ""
  );
  let p_transition;
  let current;
  return {
    c() {
      p = element("p");
      attr(p, "class", "detail svelte-15jbbo");
    },
    m(target, anchor) {
      insert(target, p, anchor);
      p.innerHTML = raw_value;
      current = true;
    },
    p(ctx2, dirty) {
      if ((!current || dirty & /*detail*/
      2) && raw_value !== (raw_value = /*detail*/
      ctx2[1][0] + ""))
        p.innerHTML = raw_value;
    },
    i(local) {
      if (current)
        return;
      add_render_callback(() => {
        if (!current)
          return;
        if (!p_transition)
          p_transition = create_bidirectional_transition(p, slide, { duration: 500 }, true);
        p_transition.run(1);
      });
      current = true;
    },
    o(local) {
      if (!p_transition)
        p_transition = create_bidirectional_transition(p, slide, { duration: 500 }, false);
      p_transition.run(0);
      current = false;
    },
    d(detaching) {
      if (detaching)
        detach(p);
      if (detaching && p_transition)
        p_transition.end();
    }
  };
}
function create_each_block(ctx) {
  let li;
  let t_value = (
    /*item*/
    ctx[4] + ""
  );
  let t;
  return {
    c() {
      li = element("li");
      t = text$1(t_value);
      attr(li, "class", "svelte-15jbbo");
    },
    m(target, anchor) {
      insert(target, li, anchor);
      append(li, t);
    },
    p(ctx2, dirty) {
      if (dirty & /*detail*/
      2 && t_value !== (t_value = /*item*/
      ctx2[4] + ""))
        set_data(t, t_value);
    },
    d(detaching) {
      if (detaching)
        detach(li);
    }
  };
}
function create_fragment$6(ctx) {
  let div1;
  let div0;
  let p;
  let t0;
  let button;
  let img;
  let img_src_value;
  let t1;
  let current;
  let mounted;
  let dispose;
  let if_block = (
    /*showDetail*/
    ctx[2] && create_if_block$1(ctx)
  );
  return {
    c() {
      div1 = element("div");
      div0 = element("div");
      p = element("p");
      t0 = space();
      button = element("button");
      img = element("img");
      t1 = space();
      if (if_block)
        if_block.c();
      attr(p, "class", "svelte-15jbbo");
      if (!src_url_equal(img.src, img_src_value = plus))
        attr(img, "src", img_src_value);
      attr(img, "alt", "plus");
      attr(img, "width", "100%");
      attr(button, "class", "image-wrap");
      attr(div0, "class", "bullet svelte-15jbbo");
      attr(div1, "class", "wrap svelte-15jbbo");
    },
    m(target, anchor) {
      insert(target, div1, anchor);
      append(div1, div0);
      append(div0, p);
      p.innerHTML = /*bullet*/
      ctx[0];
      append(div0, t0);
      append(div0, button);
      append(button, img);
      append(div1, t1);
      if (if_block)
        if_block.m(div1, null);
      current = true;
      if (!mounted) {
        dispose = listen(
          button,
          "click",
          /*click_handler*/
          ctx[3]
        );
        mounted = true;
      }
    },
    p(ctx2, [dirty]) {
      if (!current || dirty & /*bullet*/
      1)
        p.innerHTML = /*bullet*/
        ctx2[0];
      if (
        /*showDetail*/
        ctx2[2]
      ) {
        if (if_block) {
          if_block.p(ctx2, dirty);
          if (dirty & /*showDetail*/
          4) {
            transition_in(if_block, 1);
          }
        } else {
          if_block = create_if_block$1(ctx2);
          if_block.c();
          transition_in(if_block, 1);
          if_block.m(div1, null);
        }
      } else if (if_block) {
        group_outros();
        transition_out(if_block, 1, 1, () => {
          if_block = null;
        });
        check_outros();
      }
    },
    i(local) {
      if (current)
        return;
      transition_in(if_block);
      current = true;
    },
    o(local) {
      transition_out(if_block);
      current = false;
    },
    d(detaching) {
      if (detaching)
        detach(div1);
      if (if_block)
        if_block.d();
      mounted = false;
      dispose();
    }
  };
}
function instance$4($$self, $$props, $$invalidate) {
  let { bullet = "" } = $$props;
  let { detail = [""] } = $$props;
  let showDetail = false;
  const click_handler = () => $$invalidate(2, showDetail = !showDetail);
  $$self.$$set = ($$props2) => {
    if ("bullet" in $$props2)
      $$invalidate(0, bullet = $$props2.bullet);
    if ("detail" in $$props2)
      $$invalidate(1, detail = $$props2.detail);
  };
  return [bullet, detail, showDetail, click_handler];
}
class Collapsible extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$4, create_fragment$6, safe_not_equal, { bullet: 0, detail: 1 });
  }
}
const Accordion_svelte_svelte_type_style_lang = "";
function create_fragment$5(ctx) {
  let div2;
  let div1;
  let div0;
  let h2;
  let t1;
  let p;
  let t3;
  let collapsible0;
  let t4;
  let collapsible1;
  let t5;
  let collapsible2;
  let t6;
  let collapsible3;
  let t7;
  let h3;
  let t9;
  let collapsible4;
  let t10;
  let collapsible5;
  let t11;
  let collapsible6;
  let t12;
  let collapsible7;
  let t13;
  let collapsible8;
  let t14;
  let collapsible9;
  let t15;
  let collapsible10;
  let current;
  collapsible0 = new Collapsible({
    props: {
      bullet: "Implement the <a href='https://unfccc.int/sites/default/files/resource/CMA2018_03a02E.pdf' target='_blank'>transparency commitments</a> agreed in 2018",
      detail: ["Including publishing more timely data, at a minimum annually."]
    }
  });
  collapsible1 = new Collapsible({
    props: {
      bullet: "Address quality and reporting issues",
      detail: [
        "Standardising reporting practices with all providers, including counting the actual climate portions of projects on a case-by-case basis.",
        "Accurately reporting both disbursement and commitment data for all projects.",
        "Applying a consistent, clean, and complete multilateral finance reporting methodology across donors.",
        "Improving the structure of Common Tabular Format tables and implementing a standardised way of reporting, including using consistent multilateral names, avoiding mixing ODA and Other Official Flows, and using columns consistently. This should be done at the review of the Enhanced Transparency Framework no later than 2028 (and ideally much sooner)."
      ]
    }
  });
  collapsible2 = new Collapsible({
    props: {
      bullet: "Improve quality assurance and validation of reported data",
      detail: ["including through independent audits."]
    }
  });
  collapsible3 = new Collapsible({
    props: {
      bullet: "Adopt transparent and replicable methodologies",
      detail: [
        "All providers, including multilateral development banks, should ensure they have transparent and replicable methodologies for how they calculate their climate finance contributions as well as more detailed, timely, and project level data."
      ]
    }
  });
  collapsible4 = new Collapsible({
    props: {
      bullet: "Provider governments need to meet their historic climate finance commitments",
      detail: [
        "This includes actually delivering the promised US$100 billion and making up for the funding shortfall between 2020 and 2022 (including US$16.7 billion in 2020 and US$10.4 billion in 2021). They also must meet their COP26 commitment to double adaptation finance by 2025."
      ]
    }
  });
  collapsible5 = new Collapsible({
    props: {
      bullet: "Agree on an ambitious post-2025 climate finance goal",
      detail: [
        "Parties should agree an ambitious post-2025 climate finance goal that reflects countries' needs, vulnerability to climate change, and economic capacity."
      ]
    }
  });
  collapsible6 = new Collapsible({
    props: {
      bullet: "Climate finance must be additional",
      detail: [
        "Providers must ensure that climate finance is additional to development finance."
      ]
    }
  });
  collapsible7 = new Collapsible({
    props: {
      bullet: "Development banks should increase their available climate financing",
      detail: [
        "Multilateral development banks should increase their available climate financing, particularly for climate adaptation, by leveraging more from their balance sheets. They also should increase concessional financing."
      ]
    }
  });
  collapsible8 = new Collapsible({
    props: {
      bullet: "Provide relief and free up capital for climate investment for countries facing debt distress.",
      detail: [
        "This includes reforming the Debt Sustainability Assessments at the IMF to better reflect climate vulnerabilities, including adding climate clauses to new loans, and agreeing to debt-for-climate swaps where appropriate."
      ]
    }
  });
  collapsible9 = new Collapsible({
    props: {
      bullet: "Channel Special Drawing Rights to climate vulnerable countries",
      detail: [
        "Special Drawing Rights should be directly or indirectly channelled to climate vulnerable countries, providing hundreds of billions in more affordable loans for resilience efforts."
      ]
    }
  });
  collapsible10 = new Collapsible({
    props: {
      bullet: "Accelerate investment in adaptation action",
      detail: [
        "Parties should agree on an ambitious Global Goal on Adaptation to accelerate investment in adaptation action, particularly for those countries with the least resilience to the effects of climate change."
      ]
    }
  });
  return {
    c() {
      div2 = element("div");
      div1 = element("div");
      div0 = element("div");
      h2 = element("h2");
      h2.textContent = "Recommendations";
      t1 = space();
      p = element("p");
      p.textContent = "Delivering climate action and ambition will require trust between\n        providers and recipients. Transparent, accurate, and comparable climate\n        finance data is critical for building that trust. To achieve that, all\n        providers, working with the OECD and UNFCCC, should:";
      t3 = space();
      create_component(collapsible0.$$.fragment);
      t4 = space();
      create_component(collapsible1.$$.fragment);
      t5 = space();
      create_component(collapsible2.$$.fragment);
      t6 = space();
      create_component(collapsible3.$$.fragment);
      t7 = space();
      h3 = element("h3");
      h3.textContent = "Climate action and ambition will also need more investment. Here’s what\n        we need to see:";
      t9 = space();
      create_component(collapsible4.$$.fragment);
      t10 = space();
      create_component(collapsible5.$$.fragment);
      t11 = space();
      create_component(collapsible6.$$.fragment);
      t12 = space();
      create_component(collapsible7.$$.fragment);
      t13 = space();
      create_component(collapsible8.$$.fragment);
      t14 = space();
      create_component(collapsible9.$$.fragment);
      t15 = space();
      create_component(collapsible10.$$.fragment);
      attr(h2, "class", "svelte-1g3vzv5");
      attr(h3, "class", "svelte-1g3vzv5");
      attr(div0, "class", "column");
      attr(div1, "class", "column-wrap");
      attr(div2, "class", "accordion");
    },
    m(target, anchor) {
      insert(target, div2, anchor);
      append(div2, div1);
      append(div1, div0);
      append(div0, h2);
      append(div0, t1);
      append(div0, p);
      append(div0, t3);
      mount_component(collapsible0, div0, null);
      append(div0, t4);
      mount_component(collapsible1, div0, null);
      append(div0, t5);
      mount_component(collapsible2, div0, null);
      append(div0, t6);
      mount_component(collapsible3, div0, null);
      append(div0, t7);
      append(div0, h3);
      append(div0, t9);
      mount_component(collapsible4, div0, null);
      append(div0, t10);
      mount_component(collapsible5, div0, null);
      append(div0, t11);
      mount_component(collapsible6, div0, null);
      append(div0, t12);
      mount_component(collapsible7, div0, null);
      append(div0, t13);
      mount_component(collapsible8, div0, null);
      append(div0, t14);
      mount_component(collapsible9, div0, null);
      append(div0, t15);
      mount_component(collapsible10, div0, null);
      current = true;
    },
    p: noop,
    i(local) {
      if (current)
        return;
      transition_in(collapsible0.$$.fragment, local);
      transition_in(collapsible1.$$.fragment, local);
      transition_in(collapsible2.$$.fragment, local);
      transition_in(collapsible3.$$.fragment, local);
      transition_in(collapsible4.$$.fragment, local);
      transition_in(collapsible5.$$.fragment, local);
      transition_in(collapsible6.$$.fragment, local);
      transition_in(collapsible7.$$.fragment, local);
      transition_in(collapsible8.$$.fragment, local);
      transition_in(collapsible9.$$.fragment, local);
      transition_in(collapsible10.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(collapsible0.$$.fragment, local);
      transition_out(collapsible1.$$.fragment, local);
      transition_out(collapsible2.$$.fragment, local);
      transition_out(collapsible3.$$.fragment, local);
      transition_out(collapsible4.$$.fragment, local);
      transition_out(collapsible5.$$.fragment, local);
      transition_out(collapsible6.$$.fragment, local);
      transition_out(collapsible7.$$.fragment, local);
      transition_out(collapsible8.$$.fragment, local);
      transition_out(collapsible9.$$.fragment, local);
      transition_out(collapsible10.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      if (detaching)
        detach(div2);
      destroy_component(collapsible0);
      destroy_component(collapsible1);
      destroy_component(collapsible2);
      destroy_component(collapsible3);
      destroy_component(collapsible4);
      destroy_component(collapsible5);
      destroy_component(collapsible6);
      destroy_component(collapsible7);
      destroy_component(collapsible8);
      destroy_component(collapsible9);
      destroy_component(collapsible10);
    }
  };
}
class Accordion extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, null, create_fragment$5, safe_not_equal, {});
  }
}
const Resource_svelte_svelte_type_style_lang = "";
function create_fragment$4(ctx) {
  let div;
  let button;
  let header;
  let t0;
  let t1;
  let p;
  let t2;
  let div_class_value;
  let mounted;
  let dispose;
  return {
    c() {
      div = element("div");
      button = element("button");
      header = element("header");
      t0 = text$1(
        /*title*/
        ctx[0]
      );
      t1 = space();
      p = element("p");
      t2 = text$1(
        /*description*/
        ctx[1]
      );
      attr(header, "class", "svelte-13f4dc8");
      attr(p, "class", "svelte-13f4dc8");
      attr(button, "class", "svelte-13f4dc8");
      attr(div, "class", div_class_value = null_to_empty(
        /*position*/
        ctx[2]
      ) + " svelte-13f4dc8");
    },
    m(target, anchor) {
      insert(target, div, anchor);
      append(div, button);
      append(button, header);
      append(header, t0);
      append(button, t1);
      append(button, p);
      append(p, t2);
      if (!mounted) {
        dispose = listen(
          button,
          "click",
          /*goToUrl*/
          ctx[3]
        );
        mounted = true;
      }
    },
    p(ctx2, [dirty]) {
      if (dirty & /*title*/
      1)
        set_data(
          t0,
          /*title*/
          ctx2[0]
        );
      if (dirty & /*description*/
      2)
        set_data(
          t2,
          /*description*/
          ctx2[1]
        );
      if (dirty & /*position*/
      4 && div_class_value !== (div_class_value = null_to_empty(
        /*position*/
        ctx2[2]
      ) + " svelte-13f4dc8")) {
        attr(div, "class", div_class_value);
      }
    },
    i: noop,
    o: noop,
    d(detaching) {
      if (detaching)
        detach(div);
      mounted = false;
      dispose();
    }
  };
}
function instance$3($$self, $$props, $$invalidate) {
  let { title = "" } = $$props;
  let { description = "" } = $$props;
  let { url = "" } = $$props;
  let { position = "left" } = $$props;
  function goToUrl() {
    window.open(url, "_blank");
  }
  $$self.$$set = ($$props2) => {
    if ("title" in $$props2)
      $$invalidate(0, title = $$props2.title);
    if ("description" in $$props2)
      $$invalidate(1, description = $$props2.description);
    if ("url" in $$props2)
      $$invalidate(4, url = $$props2.url);
    if ("position" in $$props2)
      $$invalidate(2, position = $$props2.position);
  };
  return [title, description, position, goToUrl, url];
}
class Resource extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$3, create_fragment$4, safe_not_equal, {
      title: 0,
      description: 1,
      url: 4,
      position: 2
    });
  }
}
const Resources_svelte_svelte_type_style_lang = "";
function create_fragment$3(ctx) {
  let div2;
  let div1;
  let header;
  let t3;
  let div0;
  let resource0;
  let t4;
  let resource1;
  let t5;
  let resource2;
  let t6;
  let resource3;
  let t7;
  let resource4;
  let t8;
  let div2_data_chapter_value;
  let current;
  resource0 = new Resource({
    props: {
      title: "ONE Data Commons",
      description: "Explore this data, together with thousands of other indicators, with ONE Data Commons.",
      position: "left",
      url: "https://datacommons.one.org/"
    }
  });
  resource1 = new Resource({
    props: {
      title: "Methodology",
      description: "We had to simplify things a lot for this story. Read the technical details here.",
      position: "center",
      url: "https://observablehq.com/@one-campaign/the-climate-finance-files-methodology"
    }
  });
  resource2 = new Resource({
    props: {
      title: "Behind-the-scenes",
      description: "While charts do tell a thousand words, some words are sometimes helpful. Read more about the charts on this story.",
      position: "center",
      url: "https://observablehq.com/@one-campaign/climate-finance-files-story-behind-the-scenes"
    }
  });
  resource3 = new Resource({
    props: {
      title: "Data download",
      description: "We spent months cleaning data so that you don't have to. Download it this way.",
      position: "center",
      url: "https://datacommons.one.org/tools/download"
    }
  });
  resource4 = new Resource({
    props: {
      title: "Python package",
      description: "Get, rebuild, remix, and create using our tools and methodologies - all with only a few lines of code.",
      position: "right",
      url: "https://data.one.org"
    }
  });
  return {
    c() {
      div2 = element("div");
      div1 = element("div");
      header = element("header");
      header.innerHTML = `<h2 class="svelte-zjte5q">Congratulations on making it to the end! 🪩</h2> 
      <p class="svelte-zjte5q">Here’s your reward: you can dive deeper and explore the data on your
        own. Feel free to download the data, create, and share your own stories!</p>`;
      t3 = space();
      div0 = element("div");
      create_component(resource0.$$.fragment);
      t4 = space();
      create_component(resource1.$$.fragment);
      t5 = space();
      create_component(resource2.$$.fragment);
      t6 = space();
      create_component(resource3.$$.fragment);
      t7 = space();
      create_component(resource4.$$.fragment);
      t8 = space();
      attr(header, "class", "svelte-zjte5q");
      attr(div0, "class", "resources svelte-zjte5q");
      attr(div1, "class", "resources-main svelte-zjte5q");
      attr(div2, "class", "resources-wrap svelte-zjte5q");
      attr(div2, "data-chapter", div2_data_chapter_value = /*data*/
      ctx[0].chapter);
    },
    m(target, anchor) {
      insert(target, div2, anchor);
      append(div2, div1);
      append(div1, header);
      append(div1, t3);
      append(div1, div0);
      mount_component(resource0, div0, null);
      append(div0, t4);
      mount_component(resource1, div0, null);
      append(div0, t5);
      mount_component(resource2, div0, null);
      append(div0, t6);
      mount_component(resource3, div0, null);
      append(div0, t7);
      mount_component(resource4, div0, null);
      append(div1, t8);
      current = true;
    },
    p(ctx2, [dirty]) {
      if (!current || dirty & /*data*/
      1 && div2_data_chapter_value !== (div2_data_chapter_value = /*data*/
      ctx2[0].chapter)) {
        attr(div2, "data-chapter", div2_data_chapter_value);
      }
    },
    i(local) {
      if (current)
        return;
      transition_in(resource0.$$.fragment, local);
      transition_in(resource1.$$.fragment, local);
      transition_in(resource2.$$.fragment, local);
      transition_in(resource3.$$.fragment, local);
      transition_in(resource4.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(resource0.$$.fragment, local);
      transition_out(resource1.$$.fragment, local);
      transition_out(resource2.$$.fragment, local);
      transition_out(resource3.$$.fragment, local);
      transition_out(resource4.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      if (detaching)
        detach(div2);
      destroy_component(resource0);
      destroy_component(resource1);
      destroy_component(resource2);
      destroy_component(resource3);
      destroy_component(resource4);
    }
  };
}
function instance$2($$self, $$props, $$invalidate) {
  let { data } = $$props;
  $$self.$$set = ($$props2) => {
    if ("data" in $$props2)
      $$invalidate(0, data = $$props2.data);
  };
  return [data];
}
class Resources extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$2, create_fragment$3, safe_not_equal, { data: 0 });
  }
}
const Contributor_svelte_svelte_type_style_lang = "";
function create_fragment$2(ctx) {
  let div3;
  let div2;
  let div1;
  return {
    c() {
      div3 = element("div");
      div2 = element("div");
      div1 = element("div");
      div1.innerHTML = `<h3 class="svelte-aivbwk">This story was brought to you by the following team...</h3> 
      <div class="list svelte-aivbwk"><p class="svelte-aivbwk">Story by <strong><a href="https://data.one.org/experts/#joseph-kraus" target="_blank">Joseph Kraus</a></strong></p> 
        <p class="svelte-aivbwk">Data by
          <strong><a href="https://data.one.org/experts/#jorge-rivera" target="_blank">Jorge Rivera</a>
            and
            <a href="https://data.one.org/experts/#matthew-price" target="_blank">Matthew Price</a></strong></p> 
        <p class="svelte-aivbwk">With contributions from
          <strong><a href="https://data.one.org/experts/#olawunmi-ola-busari" target="_blank">Olawunmi Ola-Busari</a>,
            <a href="https://data.one.org/experts/#luca-picci" target="_blank">Luca Picci</a>,
            <a href="https://data.one.org/experts/#amy-dodd" target="_blank">Amy Dodd</a>,
            <a href="https://www.one.org/stories/author/annepaisley/" target="_blank">Anne Paisley</a>, and
            <a href="https://data.one.org/experts/#david-mcnair" target="_blank">David McNair</a></strong></p> 
        <p class="svelte-aivbwk">Viusal storytelling by
          <strong><a href="https://www.parabole.studio/" target="_blank">Evelina Judeikyte</a>
            and
            <a href="https://www.datamake.io/" target="_blank">Lars Verspohl</a></strong></p></div>`;
      attr(div1, "class", "column");
      attr(div2, "class", "column-wrap");
      set_style(
        div2,
        "grid-template-columns",
        /*gridColWidths*/
        ctx[0]
      );
      attr(div3, "class", "contributor svelte-aivbwk");
    },
    m(target, anchor) {
      insert(target, div3, anchor);
      append(div3, div2);
      append(div2, div1);
    },
    p(ctx2, [dirty]) {
      if (dirty & /*gridColWidths*/
      1) {
        set_style(
          div2,
          "grid-template-columns",
          /*gridColWidths*/
          ctx2[0]
        );
      }
    },
    i: noop,
    o: noop,
    d(detaching) {
      if (detaching)
        detach(div3);
    }
  };
}
function instance$1($$self, $$props, $$invalidate) {
  let { width = "600px" } = $$props;
  let gridColWidths;
  $$self.$$set = ($$props2) => {
    if ("width" in $$props2)
      $$invalidate(1, width = $$props2.width);
  };
  $$self.$$.update = () => {
    if ($$self.$$.dirty & /*width*/
    2) {
      $$invalidate(0, gridColWidths = getGridColWidth(width));
    }
  };
  return [gridColWidths, width];
}
class Contributor extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$1, create_fragment$2, safe_not_equal, { width: 1 });
  }
}
const graphic_1_2 = "" + new URL("graphic_1_2.svg", import.meta.url).href;
const graphic_1_2_mobile = "" + new URL("graphic_1_2_mobile.svg", import.meta.url).href;
const graphic_1_3 = "" + new URL("graphic_1_3.svg", import.meta.url).href;
const graphic_1_3_mobile = "" + new URL("graphic_1_3_mobile.svg", import.meta.url).href;
const graphic_2_1 = "" + new URL("graphic_2_1.svg", import.meta.url).href;
function create_if_block(ctx) {
  let title;
  let t0;
  let textblock0;
  let t1;
  let textblock1;
  let t2;
  let textblock2;
  let t3;
  let keyresults;
  let t4;
  let chaptertitle0;
  let t5;
  let textblock3;
  let t6;
  let callout0;
  let t7;
  let textblock4;
  let t8;
  let graphic0;
  let t9;
  let textblock5;
  let t10;
  let graphic1;
  let t11;
  let textblock6;
  let t12;
  let image;
  let t13;
  let textblock7;
  let t14;
  let chaptertitle1;
  let t15;
  let textblock8;
  let t16;
  let graphic2;
  let t17;
  let textblock9;
  let t18;
  let callout1;
  let t19;
  let textblock10;
  let t20;
  let textblock11;
  let t21;
  let visual0;
  let t22;
  let textblock12;
  let t23;
  let visual1;
  let t24;
  let textblock13;
  let t25;
  let chaptertitle2;
  let t26;
  let textblock14;
  let t27;
  let visual2;
  let t28;
  let textblock15;
  let t29;
  let visual3;
  let t30;
  let chaptertitle3;
  let t31;
  let textblock16;
  let t32;
  let visual4;
  let t33;
  let textblock17;
  let t34;
  let visual5;
  let t35;
  let chaptertitle4;
  let t36;
  let textblock18;
  let t37;
  let chaptertitle5;
  let t38;
  let textblock19;
  let t39;
  let accordion;
  let t40;
  let resources;
  let t41;
  let contributor;
  let current;
  title = new Title({
    props: {
      title: "These ↑ are the human and economic impacts of just a few extreme weather events in Africa."
    }
  });
  textblock0 = new TextBlock({ props: { copy: (
    /*copy*/
    ctx[2].get(1)
  ) } });
  textblock1 = new TextBlock({
    props: {
      copy: (
        /*copy*/
        ctx[2].get(2)
      ),
      note: "You can " + /*$isMobile*/
      (ctx[4] ? "click on" : "hover over") + " <span style='border-bottom: 0.5px dashed'>dash-underlined terms</span> for definitions"
    }
  });
  textblock2 = new TextBlock({
    props: {
      copy: (
        /*copy*/
        ctx[2].get(3)
      ),
      note: "The Files apply a robust methodology to correct flaws in the OECD's and UNFCCC's data."
    }
  });
  keyresults = new KeyResults({ props: { width_factor: 2 } });
  chaptertitle0 = new ChapterTitle({ props: { data: (
    /*$chapters*/
    ctx[3][0]
  ) } });
  textblock3 = new TextBlock({ props: { copy: (
    /*copy*/
    ctx[2].get(4)
  ) } });
  callout0 = new Callout({
    props: {
      text: "“This is the wild, wild west of finance. Essentially, whatever [providers] call climate finance is climate finance.”",
      note: "<a href='https://www.reuters.com/investigates/special-report/climate-change-finance/' target='_blank'>Mark Joven</a>, Philippines Department of Finance undersecretary"
    }
  });
  textblock4 = new TextBlock({ props: { copy: (
    /*copy*/
    ctx[2].get(5)
  ) } });
  graphic0 = new Graphic({
    props: {
      title: "Providers use different criteria to count climate finance",
      subtitle: "Different reporting methodologies for 26 climate finance providers",
      url: (
        /*$isMobile*/
        ctx[4] ? graphic_1_2_mobile : graphic_1_2
      ),
      notes: "Data reflects 2020 reporting methodology for each provider. We do not include providers that have not reported climate finance on the UNFCCC Climate Finance Data Portal (as of November 2023).",
      sources: "<a href='https://unfccc.int/climatefinance?home' target='_blank'>UNFCCC Climate Finance Data Portal</a>",
      width_factor: 1.8
    }
  });
  textblock5 = new TextBlock({ props: { copy: (
    /*copy*/
    ctx[2].get(6)
  ) } });
  graphic1 = new Graphic({
    props: {
      title: "Different methodologies, wildly different results",
      subtitle: "UK climate finance commitments for 22 projects, calculated using four methodologies",
      url: (
        /*$isMobile*/
        ctx[4] ? graphic_1_3_mobile : graphic_1_3
      ),
      notes: "Without the type of harmonisation made by The Climate Finance Files, numbers reported by different providers aren’t really comparable.",
      sources: "<a href='https://unfccc.int/' target='_blank'>UNFCCC</a>, <a href='https://unfccc.int/climatefinance?home' target='_blank'>UNFCCC Climate Finance Data Portal</a>, <a href='https://one.oecd.org/document/DCD/DAC/STAT(2022)24/REV1/en/pdf' target='_blank'>OECD (2022)</a>",
      width_factor: 1.5,
      legend_data: (
        /*$legend_1_3*/
        ctx[5]
      )
    }
  });
  textblock6 = new TextBlock({ props: { copy: (
    /*copy*/
    ctx[2].get(7)
  ) } });
  image = new Image({
    props: {
      url: `https://datacommons-cdn.one.org/graphic_1_1${/*$isMobile*/
      ctx[4] ? "_mobile" : ""}.gif`,
      width: "100%",
      height: "auto",
      title: "It took us months to figure out the data...",
      sources: "<a href='https://unfccc.int/climatefinance?home' target='_blank'>UNFCCC Climate Finance Data Portal</a>"
    }
  });
  textblock7 = new TextBlock({ props: { copy: (
    /*copy*/
    ctx[2].get(8)
  ) } });
  chaptertitle1 = new ChapterTitle({ props: { data: (
    /*$chapters*/
    ctx[3][1]
  ) } });
  textblock8 = new TextBlock({ props: { copy: (
    /*copy*/
    ctx[2].get(9)
  ) } });
  graphic2 = new Graphic({
    props: {
      url: graphic_2_1,
      width_factor: 1,
      sources: "ONE calculations based on <a href='https://www.oecd.org/dac/financing-sustainable-development/development-finance-topics/climate-change.htm' target='_blank'>OECD</a>,\n    <a href='https://milex.sipri.org/sipri' target='_blank'>SIPRI</a>"
    }
  });
  textblock9 = new TextBlock({ props: { copy: (
    /*copy*/
    ctx[2].get(10)
  ) } });
  callout1 = new Callout({
    props: {
      text: "Rich countries are providing much less climate finance than they claim"
    }
  });
  textblock10 = new TextBlock({ props: { copy: (
    /*copy*/
    ctx[2].get(11)
  ) } });
  textblock11 = new TextBlock({
    props: {
      copy: (
        /*copy*/
        ctx[2].get(12)
      ),
      note: "Not the same data the OECD uses to track progress toward the US$100 billion pledge (which isn't public)."
    }
  });
  visual0 = new Visual({
    props: {
      type: "story",
      width_factor: 1.5,
      id: 2102402
    }
  });
  textblock12 = new TextBlock({ props: { copy: (
    /*copy*/
    ctx[2].get(13)
  ) } });
  visual1 = new Visual({
    props: {
      title: "Climate commitments don’t always translate into climate disbursements",
      subtitle: "Share of commitments that are disbursed and meaningfully related to climate",
      notes: "Besides tracking disbursements instead of commitments, The Climate Finance Files only count 40% of climate projects marked “significant” (and 100% of those marked “principal”). That reduces (but probably doesn’t eliminate) inflation.",
      sources: "ONE calculations based on <a href='https://www.oecd.org/dac/financing-sustainable-development/development-finance-topics/climate-change.htm' target='_blank'>OECD</a>",
      width_factor: 1.5,
      type: "story",
      id: 2102404
    }
  });
  textblock13 = new TextBlock({ props: { copy: (
    /*copy*/
    ctx[2].get(14)
  ) } });
  chaptertitle2 = new ChapterTitle({ props: { data: (
    /*$chapters*/
    ctx[3][2]
  ) } });
  textblock14 = new TextBlock({ props: { copy: (
    /*copy*/
    ctx[2].get(15)
  ) } });
  visual2 = new Visual({
    props: {
      title: "The climate finance needs of the most vulnerable countries are far from being met",
      subtitle: "Most countries receive a fraction of the financing they need to address climate change",
      notes: "Based on <a href='https://www.climatepolicyinitiative.org/wp-content/uploads/2022/06/Climate-Finance-Needs-of-African-Countries-1.pdf' target='_blank'>annual climate finance needs</a> in 20 most climate-vulnerable countries. Disbursement calculations based on the 2019-2020 average.",
      sources: "ONE calculations based on <a href='https://www.oecd.org/dac/financing-sustainable-development/development-finance-topics/climate-change.htm' target='_blank'>OECD</a>, <a href='https://gain.nd.edu/' target='_blank'>ND-GAIN</a>, <a href='https://www.climatepolicyinitiative.org/wp-content/uploads/2022/06/Climate-Finance-Needs-of-African-Countries-1.pdf' target='_blank'>CPI</a>, <a href='https://www.imf.org/en/Topics/climate-change' target='_blank'>IMF</a>, <a href='https://unfccc.int/' target='_blank'>UNFCCC</a>",
      width_factor: 1.5,
      id: 15894576,
      legend_data: (
        /*$legend_3_1*/
        ctx[6]
      )
    }
  });
  textblock15 = new TextBlock({ props: { copy: (
    /*copy*/
    ctx[2].get(16)
  ) } });
  visual3 = new Visual({
    props: {
      title: "No climate-vulnerable country is able to cover both climate and health needs",
      subtitle: "Climate finance needs and health spending for the 20 most climate-vulnerable countries",
      type: "story",
      width_factor: 1.5,
      id: 2102410,
      notes: "Based on <a href='https://www.climatepolicyinitiative.org/wp-content/uploads/2022/06/Climate-Finance-Needs-of-African-Countries-1.pdf' target='_blank'>annual climate finance needs</a> in 20 most climate-vulnerable countries.",
      sources: "ONE calculations based on <a href='https://www.oecd.org/dac/financing-sustainable-development/development-finance-topics/climate-change.htm' target='_blank'>OECD</a>, <a href='https://apps.who.int/nha/database#:~:text=The%20Global%20Health%20Expenditure%20Database,open%20access%20to%20the%20public' target='_blank'>WHO GHED</a>"
    }
  });
  chaptertitle3 = new ChapterTitle({ props: { data: (
    /*$chapters*/
    ctx[3][3]
  ) } });
  textblock16 = new TextBlock({ props: { copy: (
    /*copy*/
    ctx[2].get(17)
  ) } });
  visual4 = new Visual({
    props: {
      title: "Almost 1 in 2 debt-distressed countries paid more in debt than they received in climate financing",
      subtitle: "Debt payments divided by climate financing in 2021",
      notes: "Basen on climate finance and debt service payments data for 46 out 54 countries with severe debt problems. The list of 54 countries is from UNDP/Jensen, using data on credit ratings, debt sustainability ratings, and sovereign bond spreads.",
      sources: "ONE calculations based on <a href='https://www.oecd.org/dac/financing-sustainable-development/development-finance-topics/climate-change.htm' target='_blank'>OECD</a>, <a href='https://www.worldbank.org/en/programs/debt-statistics/ids' target='_blank'>International Debt Statistics</a>, <a href='https://www.undp.org/sites/g/files/zskgke326/files/2022-10/UNDP-DFS-Avoiding-Too-Little-Too-Late-on-International-Debt-Relief-V2.pdf' target='_blank'>UNDP</>",
      width_factor: 1.5,
      type: "story",
      id: 2102412
    }
  });
  textblock17 = new TextBlock({ props: { copy: (
    /*copy*/
    ctx[2].get(18)
  ) } });
  visual5 = new Visual({
    props: { id: 15886574, width_factor: 1.8 }
  });
  chaptertitle4 = new ChapterTitle({ props: { data: (
    /*$chapters*/
    ctx[3][4]
  ) } });
  textblock18 = new TextBlock({ props: { copy: (
    /*copy*/
    ctx[2].get(19)
  ) } });
  chaptertitle5 = new ChapterTitle({ props: { data: (
    /*$chapters*/
    ctx[3][5]
  ) } });
  textblock19 = new TextBlock({ props: { copy: (
    /*copy*/
    ctx[2].get(20)
  ) } });
  accordion = new Accordion({});
  resources = new Resources({ props: { data: (
    /*$chapters*/
    ctx[3][6]
  ) } });
  contributor = new Contributor({ props: { width: "700px" } });
  return {
    c() {
      create_component(title.$$.fragment);
      t0 = space();
      create_component(textblock0.$$.fragment);
      t1 = space();
      create_component(textblock1.$$.fragment);
      t2 = space();
      create_component(textblock2.$$.fragment);
      t3 = space();
      create_component(keyresults.$$.fragment);
      t4 = space();
      create_component(chaptertitle0.$$.fragment);
      t5 = space();
      create_component(textblock3.$$.fragment);
      t6 = space();
      create_component(callout0.$$.fragment);
      t7 = space();
      create_component(textblock4.$$.fragment);
      t8 = space();
      create_component(graphic0.$$.fragment);
      t9 = space();
      create_component(textblock5.$$.fragment);
      t10 = space();
      create_component(graphic1.$$.fragment);
      t11 = space();
      create_component(textblock6.$$.fragment);
      t12 = space();
      create_component(image.$$.fragment);
      t13 = space();
      create_component(textblock7.$$.fragment);
      t14 = space();
      create_component(chaptertitle1.$$.fragment);
      t15 = space();
      create_component(textblock8.$$.fragment);
      t16 = space();
      create_component(graphic2.$$.fragment);
      t17 = space();
      create_component(textblock9.$$.fragment);
      t18 = space();
      create_component(callout1.$$.fragment);
      t19 = space();
      create_component(textblock10.$$.fragment);
      t20 = space();
      create_component(textblock11.$$.fragment);
      t21 = space();
      create_component(visual0.$$.fragment);
      t22 = space();
      create_component(textblock12.$$.fragment);
      t23 = space();
      create_component(visual1.$$.fragment);
      t24 = space();
      create_component(textblock13.$$.fragment);
      t25 = space();
      create_component(chaptertitle2.$$.fragment);
      t26 = space();
      create_component(textblock14.$$.fragment);
      t27 = space();
      create_component(visual2.$$.fragment);
      t28 = space();
      create_component(textblock15.$$.fragment);
      t29 = space();
      create_component(visual3.$$.fragment);
      t30 = space();
      create_component(chaptertitle3.$$.fragment);
      t31 = space();
      create_component(textblock16.$$.fragment);
      t32 = space();
      create_component(visual4.$$.fragment);
      t33 = space();
      create_component(textblock17.$$.fragment);
      t34 = space();
      create_component(visual5.$$.fragment);
      t35 = space();
      create_component(chaptertitle4.$$.fragment);
      t36 = space();
      create_component(textblock18.$$.fragment);
      t37 = space();
      create_component(chaptertitle5.$$.fragment);
      t38 = space();
      create_component(textblock19.$$.fragment);
      t39 = space();
      create_component(accordion.$$.fragment);
      t40 = space();
      create_component(resources.$$.fragment);
      t41 = space();
      create_component(contributor.$$.fragment);
    },
    m(target, anchor) {
      mount_component(title, target, anchor);
      insert(target, t0, anchor);
      mount_component(textblock0, target, anchor);
      insert(target, t1, anchor);
      mount_component(textblock1, target, anchor);
      insert(target, t2, anchor);
      mount_component(textblock2, target, anchor);
      insert(target, t3, anchor);
      mount_component(keyresults, target, anchor);
      insert(target, t4, anchor);
      mount_component(chaptertitle0, target, anchor);
      insert(target, t5, anchor);
      mount_component(textblock3, target, anchor);
      insert(target, t6, anchor);
      mount_component(callout0, target, anchor);
      insert(target, t7, anchor);
      mount_component(textblock4, target, anchor);
      insert(target, t8, anchor);
      mount_component(graphic0, target, anchor);
      insert(target, t9, anchor);
      mount_component(textblock5, target, anchor);
      insert(target, t10, anchor);
      mount_component(graphic1, target, anchor);
      insert(target, t11, anchor);
      mount_component(textblock6, target, anchor);
      insert(target, t12, anchor);
      mount_component(image, target, anchor);
      insert(target, t13, anchor);
      mount_component(textblock7, target, anchor);
      insert(target, t14, anchor);
      mount_component(chaptertitle1, target, anchor);
      insert(target, t15, anchor);
      mount_component(textblock8, target, anchor);
      insert(target, t16, anchor);
      mount_component(graphic2, target, anchor);
      insert(target, t17, anchor);
      mount_component(textblock9, target, anchor);
      insert(target, t18, anchor);
      mount_component(callout1, target, anchor);
      insert(target, t19, anchor);
      mount_component(textblock10, target, anchor);
      insert(target, t20, anchor);
      mount_component(textblock11, target, anchor);
      insert(target, t21, anchor);
      mount_component(visual0, target, anchor);
      insert(target, t22, anchor);
      mount_component(textblock12, target, anchor);
      insert(target, t23, anchor);
      mount_component(visual1, target, anchor);
      insert(target, t24, anchor);
      mount_component(textblock13, target, anchor);
      insert(target, t25, anchor);
      mount_component(chaptertitle2, target, anchor);
      insert(target, t26, anchor);
      mount_component(textblock14, target, anchor);
      insert(target, t27, anchor);
      mount_component(visual2, target, anchor);
      insert(target, t28, anchor);
      mount_component(textblock15, target, anchor);
      insert(target, t29, anchor);
      mount_component(visual3, target, anchor);
      insert(target, t30, anchor);
      mount_component(chaptertitle3, target, anchor);
      insert(target, t31, anchor);
      mount_component(textblock16, target, anchor);
      insert(target, t32, anchor);
      mount_component(visual4, target, anchor);
      insert(target, t33, anchor);
      mount_component(textblock17, target, anchor);
      insert(target, t34, anchor);
      mount_component(visual5, target, anchor);
      insert(target, t35, anchor);
      mount_component(chaptertitle4, target, anchor);
      insert(target, t36, anchor);
      mount_component(textblock18, target, anchor);
      insert(target, t37, anchor);
      mount_component(chaptertitle5, target, anchor);
      insert(target, t38, anchor);
      mount_component(textblock19, target, anchor);
      insert(target, t39, anchor);
      mount_component(accordion, target, anchor);
      insert(target, t40, anchor);
      mount_component(resources, target, anchor);
      insert(target, t41, anchor);
      mount_component(contributor, target, anchor);
      current = true;
    },
    p(ctx2, dirty) {
      const textblock0_changes = {};
      if (dirty & /*copy*/
      4)
        textblock0_changes.copy = /*copy*/
        ctx2[2].get(1);
      textblock0.$set(textblock0_changes);
      const textblock1_changes = {};
      if (dirty & /*copy*/
      4)
        textblock1_changes.copy = /*copy*/
        ctx2[2].get(2);
      if (dirty & /*$isMobile*/
      16)
        textblock1_changes.note = "You can " + /*$isMobile*/
        (ctx2[4] ? "click on" : "hover over") + " <span style='border-bottom: 0.5px dashed'>dash-underlined terms</span> for definitions";
      textblock1.$set(textblock1_changes);
      const textblock2_changes = {};
      if (dirty & /*copy*/
      4)
        textblock2_changes.copy = /*copy*/
        ctx2[2].get(3);
      textblock2.$set(textblock2_changes);
      const chaptertitle0_changes = {};
      if (dirty & /*$chapters*/
      8)
        chaptertitle0_changes.data = /*$chapters*/
        ctx2[3][0];
      chaptertitle0.$set(chaptertitle0_changes);
      const textblock3_changes = {};
      if (dirty & /*copy*/
      4)
        textblock3_changes.copy = /*copy*/
        ctx2[2].get(4);
      textblock3.$set(textblock3_changes);
      const textblock4_changes = {};
      if (dirty & /*copy*/
      4)
        textblock4_changes.copy = /*copy*/
        ctx2[2].get(5);
      textblock4.$set(textblock4_changes);
      const graphic0_changes = {};
      if (dirty & /*$isMobile*/
      16)
        graphic0_changes.url = /*$isMobile*/
        ctx2[4] ? graphic_1_2_mobile : graphic_1_2;
      graphic0.$set(graphic0_changes);
      const textblock5_changes = {};
      if (dirty & /*copy*/
      4)
        textblock5_changes.copy = /*copy*/
        ctx2[2].get(6);
      textblock5.$set(textblock5_changes);
      const graphic1_changes = {};
      if (dirty & /*$isMobile*/
      16)
        graphic1_changes.url = /*$isMobile*/
        ctx2[4] ? graphic_1_3_mobile : graphic_1_3;
      if (dirty & /*$legend_1_3*/
      32)
        graphic1_changes.legend_data = /*$legend_1_3*/
        ctx2[5];
      graphic1.$set(graphic1_changes);
      const textblock6_changes = {};
      if (dirty & /*copy*/
      4)
        textblock6_changes.copy = /*copy*/
        ctx2[2].get(7);
      textblock6.$set(textblock6_changes);
      const image_changes = {};
      if (dirty & /*$isMobile*/
      16)
        image_changes.url = `https://datacommons-cdn.one.org/graphic_1_1${/*$isMobile*/
        ctx2[4] ? "_mobile" : ""}.gif`;
      image.$set(image_changes);
      const textblock7_changes = {};
      if (dirty & /*copy*/
      4)
        textblock7_changes.copy = /*copy*/
        ctx2[2].get(8);
      textblock7.$set(textblock7_changes);
      const chaptertitle1_changes = {};
      if (dirty & /*$chapters*/
      8)
        chaptertitle1_changes.data = /*$chapters*/
        ctx2[3][1];
      chaptertitle1.$set(chaptertitle1_changes);
      const textblock8_changes = {};
      if (dirty & /*copy*/
      4)
        textblock8_changes.copy = /*copy*/
        ctx2[2].get(9);
      textblock8.$set(textblock8_changes);
      const textblock9_changes = {};
      if (dirty & /*copy*/
      4)
        textblock9_changes.copy = /*copy*/
        ctx2[2].get(10);
      textblock9.$set(textblock9_changes);
      const textblock10_changes = {};
      if (dirty & /*copy*/
      4)
        textblock10_changes.copy = /*copy*/
        ctx2[2].get(11);
      textblock10.$set(textblock10_changes);
      const textblock11_changes = {};
      if (dirty & /*copy*/
      4)
        textblock11_changes.copy = /*copy*/
        ctx2[2].get(12);
      textblock11.$set(textblock11_changes);
      const textblock12_changes = {};
      if (dirty & /*copy*/
      4)
        textblock12_changes.copy = /*copy*/
        ctx2[2].get(13);
      textblock12.$set(textblock12_changes);
      const textblock13_changes = {};
      if (dirty & /*copy*/
      4)
        textblock13_changes.copy = /*copy*/
        ctx2[2].get(14);
      textblock13.$set(textblock13_changes);
      const chaptertitle2_changes = {};
      if (dirty & /*$chapters*/
      8)
        chaptertitle2_changes.data = /*$chapters*/
        ctx2[3][2];
      chaptertitle2.$set(chaptertitle2_changes);
      const textblock14_changes = {};
      if (dirty & /*copy*/
      4)
        textblock14_changes.copy = /*copy*/
        ctx2[2].get(15);
      textblock14.$set(textblock14_changes);
      const visual2_changes = {};
      if (dirty & /*$legend_3_1*/
      64)
        visual2_changes.legend_data = /*$legend_3_1*/
        ctx2[6];
      visual2.$set(visual2_changes);
      const textblock15_changes = {};
      if (dirty & /*copy*/
      4)
        textblock15_changes.copy = /*copy*/
        ctx2[2].get(16);
      textblock15.$set(textblock15_changes);
      const chaptertitle3_changes = {};
      if (dirty & /*$chapters*/
      8)
        chaptertitle3_changes.data = /*$chapters*/
        ctx2[3][3];
      chaptertitle3.$set(chaptertitle3_changes);
      const textblock16_changes = {};
      if (dirty & /*copy*/
      4)
        textblock16_changes.copy = /*copy*/
        ctx2[2].get(17);
      textblock16.$set(textblock16_changes);
      const textblock17_changes = {};
      if (dirty & /*copy*/
      4)
        textblock17_changes.copy = /*copy*/
        ctx2[2].get(18);
      textblock17.$set(textblock17_changes);
      const chaptertitle4_changes = {};
      if (dirty & /*$chapters*/
      8)
        chaptertitle4_changes.data = /*$chapters*/
        ctx2[3][4];
      chaptertitle4.$set(chaptertitle4_changes);
      const textblock18_changes = {};
      if (dirty & /*copy*/
      4)
        textblock18_changes.copy = /*copy*/
        ctx2[2].get(19);
      textblock18.$set(textblock18_changes);
      const chaptertitle5_changes = {};
      if (dirty & /*$chapters*/
      8)
        chaptertitle5_changes.data = /*$chapters*/
        ctx2[3][5];
      chaptertitle5.$set(chaptertitle5_changes);
      const textblock19_changes = {};
      if (dirty & /*copy*/
      4)
        textblock19_changes.copy = /*copy*/
        ctx2[2].get(20);
      textblock19.$set(textblock19_changes);
      const resources_changes = {};
      if (dirty & /*$chapters*/
      8)
        resources_changes.data = /*$chapters*/
        ctx2[3][6];
      resources.$set(resources_changes);
    },
    i(local) {
      if (current)
        return;
      transition_in(title.$$.fragment, local);
      transition_in(textblock0.$$.fragment, local);
      transition_in(textblock1.$$.fragment, local);
      transition_in(textblock2.$$.fragment, local);
      transition_in(keyresults.$$.fragment, local);
      transition_in(chaptertitle0.$$.fragment, local);
      transition_in(textblock3.$$.fragment, local);
      transition_in(callout0.$$.fragment, local);
      transition_in(textblock4.$$.fragment, local);
      transition_in(graphic0.$$.fragment, local);
      transition_in(textblock5.$$.fragment, local);
      transition_in(graphic1.$$.fragment, local);
      transition_in(textblock6.$$.fragment, local);
      transition_in(image.$$.fragment, local);
      transition_in(textblock7.$$.fragment, local);
      transition_in(chaptertitle1.$$.fragment, local);
      transition_in(textblock8.$$.fragment, local);
      transition_in(graphic2.$$.fragment, local);
      transition_in(textblock9.$$.fragment, local);
      transition_in(callout1.$$.fragment, local);
      transition_in(textblock10.$$.fragment, local);
      transition_in(textblock11.$$.fragment, local);
      transition_in(visual0.$$.fragment, local);
      transition_in(textblock12.$$.fragment, local);
      transition_in(visual1.$$.fragment, local);
      transition_in(textblock13.$$.fragment, local);
      transition_in(chaptertitle2.$$.fragment, local);
      transition_in(textblock14.$$.fragment, local);
      transition_in(visual2.$$.fragment, local);
      transition_in(textblock15.$$.fragment, local);
      transition_in(visual3.$$.fragment, local);
      transition_in(chaptertitle3.$$.fragment, local);
      transition_in(textblock16.$$.fragment, local);
      transition_in(visual4.$$.fragment, local);
      transition_in(textblock17.$$.fragment, local);
      transition_in(visual5.$$.fragment, local);
      transition_in(chaptertitle4.$$.fragment, local);
      transition_in(textblock18.$$.fragment, local);
      transition_in(chaptertitle5.$$.fragment, local);
      transition_in(textblock19.$$.fragment, local);
      transition_in(accordion.$$.fragment, local);
      transition_in(resources.$$.fragment, local);
      transition_in(contributor.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(title.$$.fragment, local);
      transition_out(textblock0.$$.fragment, local);
      transition_out(textblock1.$$.fragment, local);
      transition_out(textblock2.$$.fragment, local);
      transition_out(keyresults.$$.fragment, local);
      transition_out(chaptertitle0.$$.fragment, local);
      transition_out(textblock3.$$.fragment, local);
      transition_out(callout0.$$.fragment, local);
      transition_out(textblock4.$$.fragment, local);
      transition_out(graphic0.$$.fragment, local);
      transition_out(textblock5.$$.fragment, local);
      transition_out(graphic1.$$.fragment, local);
      transition_out(textblock6.$$.fragment, local);
      transition_out(image.$$.fragment, local);
      transition_out(textblock7.$$.fragment, local);
      transition_out(chaptertitle1.$$.fragment, local);
      transition_out(textblock8.$$.fragment, local);
      transition_out(graphic2.$$.fragment, local);
      transition_out(textblock9.$$.fragment, local);
      transition_out(callout1.$$.fragment, local);
      transition_out(textblock10.$$.fragment, local);
      transition_out(textblock11.$$.fragment, local);
      transition_out(visual0.$$.fragment, local);
      transition_out(textblock12.$$.fragment, local);
      transition_out(visual1.$$.fragment, local);
      transition_out(textblock13.$$.fragment, local);
      transition_out(chaptertitle2.$$.fragment, local);
      transition_out(textblock14.$$.fragment, local);
      transition_out(visual2.$$.fragment, local);
      transition_out(textblock15.$$.fragment, local);
      transition_out(visual3.$$.fragment, local);
      transition_out(chaptertitle3.$$.fragment, local);
      transition_out(textblock16.$$.fragment, local);
      transition_out(visual4.$$.fragment, local);
      transition_out(textblock17.$$.fragment, local);
      transition_out(visual5.$$.fragment, local);
      transition_out(chaptertitle4.$$.fragment, local);
      transition_out(textblock18.$$.fragment, local);
      transition_out(chaptertitle5.$$.fragment, local);
      transition_out(textblock19.$$.fragment, local);
      transition_out(accordion.$$.fragment, local);
      transition_out(resources.$$.fragment, local);
      transition_out(contributor.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      destroy_component(title, detaching);
      if (detaching)
        detach(t0);
      destroy_component(textblock0, detaching);
      if (detaching)
        detach(t1);
      destroy_component(textblock1, detaching);
      if (detaching)
        detach(t2);
      destroy_component(textblock2, detaching);
      if (detaching)
        detach(t3);
      destroy_component(keyresults, detaching);
      if (detaching)
        detach(t4);
      destroy_component(chaptertitle0, detaching);
      if (detaching)
        detach(t5);
      destroy_component(textblock3, detaching);
      if (detaching)
        detach(t6);
      destroy_component(callout0, detaching);
      if (detaching)
        detach(t7);
      destroy_component(textblock4, detaching);
      if (detaching)
        detach(t8);
      destroy_component(graphic0, detaching);
      if (detaching)
        detach(t9);
      destroy_component(textblock5, detaching);
      if (detaching)
        detach(t10);
      destroy_component(graphic1, detaching);
      if (detaching)
        detach(t11);
      destroy_component(textblock6, detaching);
      if (detaching)
        detach(t12);
      destroy_component(image, detaching);
      if (detaching)
        detach(t13);
      destroy_component(textblock7, detaching);
      if (detaching)
        detach(t14);
      destroy_component(chaptertitle1, detaching);
      if (detaching)
        detach(t15);
      destroy_component(textblock8, detaching);
      if (detaching)
        detach(t16);
      destroy_component(graphic2, detaching);
      if (detaching)
        detach(t17);
      destroy_component(textblock9, detaching);
      if (detaching)
        detach(t18);
      destroy_component(callout1, detaching);
      if (detaching)
        detach(t19);
      destroy_component(textblock10, detaching);
      if (detaching)
        detach(t20);
      destroy_component(textblock11, detaching);
      if (detaching)
        detach(t21);
      destroy_component(visual0, detaching);
      if (detaching)
        detach(t22);
      destroy_component(textblock12, detaching);
      if (detaching)
        detach(t23);
      destroy_component(visual1, detaching);
      if (detaching)
        detach(t24);
      destroy_component(textblock13, detaching);
      if (detaching)
        detach(t25);
      destroy_component(chaptertitle2, detaching);
      if (detaching)
        detach(t26);
      destroy_component(textblock14, detaching);
      if (detaching)
        detach(t27);
      destroy_component(visual2, detaching);
      if (detaching)
        detach(t28);
      destroy_component(textblock15, detaching);
      if (detaching)
        detach(t29);
      destroy_component(visual3, detaching);
      if (detaching)
        detach(t30);
      destroy_component(chaptertitle3, detaching);
      if (detaching)
        detach(t31);
      destroy_component(textblock16, detaching);
      if (detaching)
        detach(t32);
      destroy_component(visual4, detaching);
      if (detaching)
        detach(t33);
      destroy_component(textblock17, detaching);
      if (detaching)
        detach(t34);
      destroy_component(visual5, detaching);
      if (detaching)
        detach(t35);
      destroy_component(chaptertitle4, detaching);
      if (detaching)
        detach(t36);
      destroy_component(textblock18, detaching);
      if (detaching)
        detach(t37);
      destroy_component(chaptertitle5, detaching);
      if (detaching)
        detach(t38);
      destroy_component(textblock19, detaching);
      if (detaching)
        detach(t39);
      destroy_component(accordion, detaching);
      if (detaching)
        detach(t40);
      destroy_component(resources, detaching);
      if (detaching)
        detach(t41);
      destroy_component(contributor, detaching);
    }
  };
}
function create_fragment$1(ctx) {
  let progress_1;
  let t0;
  let bookmarks;
  let t1;
  let hero;
  let t2;
  let carousel;
  let t3;
  let if_block_anchor;
  let current;
  progress_1 = new Progress({ props: { progress: (
    /*progress*/
    ctx[1]
  ) } });
  bookmarks = new Bookmarks({ props: { chapters: (
    /*chapters*/
    ctx[7]
  ) } });
  hero = new Hero({});
  carousel = new Carousel({});
  let if_block = (
    /*dataLoaded*/
    ctx[0] && create_if_block(ctx)
  );
  return {
    c() {
      create_component(progress_1.$$.fragment);
      t0 = space();
      create_component(bookmarks.$$.fragment);
      t1 = space();
      create_component(hero.$$.fragment);
      t2 = space();
      create_component(carousel.$$.fragment);
      t3 = space();
      if (if_block)
        if_block.c();
      if_block_anchor = empty();
    },
    m(target, anchor) {
      mount_component(progress_1, target, anchor);
      insert(target, t0, anchor);
      mount_component(bookmarks, target, anchor);
      insert(target, t1, anchor);
      mount_component(hero, target, anchor);
      insert(target, t2, anchor);
      mount_component(carousel, target, anchor);
      insert(target, t3, anchor);
      if (if_block)
        if_block.m(target, anchor);
      insert(target, if_block_anchor, anchor);
      current = true;
    },
    p(ctx2, [dirty]) {
      const progress_1_changes = {};
      if (dirty & /*progress*/
      2)
        progress_1_changes.progress = /*progress*/
        ctx2[1];
      progress_1.$set(progress_1_changes);
      if (
        /*dataLoaded*/
        ctx2[0]
      ) {
        if (if_block) {
          if_block.p(ctx2, dirty);
          if (dirty & /*dataLoaded*/
          1) {
            transition_in(if_block, 1);
          }
        } else {
          if_block = create_if_block(ctx2);
          if_block.c();
          transition_in(if_block, 1);
          if_block.m(if_block_anchor.parentNode, if_block_anchor);
        }
      } else if (if_block) {
        group_outros();
        transition_out(if_block, 1, 1, () => {
          if_block = null;
        });
        check_outros();
      }
    },
    i(local) {
      if (current)
        return;
      transition_in(progress_1.$$.fragment, local);
      transition_in(bookmarks.$$.fragment, local);
      transition_in(hero.$$.fragment, local);
      transition_in(carousel.$$.fragment, local);
      transition_in(if_block);
      current = true;
    },
    o(local) {
      transition_out(progress_1.$$.fragment, local);
      transition_out(bookmarks.$$.fragment, local);
      transition_out(hero.$$.fragment, local);
      transition_out(carousel.$$.fragment, local);
      transition_out(if_block);
      current = false;
    },
    d(detaching) {
      destroy_component(progress_1, detaching);
      if (detaching)
        detach(t0);
      destroy_component(bookmarks, detaching);
      if (detaching)
        detach(t1);
      destroy_component(hero, detaching);
      if (detaching)
        detach(t2);
      destroy_component(carousel, detaching);
      if (detaching)
        detach(t3);
      if (if_block)
        if_block.d(detaching);
      if (detaching)
        detach(if_block_anchor);
    }
  };
}
function instance($$self, $$props, $$invalidate) {
  let $chapters;
  let $isMobile;
  let $legend_1_3;
  let $legend_3_1;
  component_subscribe($$self, isMobile, ($$value) => $$invalidate(4, $isMobile = $$value));
  component_subscribe($$self, legend_1_3, ($$value) => $$invalidate(5, $legend_1_3 = $$value));
  component_subscribe($$self, legend_3_1, ($$value) => $$invalidate(6, $legend_3_1 = $$value));
  let dataLoaded = false;
  const chapters = writable([]);
  component_subscribe($$self, chapters, (value) => $$invalidate(3, $chapters = value));
  let storyHeight = 0;
  let progress = 0;
  let observer;
  let copy;
  async function loadData() {
    set_store_value(
      chapters,
      $chapters = await csv(
        // "./chapters.csv",
        // "https://datacommons-cdn.one.org/copy.csv", // ONE bucket
        // "https://storage.googleapis.com/cdn-datacommons-one-org/chapters.csv", // ONE CDN
        "https://one-climate-finance-story.s3.amazonaws.com/chapters.csv",
        autoType
      ),
      $chapters
    );
    const copyCsv = await csv(
      // "./copy.csv",
      // "https://datacommons-cdn.one.org/copy.csv", ONE bucket
      // "https://storage.googleapis.com/cdn-datacommons-one-org/chapters.csv", // ONE CDN
      "https://one-climate-finance-story.s3.amazonaws.com/copy.csv",
      autoType
    );
    const copyCsvPrepped = prepareText(copyCsv);
    $$invalidate(2, copy = group(copyCsvPrepped, (d) => d.section));
    $$invalidate(0, dataLoaded = true);
  }
  function setChapterNodes() {
    const chapterNodes = document.querySelectorAll("[data-chapter]");
    if (!chapterNodes.length)
      return;
    Array.from(chapterNodes).forEach((node, i) => {
      set_store_value(chapters, $chapters[i].node = node, $chapters);
    });
  }
  function handleScroll() {
    let scrollTop = window.scrollY || window.pageYOffset;
    let maxScroll = storyHeight - window.innerHeight;
    $$invalidate(1, progress = Math.min(scrollTop / maxScroll * 100, 100));
  }
  onMount(async () => {
    loadData();
    observer = new ResizeObserver((entries) => {
      storyHeight = entries[0].target.scrollHeight;
      setChapterNodes();
    });
    observer.observe(document.body);
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      observer.disconnect();
    };
  });
  return [
    dataLoaded,
    progress,
    copy,
    $chapters,
    $isMobile,
    $legend_1_3,
    $legend_3_1,
    chapters
  ];
}
class Story extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance, create_fragment$1, safe_not_equal, {});
  }
}
function create_fragment(ctx) {
  let story;
  let current;
  story = new Story({});
  return {
    c() {
      create_component(story.$$.fragment);
    },
    m(target, anchor) {
      mount_component(story, target, anchor);
      current = true;
    },
    p: noop,
    i(local) {
      if (current)
        return;
      transition_in(story.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(story.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      destroy_component(story, detaching);
    }
  };
}
class App extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, null, create_fragment, safe_not_equal, {});
  }
}
new App({
  target: document.getElementById("climate-story")
});
