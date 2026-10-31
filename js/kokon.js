// STATE_*・WAYBACK_LINK_STATES・KIND_MASAO_VALUES・FEATURE_VALUES は js/common.js で定義

const CLASS_NAME_CANVAS = "canvas";
const CLASS_NAME_EXIST = "exist";
const CLASS_NAME_CLOSED = "closed";
const CLASS_NAME_ARCHIVED = "archived";
const CLASS_NAME_VANISHED = "vanished";

// 正男のデータがアーカイブされている状態
const ARCHIVE_STATES = [STATE_ARCHIVED, STATE_REMAINED];

// バナーの背景色を決める class 名
const STATE_CLASS_NAMES = {
  [STATE_EXIST]: CLASS_NAME_EXIST,
  [STATE_CLOSED]: CLASS_NAME_CLOSED,
  [STATE_VANISHED]: CLASS_NAME_VANISHED,
  [STATE_CANVAS]: CLASS_NAME_CANVAS,
  [STATE_ARCHIVED]: CLASS_NAME_ARCHIVED,
  [STATE_REMAINED]: CLASS_NAME_ARCHIVED,
};

// 「サイトの状態」の絞り込みで表示する状態（ここに無い値は絞り込まない）
const MODE_STATES = {
  now: [STATE_EXIST, STATE_CANVAS],
  canvas: [STATE_CANVAS],
  archive: ARCHIVE_STATES,
};

// 「先頭文字の行」の絞り込みで、よみの先頭文字の範囲（ここに無い値は絞り込まない）
const ORDER_RANGES = {
  a: ["あ", "お"],
  k: ["か", "こ"],
  s: ["さ", "そ"],
  t: ["た", "と"],
  n: ["な", "の"],
  h: ["は", "ほ"],
  m: ["ま", "も"],
  y: ["や", "よ"],
  r: ["ら", "ろ"],
  w: ["わ", "ん"],
};

const FILTER_ALL = "all";

const NO_BANNER_COLOR = "#000000";
const NO_BANNER_BACKGROUND_COLOR = "#808080";
const BANNER_MAX_WIDTH = 200;

let list = [];

$.ajax({
  type: "GET",
  url: "list.json",
  dataType: "json",
  async: false,
  cache: false,
  success: function (json) {
    // 過疎村（当サイト）は一覧表に出さず、総数にも数えない
    list = json.filter((entry) => entry.state != STATE_HOME);
  },
});

function matchesMode(entry, mode) {
  const states = MODE_STATES[mode];
  return states === undefined || states.includes(entry.state);
}

function matchesOrder(entry, order) {
  const range = ORDER_RANGES[order];
  if (range === undefined) {
    return true;
  }
  const initial = entry.site.yomi.charAt(0);
  return initial >= range[0] && initial <= range[1];
}

// kind_masao・feature のように、1つの値か配列で持つ項目の絞り込み
function matchesValue(value, filter) {
  if (filter == FILTER_ALL) {
    return true;
  }
  const values = Array.isArray(value) ? value : [value];
  return values.some((v) => v == filter);
}

function createTable(mode, order, kindMasao, feature) {
  const tbody = document.getElementById("kokon_nakami");
  let count = 0;

  for (const entry of list) {
    if (
      matchesMode(entry, mode) &&
      matchesOrder(entry, order) &&
      matchesValue(entry.kind_masao, kindMasao) &&
      matchesValue(entry.feature, feature)
    ) {
      count += 1;
      tbody.appendChild(createRow(entry));
    }
  }

  $("#display_site_num").append(
    "<p>現在、表示している正男サイトの数は<strong>" +
      count +
      "</strong>です。</p>",
  );
}

function createRow(entry) {
  const tr = document.createElement("tr");
  tr.appendChild(createBannerCell(entry));
  tr.appendChild(createSiteNameCell(entry.site.name, entry.oldname));
  tr.appendChild(createTextCell(entry.webmaster ?? "？"));
  tr.appendChild(createTextCell(formatPeriod(entry.year)));
  return tr;
}

function createTextCell(text) {
  const td = document.createElement("td");
  td.appendChild(document.createTextNode(text));
  return td;
}

function createBannerCell(entry) {
  const td = document.createElement("td");
  const className = STATE_CLASS_NAMES[entry.state];
  if (className !== undefined) {
    td.className = className;
  }

  const bannerElement = createBannerElement(entry.banner, entry.site.name);
  if (entry.state == STATE_VANISHED) {
    // データが消滅したサイトはリンクせず、バナーだけを置く
    if (bannerElement.tagName == "DIV") {
      bannerElement.className = "noimage";
    }
    td.appendChild(bannerElement);
  } else {
    td.appendChild(createBannerLink(entry, bannerElement));
  }
  return td;
}

function createBannerLink(entry, bannerElement) {
  const a = document.createElement("a");
  const clickName = "古今東西正男/" + entry.site.name;
  a.onclick = function () {
    ga("send", "event", "banner", "click", clickName);
  };
  a.href = getLinkUrl(entry);
  a.target = "_blank";
  a.className = hasBannerImage(entry.banner) ? "image" : "noimage";
  a.appendChild(bannerElement);
  return a;
}

function getLinkUrl(entry) {
  if (WAYBACK_LINK_STATES.includes(entry.state)) {
    if (entry.wayback_time === undefined) {
      return "https://web.archive.org/web/" + entry.url;
    }
    return (
      "https://web.archive.org/web/" + entry.wayback_time + "/" + entry.url
    );
  }
  return entry.url;
}

function hasBannerImage(banner) {
  return banner !== undefined && banner.image !== undefined;
}

function createBannerElement(banner, name) {
  if (hasBannerImage(banner)) {
    return createBannerImage(banner, name);
  }
  return createNoBanner(banner);
}

// バナー画像が無いサイトの「NO BANNER」（文字は CSS で出す）
function createNoBanner(banner) {
  const div = document.createElement("div");
  div.style.color = banner?.color ?? NO_BANNER_COLOR;
  div.style.backgroundColor =
    banner?.background_color ?? NO_BANNER_BACKGROUND_COLOR;
  return div;
}

function createBannerImage(banner, name) {
  const img = document.createElement("img");
  // 幅の大きいバナーは、縦横比を保って縮める
  if (banner.size.x > BANNER_MAX_WIDTH) {
    const ratio = banner.size.x / BANNER_MAX_WIDTH;
    img.setAttribute("width", BANNER_MAX_WIDTH);
    img.setAttribute("height", banner.size.y / ratio);
  } else {
    img.setAttribute("width", banner.size.x);
    img.setAttribute("height", banner.size.y);
  }
  img.className = "lazy";
  img.onload = img.onerror = function () {
    img.classList.add("loaded");
  };
  // src より先に loading を設定しないと、即座に読み込まれるブラウザがある
  img.setAttribute("loading", "lazy");
  img.setAttribute("src", "banner/" + banner.image);
  img.alt = name;
  return img;
}

// 旧サイト名は、新しいものから順に下へ薄く並べる
function createSiteNameCell(name, oldNames) {
  const td = document.createElement("td");
  const em = document.createElement("em");
  em.appendChild(document.createTextNode(name));
  td.appendChild(em);

  if (oldNames !== undefined) {
    for (const oldName of Array.isArray(oldNames) ? oldNames : [oldNames]) {
      td.appendChild(document.createElement("br"));
      const span = document.createElement("span");
      span.className = "old";
      span.appendChild(document.createTextNode(oldName));
      td.appendChild(span);
    }
  }
  return td;
}

// year.to が 0 なら継続中（「2010～」）
function formatPeriod(year) {
  const from = formatYear(year?.from);
  if (year?.to === 0) {
    return from + "～";
  }
  const to = formatYear(year?.to);
  if (from == to) {
    return from;
  }
  return from + "～" + to;
}

// -1 は不明（「？」）、ほかの負の値は推定（-2005 なら「2005？」）
function formatYear(value) {
  if (value === undefined || value == -1) {
    return "？";
  }
  if (value < 0) {
    return -value + "？";
  }
  return String(value);
}

function resetTable() {
  document.getElementById("kokon_nakami").replaceChildren();
  document.getElementById("display_site_num").replaceChildren();
}

// 絞り込みのラジオボタンを、値の一覧から作って form の末尾に足す。
// form の id は「form_{key}」、ボタンの name は「radio_{key}」（「すべて」は index.html に書いてある）
function appendFilterRadios(key, values) {
  const form = document.getElementById("form_" + key);
  values.forEach(function (value, i) {
    const id = key + "_" + (i + 1);
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "radio_" + key;
    input.value = value;
    input.id = id;
    input.addEventListener("click", clickRadio);
    const label = document.createElement("label");
    label.htmlFor = id;
    label.textContent = value;
    // index.html に書いたボタンと同じく、ボタンの間に空白を入れる
    form.append(" ", input, label);
  });
}

// 絞り込みのラジオボタンをクリックしたときに呼ぶ
function clickRadio() {
  resetTable();
  createTable(
    document.getElementById("form_mode").radio_mode.value,
    document.getElementById("form_order").radio_order.value,
    document.getElementById("form_kind_masao").radio_kind_masao.value,
    document.getElementById("form_feature").radio_feature.value,
  );
}

$(function () {
  appendFilterRadios("kind_masao", KIND_MASAO_VALUES);
  appendFilterRadios("feature", FEATURE_VALUES);
  $("#all_site_num").append(
    "<p>現在の正男サイトの総数は<strong>" + list.length + "</strong>です。</p>",
  );
  createTable(FILTER_ALL, FILTER_ALL, FILTER_ALL, FILTER_ALL);
});
