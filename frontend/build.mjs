/**
 * Stan Clips Frontend Build Pipeline
 *
 * Compiles Tailwind CSS tokens, bundles the client-side UI runtime (StanUI) using esbuild,
 * prunes stale bundle hashes from web/, and prerenders static/interactive HTML templates.
 */

import { build } from "esbuild";
import { readFile, writeFile, readdir, mkdir, rename, unlink } from "node:fs/promises";
import { watch } from "node:fs";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import postcss from "postcss";
import tailwind from "tailwindcss";
import autoprefixer from "autoprefixer";

const src = path.resolve("src");
const web = path.resolve("../web");
const cache = path.resolve("node_modules/.cache/stan");

await mkdir(cache, { recursive: true });
const production = { "process.env.NODE_ENV": '"production"' };

/**
 * Removes any old stan-ui-*.js bundles in web/ so stale builds never accumulate.
 */
async function cleanStaleBundles(currentHash) {
  try {
    const files = await readdir(web);
    for (const file of files) {
      if (file.startsWith("stan-ui-") && file.endsWith(".js") && file !== `stan-ui-${currentHash}.js`) {
        await unlink(path.join(web, file)).catch(() => {});
      }
    }
  } catch (err) {
    console.warn("[Build] Warning: Failed to clean stale bundles:", err.message);
  }
}

async function compile() {
  const startTime = Date.now();
  console.log("[Build] Starting compilation...");

  // 1. Compile CSS with Tailwind and Design Tokens
  const theme =
    (await readFile(path.resolve("../design/stan-clips/tokens.css"), "utf8")) +
    (await readFile(path.join(src, "studio.css"), "utf8"));

  const css = (
    await postcss([
      tailwind({
        content: ["./src/**/*.{tsx,ts}"],
        corePlugins: { preflight: false },
      }),
      autoprefixer,
    ]).process(theme, { from: undefined })
  ).css;

  // 2. Bundle Client Library (StanUI)
  const client = await build({
    entryPoints: ["src/library.tsx"],
    bundle: true,
    format: "iife",
    globalName: "StanUI",
    minify: true,
    write: false,
    define: production,
  });

  const uiJs = client.outputFiles[0].text;
  const uiHash = createHash("sha256").update(uiJs).digest("hex").slice(0, 12);
  const bundleFilename = `stan-ui-${uiHash}.js`;

  // Write new bundle and clean up previous versions
  await writeFile(path.join(web, bundleFilename), uiJs);
  await cleanStaleBundles(uiHash);

  // 3. Prerender HTML Pages
  const pages = await readdir(path.join(src, "pages"));
  for (const name of pages) {
    const folder = path.join(src, "pages", name);
    const compiled = path.join(cache, `${name}.mjs`);

    await build({
      entryPoints: [path.join(folder, "Page.tsx")],
      outfile: compiled,
      bundle: true,
      platform: "node",
      packages: "external",
      format: "esm",
      jsx: "automatic",
    });

    const PageModule = await import(`${pathToFileURL(compiled).href}?t=${Date.now()}`);
    const Page = PageModule.default;

    const markup = Page
      ? renderToStaticMarkup(createElement(Page)).replace(
          / data-stan-(onclick|oninput|onchange)=/g,
          " $1="
        )
      : "";

    const interactive = name === "index" || name === "layout_studio";
    const templatePath = path.join(folder, interactive ? "document.legacy.html" : "document.html");
    const template = await readFile(templatePath, "utf8");

    const scriptTag = name === "index" ? `<script src="/assets/${bundleFilename}"></script>` : "";
    const html = template
      .replace("<!-- STAN_PAGE -->", () => markup)
      .replace("<!-- STAN_THEME -->", () => `<style>${css}</style>${scriptTag}`)
      .replace("<!-- STAN_SCRIPT -->", () => "");

    const target = path.join(web, `${name}.html`);
    await writeFile(
      `${target}.tmp`,
      html.replace(/(\/brand\/(?:logo(?:-light)?|favicon)\.svg)(?=["'])/g, "$1?v=lime2")
    );
    await rename(`${target}.tmp`, target);
  }

  const duration = Date.now() - startTime;
  console.log(`[Build] Compiled successfully in ${duration}ms (bundle: ${bundleFilename})`);
}

await compile();

if (process.argv.includes("--watch")) {
  console.log("[Build] Watching for changes in src/...");
  let timer;
  let queue = Promise.resolve();
  watch(src, { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      queue = queue.then(compile).catch(console.error);
    }, 150);
  });
}
