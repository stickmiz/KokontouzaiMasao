// テスト用に、実際の html と本番の js を jsdom で読み込む
// 本番のファイルは変更せず、通信（$.ajax・fetch）などだけをスタブにする

const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");

const PROJECT_DIR = path.join(__dirname, "..", "..");
// jquery.js は親階層（サイト共通）のもの
const SITE_DIR = path.join(PROJECT_DIR, "..");

// Google ドライブ上では npm install ができないので、ローカルディスクに入れた jsdom も探す
// （詳しくは test/README.md）
function loadJsdom() {
  try {
    return require("jsdom");
  } catch {
    const modulesDir =
      process.env.KOKONTOUZAI_TEST_MODULES ??
      path.join(process.env.LOCALAPPDATA ?? "", "kokontouzai-test");
    return createRequire(path.join(modulesDir, "package.json"))("jsdom");
  }
}

const { JSDOM, VirtualConsole } = loadJsdom();

const SCRIPT_FILES = {
  jquery: path.join(SITE_DIR, "js", "jquery.js"),
  common: path.join(PROJECT_DIR, "js", "common.js"),
  kokon: path.join(PROJECT_DIR, "js", "kokon.js"),
  check: path.join(PROJECT_DIR, "js", "check.js"),
  exceptionSitelist: path.join(PROJECT_DIR, "js", "exception-sitelist.js"),
};

const sourceCache = new Map();
function readSource(file) {
  if (!sourceCache.has(file)) {
    sourceCache.set(file, fs.readFileSync(file, "utf8"));
  }
  return sourceCache.get(file);
}

// html の script タグは外し、テストで指定した順に読み込む
function readHtmlWithoutScripts(htmlFile) {
  return readSource(path.join(PROJECT_DIR, htmlFile)).replace(
    /<script\b[^>]*>[\s\S]*?<\/script>/gi,
    "",
  );
}

/**
 * html を読み込み、steps を順に実行する。
 * steps の要素は SCRIPT_FILES のキー（本番の js を読み込む）か、window を受け取る関数（スタブを入れる）。
 * script の実行は、ブラウザと同じく DOMContentLoaded の前に行う。
 */
function createPage(htmlFile, steps) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  // script の中で起きた例外（クリック時の例外など）を記録する
  virtualConsole.on("jsdomError", (error) => errors.push(error));

  const dom = new JSDOM(readHtmlWithoutScripts(htmlFile), {
    runScripts: "dangerously",
    url: "https://kasomura.stickmiz.net/kokontouzai/" + htmlFile,
    virtualConsole,
  });
  const { window } = dom;

  for (const step of steps) {
    if (typeof step == "function") {
      step(window);
      continue;
    }
    // script 要素として入れると、ブラウザと同じく const などが script 間で共有される
    const script = window.document.createElement("script");
    script.textContent = readSource(SCRIPT_FILES[step]);
    window.document.head.appendChild(script);
  }

  return { dom, window, document: window.document, errors };
}

// DOMContentLoaded・load の処理と、その後の Promise の処理が終わるまで待つ
async function waitForLoad(window) {
  if (window.document.readyState != "complete") {
    await new Promise((resolve) => window.addEventListener("load", resolve));
  }
  await new Promise((resolve) => setTimeout(resolve, 0));
}

// const・let で宣言された値は window のプロパティにならないので、ページの中で評価して取り出す
function getGlobal(window, name) {
  return window.eval(name);
}

module.exports = { createPage, waitForLoad, getGlobal };
