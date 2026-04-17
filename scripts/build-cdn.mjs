import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const execFileAsync = promisify(execFile);
const rootDir = process.cwd();
const distDir = path.join(rootDir, "dist");

const packageJson = JSON.parse(
  await readFile(path.join(rootDir, "package.json"), "utf8")
);

const banner = `/*! ${packageJson.name} v${packageJson.version} | MIT License */`;
const sourceOrder = [
  "src/lib/config.js",
  "src/lib/color.js",
  "src/lib/dom.js",
  "src/lib/network.js",
  "src/lib/renderers/index.js",
  "src/lib/imgx.js"
];

function stripModuleSyntax(source) {
  return source
    .replace(/^import\s+[^;]+;\n/gm, "")
    .replace(/^export\s+default\s+[^;]+;\n?/gm, "")
    .replace(/^export\s+\{[\s\S]*?\}\s+from\s+[^;]+;\n?/gm, "")
    .replace(/^export\s+\{[\s\S]*?\};\n?/gm, "")
    .replace(/^export\s+(async\s+function|class|function|const)\s+/gm, "$1 ");
}

const transformedSources = await Promise.all(
  sourceOrder.map(async (relativeFile) => {
    const absoluteFile = path.join(rootDir, relativeFile);
    const content = await readFile(absoluteFile, "utf8");
    return `// ${relativeFile}\n${stripModuleSyntax(content).trim()}\n`;
  })
);

const footer = `
function createImgx(config = {}) {
  return new Imgx(config);
}

const imgx = createImgx();

if (typeof window !== "undefined" && typeof document !== "undefined") {
  imgx.enableAutoInit();
}

const ImgxCDN = {
  Imgx,
  builtinRenderers,
  skeletonRenderer,
  svgAnimationRenderer,
  blurPreviewRenderer,
  dominantColorRenderer,
  fallbackRenderer,
  createImgx,
  imgx
};

global.Imgx = ImgxCDN;
`;

const bundle = `${banner}
(function (global) {
"use strict";

${transformedSources.join("\n")}
${footer.trim()}
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : this);
`;

await mkdir(distDir, { recursive: true });

const distFile = path.join(distDir, "imgx.js");
const minFile = path.join(distDir, "imgx.min.js");

await writeFile(distFile, bundle, "utf8");

await execFileAsync("terser", [
  distFile,
  "--compress",
  "--mangle",
  "--comments",
  "/^!/",
  "--ecma",
  "2020",
  "--output",
  minFile
], {
  cwd: rootDir,
  maxBuffer: 10 * 1024 * 1024
});

console.log(`Built ${path.relative(rootDir, distFile)}`);
console.log(`Built ${path.relative(rootDir, minFile)}`);
