// js/exception-sitelist.js（Java の例外サイトリスト用の URL 一覧）のテスト

const { describe, test, before } = require("node:test");
const assert = require("node:assert/strict");
const { createPage, waitForLoad, getGlobal } = require("./helpers/load-page.js");
const { makeSite } = require("./helpers/fixtures.js");

// サーバーの返事（FakeXMLHttpRequest が返す内容）
const ok = (data) => ({ status: 200, text: JSON.stringify(data) });
const httpError = (status) => ({ status, text: "" });
const invalidJson = () => ({ status: 200, text: "{ not json" });
const networkError = () => ({ network: true });

// 本物の jQuery の $.ajax を通すため、XMLHttpRequest だけを差し替える。
// responses はファイル名（クエリを除く）ごとの返事
function fakeXhrClass(responses, requests) {
  return class FakeXMLHttpRequest {
    open(method, url) {
      this.method = method;
      this.url = new URL(url, "https://kasomura.stickmiz.net/kokontouzai/");
      requests.push(this);
    }
    setRequestHeader() {}
    getAllResponseHeaders() {
      return "Content-Type: application/json\r\n";
    }
    abort() {}
    send() {
      const response = responses[this.url.pathname.split("/").pop()];
      queueMicrotask(() => {
        if (response.network) {
          this.status = 0;
          this.statusText = "error";
          this.onerror();
          return;
        }
        this.status = response.status;
        this.statusText = String(response.status);
        this.responseText = response.text;
        this.onload();
      });
    }
  };
}

// exception-sitelist.html を開く
async function openSitelist(responses) {
  const requests = [];
  const page = createPage("exception-sitelist.html", [
    "jquery",
    (window) => {
      window.XMLHttpRequest = fakeXhrClass(responses, requests);
    },
    "common",
    "exceptionSitelist",
  ]);
  await waitForLoad(page.window);
  return { ...page, requests };
}

function textareas(document) {
  return [...document.querySelectorAll("#tarea textarea")];
}

function paragraphs(document) {
  return [...document.querySelectorAll("#tarea p")].map((p) => p.textContent);
}

// 画面に出た URL 一覧（1行ずつ）
function shownUrls(document) {
  const [textarea] = textareas(document);
  return textarea.value == "" ? [] : textarea.value.split("\n");
}

async function show(list, anotherList = []) {
  const { document } = await openSitelist({ "list.json": ok(list), "anotherlist.json": ok(anotherList) });
  return shownUrls(document);
}

describe("extractUrls", () => {
  let extractUrls;
  before(async () => {
    const { window } = await openSitelist({ "list.json": ok([]), "anotherlist.json": ok([]) });
    extractUrls = getGlobal(window, "extractUrls");
  });

  for (const state of ["exist", "canvas", "remained", "home"]) {
    test(`${state} のサイトは url を入れる`, () => {
      assert.deepEqual([...extractUrls([{ state, url: "http://a.jp/" }])], ["http://a.jp/"]);
    });
  }
  for (const state of ["closed", "archived", "vanished"]) {
    test(`${state} のサイトは url を入れない`, () => {
      assert.deepEqual([...extractUrls([{ state, url: "http://a.jp/" }])], []);
    });
  }
  test("suburl（文字列）は state にかかわらず入れる", () => {
    const urls = extractUrls([{ state: "closed", url: "http://a.jp/", suburl: "http://m.jp/" }]);
    assert.deepEqual([...urls], ["http://m.jp/"]);
  });
  test("suburl（配列）はすべて入れる", () => {
    const urls = extractUrls([{ state: "vanished", url: "", suburl: ["http://m1.jp/", "http://m2.jp/"] }]);
    assert.deepEqual([...urls], ["http://m1.jp/", "http://m2.jp/"]);
  });
  test("url の後に suburl を入れる", () => {
    const urls = extractUrls([{ state: "canvas", url: "http://a.jp/", suburl: "http://m.jp/" }]);
    assert.deepEqual([...urls], ["http://a.jp/", "http://m.jp/"]);
  });
  test("空の list なら空の配列", () => {
    assert.deepEqual([...extractUrls([])], []);
  });
});

describe("exception-sitelist.html を開いたとき", () => {
  test("list.json と anotherlist.json を、キャッシュなしで読み込む", async () => {
    const { requests } = await openSitelist({ "list.json": ok([]), "anotherlist.json": ok([]) });
    assert.deepEqual(requests.map((r) => r.url.pathname.split("/").pop()).sort(), ["anotherlist.json", "list.json"]);
    // cache: false のとき、jQuery は URL に「_=」を付ける
    assert.ok(requests.every((r) => r.method == "GET" && r.url.searchParams.has("_")));
  });
  test("読み取り専用のテキストエリアを1つ置き、エラーの文は出さない", async () => {
    const { document } = await openSitelist({ "list.json": ok([]), "anotherlist.json": ok([]) });
    const areas = textareas(document);
    assert.equal(areas.length, 1);
    assert.equal(areas[0].readOnly, true);
    assert.deepEqual(paragraphs(document), []);
  });
  test("list.json の対象の url と anotherlist.json の url をまとめて出す", async () => {
    const urls = await show(
      [makeSite({ url: "http://a.jp/" }), makeSite({ state: "closed", url: "http://closed.jp/", wayback_time: 20040101000000 })],
      [{ url: "http://another.jp/" }],
    );
    assert.deepEqual(urls, ["http://a.jp/", "http://another.jp/"]);
  });
  test("URL の順（文字コード順）に並べる", async () => {
    const urls = await show([makeSite({ url: "http://c.jp/" }), makeSite({ url: "http://a.jp/" })], [{ url: "http://b.jp/" }]);
    assert.deepEqual(urls, ["http://a.jp/", "http://b.jp/", "http://c.jp/"]);
  });
  test("同じ URL は1つにまとめる", async () => {
    const urls = await show([makeSite({ url: "http://a.jp/" })], [{ url: "http://a.jp/" }]);
    assert.deepEqual(urls, ["http://a.jp/"]);
  });
  test("最後の / より後ろ（ファイル名）を除いて出す", async () => {
    const urls = await show([makeSite({ url: "http://a.jp/dir/index.html" })]);
    assert.deepEqual(urls, ["http://a.jp/dir/"]);
  });
  test("ファイル名を除いた後に同じになる URL も1つにまとめる", async () => {
    const urls = await show(
      [makeSite({ url: "http://a.jp/dir/index.html" }), makeSite({ url: "http://a.jp/dir/" })],
      [{ url: "http://a.jp/dir/top.htm" }],
    );
    assert.deepEqual(urls, ["http://a.jp/dir/"]);
  });
  test("url が無い要素（undefined）は出さない", async () => {
    const urls = await show([makeSite({ url: undefined })], [{}]);
    assert.deepEqual(urls, []);
  });
  test("対象が無ければ、空のテキストエリアになる", async () => {
    const { document } = await openSitelist({ "list.json": ok([]), "anotherlist.json": ok([]) });
    assert.equal(textareas(document)[0].value, "");
  });
  test("& や < を含む URL も、そのままの文字で出す", async () => {
    const urls = await show([], [{ url: "http://a.jp/?a=1&amp;b=<x>/" }]);
    assert.deepEqual(urls, ["http://a.jp/?a=1&amp;b=<x>/"]);
  });
});

describe("読み込みに失敗したとき", () => {
  const RETRY = "時間をおいて再読み込みしてください。";

  test("list.json が 404 なら、ファイル名とステータスを出し、一覧は出さない", async () => {
    const { document } = await openSitelist({ "list.json": httpError(404), "anotherlist.json": ok([]) });
    assert.deepEqual(paragraphs(document), ["list.json の読み込みに失敗しました（404）", RETRY]);
    assert.equal(textareas(document).length, 0);
  });
  test("anotherlist.json だけが失敗しても、一覧は出さない", async () => {
    const { document } = await openSitelist({ "list.json": ok([makeSite()]), "anotherlist.json": httpError(500) });
    assert.deepEqual(paragraphs(document), ["anotherlist.json の読み込みに失敗しました（500）", RETRY]);
    assert.equal(textareas(document).length, 0);
  });
  test("両方とも失敗したら、両方のファイルを出す", async () => {
    const { document } = await openSitelist({ "list.json": httpError(404), "anotherlist.json": httpError(404) });
    assert.deepEqual(paragraphs(document), [
      "list.json の読み込みに失敗しました（404）",
      "anotherlist.json の読み込みに失敗しました（404）",
      RETRY,
    ]);
  });
  test("通信そのものが失敗したら、ステータス 0 として出す", async () => {
    const { document } = await openSitelist({ "list.json": networkError(), "anotherlist.json": ok([]) });
    assert.deepEqual(paragraphs(document), ["list.json の読み込みに失敗しました（0）", RETRY]);
  });
  test("JSON として読めなければ、その旨を出す", async () => {
    const { document } = await openSitelist({ "list.json": invalidJson(), "anotherlist.json": ok([]) });
    assert.deepEqual(paragraphs(document), ["list.json の読み込みに失敗しました（JSON として読めません）", RETRY]);
  });
  test("読み込めてもデータの形が違えば、エラーの文を出す", async () => {
    // list.json が配列でない
    const { document } = await openSitelist({ "list.json": ok({}), "anotherlist.json": ok([]) });
    const messages = paragraphs(document);
    assert.equal(messages.length, 2);
    assert.equal(messages[1], RETRY);
    assert.equal(textareas(document).length, 0);
  });
  test("失敗しても、ページに例外を残さない", async () => {
    const { errors } = await openSitelist({ "list.json": httpError(404), "anotherlist.json": ok([]) });
    assert.deepEqual(errors, []);
  });
});
