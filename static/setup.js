process.on("unhandledRejection", (err) => {
  fail(err);
});

window.ResizeObserver = require("resize-observer-polyfill");
