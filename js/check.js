// STATE_*・KNOWN_STATES・WAYBACK_LINK_STATES・KIND_MASAO_VALUES・FEATURE_VALUES は js/common.js で定義

const KNOWN_KEYS = [
  "id",
  "site",
  "oldname",
  "webmaster",
  "banner",
  "url",
  "oldurl",
  "suburl",
  "year",
  "kind_masao",
  "feature",
  "work",
  "wayback_time",
  "state",
  "explanation",
];

// よみはひらがなだけで書く
const NOT_HIRAGANA = /[^あ-ん]/;
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
  const errorMessage = document.getElementById("error_message");
  errorMessage.appendChild(document.createTextNode(text));
  errorMessage.appendChild(document.createElement("br"));
}

function appendError(entry, message) {
  appendMessage(entry.site.name + "：" + message);
}

// 1つの値か配列で持つ項目を、配列にそろえる（項目が無ければ空の配列）
function toArray(value) {
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
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
function checkYear(entry) {
  const year = entry.year;
  if (year === undefined) {
    return;
  }
  if (!Number.isInteger(year.from) || !Number.isInteger(year.to)) {
    appendError(entry, "year.from and year.to must both be integers");
    return;
  }
  if (year.from == -1 || year.to == -1 || year.to == 0) {
    return;
  }
  if (Math.abs(year.from) > Math.abs(year.to)) {
    appendError(entry, "year.from must not be later than year.to");
  }
}

function checkBanner(entry) {
  const banner = entry.banner;
  if (banner === undefined) {
    return;
  }
  if (banner.image !== undefined) {
    if (
      !isPositiveInteger(banner.size?.x) ||
      !isPositiveInteger(banner.size?.y)
    ) {
      appendError(
        entry,
        "banner.size.x and banner.size.y must be positive integers",
      );
    }
    if (banner.color !== undefined || banner.background_color !== undefined) {
      appendError(entry, "banner must not have both an image and colors");
    }
  }
  for (const key of ["color", "background_color"]) {
    if (banner[key] !== undefined && !COLOR_CODE.test(banner[key])) {
      appendError(entry, `banner.${key} must be in #RRGGBB format`);
    }
  }
}

function checkData(list) {
  for (let i = 0; i < list.length; i++) {
    const entry = list[i];

    if (i != 0 && entry.site.yomi < list[i - 1].site.yomi) {
      appendError(entry, "yomi is out of order");
    }

    if (NOT_HIRAGANA.test(entry.site.yomi)) {
      appendError(entry, "yomi must contain only hiragana");
    }

    for (const key of Object.keys(entry)) {
      if (!KNOWN_KEYS.includes(key)) {
        appendError(entry, `unknown key "${key}"`);
      }
    }

    if (!KNOWN_STATES.includes(entry.state)) {
      appendError(entry, `state has an unknown value "${entry.state}"`);
    }

    checkKnownValues(entry, "kind_masao", KIND_MASAO_VALUES);
    checkKnownValues(entry, "feature", FEATURE_VALUES);

    const needsWaybackTime = WAYBACK_LINK_STATES.includes(entry.state);
    if (needsWaybackTime && entry.wayback_time === undefined) {
      appendError(
        entry,
        `wayback_time is required when state is "${entry.state}"`,
      );
    }
    if (!needsWaybackTime && entry.wayback_time !== undefined) {
      appendError(
        entry,
        `wayback_time must not be set when state is "${entry.state}"`,
      );
    }
    if (
      entry.wayback_time !== undefined &&
      !WAYBACK_TIME.test(String(entry.wayback_time))
    ) {
      appendError(
        entry,
        "wayback_time must be a 14-digit number (YYYYMMDDhhmmss)",
      );
    }

    checkYear(entry);
    checkBanner(entry);

    // データが消滅したサイトはリンクしないので、url が無くてもよい
    if (entry.state != STATE_VANISHED && !HTTP_URL.test(entry.url ?? "")) {
      appendError(entry, "url must start with http:// or https://");
    }

    if (toArray(entry.suburl).includes(entry.url)) {
      appendError(entry, "suburl must not include the current url");
    }

    if (toArray(entry.oldurl).includes(entry.url)) {
      appendError(entry, "oldurl must not include the current url");
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
