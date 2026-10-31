// STATE_*・KNOWN_STATES・WAYBACK_LINK_STATES・MASAO_KIND_VALUES・FEATURE_VALUES は js/common.js で定義

const KNOWN_KEYS = [
  "id",
  "site",
  "oldName",
  "webmaster",
  "banner",
  "url",
  "oldUrl",
  "mirrorUrl",
  "period",
  "masaoKind",
  "feature",
  "works",
  "waybackTime",
  "state",
  "note",
];
// 配列で書く項目
const ARRAY_KEYS = [
  "oldName",
  "oldUrl",
  "mirrorUrl",
  "masaoKind",
  "feature",
  "works",
];

// よみはひらがなだけで書き、濁点・半濁点・小さい文字は使わない
const READING_FORMAT =
  /^[あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわゐゑをん]+$/;
// id は英小文字・数字・- だけで書く
const ID_FORMAT = /^[a-z0-9-]+$/;
const HTTP_URL = /^https?:\/\//;
// YYYYMMDDhhmmss
const WAYBACK_TIME = /^\d{14}$/;
// #RRGGBB
const COLOR_CODE = /^#[0-9A-Fa-f]{6}$/;

async function loadList() {
  // 更新した list.json をすぐ検査できるよう、キャッシュを使わない
  const response = await fetch("list.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(
      "list.json の読み込みに失敗しました（" + response.status + "）",
    );
  }
  return response.json();
}

function appendMessage(text) {
  const errorMessage = document.getElementById("error-message");
  errorMessage.appendChild(document.createTextNode(text));
  errorMessage.appendChild(document.createElement("br"));
}

// サイト名が無い要素は、id で示す
function appendError(entry, message) {
  const label =
    entry.site?.name ??
    (entry.id !== undefined ? `id "${entry.id}"` : "（サイト名なし）");
  appendMessage(label + "：" + message);
}

// 配列で持つ項目を返す。配列でなければ空の配列（配列でないことは checkArrayKeys で報告する）
function toArray(value) {
  return Array.isArray(value) ? value : [];
}

// 値が1つでも配列で書き、空の配列は使わない（該当なしならキーを書かない）
function checkArrayKeys(entry) {
  for (const key of ARRAY_KEYS) {
    const value = entry[key];
    if (value !== undefined && (!Array.isArray(value) || value.length == 0)) {
      appendError(entry, `${key} must be a non-empty array`);
    }
  }
}

function checkKnownValues(entry, key, knownValues) {
  for (const value of toArray(entry[key])) {
    if (!knownValues.includes(value)) {
      appendError(entry, `${key} has an unknown value "${value}"`);
    }
  }
}

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

// -1 は不明、ほかの負の値は推定（-2005 は 2005 年ごろ）、to の 0 は継続中
function checkPeriod(entry) {
  const period = entry.period;
  if (period === undefined) {
    return;
  }
  if (!Number.isInteger(period.from) || !Number.isInteger(period.to)) {
    appendError(entry, "period.from and period.to must both be integers");
    return;
  }
  if (period.from == -1 || period.to == -1 || period.to == 0) {
    return;
  }
  if (Math.abs(period.from) > Math.abs(period.to)) {
    appendError(entry, "period.from must not be later than period.to");
  }
}

function checkBanner(entry) {
  const banner = entry.banner;
  if (banner === undefined) {
    return;
  }
  if (banner.image !== undefined) {
    if (
      !isPositiveInteger(banner.size?.width) ||
      !isPositiveInteger(banner.size?.height)
    ) {
      appendError(
        entry,
        "banner.size.width and banner.size.height must be positive integers",
      );
    }
    if (banner.color !== undefined || banner.backgroundColor !== undefined) {
      appendError(entry, "banner must not have both an image and colors");
    }
  }
  for (const key of ["color", "backgroundColor"]) {
    if (banner[key] !== undefined && !COLOR_CODE.test(banner[key])) {
      appendError(entry, `banner.${key} must be in #RRGGBB format`);
    }
  }
}

function checkId(entry, seenIds) {
  if (entry.id === undefined) {
    appendError(entry, "id is required");
    return;
  }
  if (typeof entry.id != "string" || !ID_FORMAT.test(entry.id)) {
    appendError(entry, `id "${entry.id}" must contain only a-z, 0-9 and -`);
  }
  if (seenIds.has(entry.id)) {
    appendError(entry, `id "${entry.id}" is duplicated`);
  }
  seenIds.add(entry.id);
}

// site・site.name・site.reading が無くても、ほかの検査は続ける
function checkSite(entry, previous) {
  if (entry.site == null) {
    appendError(entry, "site is required");
    return;
  }
  if (entry.site.name === undefined) {
    appendError(entry, "site.name is required");
  }
  const reading = entry.site.reading;
  if (reading === undefined) {
    appendError(entry, "site.reading is required");
    return;
  }
  // 1つ前の要素によみが無ければ、並び順は比べない
  const previousReading = previous?.site?.reading;
  if (previousReading !== undefined && reading < previousReading) {
    appendError(entry, "reading is out of order");
  }
  if (!READING_FORMAT.test(reading)) {
    appendError(
      entry,
      "reading must contain only hiragana without dakuten, handakuten or small letters",
    );
  }
}

function checkData(list) {
  const seenIds = new Set();
  for (let i = 0; i < list.length; i++) {
    const entry = list[i];

    checkId(entry, seenIds);
    checkSite(entry, list[i - 1]);

    for (const key of Object.keys(entry)) {
      if (!KNOWN_KEYS.includes(key)) {
        appendError(entry, `unknown key "${key}"`);
      }
    }

    if (!KNOWN_STATES.includes(entry.state)) {
      appendError(entry, `state has an unknown value "${entry.state}"`);
    }

    checkArrayKeys(entry);
    checkKnownValues(entry, "masaoKind", MASAO_KIND_VALUES);
    checkKnownValues(entry, "feature", FEATURE_VALUES);

    const needsWaybackTime = WAYBACK_LINK_STATES.includes(entry.state);
    if (needsWaybackTime && entry.waybackTime === undefined) {
      appendError(
        entry,
        `waybackTime is required when state is "${entry.state}"`,
      );
    }
    if (!needsWaybackTime && entry.waybackTime !== undefined) {
      appendError(
        entry,
        `waybackTime must not be set when state is "${entry.state}"`,
      );
    }
    if (
      entry.waybackTime !== undefined &&
      !WAYBACK_TIME.test(String(entry.waybackTime))
    ) {
      appendError(
        entry,
        "waybackTime must be a 14-digit number (YYYYMMDDhhmmss)",
      );
    }

    checkPeriod(entry);
    checkBanner(entry);

    // データが消滅したサイトはリンクしないので、url が無くてもよい
    if (entry.state != STATE_VANISHED && !HTTP_URL.test(entry.url ?? "")) {
      appendError(entry, "url must start with http:// or https://");
    }

    if (toArray(entry.mirrorUrl).includes(entry.url)) {
      appendError(entry, "mirrorUrl must not include the current url");
    }

    if (toArray(entry.oldUrl).includes(entry.url)) {
      appendError(entry, "oldUrl must not include the current url");
    }
  }
}

document.addEventListener("DOMContentLoaded", async function () {
  try {
    checkData(await loadList());
  } catch (error) {
    appendMessage(error.message);
  }
});
