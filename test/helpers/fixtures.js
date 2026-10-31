// テスト用の list.json の要素を作る。テストごとに新しいオブジェクトを返す

let serial = 0;

// check.js の検査を通る最小限の要素（state は canvas）
function makeSite(overrides = {}) {
  serial += 1;
  return {
    id: "site-" + serial,
    site: { name: "サイト" + serial, reading: "あ" },
    url: "https://example.com/" + serial + "/",
    state: "canvas",
    ...overrides,
  };
}

module.exports = { makeSite };
