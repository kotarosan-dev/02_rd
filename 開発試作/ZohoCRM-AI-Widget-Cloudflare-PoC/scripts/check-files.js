const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const required = [
  "plugin-manifest.json",
  "app/widget.html",
  "app/css/style.css",
  "app/js/main.js",
  "app/js/zoho-mock.js",
  "app/lib/three-adapter.js",
  "app/lib/three-lite.js"
];

const missing = required.filter((file) => {
  const fullPath = path.join(root, file);
  return !fs.existsSync(fullPath) || fs.statSync(fullPath).size === 0;
});

if (missing.length > 0) {
  console.error(`Missing required files: ${missing.join(", ")}`);
  process.exit(1);
}

const mainJs = fs.readFileSync(path.join(root, "app/js/main.js"), "utf8");
if (/innerHTML\s*=/.test(mainJs)) {
  console.error("main.js contains direct innerHTML assignment.");
  process.exit(1);
}

const adapterJs = fs.readFileSync(path.join(root, "app/lib/three-adapter.js"), "utf8");
if (!adapterJs.includes("three.module.min.js") || !adapterJs.includes("cdn.jsdelivr.net")) {
  console.error("three-adapter.js must prefer vendored three.js and include CDN fallback.");
  process.exit(1);
}

console.log(`OK: ${required.length} files verified. adapter=${path.join(root, "app/lib/three-adapter.js")}`);
