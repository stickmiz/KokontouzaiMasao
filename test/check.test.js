// js/check.js（check.html の list.json 検査）のテスト

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const { createPage, waitForLoad } = require("./helpers/load-page.js");
const { makeSite } = require("./helpers/fixtures.js");

// check.html を開く。fetch は respond の結果を返すスタブにする
async function openCheck(respond) {
  const fetchCalls = [];
  const page = createPage("check.html", [
    (window) => {
      window.fetch = async (...args) => {
        fetchCalls.push(args);
        return respond();
      };
    },
    "common",
    "check",
  ]);
  await waitForLoad(page.window);
  return { ...page, fetchCalls };
}

function okResponse(data) {
  return { ok: true, status: 200, json: async () => data };
}

// 画面に出たメッセージ（1行ずつ）
function messagesOf(document) {
  return [...document.getElementById("error-message").childNodes]
    .filter((node) => node.nodeType == 3)
    .map((node) => node.textContent);
}

// list を検査して、出たメッセージを返す
async function check(list) {
  const { document } = await openCheck(() => okResponse(list));
  return messagesOf(document);
}

// 1サイトだけの list を検査する
function checkOne(overrides) {
  return check([makeSite(overrides)]);
}

describe("list.json の読み込み", () => {
  test("list.json をキャッシュなしで読み込む", async () => {
    const { fetchCalls } = await openCheck(() => okResponse([]));
    assert.equal(fetchCalls.length, 1);
    assert.equal(fetchCalls[0][0], "list.json");
    assert.equal(fetchCalls[0][1].cache, "no-store");
  });
  test("読み込みに失敗したら、ステータスを付けて知らせる", async () => {
    const { document } = await openCheck(() => ({ ok: false, status: 404 }));
    assert.deepEqual(messagesOf(document), ["list.json の読み込みに失敗しました（404）"]);
  });
  test("通信そのものが失敗したら、そのエラー文を知らせる", async () => {
    const { document } = await openCheck(() => {
      throw new Error("network down");
    });
    assert.deepEqual(messagesOf(document), ["network down"]);
  });
  test("JSON として読めなければ、そのエラー文を知らせる", async () => {
    const { document } = await openCheck(() => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError("Unexpected token");
      },
    }));
    assert.deepEqual(messagesOf(document), ["Unexpected token"]);
  });
});

describe("正しいデータ", () => {
  test("空の list はエラーにならない", async () => {
    assert.deepEqual(await check([]), []);
  });
  test("ルールどおりのデータはエラーにならない", async () => {
    const list = [
      makeSite({ site: { name: "A", reading: "あ" } }),
      makeSite({
        site: { name: "B", reading: "か" },
        oldName: ["B2", "B3"],
        webmaster: "管理人",
        banner: { image: "b.png", size: { width: 200, height: 40 } },
        oldUrl: "http://old.example.com/",
        mirrorUrl: ["http://mirror.example.com/"],
        period: { from: 2004, to: 2006 },
        masaoKind: ["自動", "JS拡張"],
        feature: "エディタ",
        works: "作品",
        note: "メモ",
        state: "closed",
        waybackTime: 20041220185135,
      }),
      makeSite({ site: { name: "C", reading: "さ" }, state: "vanished", url: "" }),
    ];
    assert.deepEqual(await check(list), []);
  });
  test("エラーは「サイト名：内容」の形で出す", async () => {
    const messages = await checkOne({ site: { name: "テストのサイト", reading: "あ" }, state: "unknown" });
    assert.deepEqual(messages, ['テストのサイト：state has an unknown value "unknown"']);
  });
  test("1つのサイトに複数の誤りがあれば、すべて出す", async () => {
    const messages = await checkOne({ id: "Bad", url: "ftp://a.jp/", state: "closed" });
    assert.equal(messages.length, 3);
  });
});

describe("id", () => {
  test("id が無ければエラー", async () => {
    const site = makeSite();
    delete site.id;
    assert.deepEqual(await check([site]), [`${site.site.name}：id is required`]);
  });
  test("英小文字・数字・- だけなら正しい", async () => {
    assert.deepEqual(await checkOne({ id: "masao-2-kobo" }), []);
  });
  for (const id of ["Masao", "masao_kobo", "まさお", "masao kobo", ""]) {
    test(`使えない文字を含む id「${id}」はエラー`, async () => {
      const messages = await checkOne({ id });
      assert.equal(messages.length, 1);
      assert.match(messages[0], /must contain only a-z, 0-9 and -/);
    });
  }
  test("文字列でない id はエラー", async () => {
    const messages = await checkOne({ id: 123 });
    assert.match(messages[0], /must contain only a-z, 0-9 and -/);
  });
  test("重複した id は、2つ目のサイトでエラー", async () => {
    const list = [
      makeSite({ id: "same", site: { name: "1つ目", reading: "あ" } }),
      makeSite({ id: "same", site: { name: "2つ目", reading: "い" } }),
    ];
    assert.deepEqual(await check(list), ['2つ目：id "same" is duplicated']);
  });
});

describe("site.reading", () => {
  test("よみの順に並んでいなければエラー", async () => {
    const list = [
      makeSite({ site: { name: "後", reading: "い" } }),
      makeSite({ site: { name: "前", reading: "あ" } }),
    ];
    assert.deepEqual(await check(list), ["前：reading is out of order"]);
  });
  test("同じよみが続くのは誤りではない", async () => {
    const list = [
      makeSite({ site: { name: "1", reading: "あ" } }),
      makeSite({ site: { name: "2", reading: "あ" } }),
    ];
    assert.deepEqual(await check(list), []);
  });
  const READING_ERROR =
    "x：reading must contain only hiragana without dakuten, handakuten or small letters";
  for (const reading of ["アイウ", "abc", "あい う", "あー"]) {
    test(`ひらがな以外を含むよみ「${reading}」はエラー`, async () => {
      const messages = await checkOne({ site: { name: "x", reading } });
      assert.deepEqual(messages, [READING_ERROR]);
    });
  }
  for (const reading of ["かが", "はぱ", "う゛", "ゔ"]) {
    test(`濁点・半濁点を含むよみ「${reading}」はエラー`, async () => {
      const messages = await checkOne({ site: { name: "x", reading } });
      assert.deepEqual(messages, [READING_ERROR]);
    });
  }
  for (const reading of ["きゃ", "あっ", "あぁ", "わゎ"]) {
    test(`小さい文字を含むよみ「${reading}」はエラー`, async () => {
      const messages = await checkOne({ site: { name: "x", reading } });
      assert.deepEqual(messages, [READING_ERROR]);
    });
  }
  test("空のよみはエラー", async () => {
    const messages = await checkOne({ site: { name: "x", reading: "" } });
    assert.deepEqual(messages, [READING_ERROR]);
  });
  test("清音・大きい文字だけのよみは通る（あ〜ん・を・ゐ・ゑ）", async () => {
    assert.deepEqual(await checkOne({ site: { name: "x", reading: "あいうえおかはやわをゐゑん" } }), []);
  });
});

describe("site", () => {
  test("site が無ければエラーにし、id でどの要素かを示す", async () => {
    const site = makeSite({ id: "no-site" });
    delete site.site;
    assert.deepEqual(await check([site]), ['id "no-site"：site is required']);
  });
  test("site も id も無ければ「（サイト名なし）」で示す", async () => {
    const site = makeSite();
    delete site.site;
    delete site.id;
    assert.deepEqual(await check([site]), ["（サイト名なし）：id is required", "（サイト名なし）：site is required"]);
  });
  test("site が null でもエラーにする", async () => {
    const messages = await checkOne({ id: "null-site", site: null });
    assert.deepEqual(messages, ['id "null-site"：site is required']);
  });
  test("site が無くても、ほかの検査は続ける", async () => {
    const site = makeSite({ id: "no-site", state: "unknown" });
    delete site.site;
    assert.deepEqual(await check([site]), [
      'id "no-site"：site is required',
      'id "no-site"：state has an unknown value "unknown"',
    ]);
  });
  test("site が無い要素の後のサイトも検査する", async () => {
    const broken = makeSite({ id: "no-site" });
    delete broken.site;
    const list = [broken, makeSite({ site: { name: "次", reading: "い" }, state: "unknown" })];
    assert.deepEqual(await check(list), ['id "no-site"：site is required', '次：state has an unknown value "unknown"']);
  });
  test("site.name が無ければエラー", async () => {
    const messages = await checkOne({ id: "no-name", site: { reading: "あ" } });
    assert.deepEqual(messages, ['id "no-name"：site.name is required']);
  });
  test("site.reading が無ければエラー", async () => {
    const messages = await checkOne({ site: { name: "x" } });
    assert.deepEqual(messages, ["x：site.reading is required"]);
  });
  test("1つ前の要素によみが無ければ、並び順は比べない", async () => {
    const list = [
      makeSite({ site: { name: "よみなし" } }),
      makeSite({ site: { name: "次", reading: "あ" } }),
    ];
    assert.deepEqual(await check(list), ["よみなし：site.reading is required"]);
  });
});

describe("キー", () => {
  test("決まっていないキーはエラー", async () => {
    const messages = await checkOne({ site: { name: "x", reading: "あ" }, memo: "a" });
    assert.deepEqual(messages, ['x：unknown key "memo"']);
  });
});

describe("state", () => {
  for (const state of ["canvas", "exist", "vanished", "home"]) {
    test(`${state} は使える値`, async () => {
      assert.deepEqual(await checkOne({ state }), []);
    });
  }
  for (const state of ["archived_wayback", "archived_geolog", "", undefined]) {
    test(`廃止・未知の値 ${JSON.stringify(state)} はエラー`, async () => {
      const messages = await checkOne({ state });
      assert.ok(messages.some((m) => m.includes("state has an unknown value")));
    });
  }
});

describe("masaoKind・feature", () => {
  test("決まった値の文字列は通る", async () => {
    assert.deepEqual(await checkOne({ masaoKind: "SASUKE系", feature: "まさお3" }), []);
  });
  test("masaoKind に未知の値があればエラー", async () => {
    const messages = await checkOne({ site: { name: "x", reading: "あ" }, masaoKind: "謎" });
    assert.deepEqual(messages, ['x：masaoKind has an unknown value "謎"']);
  });
  test("配列の中の未知の値だけをエラーにする", async () => {
    const messages = await checkOne({ site: { name: "x", reading: "あ" }, feature: ["WWA", "謎"] });
    assert.deepEqual(messages, ['x：feature has an unknown value "謎"']);
  });
});

describe("waybackTime", () => {
  for (const state of ["closed", "archived", "remained"]) {
    test(`${state} で waybackTime が無ければエラー`, async () => {
      const messages = await checkOne({ site: { name: "x", reading: "あ" }, state });
      assert.deepEqual(messages, [`x：waybackTime is required when state is "${state}"`]);
    });
  }
  for (const state of ["canvas", "exist", "vanished", "home"]) {
    test(`${state} で waybackTime があればエラー`, async () => {
      const messages = await checkOne({ site: { name: "x", reading: "あ" }, state, waybackTime: 20040101000000 });
      assert.deepEqual(messages, [`x：waybackTime must not be set when state is "${state}"`]);
    });
  }
  test("14桁ちょうどなら正しい", async () => {
    assert.deepEqual(await checkOne({ state: "closed", waybackTime: 20041220185135 }), []);
  });
  for (const value of [2004122018513, 200412201851350]) {
    test(`${String(value).length}桁はエラー`, async () => {
      const messages = await checkOne({ state: "closed", waybackTime: value });
      assert.equal(messages.length, 1);
      assert.match(messages[0], /14-digit number/);
    });
  }
});

describe("period", () => {
  const yearErrors = async (period) => checkOne({ site: { name: "x", reading: "あ" }, period });

  test("from < to は正しい", async () => {
    assert.deepEqual(await yearErrors({ from: 2004, to: 2006 }), []);
  });
  test("from = to は正しい（境界）", async () => {
    assert.deepEqual(await yearErrors({ from: 2005, to: 2005 }), []);
  });
  test("from > to はエラー", async () => {
    assert.deepEqual(await yearErrors({ from: 2006, to: 2005 }), ["x：period.from must not be later than period.to"]);
  });
  test("推定（負の値）は絶対値で比べる：2006？～2005 はエラー", async () => {
    assert.equal((await yearErrors({ from: -2006, to: 2005 })).length, 1);
  });
  test("推定（負の値）は絶対値で比べる：2004～2005？ は正しい", async () => {
    assert.deepEqual(await yearErrors({ from: 2004, to: -2005 }), []);
  });
  test("to が 0（継続中）なら比べない", async () => {
    assert.deepEqual(await yearErrors({ from: 2011, to: 0 }), []);
  });
  test("-1（不明）があれば比べない", async () => {
    assert.deepEqual(await yearErrors({ from: 2011, to: -1 }), []);
    assert.deepEqual(await yearErrors({ from: -1, to: 2005 }), []);
  });
  test("from・to の片方が無ければエラー", async () => {
    assert.deepEqual(await yearErrors({ from: 2004 }), ["x：period.from and period.to must both be integers"]);
  });
  test("整数でなければエラー", async () => {
    assert.deepEqual(await yearErrors({ from: 2004.5, to: 2006 }), ["x：period.from and period.to must both be integers"]);
  });
  test("文字列の年はエラー", async () => {
    assert.deepEqual(await yearErrors({ from: "2004", to: 2006 }), ["x：period.from and period.to must both be integers"]);
  });
});

describe("banner", () => {
  const bannerErrors = (banner) => checkOne({ site: { name: "x", reading: "あ" }, banner });

  test("画像と正の整数の大きさなら正しい", async () => {
    assert.deepEqual(await bannerErrors({ image: "a.png", size: { width: 1, height: 1 } }), []);
  });
  test("画像があるのに size が無ければエラー", async () => {
    assert.deepEqual(await bannerErrors({ image: "a.png" }), [
      "x：banner.size.width and banner.size.height must be positive integers",
    ]);
  });
  for (const size of [{ width: 0, height: 40 }, { width: 200, height: -1 }, { width: 200.5, height: 40 }]) {
    test(`大きさ ${JSON.stringify(size)} はエラー`, async () => {
      const messages = await bannerErrors({ image: "a.png", size });
      assert.deepEqual(messages, ["x：banner.size.width and banner.size.height must be positive integers"]);
    });
  }
  test("画像と色を両方書くとエラー", async () => {
    const messages = await bannerErrors({ image: "a.png", size: { width: 1, height: 1 }, backgroundColor: "#000000" });
    assert.deepEqual(messages, ["x：banner must not have both an image and colors"]);
  });
  test("色だけなら正しい（小文字の16進数も可）", async () => {
    assert.deepEqual(await bannerErrors({ color: "#00ff00", backgroundColor: "#ABCDEF" }), []);
  });
  for (const color of ["#FFF", "00FF00", "#GGGGGG", "red"]) {
    test(`#RRGGBB でない色「${color}」はエラー`, async () => {
      assert.deepEqual(await bannerErrors({ color }), ["x：banner.color must be in #RRGGBB format"]);
    });
  }
  test("backgroundColor の形式も検査する", async () => {
    assert.deepEqual(await bannerErrors({ backgroundColor: "#12345" }), [
      "x：banner.backgroundColor must be in #RRGGBB format",
    ]);
  });
});

describe("url・oldUrl・mirrorUrl", () => {
  const urlErrors = (overrides) => checkOne({ site: { name: "x", reading: "あ" }, ...overrides });

  test("https:// で始まる url は正しい", async () => {
    assert.deepEqual(await urlErrors({ url: "https://a.jp/" }), []);
  });
  test("http:// で始まる url は正しい", async () => {
    assert.deepEqual(await urlErrors({ url: "http://a.jp/" }), []);
  });
  for (const url of ["ftp://a.jp/", "a.jp", "", undefined]) {
    test(`消滅していないサイトの url ${JSON.stringify(url)} はエラー`, async () => {
      assert.deepEqual(await urlErrors({ url }), ["x：url must start with http:// or https://"]);
    });
  }
  test("消滅したサイトは url が空でもよい", async () => {
    assert.deepEqual(await urlErrors({ state: "vanished", url: "" }), []);
  });
  test("mirrorUrl（文字列）に今の url があればエラー", async () => {
    const messages = await urlErrors({ url: "https://a.jp/", mirrorUrl: "https://a.jp/" });
    assert.deepEqual(messages, ["x：mirrorUrl must not include the current url"]);
  });
  test("oldUrl（配列）に今の url があればエラー", async () => {
    const messages = await urlErrors({ url: "https://a.jp/", oldUrl: ["https://b.jp/", "https://a.jp/"] });
    assert.deepEqual(messages, ["x：oldUrl must not include the current url"]);
  });
  test("ほかのサイトと url が同じでも誤りではない", async () => {
    const list = [
      makeSite({ site: { name: "1", reading: "あ" }, url: "https://same.jp/" }),
      makeSite({ site: { name: "2", reading: "い" }, url: "https://same.jp/" }),
    ];
    assert.deepEqual(await check(list), []);
  });
});
