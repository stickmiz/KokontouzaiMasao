// js/kokon.js（index.html の一覧表）のテスト

const { describe, test, before } = require("node:test");
const assert = require("node:assert/strict");
const { createPage, waitForLoad, getGlobal } = require("./helpers/load-page.js");
const { makeSite } = require("./helpers/fixtures.js");

// index.html を開く。list.json の読み込み（同期の $.ajax）は data を返すスタブにする
async function openIndex(data) {
  const ajaxCalls = [];
  const page = createPage("index.html", [
    "jquery",
    (window) => {
      window.$.ajax = (options) => {
        ajaxCalls.push(options);
        options.success(data);
      };
    },
    "common",
    "kokon",
  ]);
  await waitForLoad(page.window);
  return { ...page, ajaxCalls };
}

function rows(document) {
  return [...document.querySelectorAll("#kokon-nakami tr")];
}

// 一覧表に出ているサイト名（em の文字）
function shownNames(document) {
  return rows(document).map((tr) => tr.querySelector("em").textContent);
}

function click(document, id) {
  document.getElementById(id).click();
}

// ラベルの文字から、自動で作られた絞り込みボタンを探す
function radioByLabel(document, formId, text) {
  const label = [...document.querySelectorAll(`#${formId} label`)].find(
    (l) => l.textContent == text,
  );
  return document.getElementById(label.htmlFor);
}

describe("formatYear", () => {
  let formatYear;
  before(async () => {
    formatYear = (await openIndex([])).window.formatYear;
  });

  test("undefined は「？」", () => {
    assert.equal(formatYear(undefined), "？");
  });
  test("-1 は不明として「？」", () => {
    assert.equal(formatYear(-1), "？");
  });
  test("-1 以外の負の値は推定として「年？」", () => {
    assert.equal(formatYear(-2005), "2005？");
  });
  test("-2（-1 の隣の値）も推定として扱う", () => {
    assert.equal(formatYear(-2), "2？");
  });
  test("正の値はそのまま文字列にする", () => {
    assert.equal(formatYear(2005), "2005");
  });
});

describe("formatPeriod", () => {
  let formatPeriod;
  before(async () => {
    formatPeriod = (await openIndex([])).window.formatPeriod;
  });

  test("period が無いときは「？」1つ", () => {
    assert.equal(formatPeriod(undefined), "？");
  });
  test("from と to が違うときは「from～to」", () => {
    assert.equal(formatPeriod({ from: 2004, to: 2006 }), "2004～2006");
  });
  test("from と to が同じときは1つだけ表示する", () => {
    assert.equal(formatPeriod({ from: 2004, to: 2004 }), "2004");
  });
  test("to が 0 なら継続中として「from～」", () => {
    assert.equal(formatPeriod({ from: 2010, to: 0 }), "2010～");
  });
  test("from が不明で継続中なら「？～」", () => {
    assert.equal(formatPeriod({ from: -1, to: 0 }), "？～");
  });
  test("from だけ不明なら「？～to」", () => {
    assert.equal(formatPeriod({ from: -1, to: 2005 }), "？～2005");
  });
  test("from も to も不明なら「？」1つ", () => {
    assert.equal(formatPeriod({ from: -1, to: -1 }), "？");
  });
  test("推定の年は「？」付きで表示する", () => {
    assert.equal(formatPeriod({ from: -2004, to: -2005 }), "2004？～2005？");
  });
  test("推定の年が同じなら1つだけ表示する", () => {
    assert.equal(formatPeriod({ from: -2005, to: -2005 }), "2005？");
  });
});

describe("matchesValue（masaoKind・feature の絞り込み）", () => {
  let matchesValue;
  before(async () => {
    matchesValue = (await openIndex([])).window.matchesValue;
  });

  test("「すべて」なら値が無くても一致する", () => {
    assert.equal(matchesValue(undefined, "all"), true);
  });
  test("値が1つの配列で、絞り込みの値と同じなら一致する", () => {
    assert.equal(matchesValue(["自動"], "自動"), true);
  });
  test("値が1つの配列で、値が違えば一致しない", () => {
    assert.equal(matchesValue(["自動"], "一画面"), false);
  });
  test("配列のどれかが同じなら一致する", () => {
    assert.equal(matchesValue(["自動", "JS拡張"], "JS拡張"), true);
  });
  test("配列のどれとも違えば一致しない", () => {
    assert.equal(matchesValue(["自動", "JS拡張"], "一画面"), false);
  });
  test("値が無いサイトは、「すべて」以外では一致しない", () => {
    assert.equal(matchesValue(undefined, "自動"), false);
  });
});

describe("matchesOrder（先頭文字の行の絞り込み）", () => {
  let matchesOrder;
  const entry = (reading) => ({ site: { name: "x", reading } });
  before(async () => {
    matchesOrder = (await openIndex([])).window.matchesOrder;
  });

  test("「すべての行」ならどのよみでも一致する", () => {
    assert.equal(matchesOrder(entry("ん"), "all"), true);
  });
  test("あ行の始まり「あ」は、あ行に入る", () => {
    assert.equal(matchesOrder(entry("あいう"), "a"), true);
  });
  test("あ行の終わり「お」は、あ行に入る", () => {
    assert.equal(matchesOrder(entry("おか"), "a"), true);
  });
  test("か行の始まり「か」は、あ行に入らない", () => {
    assert.equal(matchesOrder(entry("かき"), "a"), false);
  });
  test("か行の始まり「か」は、か行に入る", () => {
    assert.equal(matchesOrder(entry("かき"), "k"), true);
  });
  test("わ行には「を」も入る", () => {
    assert.equal(matchesOrder(entry("をか"), "w"), true);
  });
  test("わ行には「ん」も入る", () => {
    assert.equal(matchesOrder(entry("ん"), "w"), true);
  });
  test("行の範囲に無い値（未知のキー）は絞り込まない", () => {
    assert.equal(matchesOrder(entry("ん"), "unknown"), true);
  });
});

describe("matchesMode（サイトの状態の絞り込み）", () => {
  let matchesMode;
  const entry = (state) => ({ state });
  before(async () => {
    matchesMode = (await openIndex([])).window.matchesMode;
  });

  test("「すべて」はどの状態でも一致する", () => {
    for (const state of ["exist", "canvas", "closed", "archived", "vanished", "remained"]) {
      assert.equal(matchesMode(entry(state), "all"), true, state);
    }
  });
  test("「現存サイトのみ」は exist・canvas だけ", () => {
    assert.equal(matchesMode(entry("exist"), "now"), true);
    assert.equal(matchesMode(entry("canvas"), "now"), true);
    assert.equal(matchesMode(entry("closed"), "now"), false);
    assert.equal(matchesMode(entry("remained"), "now"), false);
  });
  test("「Canvas対応サイトのみ」は canvas だけ", () => {
    assert.equal(matchesMode(entry("canvas"), "canvas"), true);
    assert.equal(matchesMode(entry("exist"), "canvas"), false);
  });
  test("「アーカイブに正男保存のサイトのみ」は archived・remained だけ", () => {
    assert.equal(matchesMode(entry("archived"), "archive"), true);
    assert.equal(matchesMode(entry("remained"), "archive"), true);
    assert.equal(matchesMode(entry("closed"), "archive"), false);
    assert.equal(matchesMode(entry("vanished"), "archive"), false);
  });
});

describe("getLinkUrl（バナーのリンク先）", () => {
  let getLinkUrl;
  before(async () => {
    getLinkUrl = (await openIndex([])).window.getLinkUrl;
  });

  for (const state of ["closed", "archived", "remained"]) {
    test(`${state} は waybackTime 付きの Wayback Machine の URL`, () => {
      const url = getLinkUrl({ state, url: "http://a.jp/", waybackTime: 20041220185135 });
      assert.equal(url, "https://web.archive.org/web/20041220185135/http://a.jp/");
    });
  }
  test("Wayback Machine にリンクする状態で waybackTime が無ければ、日時なしの URL", () => {
    const url = getLinkUrl({ state: "closed", url: "http://a.jp/" });
    assert.equal(url, "https://web.archive.org/web/http://a.jp/");
  });
  for (const state of ["canvas", "exist"]) {
    test(`${state} は url そのもの`, () => {
      assert.equal(getLinkUrl({ state, url: "https://a.jp/" }), "https://a.jp/");
    });
  }
});

describe("createBannerImage（バナー画像の大きさ）", () => {
  let window;
  before(async () => {
    window = (await openIndex([])).window;
  });

  const make = (width, height) =>
    window.createBannerImage({ image: "a.png", size: { width, height } }, "サイト名");

  test("幅が 200 以下ならそのままの大きさ", () => {
    const img = make(88, 31);
    assert.equal(img.getAttribute("width"), "88");
    assert.equal(img.getAttribute("height"), "31");
  });
  test("幅がちょうど 200 なら縮めない", () => {
    const img = make(200, 40);
    assert.equal(img.getAttribute("width"), "200");
    assert.equal(img.getAttribute("height"), "40");
  });
  test("幅が 200 を超えるなら、縦横比を保って幅 200 に縮める", () => {
    const img = make(400, 80);
    assert.equal(img.getAttribute("width"), "200");
    assert.equal(img.getAttribute("height"), "40");
  });
  test("src は banner/ の下の画像、alt はサイト名", () => {
    const img = make(88, 31);
    assert.equal(img.getAttribute("src"), "banner/a.png");
    assert.equal(img.alt, "サイト名");
  });
  test("遅延読み込みにし、読み込み前は loaded が付かない", () => {
    const img = make(88, 31);
    assert.equal(img.getAttribute("loading"), "lazy");
    assert.deepEqual([...img.classList], ["lazy"]);
  });
  test("読み込みが終わると loaded が付く", () => {
    const img = make(88, 31);
    img.dispatchEvent(new window.Event("load"));
    assert.equal(img.classList.contains("loaded"), true);
  });
  test("読み込みに失敗しても loaded が付く（透明のままにしない）", () => {
    const img = make(88, 31);
    img.dispatchEvent(new window.Event("error"));
    assert.equal(img.classList.contains("loaded"), true);
  });
});

describe("createNoBanner（NO BANNER の色）", () => {
  let createNoBanner;
  before(async () => {
    createNoBanner = (await openIndex([])).window.createNoBanner;
  });

  test("banner が無ければ、文字は黒・背景は灰色", () => {
    const div = createNoBanner(undefined);
    assert.equal(div.style.color, "rgb(0, 0, 0)");
    assert.equal(div.style.backgroundColor, "rgb(128, 128, 128)");
  });
  test("banner の色があればその色", () => {
    const div = createNoBanner({ color: "#3030FC", backgroundColor: "#E8E8FF" });
    assert.equal(div.style.color, "rgb(48, 48, 252)");
    assert.equal(div.style.backgroundColor, "rgb(232, 232, 255)");
  });
  test("色が片方だけなら、もう片方は既定の色", () => {
    const div = createNoBanner({ color: "#FF0000" });
    assert.equal(div.style.color, "rgb(255, 0, 0)");
    assert.equal(div.style.backgroundColor, "rgb(128, 128, 128)");
  });
});

describe("createBannerCell（バナーの列）", () => {
  let window;
  before(async () => {
    window = (await openIndex([])).window;
  });
  const image = { image: "a.png", size: { width: 88, height: 31 } };

  const expectedClass = {
    exist: "exist",
    canvas: "canvas",
    closed: "closed",
    vanished: "vanished",
    archived: "archived",
    remained: "archived",
  };
  for (const [state, className] of Object.entries(expectedClass)) {
    test(`${state} の背景色の class は ${className}`, () => {
      const td = window.createBannerCell(makeSite({ state, waybackTime: 20040101000000 }));
      assert.equal(td.className, className);
    });
  }

  test("消滅したサイトはリンクせず、NO BANNER に noimage を付ける", () => {
    const td = window.createBannerCell(makeSite({ state: "vanished" }));
    assert.equal(td.querySelector("a"), null);
    assert.equal(td.firstElementChild.tagName, "DIV");
    assert.equal(td.firstElementChild.className, "noimage");
  });
  test("消滅したサイトでも、バナー画像はリンクせずに置く", () => {
    const td = window.createBannerCell(makeSite({ state: "vanished", banner: image }));
    assert.equal(td.querySelector("a"), null);
    assert.equal(td.firstElementChild.tagName, "IMG");
  });
  test("消滅していないサイトは、新しいタブで開くリンクにする", () => {
    const td = window.createBannerCell(makeSite({ url: "https://a.jp/" }));
    const a = td.querySelector("a");
    assert.equal(a.href, "https://a.jp/");
    assert.equal(a.target, "_blank");
  });
  test("バナー画像のリンクには image を付ける", () => {
    const td = window.createBannerCell(makeSite({ banner: image }));
    assert.equal(td.querySelector("a").className, "image");
  });
  test("バナー画像が無いリンクには noimage を付ける", () => {
    const td = window.createBannerCell(makeSite({ banner: { color: "#000000" } }));
    assert.equal(td.querySelector("a").className, "noimage");
  });
});

describe("createSiteNameCell（サイト名の列）", () => {
  let createSiteNameCell;
  before(async () => {
    createSiteNameCell = (await openIndex([])).window.createSiteNameCell;
  });

  test("サイト名を em で表示する", () => {
    const td = createSiteNameCell("今の名前", undefined);
    assert.equal(td.querySelector("em").textContent, "今の名前");
    assert.equal(td.querySelectorAll("span.old").length, 0);
  });
  test("旧サイト名が1つなら、薄い表示で1つ並べる", () => {
    const td = createSiteNameCell("今の名前", ["前の名前"]);
    const olds = [...td.querySelectorAll("span.old")].map((s) => s.textContent);
    assert.deepEqual(olds, ["前の名前"]);
  });
  test("旧サイト名が2つ以上なら、書いた順に並べる", () => {
    const td = createSiteNameCell("今の名前", ["1つ前", "2つ前"]);
    const olds = [...td.querySelectorAll("span.old")].map((s) => s.textContent);
    assert.deepEqual(olds, ["1つ前", "2つ前"]);
  });
  test("サイト名に記号があっても、html ではなく文字として表示する", () => {
    const td = createSiteNameCell("<b>A&B</b>", undefined);
    assert.equal(td.querySelector("em").textContent, "<b>A&B</b>");
    assert.equal(td.querySelector("b"), null);
  });
});

describe("createRow（一覧表の1行）", () => {
  let createRow;
  before(async () => {
    createRow = (await openIndex([])).window.createRow;
  });

  test("バナー・サイト名・管理人・期間の4列", () => {
    const tr = createRow(makeSite({ webmaster: "棒", period: { from: 2011, to: 0 } }));
    const cells = [...tr.children].map((td) => td.textContent);
    assert.equal(cells.length, 4);
    assert.equal(cells[2], "棒");
    assert.equal(cells[3], "2011～");
  });
  test("管理人が無ければ「？」", () => {
    const tr = createRow(makeSite());
    assert.equal(tr.children[2].textContent, "？");
  });
});

describe("index.html を開いたとき", () => {
  test("list.json を同期で、キャッシュを使わずに読み込む", async () => {
    const { ajaxCalls } = await openIndex([]);
    assert.equal(ajaxCalls.length, 1);
    assert.equal(ajaxCalls[0].url, "list.json");
    assert.equal(ajaxCalls[0].async, false);
    assert.equal(ajaxCalls[0].cache, false);
  });
  test("すべてのサイトを list.json の順に表示する", async () => {
    const data = [
      makeSite({ site: { name: "A", reading: "あ" }, state: "canvas" }),
      makeSite({ site: { name: "B", reading: "か" }, state: "vanished" }),
      makeSite({ site: { name: "C", reading: "さ" }, state: "closed", waybackTime: 20040101000000 }),
    ];
    const { document } = await openIndex(data);
    assert.deepEqual(shownNames(document), ["A", "B", "C"]);
  });
  test("state が home のサイト（過疎村）は表示しない", async () => {
    const data = [
      makeSite({ site: { name: "A", reading: "あ" } }),
      makeSite({ site: { name: "過疎村", reading: "かそむら" }, state: "home" }),
    ];
    const { document } = await openIndex(data);
    assert.deepEqual(shownNames(document), ["A"]);
  });
  test("総数と表示数には home を数えない", async () => {
    const data = [makeSite(), makeSite(), makeSite({ state: "home" })];
    const { document } = await openIndex(data);
    assert.match(document.getElementById("all-site-num").textContent, /総数は2です/);
    assert.match(document.getElementById("display-site-num").textContent, /サイトの数は2です/);
  });
  test("list.json が空なら、表は空で総数は0", async () => {
    const { document } = await openIndex([]);
    assert.equal(rows(document).length, 0);
    assert.match(document.getElementById("all-site-num").textContent, /総数は0です/);
  });
  test("「正男の種別」のボタンを common.js の値から順に作る", async () => {
    const { window, document } = await openIndex([]);
    // ページ内の配列は realm が違うので、Node の配列にしてから比べる
    const values = [...getGlobal(window, "MASAO_KIND_VALUES")];
    const inputs = [...document.querySelectorAll("#form-masao-kind input")].slice(1);
    assert.deepEqual(inputs.map((i) => i.value), values);
    assert.deepEqual(inputs.map((i) => i.id), values.map((_, i) => "masao-kind-" + (i + 1)));
    assert.ok(inputs.every((i) => i.name == "radio-masao-kind"));
  });
  test("「サイトの特徴」のボタンを common.js の値から順に作る", async () => {
    const { window, document } = await openIndex([]);
    const values = getGlobal(window, "FEATURE_VALUES");
    const inputs = [...document.querySelectorAll("#form-feature input")].slice(1);
    assert.deepEqual(inputs.map((i) => i.value), [...values]);
  });
  test("自動で作ったボタンは、ラベルを押すと選べる（label の for と id が合っている）", async () => {
    const { document } = await openIndex([]);
    for (const label of document.querySelectorAll("#form-masao-kind label, #form-feature label")) {
      assert.ok(document.getElementById(label.htmlFor), label.textContent);
    }
  });
  test("読み込み時にエラーが出ない", async () => {
    const { errors } = await openIndex([makeSite()]);
    assert.deepEqual(errors, []);
  });
});

describe("絞り込みのボタンを押したとき", () => {
  const data = () => [
    makeSite({ site: { name: "現存", reading: "あ" }, state: "exist", masaoKind: ["自動"] }),
    makeSite({ site: { name: "Canvas", reading: "か" }, state: "canvas", masaoKind: ["自動", "JS拡張"], feature: ["エディタ"] }),
    makeSite({ site: { name: "閉鎖", reading: "さ" }, state: "closed", waybackTime: 20040101000000 }),
    makeSite({ site: { name: "保存", reading: "か" }, state: "archived", waybackTime: 20040101000000, masaoKind: ["一画面"] }),
  ];

  test("「現存サイトのみ」で exist・canvas だけになる", async () => {
    const { document } = await openIndex(data());
    click(document, "now-site");
    assert.deepEqual(shownNames(document), ["現存", "Canvas"]);
  });
  test("押すたびに表を作り直し、行が重ならない", async () => {
    const { document } = await openIndex(data());
    click(document, "now-site");
    click(document, "all-site");
    assert.deepEqual(shownNames(document), ["現存", "Canvas", "閉鎖", "保存"]);
  });
  test("表示数の文を1つだけにし、件数を更新する", async () => {
    const { document } = await openIndex(data());
    click(document, "now-site");
    const box = document.getElementById("display-site-num");
    assert.equal(box.querySelectorAll("p").length, 1);
    assert.match(box.textContent, /サイトの数は2です/);
  });
  test("総数は絞り込んでも変わらない", async () => {
    const { document } = await openIndex(data());
    click(document, "now-site");
    assert.match(document.getElementById("all-site-num").textContent, /総数は4です/);
  });
  test("先頭文字の行で絞り込める", async () => {
    const { document } = await openIndex(data());
    click(document, "k");
    assert.deepEqual(shownNames(document), ["Canvas", "保存"]);
  });
  test("自動で作った「正男の種別」のボタンで絞り込める（配列の値も対象）", async () => {
    const { document } = await openIndex(data());
    radioByLabel(document, "form-masao-kind", "自動").click();
    assert.deepEqual(shownNames(document), ["現存", "Canvas"]);
  });
  test("自動で作った「サイトの特徴」のボタンで絞り込める", async () => {
    const { document } = await openIndex(data());
    radioByLabel(document, "form-feature", "エディタ").click();
    assert.deepEqual(shownNames(document), ["Canvas"]);
  });
  test("複数の絞り込みは、すべてに当てはまるものだけ（AND）", async () => {
    const { document } = await openIndex(data());
    click(document, "k");
    radioByLabel(document, "form-masao-kind", "一画面").click();
    assert.deepEqual(shownNames(document), ["保存"]);
  });
  test("当てはまるサイトが無ければ、表は空で表示数は0", async () => {
    const { document } = await openIndex(data());
    click(document, "w");
    assert.equal(rows(document).length, 0);
    assert.match(document.getElementById("display-site-num").textContent, /サイトの数は0です/);
  });
});
