// js/common.js（各ページ共通の定義）のテスト
// 値は docs/list-json.md の仕様と合っているかを確かめる

const { describe, test, before } = require("node:test");
const assert = require("node:assert/strict");
const { createPage, getGlobal } = require("./helpers/load-page.js");

describe("common.js の定義", () => {
  let get;
  before(() => {
    const { window } = createPage("check.html", ["common"]);
    // ページ内の配列は realm が違うので、Node の配列にしてから比べる
    get = (name) => [...getGlobal(window, name)];
  });

  test("state は仕様の7値", () => {
    assert.deepEqual(get("KNOWN_STATES").sort(), [
      "archived",
      "canvas",
      "closed",
      "exist",
      "home",
      "remained",
      "vanished",
    ]);
  });
  test("waybackTime が必要な state は closed・archived・remained", () => {
    assert.deepEqual(get("WAYBACK_LINK_STATES").sort(), ["archived", "closed", "remained"]);
  });
  test("waybackTime が必要な state は、すべて使える state", () => {
    const known = get("KNOWN_STATES");
    assert.ok(get("WAYBACK_LINK_STATES").every((s) => known.includes(s)));
  });
  test("kindMasao は仕様の6値（この順でボタンを作る）", () => {
    assert.deepEqual(get("KIND_MASAO_VALUES"), ["自動", "一画面", "ストーリー", "JS拡張", "カービィ系", "SASUKE系"]);
  });
  test("feature は仕様の5値（この順でボタンを作る）", () => {
    assert.deepEqual(get("FEATURE_VALUES"), ["正男100個以上", "素材配布", "エディタ", "WWA", "まさお3"]);
  });
  for (const name of ["KNOWN_STATES", "KIND_MASAO_VALUES", "FEATURE_VALUES"]) {
    test(`${name} に重複が無い`, () => {
      const values = get(name);
      assert.equal(new Set(values).size, values.length);
    });
  }
});
