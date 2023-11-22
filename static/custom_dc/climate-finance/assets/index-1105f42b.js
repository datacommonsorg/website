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
function component_subscribe(component, store, callback) {
  component.$$.on_destroy.push(subscribe(store, callback));
}
function set_store_value(store, ret, value) {
  store.set(value);
  return ret;
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
function fade(node, { delay = 0, duration = 400, easing = identity$1 } = {}) {
  const o = +getComputedStyle(node).opacity;
  return {
    delay,
    duration,
    easing,
    css: (t) => `opacity: ${t * o}`
  };
}
const mobileBreak = readable(700);
const windowWidth = writable(window.innerWidth);
const isMobile = derived([mobileBreak, windowWidth], ([$mobileBreak, $windowWidth]) => $windowWidth < $mobileBreak);
const slideWidth = writable(0);
function resize() {
  windowWidth.set(window.innerWidth);
}
window.addEventListener("resize", resize);
const bookmark = "" + new URL("bookmark-45c42e61.svg", import.meta.url).href;
const Progress_svelte_svelte_type_style_lang = "";
function get_each_context$2(ctx, list, i) {
  const child_ctx = ctx.slice();
  child_ctx[8] = list[i];
  child_ctx[10] = i;
  return child_ctx;
}
function create_if_block$3(ctx) {
  let each_1_anchor;
  let current;
  let each_value = (
    /*$chapters*/
    ctx[4]
  );
  let each_blocks = [];
  for (let i = 0; i < each_value.length; i += 1) {
    each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
  }
  const out = (i) => transition_out(each_blocks[i], 1, 1, () => {
    each_blocks[i] = null;
  });
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
      current = true;
    },
    p(ctx2, dirty) {
      if (dirty & /*$chapters, click*/
      48) {
        each_value = /*$chapters*/
        ctx2[4];
        let i;
        for (i = 0; i < each_value.length; i += 1) {
          const child_ctx = get_each_context$2(ctx2, each_value, i);
          if (each_blocks[i]) {
            each_blocks[i].p(child_ctx, dirty);
            transition_in(each_blocks[i], 1);
          } else {
            each_blocks[i] = create_each_block$2(child_ctx);
            each_blocks[i].c();
            transition_in(each_blocks[i], 1);
            each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
          }
        }
        group_outros();
        for (i = each_value.length; i < each_blocks.length; i += 1) {
          out(i);
        }
        check_outros();
      }
    },
    i(local) {
      if (current)
        return;
      for (let i = 0; i < each_value.length; i += 1) {
        transition_in(each_blocks[i]);
      }
      current = true;
    },
    o(local) {
      each_blocks = each_blocks.filter(Boolean);
      for (let i = 0; i < each_blocks.length; i += 1) {
        transition_out(each_blocks[i]);
      }
      current = false;
    },
    d(detaching) {
      destroy_each(each_blocks, detaching);
      if (detaching)
        detach(each_1_anchor);
    }
  };
}
function create_each_block$2(ctx) {
  let button;
  let div0;
  let t0_value = (
    /*i*/
    ctx[10] + 1 + ""
  );
  let t0;
  let t1;
  let div1;
  let t2_value = (
    /*chapter*/
    ctx[8].title_short + ""
  );
  let t2;
  let t3;
  let button_transition;
  let current;
  let mounted;
  let dispose;
  function click_handler_1() {
    return (
      /*click_handler_1*/
      ctx[7](
        /*chapter*/
        ctx[8]
      )
    );
  }
  return {
    c() {
      button = element("button");
      div0 = element("div");
      t0 = text$1(t0_value);
      t1 = space();
      div1 = element("div");
      t2 = text$1(t2_value);
      t3 = space();
      attr(div0, "class", "number svelte-1df1haq");
      attr(div1, "class", "title svelte-1df1haq");
      attr(button, "class", "chapter svelte-1df1haq");
      set_style(
        button,
        "left",
        /*chapter*/
        ctx[8].progress + "%"
      );
    },
    m(target, anchor) {
      insert(target, button, anchor);
      append(button, div0);
      append(div0, t0);
      append(button, t1);
      append(button, div1);
      append(div1, t2);
      append(button, t3);
      current = true;
      if (!mounted) {
        dispose = listen(button, "click", click_handler_1);
        mounted = true;
      }
    },
    p(new_ctx, dirty) {
      ctx = new_ctx;
      if ((!current || dirty & /*$chapters*/
      16) && t2_value !== (t2_value = /*chapter*/
      ctx[8].title_short + ""))
        set_data(t2, t2_value);
      if (!current || dirty & /*$chapters*/
      16) {
        set_style(
          button,
          "left",
          /*chapter*/
          ctx[8].progress + "%"
        );
      }
    },
    i(local) {
      if (current)
        return;
      add_render_callback(() => {
        if (!current)
          return;
        if (!button_transition)
          button_transition = create_bidirectional_transition(button, fade, { duration: 100 }, true);
        button_transition.run(1);
      });
      current = true;
    },
    o(local) {
      if (!button_transition)
        button_transition = create_bidirectional_transition(button, fade, { duration: 100 }, false);
      button_transition.run(0);
      current = false;
    },
    d(detaching) {
      if (detaching)
        detach(button);
      if (detaching && button_transition)
        button_transition.end();
      mounted = false;
      dispose();
    }
  };
}
function create_fragment$f(ctx) {
  let div1;
  let div0;
  let t0;
  let button;
  let img;
  let img_src_value;
  let t1;
  let current;
  let mounted;
  let dispose;
  let if_block = (
    /*$chapters*/
    ctx[4].length && /*showBookmarks*/
    ctx[2] && create_if_block$3(ctx)
  );
  return {
    c() {
      div1 = element("div");
      div0 = element("div");
      t0 = space();
      button = element("button");
      img = element("img");
      t1 = space();
      if (if_block)
        if_block.c();
      attr(div0, "class", "progress svelte-1df1haq");
      set_style(
        div0,
        "width",
        /*progress*/
        ctx[0] + "%"
      );
      if (!src_url_equal(img.src, img_src_value = bookmark))
        attr(img, "src", img_src_value);
      attr(img, "alt", "Bookmark");
      attr(img, "class", "svelte-1df1haq");
      attr(button, "class", "bookmark svelte-1df1haq");
      set_style(
        button,
        "opacity",
        /*showBookmarks*/
        ctx[2] ? "0.9" : "0.4"
      );
      set_style(
        button,
        "top",
        /*$isMobile*/
        ctx[3] && /*showBookmarks*/
        ctx[2] ? "5rem" : "0"
      );
      attr(div1, "class", "progress-wrap svelte-1df1haq");
    },
    m(target, anchor) {
      insert(target, div1, anchor);
      append(div1, div0);
      append(div1, t0);
      append(div1, button);
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
          ctx[6]
        );
        mounted = true;
      }
    },
    p(ctx2, [dirty]) {
      if (!current || dirty & /*progress*/
      1) {
        set_style(
          div0,
          "width",
          /*progress*/
          ctx2[0] + "%"
        );
      }
      if (!current || dirty & /*showBookmarks*/
      4) {
        set_style(
          button,
          "opacity",
          /*showBookmarks*/
          ctx2[2] ? "0.9" : "0.4"
        );
      }
      if (!current || dirty & /*$isMobile, showBookmarks*/
      12) {
        set_style(
          button,
          "top",
          /*$isMobile*/
          ctx2[3] && /*showBookmarks*/
          ctx2[2] ? "5rem" : "0"
        );
      }
      if (
        /*$chapters*/
        ctx2[4].length && /*showBookmarks*/
        ctx2[2]
      ) {
        if (if_block) {
          if_block.p(ctx2, dirty);
          if (dirty & /*$chapters, showBookmarks*/
          20) {
            transition_in(if_block, 1);
          }
        } else {
          if_block = create_if_block$3(ctx2);
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
function instance$d($$self, $$props, $$invalidate) {
  let $isMobile;
  let $chapters, $$unsubscribe_chapters = noop, $$subscribe_chapters = () => ($$unsubscribe_chapters(), $$unsubscribe_chapters = subscribe(chapters, ($$value) => $$invalidate(4, $chapters = $$value)), chapters);
  component_subscribe($$self, isMobile, ($$value) => $$invalidate(3, $isMobile = $$value));
  $$self.$$.on_destroy.push(() => $$unsubscribe_chapters());
  let { progress = 0 } = $$props;
  let { chapters } = $$props;
  $$subscribe_chapters();
  let showBookmarks = false;
  function click(node) {
    node.scrollIntoView({ behavior: "smooth" });
    $$invalidate(2, showBookmarks = false);
  }
  const click_handler = () => $$invalidate(2, showBookmarks = !showBookmarks);
  const click_handler_1 = (chapter) => click(chapter.node);
  $$self.$$set = ($$props2) => {
    if ("progress" in $$props2)
      $$invalidate(0, progress = $$props2.progress);
    if ("chapters" in $$props2)
      $$subscribe_chapters($$invalidate(1, chapters = $$props2.chapters));
  };
  return [
    progress,
    chapters,
    showBookmarks,
    $isMobile,
    $chapters,
    click,
    click_handler,
    click_handler_1
  ];
}
class Progress extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$d, create_fragment$f, safe_not_equal, { progress: 0, chapters: 1 });
  }
}
const heroImg = "" + new URL("hero-d2a6b546.jpg", import.meta.url).href;
const Tag_svelte_svelte_type_style_lang = "";
function create_fragment$e(ctx) {
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
      attr(div, "class", "svelte-1r9y2gi");
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
function instance$c($$self, $$props, $$invalidate) {
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
    init(this, options, instance$c, create_fragment$e, safe_not_equal, { text: 0 });
  }
}
const ScrollCue_svelte_svelte_type_style_lang = "";
function create_fragment$d(ctx) {
  let div;
  let t;
  return {
    c() {
      div = element("div");
      t = text$1("Scroll ↓");
      attr(div, "class", "scroll-indicator svelte-h3cok3");
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
function instance$b($$self, $$props, $$invalidate) {
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
    init(this, options, instance$b, create_fragment$d, safe_not_equal, {});
  }
}
const Hero_svelte_svelte_type_style_lang = "";
function create_fragment$c(ctx) {
  let div1;
  let div0;
  let tag;
  let t0;
  let h1;
  let t2;
  let p;
  let t4;
  let scrollcue;
  let current;
  tag = new Tag({ props: { text: "climate financing" } });
  scrollcue = new ScrollCue({});
  return {
    c() {
      div1 = element("div");
      div0 = element("div");
      create_component(tag.$$.fragment);
      t0 = space();
      h1 = element("h1");
      h1.textContent = "CLIMATE FINANCE IS A MESS. HERE’S HOW TO FIX IT.";
      t2 = space();
      p = element("p");
      p.textContent = "No one really knows how much is being spent to address climate change. So\n      ONE is launching the Climate Finance Files, a detailed account of what's\n      being spent, where.";
      t4 = space();
      create_component(scrollcue.$$.fragment);
      attr(h1, "class", "svelte-1i9n4k");
      attr(p, "class", "svelte-1i9n4k");
      attr(div0, "id", "hero-text");
      attr(div0, "class", "svelte-1i9n4k");
      attr(div1, "class", "img-wrap svelte-1i9n4k");
      set_style(div1, "background-image", "url(" + heroImg + ")");
    },
    m(target, anchor) {
      insert(target, div1, anchor);
      append(div1, div0);
      mount_component(tag, div0, null);
      append(div0, t0);
      append(div0, h1);
      append(div0, t2);
      append(div0, p);
      append(div0, t4);
      mount_component(scrollcue, div0, null);
      current = true;
    },
    p: noop,
    i(local) {
      if (current)
        return;
      transition_in(tag.$$.fragment, local);
      transition_in(scrollcue.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(tag.$$.fragment, local);
      transition_out(scrollcue.$$.fragment, local);
      current = false;
    },
    d(detaching) {
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
    init(this, options, null, create_fragment$c, safe_not_equal, {});
  }
}
const womenImg = "" + new URL("women-93fff071.jpg", import.meta.url).href;
const TextSlide_svelte_svelte_type_style_lang = "";
function create_fragment$b(ctx) {
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
      attr(p, "class", "svelte-18ggqe6");
      attr(div0, "class", "prompt svelte-18ggqe6");
      attr(div1, "class", "slide svelte-18ggqe6");
      attr(div2, "class", "slide-wrap svelte-18ggqe6");
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
function instance$a($$self, $$props, $$invalidate) {
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
    init(this, options, instance$a, create_fragment$b, safe_not_equal, { text: 0 });
  }
}
const MediaSlide_svelte_svelte_type_style_lang = "";
function create_if_block$2(ctx) {
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
      attr(video, "class", "background-video svelte-5s9mhk");
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
function create_fragment$a(ctx) {
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
    ctx[0] === "video" && create_if_block$2(ctx)
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
      attr(div0, "class", "tag svelte-5s9mhk");
      attr(p, "class", "text svelte-5s9mhk");
      attr(div1, "class", "slide svelte-5s9mhk");
      attr(div1, "style", div1_style_value = /*type*/
      ctx[0] === "image" ? `background-image: url(${/*url*/
      ctx[3]});` : "");
      attr(div2, "class", "slide-wrap svelte-5s9mhk");
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
          if_block = create_if_block$2(ctx2);
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
function instance$9($$self, $$props, $$invalidate) {
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
    init(this, options, instance$9, create_fragment$a, safe_not_equal, { type: 0, tag: 1, text: 2, url: 3 });
  }
}
const Pagination_svelte_svelte_type_style_lang = "";
function get_each_context$1(ctx, list, i) {
  const child_ctx = ctx.slice();
  child_ctx[4] = list[i];
  child_ctx[6] = i;
  return child_ctx;
}
function create_each_block$1(ctx) {
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
      ctx[6] ? "active" : "") + " svelte-o5d1pi");
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
      ctx[6] ? "active" : "") + " svelte-o5d1pi")) {
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
function create_fragment$9(ctx) {
  let div;
  let each_value = Array.from({ length: (
    /*slideNumber*/
    ctx[0]
  ) }, func);
  let each_blocks = [];
  for (let i = 0; i < each_value.length; i += 1) {
    each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
  }
  return {
    c() {
      div = element("div");
      for (let i = 0; i < each_blocks.length; i += 1) {
        each_blocks[i].c();
      }
      attr(div, "class", "pagination svelte-o5d1pi");
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
          const child_ctx = get_each_context$1(ctx2, each_value, i);
          if (each_blocks[i]) {
            each_blocks[i].p(child_ctx, dirty);
          } else {
            each_blocks[i] = create_each_block$1(child_ctx);
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
function instance$8($$self, $$props, $$invalidate) {
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
    init(this, options, instance$8, create_fragment$9, safe_not_equal, {
      slideNumber: 0,
      currentSlide: 1,
      selectSlide: 2
    });
  }
}
const Carousel_svelte_svelte_type_style_lang = "";
function create_fragment$8(ctx) {
  let div;
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
  let pagination;
  let current;
  textslide = new TextSlide({
    props: {
      text: "<b>We’re in the fight of our lives and no one is adequately checking the receipts.</b><br><br>Millions of people on the frontlines of climate change are fighting daily battles to protect their lives and livelihoods.<br><br>They did very little to cause the climate crisis. Yet they are paying the highest price."
    }
  });
  mediaslide0 = new MediaSlide({
    props: {
      type: "image",
      tag: "Climate costs in Africa",
      text: "Climate change is <a href='https://newafricanmagazine.com/29682/'>costing</a> Africa up to US$15 billion per year. That’s more than the individual GDPs of 26 African countries. By 2050, it could be US$50 billion.",
      url: womenImg
    }
  });
  mediaslide1 = new MediaSlide({
    props: {
      type: "video",
      tag: "Cyclone Freddy",
      text: "Cyclone Freddy ravaged Malawi and Mozambique in early 2023, causing US$2 billion in damage. Nearly 1 million people were displaced. The storm fueled Malawi’s largest ever cholera outbreak.",
      url: "https://dnrezzbbx4hl3.cloudfront.net/freddy.mp4"
    }
  });
  mediaslide2 = new MediaSlide({
    props: {
      type: "image",
      tag: "Drought in the Horn of Africa",
      text: "20+ million people are facing acute hunger due to historic drought in the Greater Horn of Africa. Climate change made the drought 100 times more likely.",
      url: heroImg
    }
  });
  mediaslide3 = new MediaSlide({
    props: {
      type: "video",
      tag: "Storm Daniel",
      text: "Storm Daniel unloaded 8 months of rain in two days in Libya in September 2023, killing thousands of people. Tens of thousands were displaced. Climate change made the floods 50 times more likely.",
      url: "https://dnrezzbbx4hl3.cloudfront.net/daniel.mp4"
    }
  });
  pagination = new Pagination({
    props: {
      slideNumber: totalSlides,
      currentSlide: (
        /*currentSlide*/
        ctx[1]
      ),
      selectSlide: (
        /*selectSlide*/
        ctx[2]
      )
    }
  });
  return {
    c() {
      div = element("div");
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
      create_component(pagination.$$.fragment);
      attr(div, "class", "carousel-wrap svelte-mg5e8h");
    },
    m(target, anchor) {
      insert(target, div, anchor);
      mount_component(textslide, div, null);
      append(div, t0);
      mount_component(mediaslide0, div, null);
      append(div, t1);
      mount_component(mediaslide1, div, null);
      append(div, t2);
      mount_component(mediaslide2, div, null);
      append(div, t3);
      mount_component(mediaslide3, div, null);
      ctx[3](div);
      insert(target, t4, anchor);
      mount_component(pagination, target, anchor);
      current = true;
    },
    p(ctx2, [dirty]) {
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
      transition_in(textslide.$$.fragment, local);
      transition_in(mediaslide0.$$.fragment, local);
      transition_in(mediaslide1.$$.fragment, local);
      transition_in(mediaslide2.$$.fragment, local);
      transition_in(mediaslide3.$$.fragment, local);
      transition_in(pagination.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(textslide.$$.fragment, local);
      transition_out(mediaslide0.$$.fragment, local);
      transition_out(mediaslide1.$$.fragment, local);
      transition_out(mediaslide2.$$.fragment, local);
      transition_out(mediaslide3.$$.fragment, local);
      transition_out(pagination.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      if (detaching)
        detach(div);
      destroy_component(textslide);
      destroy_component(mediaslide0);
      destroy_component(mediaslide1);
      destroy_component(mediaslide2);
      destroy_component(mediaslide3);
      ctx[3](null);
      if (detaching)
        detach(t4);
      destroy_component(pagination, detaching);
    }
  };
}
const totalSlides = 5;
function instance$7($$self, $$props, $$invalidate) {
  let $slideWidth;
  component_subscribe($$self, slideWidth, ($$value) => $$invalidate(4, $slideWidth = $$value));
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
    document.addEventListener("wheel", handleScroll);
    return () => {
      document.removeEventListener("wheel", handleScroll);
    };
  });
  function div_binding($$value) {
    binding_callbacks[$$value ? "unshift" : "push"](() => {
      carousel = $$value;
      $$invalidate(0, carousel);
    });
  }
  return [carousel, currentSlide, selectSlide, div_binding];
}
class Carousel extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$7, create_fragment$8, safe_not_equal, {});
  }
}
const ChapterTitle_svelte_svelte_type_style_lang = "";
function create_fragment$7(ctx) {
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
      div1 = element("div");
      div0 = element("div");
      p = element("p");
      t0 = text$1("CHAPTER ");
      t1 = text$1(t1_value);
      t2 = space();
      h1 = element("h1");
      t3 = text$1(t3_value);
      attr(p, "class", "svelte-1ejd12e");
      attr(h1, "class", "svelte-1ejd12e");
      attr(div0, "class", "column");
      attr(div1, "class", "column-wrap svelte-1ejd12e");
      attr(div1, "data-chapter", div1_data_chapter_value = /*data*/
      ctx[0].chapter);
    },
    m(target, anchor) {
      insert(target, div1, anchor);
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
        detach(div1);
    }
  };
}
function instance$6($$self, $$props, $$invalidate) {
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
    init(this, options, instance$6, create_fragment$7, safe_not_equal, { data: 0 });
  }
}
const TextBlock_svelte_svelte_type_style_lang = "";
function get_each_context(ctx, list, i) {
  const child_ctx = ctx.slice();
  child_ctx[2] = list[i];
  return child_ctx;
}
function create_each_block(ctx) {
  let p;
  let raw_value = (
    /*paragraph*/
    ctx[2].text + ""
  );
  return {
    c() {
      p = element("p");
      attr(p, "class", "svelte-1ceyu4b");
    },
    m(target, anchor) {
      insert(target, p, anchor);
      p.innerHTML = raw_value;
    },
    p(ctx2, dirty) {
      if (dirty & /*copy*/
      1 && raw_value !== (raw_value = /*paragraph*/
      ctx2[2].text + ""))
        p.innerHTML = raw_value;
    },
    d(detaching) {
      if (detaching)
        detach(p);
    }
  };
}
function create_fragment$6(ctx) {
  let div3;
  let div0;
  let p;
  let t0;
  let div1;
  let t1;
  let div2;
  let each_value = (
    /*copy*/
    ctx[0]
  );
  let each_blocks = [];
  for (let i = 0; i < each_value.length; i += 1) {
    each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
  }
  return {
    c() {
      div3 = element("div");
      div0 = element("div");
      p = element("p");
      t0 = space();
      div1 = element("div");
      for (let i = 0; i < each_blocks.length; i += 1) {
        each_blocks[i].c();
      }
      t1 = space();
      div2 = element("div");
      attr(p, "class", "svelte-1ceyu4b");
      attr(div0, "class", "note link-potential svelte-1ceyu4b");
      attr(div1, "class", "column");
      attr(div2, "class", "right");
      attr(div3, "class", "column-wrap");
    },
    m(target, anchor) {
      insert(target, div3, anchor);
      append(div3, div0);
      append(div0, p);
      p.innerHTML = /*note*/
      ctx[1];
      append(div3, t0);
      append(div3, div1);
      for (let i = 0; i < each_blocks.length; i += 1) {
        if (each_blocks[i]) {
          each_blocks[i].m(div1, null);
        }
      }
      append(div3, t1);
      append(div3, div2);
    },
    p(ctx2, [dirty]) {
      if (dirty & /*note*/
      2)
        p.innerHTML = /*note*/
        ctx2[1];
      if (dirty & /*copy*/
      1) {
        each_value = /*copy*/
        ctx2[0];
        let i;
        for (i = 0; i < each_value.length; i += 1) {
          const child_ctx = get_each_context(ctx2, each_value, i);
          if (each_blocks[i]) {
            each_blocks[i].p(child_ctx, dirty);
          } else {
            each_blocks[i] = create_each_block(child_ctx);
            each_blocks[i].c();
            each_blocks[i].m(div1, null);
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
      destroy_each(each_blocks, detaching);
    }
  };
}
function instance$5($$self, $$props, $$invalidate) {
  let { copy } = $$props;
  let { note = "" } = $$props;
  $$self.$$set = ($$props2) => {
    if ("copy" in $$props2)
      $$invalidate(0, copy = $$props2.copy);
    if ("note" in $$props2)
      $$invalidate(1, note = $$props2.note);
  };
  return [copy, note];
}
class TextBlock extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$5, create_fragment$6, safe_not_equal, { copy: 0, note: 1 });
  }
}
function getGridColWidth(isMobile2, width) {
  if (!isMobile2) {
    return `1fr ${width} 1fr`;
  }
  return `auto`;
}
const Graphic_svelte_svelte_type_style_lang = "";
function create_if_block_1(ctx) {
  let p;
  return {
    c() {
      p = element("p");
      attr(p, "class", "notes svelte-zypzt8");
    },
    m(target, anchor) {
      insert(target, p, anchor);
      p.innerHTML = /*notes*/
      ctx[4];
    },
    p(ctx2, dirty) {
      if (dirty & /*notes*/
      16)
        p.innerHTML = /*notes*/
        ctx2[4];
    },
    d(detaching) {
      if (detaching)
        detach(p);
    }
  };
}
function create_if_block$1(ctx) {
  let p;
  return {
    c() {
      p = element("p");
      attr(p, "class", "source svelte-zypzt8");
    },
    m(target, anchor) {
      insert(target, p, anchor);
      p.innerHTML = /*source*/
      ctx[5];
    },
    p(ctx2, dirty) {
      if (dirty & /*source*/
      32)
        p.innerHTML = /*source*/
        ctx2[5];
    },
    d(detaching) {
      if (detaching)
        detach(p);
    }
  };
}
function create_fragment$5(ctx) {
  let div3;
  let div2;
  let div1;
  let header;
  let h1;
  let t0;
  let t1;
  let p;
  let t2;
  let t3;
  let div0;
  let img;
  let img_src_value;
  let t4;
  let t5;
  let if_block0 = (
    /*notes*/
    ctx[4] && create_if_block_1(ctx)
  );
  let if_block1 = (
    /*source*/
    ctx[5] && create_if_block$1(ctx)
  );
  return {
    c() {
      div3 = element("div");
      div2 = element("div");
      div1 = element("div");
      header = element("header");
      h1 = element("h1");
      t0 = text$1(
        /*title*/
        ctx[2]
      );
      t1 = space();
      p = element("p");
      t2 = text$1(
        /*subtitle*/
        ctx[3]
      );
      t3 = space();
      div0 = element("div");
      img = element("img");
      t4 = space();
      if (if_block0)
        if_block0.c();
      t5 = space();
      if (if_block1)
        if_block1.c();
      attr(h1, "class", "svelte-zypzt8");
      attr(p, "class", "svelte-zypzt8");
      attr(header, "class", "svelte-zypzt8");
      if (!src_url_equal(img.src, img_src_value = /*$isMobile*/
      ctx[6] ? (
        /*url_mobile*/
        ctx[1]
      ) : (
        /*url*/
        ctx[0]
      )))
        attr(img, "src", img_src_value);
      attr(img, "alt", "Graphic");
      attr(img, "width", "100%");
      attr(div0, "class", "image-wrap svelte-zypzt8");
      attr(div1, "class", "graphic-wrap svelte-zypzt8");
      attr(div2, "class", "column");
      attr(div3, "class", "column-wrap");
      set_style(
        div3,
        "grid-template-columns",
        /*gridColWidths*/
        ctx[7]
      );
    },
    m(target, anchor) {
      insert(target, div3, anchor);
      append(div3, div2);
      append(div2, div1);
      append(div1, header);
      append(header, h1);
      append(h1, t0);
      append(header, t1);
      append(header, p);
      append(p, t2);
      append(div1, t3);
      append(div1, div0);
      append(div0, img);
      append(div1, t4);
      if (if_block0)
        if_block0.m(div1, null);
      append(div1, t5);
      if (if_block1)
        if_block1.m(div1, null);
    },
    p(ctx2, [dirty]) {
      if (dirty & /*title*/
      4)
        set_data(
          t0,
          /*title*/
          ctx2[2]
        );
      if (dirty & /*subtitle*/
      8)
        set_data(
          t2,
          /*subtitle*/
          ctx2[3]
        );
      if (dirty & /*$isMobile, url_mobile, url*/
      67 && !src_url_equal(img.src, img_src_value = /*$isMobile*/
      ctx2[6] ? (
        /*url_mobile*/
        ctx2[1]
      ) : (
        /*url*/
        ctx2[0]
      ))) {
        attr(img, "src", img_src_value);
      }
      if (
        /*notes*/
        ctx2[4]
      ) {
        if (if_block0) {
          if_block0.p(ctx2, dirty);
        } else {
          if_block0 = create_if_block_1(ctx2);
          if_block0.c();
          if_block0.m(div1, t5);
        }
      } else if (if_block0) {
        if_block0.d(1);
        if_block0 = null;
      }
      if (
        /*source*/
        ctx2[5]
      ) {
        if (if_block1) {
          if_block1.p(ctx2, dirty);
        } else {
          if_block1 = create_if_block$1(ctx2);
          if_block1.c();
          if_block1.m(div1, null);
        }
      } else if (if_block1) {
        if_block1.d(1);
        if_block1 = null;
      }
      if (dirty & /*gridColWidths*/
      128) {
        set_style(
          div3,
          "grid-template-columns",
          /*gridColWidths*/
          ctx2[7]
        );
      }
    },
    i: noop,
    o: noop,
    d(detaching) {
      if (detaching)
        detach(div3);
      if (if_block0)
        if_block0.d();
      if (if_block1)
        if_block1.d();
    }
  };
}
function instance$4($$self, $$props, $$invalidate) {
  let $isMobile;
  component_subscribe($$self, isMobile, ($$value) => $$invalidate(6, $isMobile = $$value));
  let { url } = $$props;
  let { url_mobile } = $$props;
  let { width = "600px" } = $$props;
  let { title = "" } = $$props;
  let { subtitle = "" } = $$props;
  let { notes = "" } = $$props;
  let { source = "" } = $$props;
  let gridColWidths;
  $$self.$$set = ($$props2) => {
    if ("url" in $$props2)
      $$invalidate(0, url = $$props2.url);
    if ("url_mobile" in $$props2)
      $$invalidate(1, url_mobile = $$props2.url_mobile);
    if ("width" in $$props2)
      $$invalidate(8, width = $$props2.width);
    if ("title" in $$props2)
      $$invalidate(2, title = $$props2.title);
    if ("subtitle" in $$props2)
      $$invalidate(3, subtitle = $$props2.subtitle);
    if ("notes" in $$props2)
      $$invalidate(4, notes = $$props2.notes);
    if ("source" in $$props2)
      $$invalidate(5, source = $$props2.source);
  };
  $$self.$$.update = () => {
    if ($$self.$$.dirty & /*$isMobile, width*/
    320) {
      $$invalidate(7, gridColWidths = getGridColWidth($isMobile, width));
    }
  };
  return [
    url,
    url_mobile,
    title,
    subtitle,
    notes,
    source,
    $isMobile,
    gridColWidths,
    width
  ];
}
class Graphic extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$4, create_fragment$5, safe_not_equal, {
      url: 0,
      url_mobile: 1,
      width: 8,
      title: 2,
      subtitle: 3,
      notes: 4,
      source: 5
    });
  }
}
function create_fragment$4(ctx) {
  let div2;
  let div1;
  let div0;
  let script;
  let script_src_value;
  let div0_data_src_value;
  let div1_style_value;
  let div2_style_value;
  return {
    c() {
      div2 = element("div");
      div1 = element("div");
      div0 = element("div");
      script = element("script");
      if (!src_url_equal(script.src, script_src_value = "https://public.flourish.studio/resources/embed.js"))
        attr(script, "src", script_src_value);
      attr(div0, "class", "flourish-embed flourish-chart");
      attr(div0, "data-src", div0_data_src_value = `${/*type*/
      ctx[0]}/${/*id*/
      ctx[1]}?123`);
      attr(div1, "class", "column");
      attr(div1, "style", div1_style_value = `margin-top:${/*marginY*/
      ctx[2]}rem; margin-bottom:${/*marginY*/
      ctx[2]}rem;`);
      attr(div2, "class", "column-wrap");
      attr(div2, "style", div2_style_value = `grid-template-columns: ${/*gridColWidths*/
      ctx[3]}`);
    },
    m(target, anchor) {
      insert(target, div2, anchor);
      append(div2, div1);
      append(div1, div0);
      append(div0, script);
    },
    p(ctx2, [dirty]) {
      if (dirty & /*type, id*/
      3 && div0_data_src_value !== (div0_data_src_value = `${/*type*/
      ctx2[0]}/${/*id*/
      ctx2[1]}?123`)) {
        attr(div0, "data-src", div0_data_src_value);
      }
      if (dirty & /*marginY*/
      4 && div1_style_value !== (div1_style_value = `margin-top:${/*marginY*/
      ctx2[2]}rem; margin-bottom:${/*marginY*/
      ctx2[2]}rem;`)) {
        attr(div1, "style", div1_style_value);
      }
      if (dirty & /*gridColWidths*/
      8 && div2_style_value !== (div2_style_value = `grid-template-columns: ${/*gridColWidths*/
      ctx2[3]}`)) {
        attr(div2, "style", div2_style_value);
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
function instance$3($$self, $$props, $$invalidate) {
  let $isMobile;
  component_subscribe($$self, isMobile, ($$value) => $$invalidate(5, $isMobile = $$value));
  let { type = "visualisation" } = $$props;
  let { id } = $$props;
  let { width = "600px" } = $$props;
  let { marginY = "2" } = $$props;
  let gridColWidths;
  $$self.$$set = ($$props2) => {
    if ("type" in $$props2)
      $$invalidate(0, type = $$props2.type);
    if ("id" in $$props2)
      $$invalidate(1, id = $$props2.id);
    if ("width" in $$props2)
      $$invalidate(4, width = $$props2.width);
    if ("marginY" in $$props2)
      $$invalidate(2, marginY = $$props2.marginY);
  };
  $$self.$$.update = () => {
    if ($$self.$$.dirty & /*$isMobile, width*/
    48) {
      $$invalidate(3, gridColWidths = getGridColWidth($isMobile, width));
    }
  };
  return [type, id, marginY, gridColWidths, width, $isMobile];
}
class Visual extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$3, create_fragment$4, safe_not_equal, { type: 0, id: 1, width: 4, marginY: 2 });
  }
}
const Callout_svelte_svelte_type_style_lang = "";
function create_fragment$3(ctx) {
  let div1;
  let div0;
  let blockquote;
  let t0;
  let t1;
  let cite;
  return {
    c() {
      div1 = element("div");
      div0 = element("div");
      blockquote = element("blockquote");
      t0 = text$1(
        /*text*/
        ctx[0]
      );
      t1 = space();
      cite = element("cite");
      set_style(
        blockquote,
        "font-size",
        /*size*/
        ctx[2] + "rem"
      );
      attr(blockquote, "class", "svelte-19uoplt");
      attr(cite, "class", "link-potential svelte-19uoplt");
      attr(div0, "class", "column svelte-19uoplt");
      attr(div1, "class", "column-wrap");
    },
    m(target, anchor) {
      insert(target, div1, anchor);
      append(div1, div0);
      append(div0, blockquote);
      append(blockquote, t0);
      append(div0, t1);
      append(div0, cite);
      cite.innerHTML = /*note*/
      ctx[1];
    },
    p(ctx2, [dirty]) {
      if (dirty & /*text*/
      1)
        set_data(
          t0,
          /*text*/
          ctx2[0]
        );
      if (dirty & /*size*/
      4) {
        set_style(
          blockquote,
          "font-size",
          /*size*/
          ctx2[2] + "rem"
        );
      }
      if (dirty & /*note*/
      2)
        cite.innerHTML = /*note*/
        ctx2[1];
    },
    i: noop,
    o: noop,
    d(detaching) {
      if (detaching)
        detach(div1);
    }
  };
}
function instance$2($$self, $$props, $$invalidate) {
  let { text: text2 } = $$props;
  let { note } = $$props;
  let { size = 3.6 } = $$props;
  $$self.$$set = ($$props2) => {
    if ("text" in $$props2)
      $$invalidate(0, text2 = $$props2.text);
    if ("note" in $$props2)
      $$invalidate(1, note = $$props2.note);
    if ("size" in $$props2)
      $$invalidate(2, size = $$props2.size);
  };
  return [text2, note, size];
}
class Callout extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$2, create_fragment$3, safe_not_equal, { text: 0, note: 1, size: 2 });
  }
}
const KeyResults_svelte_svelte_type_style_lang = "";
function create_fragment$2(ctx) {
  let div3;
  let div2;
  let div3_style_value;
  return {
    c() {
      div3 = element("div");
      div2 = element("div");
      div2.innerHTML = `<div class="result-wrap svelte-1s3cgr7"><header class="svelte-1s3cgr7"><h1 class="svelte-1s3cgr7">Here&#39;s what we found</h1> 
        <p class="svelte-1s3cgr7">Climate finance commitments from donor countries and international
          institutions are vastly overstated.</p></header> 

      <div class="results svelte-1s3cgr7"><section class="svelte-1s3cgr7"><h2 class="svelte-1s3cgr7">2/3</h2> 
          <p class="svelte-1s3cgr7">Two-thirds of climate finance commitments counted by the OECD are
            never reported as disbursed or didn’t have much to do with climate
            to begin with. That amounts to an eye-popping $400 billion between
            2013 and 2021.</p></section> 
        <section class="svelte-1s3cgr7"><h2 class="svelte-1s3cgr7">48%</h2> 
          <p class="svelte-1s3cgr7">48% of countries suffering severe debt problems paid more in debt
            payments to lenders than they received in climate finance between
            2019 and 2021.</p></section> 
        <section class="svelte-1s3cgr7"><h2 class="svelte-1s3cgr7">7%</h2> 
          <p class="svelte-1s3cgr7">In 2021, the world’s 20 most climate-vulnerable countries received
            just 7% of the climate finance they need each year to address
            climate change.</p></section></div></div>`;
      attr(div2, "class", "column");
      attr(div3, "class", "column-wrap");
      attr(div3, "style", div3_style_value = `grid-template-columns: ${/*gridColWidths*/
      ctx[0]}`);
    },
    m(target, anchor) {
      insert(target, div3, anchor);
      append(div3, div2);
    },
    p(ctx2, [dirty]) {
      if (dirty & /*gridColWidths*/
      1 && div3_style_value !== (div3_style_value = `grid-template-columns: ${/*gridColWidths*/
      ctx2[0]}`)) {
        attr(div3, "style", div3_style_value);
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
  let $windowWidth;
  let $isMobile;
  component_subscribe($$self, windowWidth, ($$value) => $$invalidate(1, $windowWidth = $$value));
  component_subscribe($$self, isMobile, ($$value) => $$invalidate(2, $isMobile = $$value));
  let gridColWidths;
  $$self.$$.update = () => {
    if ($$self.$$.dirty & /*$isMobile, $windowWidth*/
    6) {
      $$invalidate(0, gridColWidths = getGridColWidth($isMobile, $windowWidth > 1400 ? "60%" : $windowWidth > 1e3 ? "80%" : "100%"));
    }
  };
  return [gridColWidths, $windowWidth, $isMobile];
}
class KeyResults extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$1, create_fragment$2, safe_not_equal, {});
  }
}
const graphic_1_2 = "" + new URL("graphic_1_2-3dea4c14.svg", import.meta.url).href;
const graphic_1_2_mobile = "" + new URL("graphic_1_2_mobile-b0dd53d3.svg", import.meta.url).href;
function create_if_block(ctx) {
  let textblock0;
  let t0;
  let textblock1;
  let t1;
  let keyresults;
  let t2;
  let chaptertitle0;
  let t3;
  let textblock2;
  let t4;
  let callout;
  let t5;
  let textblock3;
  let t6;
  let graphic;
  let t7;
  let textblock4;
  let t8;
  let visual0;
  let t9;
  let textblock5;
  let t10;
  let visual1;
  let t11;
  let textblock6;
  let t12;
  let chaptertitle1;
  let t13;
  let textblock7;
  let t14;
  let visual2;
  let t15;
  let textblock8;
  let t16;
  let visual3;
  let t17;
  let textblock9;
  let t18;
  let visual4;
  let t19;
  let textblock10;
  let t20;
  let chaptertitle2;
  let t21;
  let textblock11;
  let t22;
  let visual5;
  let t23;
  let textblock12;
  let t24;
  let visual6;
  let t25;
  let textblock13;
  let t26;
  let visual7;
  let t27;
  let chaptertitle3;
  let t28;
  let textblock14;
  let t29;
  let visual8;
  let t30;
  let textblock15;
  let t31;
  let visual9;
  let t32;
  let chaptertitle4;
  let t33;
  let textblock16;
  let t34;
  let chaptertitle5;
  let t35;
  let textblock17;
  let current;
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
      note: "The Files apply a robust methodology to correct flaws in the OECD's and UNFCCC's data."
    }
  });
  keyresults = new KeyResults({});
  chaptertitle0 = new ChapterTitle({ props: { data: (
    /*$chapters*/
    ctx[3][0]
  ) } });
  textblock2 = new TextBlock({ props: { copy: (
    /*copy*/
    ctx[2].get(3)
  ) } });
  callout = new Callout({
    props: {
      text: "“This is the wild, wild west of finance. Essentially, whatever [donors] call climate finance is climate finance.“",
      note: "<a href='https://www.reuters.com/investigates/special-report/climate-change-finance/'>Mark Joven</a>, Philippines Department of Finance undersecretary"
    }
  });
  textblock3 = new TextBlock({ props: { copy: (
    /*copy*/
    ctx[2].get(4)
  ) } });
  graphic = new Graphic({
    props: {
      title: "Providers use different criteria to count climate finance",
      subtitle: "Different reporting methodologies for 26 climate finance providers",
      url: graphic_1_2,
      url_mobile: graphic_1_2_mobile,
      notes: "Notes: Data reflects 2020 reporting methodology for each provider. We do not include providers who have no reported climate finance on the UNFCCC Climate Finance Data Portal (as of November 2023).",
      source: "A source",
      width: "70%"
    }
  });
  textblock4 = new TextBlock({ props: { copy: (
    /*copy*/
    ctx[2].get(5)
  ) } });
  visual0 = new Visual({ props: { id: 15603815 } });
  textblock5 = new TextBlock({ props: { copy: (
    /*copy*/
    ctx[2].get(6)
  ) } });
  visual1 = new Visual({ props: { id: 15603815 } });
  textblock6 = new TextBlock({ props: { copy: (
    /*copy*/
    ctx[2].get(7)
  ) } });
  chaptertitle1 = new ChapterTitle({ props: { data: (
    /*$chapters*/
    ctx[3][1]
  ) } });
  textblock7 = new TextBlock({ props: { copy: (
    /*copy*/
    ctx[2].get(8)
  ) } });
  visual2 = new Visual({ props: { id: 15603815 } });
  textblock8 = new TextBlock({ props: { copy: (
    /*copy*/
    ctx[2].get(9)
  ) } });
  visual3 = new Visual({ props: { id: 15603815 } });
  textblock9 = new TextBlock({ props: { copy: (
    /*copy*/
    ctx[2].get(10)
  ) } });
  visual4 = new Visual({ props: { id: 15603815 } });
  textblock10 = new TextBlock({ props: { copy: (
    /*copy*/
    ctx[2].get(11)
  ) } });
  chaptertitle2 = new ChapterTitle({ props: { data: (
    /*$chapters*/
    ctx[3][2]
  ) } });
  textblock11 = new TextBlock({ props: { copy: (
    /*copy*/
    ctx[2].get(12)
  ) } });
  visual5 = new Visual({ props: { id: 15603815 } });
  textblock12 = new TextBlock({ props: { copy: (
    /*copy*/
    ctx[2].get(13)
  ) } });
  visual6 = new Visual({ props: { id: 15603815 } });
  textblock13 = new TextBlock({ props: { copy: (
    /*copy*/
    ctx[2].get(14)
  ) } });
  visual7 = new Visual({ props: { id: 15603815 } });
  chaptertitle3 = new ChapterTitle({ props: { data: (
    /*$chapters*/
    ctx[3][3]
  ) } });
  textblock14 = new TextBlock({ props: { copy: (
    /*copy*/
    ctx[2].get(15)
  ) } });
  visual8 = new Visual({ props: { id: 15603815 } });
  textblock15 = new TextBlock({ props: { copy: (
    /*copy*/
    ctx[2].get(16)
  ) } });
  visual9 = new Visual({ props: { id: 15603815 } });
  chaptertitle4 = new ChapterTitle({ props: { data: (
    /*$chapters*/
    ctx[3][4]
  ) } });
  textblock16 = new TextBlock({ props: { copy: (
    /*copy*/
    ctx[2].get(17)
  ) } });
  chaptertitle5 = new ChapterTitle({ props: { data: (
    /*$chapters*/
    ctx[3][5]
  ) } });
  textblock17 = new TextBlock({ props: { copy: (
    /*copy*/
    ctx[2].get(18)
  ) } });
  return {
    c() {
      create_component(textblock0.$$.fragment);
      t0 = space();
      create_component(textblock1.$$.fragment);
      t1 = space();
      create_component(keyresults.$$.fragment);
      t2 = space();
      create_component(chaptertitle0.$$.fragment);
      t3 = space();
      create_component(textblock2.$$.fragment);
      t4 = space();
      create_component(callout.$$.fragment);
      t5 = space();
      create_component(textblock3.$$.fragment);
      t6 = space();
      create_component(graphic.$$.fragment);
      t7 = space();
      create_component(textblock4.$$.fragment);
      t8 = space();
      create_component(visual0.$$.fragment);
      t9 = space();
      create_component(textblock5.$$.fragment);
      t10 = space();
      create_component(visual1.$$.fragment);
      t11 = space();
      create_component(textblock6.$$.fragment);
      t12 = space();
      create_component(chaptertitle1.$$.fragment);
      t13 = space();
      create_component(textblock7.$$.fragment);
      t14 = space();
      create_component(visual2.$$.fragment);
      t15 = space();
      create_component(textblock8.$$.fragment);
      t16 = space();
      create_component(visual3.$$.fragment);
      t17 = space();
      create_component(textblock9.$$.fragment);
      t18 = space();
      create_component(visual4.$$.fragment);
      t19 = space();
      create_component(textblock10.$$.fragment);
      t20 = space();
      create_component(chaptertitle2.$$.fragment);
      t21 = space();
      create_component(textblock11.$$.fragment);
      t22 = space();
      create_component(visual5.$$.fragment);
      t23 = space();
      create_component(textblock12.$$.fragment);
      t24 = space();
      create_component(visual6.$$.fragment);
      t25 = space();
      create_component(textblock13.$$.fragment);
      t26 = space();
      create_component(visual7.$$.fragment);
      t27 = space();
      create_component(chaptertitle3.$$.fragment);
      t28 = space();
      create_component(textblock14.$$.fragment);
      t29 = space();
      create_component(visual8.$$.fragment);
      t30 = space();
      create_component(textblock15.$$.fragment);
      t31 = space();
      create_component(visual9.$$.fragment);
      t32 = space();
      create_component(chaptertitle4.$$.fragment);
      t33 = space();
      create_component(textblock16.$$.fragment);
      t34 = space();
      create_component(chaptertitle5.$$.fragment);
      t35 = space();
      create_component(textblock17.$$.fragment);
    },
    m(target, anchor) {
      mount_component(textblock0, target, anchor);
      insert(target, t0, anchor);
      mount_component(textblock1, target, anchor);
      insert(target, t1, anchor);
      mount_component(keyresults, target, anchor);
      insert(target, t2, anchor);
      mount_component(chaptertitle0, target, anchor);
      insert(target, t3, anchor);
      mount_component(textblock2, target, anchor);
      insert(target, t4, anchor);
      mount_component(callout, target, anchor);
      insert(target, t5, anchor);
      mount_component(textblock3, target, anchor);
      insert(target, t6, anchor);
      mount_component(graphic, target, anchor);
      insert(target, t7, anchor);
      mount_component(textblock4, target, anchor);
      insert(target, t8, anchor);
      mount_component(visual0, target, anchor);
      insert(target, t9, anchor);
      mount_component(textblock5, target, anchor);
      insert(target, t10, anchor);
      mount_component(visual1, target, anchor);
      insert(target, t11, anchor);
      mount_component(textblock6, target, anchor);
      insert(target, t12, anchor);
      mount_component(chaptertitle1, target, anchor);
      insert(target, t13, anchor);
      mount_component(textblock7, target, anchor);
      insert(target, t14, anchor);
      mount_component(visual2, target, anchor);
      insert(target, t15, anchor);
      mount_component(textblock8, target, anchor);
      insert(target, t16, anchor);
      mount_component(visual3, target, anchor);
      insert(target, t17, anchor);
      mount_component(textblock9, target, anchor);
      insert(target, t18, anchor);
      mount_component(visual4, target, anchor);
      insert(target, t19, anchor);
      mount_component(textblock10, target, anchor);
      insert(target, t20, anchor);
      mount_component(chaptertitle2, target, anchor);
      insert(target, t21, anchor);
      mount_component(textblock11, target, anchor);
      insert(target, t22, anchor);
      mount_component(visual5, target, anchor);
      insert(target, t23, anchor);
      mount_component(textblock12, target, anchor);
      insert(target, t24, anchor);
      mount_component(visual6, target, anchor);
      insert(target, t25, anchor);
      mount_component(textblock13, target, anchor);
      insert(target, t26, anchor);
      mount_component(visual7, target, anchor);
      insert(target, t27, anchor);
      mount_component(chaptertitle3, target, anchor);
      insert(target, t28, anchor);
      mount_component(textblock14, target, anchor);
      insert(target, t29, anchor);
      mount_component(visual8, target, anchor);
      insert(target, t30, anchor);
      mount_component(textblock15, target, anchor);
      insert(target, t31, anchor);
      mount_component(visual9, target, anchor);
      insert(target, t32, anchor);
      mount_component(chaptertitle4, target, anchor);
      insert(target, t33, anchor);
      mount_component(textblock16, target, anchor);
      insert(target, t34, anchor);
      mount_component(chaptertitle5, target, anchor);
      insert(target, t35, anchor);
      mount_component(textblock17, target, anchor);
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
      textblock1.$set(textblock1_changes);
      const chaptertitle0_changes = {};
      if (dirty & /*$chapters*/
      8)
        chaptertitle0_changes.data = /*$chapters*/
        ctx2[3][0];
      chaptertitle0.$set(chaptertitle0_changes);
      const textblock2_changes = {};
      if (dirty & /*copy*/
      4)
        textblock2_changes.copy = /*copy*/
        ctx2[2].get(3);
      textblock2.$set(textblock2_changes);
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
      const textblock5_changes = {};
      if (dirty & /*copy*/
      4)
        textblock5_changes.copy = /*copy*/
        ctx2[2].get(6);
      textblock5.$set(textblock5_changes);
      const textblock6_changes = {};
      if (dirty & /*copy*/
      4)
        textblock6_changes.copy = /*copy*/
        ctx2[2].get(7);
      textblock6.$set(textblock6_changes);
      const chaptertitle1_changes = {};
      if (dirty & /*$chapters*/
      8)
        chaptertitle1_changes.data = /*$chapters*/
        ctx2[3][1];
      chaptertitle1.$set(chaptertitle1_changes);
      const textblock7_changes = {};
      if (dirty & /*copy*/
      4)
        textblock7_changes.copy = /*copy*/
        ctx2[2].get(8);
      textblock7.$set(textblock7_changes);
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
      const chaptertitle2_changes = {};
      if (dirty & /*$chapters*/
      8)
        chaptertitle2_changes.data = /*$chapters*/
        ctx2[3][2];
      chaptertitle2.$set(chaptertitle2_changes);
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
      const chaptertitle3_changes = {};
      if (dirty & /*$chapters*/
      8)
        chaptertitle3_changes.data = /*$chapters*/
        ctx2[3][3];
      chaptertitle3.$set(chaptertitle3_changes);
      const textblock14_changes = {};
      if (dirty & /*copy*/
      4)
        textblock14_changes.copy = /*copy*/
        ctx2[2].get(15);
      textblock14.$set(textblock14_changes);
      const textblock15_changes = {};
      if (dirty & /*copy*/
      4)
        textblock15_changes.copy = /*copy*/
        ctx2[2].get(16);
      textblock15.$set(textblock15_changes);
      const chaptertitle4_changes = {};
      if (dirty & /*$chapters*/
      8)
        chaptertitle4_changes.data = /*$chapters*/
        ctx2[3][4];
      chaptertitle4.$set(chaptertitle4_changes);
      const textblock16_changes = {};
      if (dirty & /*copy*/
      4)
        textblock16_changes.copy = /*copy*/
        ctx2[2].get(17);
      textblock16.$set(textblock16_changes);
      const chaptertitle5_changes = {};
      if (dirty & /*$chapters*/
      8)
        chaptertitle5_changes.data = /*$chapters*/
        ctx2[3][5];
      chaptertitle5.$set(chaptertitle5_changes);
      const textblock17_changes = {};
      if (dirty & /*copy*/
      4)
        textblock17_changes.copy = /*copy*/
        ctx2[2].get(18);
      textblock17.$set(textblock17_changes);
    },
    i(local) {
      if (current)
        return;
      transition_in(textblock0.$$.fragment, local);
      transition_in(textblock1.$$.fragment, local);
      transition_in(keyresults.$$.fragment, local);
      transition_in(chaptertitle0.$$.fragment, local);
      transition_in(textblock2.$$.fragment, local);
      transition_in(callout.$$.fragment, local);
      transition_in(textblock3.$$.fragment, local);
      transition_in(graphic.$$.fragment, local);
      transition_in(textblock4.$$.fragment, local);
      transition_in(visual0.$$.fragment, local);
      transition_in(textblock5.$$.fragment, local);
      transition_in(visual1.$$.fragment, local);
      transition_in(textblock6.$$.fragment, local);
      transition_in(chaptertitle1.$$.fragment, local);
      transition_in(textblock7.$$.fragment, local);
      transition_in(visual2.$$.fragment, local);
      transition_in(textblock8.$$.fragment, local);
      transition_in(visual3.$$.fragment, local);
      transition_in(textblock9.$$.fragment, local);
      transition_in(visual4.$$.fragment, local);
      transition_in(textblock10.$$.fragment, local);
      transition_in(chaptertitle2.$$.fragment, local);
      transition_in(textblock11.$$.fragment, local);
      transition_in(visual5.$$.fragment, local);
      transition_in(textblock12.$$.fragment, local);
      transition_in(visual6.$$.fragment, local);
      transition_in(textblock13.$$.fragment, local);
      transition_in(visual7.$$.fragment, local);
      transition_in(chaptertitle3.$$.fragment, local);
      transition_in(textblock14.$$.fragment, local);
      transition_in(visual8.$$.fragment, local);
      transition_in(textblock15.$$.fragment, local);
      transition_in(visual9.$$.fragment, local);
      transition_in(chaptertitle4.$$.fragment, local);
      transition_in(textblock16.$$.fragment, local);
      transition_in(chaptertitle5.$$.fragment, local);
      transition_in(textblock17.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(textblock0.$$.fragment, local);
      transition_out(textblock1.$$.fragment, local);
      transition_out(keyresults.$$.fragment, local);
      transition_out(chaptertitle0.$$.fragment, local);
      transition_out(textblock2.$$.fragment, local);
      transition_out(callout.$$.fragment, local);
      transition_out(textblock3.$$.fragment, local);
      transition_out(graphic.$$.fragment, local);
      transition_out(textblock4.$$.fragment, local);
      transition_out(visual0.$$.fragment, local);
      transition_out(textblock5.$$.fragment, local);
      transition_out(visual1.$$.fragment, local);
      transition_out(textblock6.$$.fragment, local);
      transition_out(chaptertitle1.$$.fragment, local);
      transition_out(textblock7.$$.fragment, local);
      transition_out(visual2.$$.fragment, local);
      transition_out(textblock8.$$.fragment, local);
      transition_out(visual3.$$.fragment, local);
      transition_out(textblock9.$$.fragment, local);
      transition_out(visual4.$$.fragment, local);
      transition_out(textblock10.$$.fragment, local);
      transition_out(chaptertitle2.$$.fragment, local);
      transition_out(textblock11.$$.fragment, local);
      transition_out(visual5.$$.fragment, local);
      transition_out(textblock12.$$.fragment, local);
      transition_out(visual6.$$.fragment, local);
      transition_out(textblock13.$$.fragment, local);
      transition_out(visual7.$$.fragment, local);
      transition_out(chaptertitle3.$$.fragment, local);
      transition_out(textblock14.$$.fragment, local);
      transition_out(visual8.$$.fragment, local);
      transition_out(textblock15.$$.fragment, local);
      transition_out(visual9.$$.fragment, local);
      transition_out(chaptertitle4.$$.fragment, local);
      transition_out(textblock16.$$.fragment, local);
      transition_out(chaptertitle5.$$.fragment, local);
      transition_out(textblock17.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      destroy_component(textblock0, detaching);
      if (detaching)
        detach(t0);
      destroy_component(textblock1, detaching);
      if (detaching)
        detach(t1);
      destroy_component(keyresults, detaching);
      if (detaching)
        detach(t2);
      destroy_component(chaptertitle0, detaching);
      if (detaching)
        detach(t3);
      destroy_component(textblock2, detaching);
      if (detaching)
        detach(t4);
      destroy_component(callout, detaching);
      if (detaching)
        detach(t5);
      destroy_component(textblock3, detaching);
      if (detaching)
        detach(t6);
      destroy_component(graphic, detaching);
      if (detaching)
        detach(t7);
      destroy_component(textblock4, detaching);
      if (detaching)
        detach(t8);
      destroy_component(visual0, detaching);
      if (detaching)
        detach(t9);
      destroy_component(textblock5, detaching);
      if (detaching)
        detach(t10);
      destroy_component(visual1, detaching);
      if (detaching)
        detach(t11);
      destroy_component(textblock6, detaching);
      if (detaching)
        detach(t12);
      destroy_component(chaptertitle1, detaching);
      if (detaching)
        detach(t13);
      destroy_component(textblock7, detaching);
      if (detaching)
        detach(t14);
      destroy_component(visual2, detaching);
      if (detaching)
        detach(t15);
      destroy_component(textblock8, detaching);
      if (detaching)
        detach(t16);
      destroy_component(visual3, detaching);
      if (detaching)
        detach(t17);
      destroy_component(textblock9, detaching);
      if (detaching)
        detach(t18);
      destroy_component(visual4, detaching);
      if (detaching)
        detach(t19);
      destroy_component(textblock10, detaching);
      if (detaching)
        detach(t20);
      destroy_component(chaptertitle2, detaching);
      if (detaching)
        detach(t21);
      destroy_component(textblock11, detaching);
      if (detaching)
        detach(t22);
      destroy_component(visual5, detaching);
      if (detaching)
        detach(t23);
      destroy_component(textblock12, detaching);
      if (detaching)
        detach(t24);
      destroy_component(visual6, detaching);
      if (detaching)
        detach(t25);
      destroy_component(textblock13, detaching);
      if (detaching)
        detach(t26);
      destroy_component(visual7, detaching);
      if (detaching)
        detach(t27);
      destroy_component(chaptertitle3, detaching);
      if (detaching)
        detach(t28);
      destroy_component(textblock14, detaching);
      if (detaching)
        detach(t29);
      destroy_component(visual8, detaching);
      if (detaching)
        detach(t30);
      destroy_component(textblock15, detaching);
      if (detaching)
        detach(t31);
      destroy_component(visual9, detaching);
      if (detaching)
        detach(t32);
      destroy_component(chaptertitle4, detaching);
      if (detaching)
        detach(t33);
      destroy_component(textblock16, detaching);
      if (detaching)
        detach(t34);
      destroy_component(chaptertitle5, detaching);
      if (detaching)
        detach(t35);
      destroy_component(textblock17, detaching);
    }
  };
}
function create_fragment$1(ctx) {
  let progress_1;
  let t0;
  let hero;
  let t1;
  let carousel;
  let t2;
  let if_block_anchor;
  let current;
  progress_1 = new Progress({
    props: {
      progress: (
        /*progress*/
        ctx[1]
      ),
      chapters: (
        /*chapters*/
        ctx[4]
      )
    }
  });
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
      create_component(hero.$$.fragment);
      t1 = space();
      create_component(carousel.$$.fragment);
      t2 = space();
      if (if_block)
        if_block.c();
      if_block_anchor = empty();
    },
    m(target, anchor) {
      mount_component(progress_1, target, anchor);
      insert(target, t0, anchor);
      mount_component(hero, target, anchor);
      insert(target, t1, anchor);
      mount_component(carousel, target, anchor);
      insert(target, t2, anchor);
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
      transition_in(hero.$$.fragment, local);
      transition_in(carousel.$$.fragment, local);
      transition_in(if_block);
      current = true;
    },
    o(local) {
      transition_out(progress_1.$$.fragment, local);
      transition_out(hero.$$.fragment, local);
      transition_out(carousel.$$.fragment, local);
      transition_out(if_block);
      current = false;
    },
    d(detaching) {
      destroy_component(progress_1, detaching);
      if (detaching)
        detach(t0);
      destroy_component(hero, detaching);
      if (detaching)
        detach(t1);
      destroy_component(carousel, detaching);
      if (detaching)
        detach(t2);
      if (if_block)
        if_block.d(detaching);
      if (detaching)
        detach(if_block_anchor);
    }
  };
}
function instance($$self, $$props, $$invalidate) {
  let $chapters;
  let dataLoaded = false;
  const chapters = writable([]);
  component_subscribe($$self, chapters, (value) => $$invalidate(3, $chapters = value));
  let storyHeight = 0;
  let progress = 0;
  let observer;
  let copy;
  async function loadData() {
    set_store_value(chapters, $chapters = await csv("./chapters.csv", autoType), $chapters);
    const copyCsv = await csv("./copy.csv", autoType);
    $$invalidate(2, copy = group(copyCsv, (d) => d.section));
    $$invalidate(0, dataLoaded = true);
  }
  function setProgressData() {
    const chapterNodes = document.querySelectorAll("[data-chapter]");
    if (!chapterNodes.length)
      return;
    Array.from(chapterNodes).forEach((node, i) => {
      const position = node.offsetTop;
      const progress2 = position / storyHeight * 100;
      set_store_value(chapters, $chapters[i].position = position, $chapters);
      set_store_value(chapters, $chapters[i].progress = progress2, $chapters);
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
      setProgressData();
    });
    observer.observe(document.body);
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      observer.disconnect();
    };
  });
  return [dataLoaded, progress, copy, $chapters, chapters];
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
  target: document.getElementById("climate-story-container")
});
