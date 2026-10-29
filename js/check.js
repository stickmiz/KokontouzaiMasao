const STATE_CLOSED = "closed";
const STATE_ARCHIVED = "archived";
const STATE_REMAINED = "remained";
const STATE_ARCHIVED_WAYBACK = "archived_wayback";

// Wayback Machine 内のページにリンクするため、wayback_time が必要な状態
const WAYBACK_LINK_STATES = [
  STATE_CLOSED,
  STATE_ARCHIVED,
  STATE_ARCHIVED_WAYBACK,
  STATE_REMAINED,
];

// よみはひらがなだけで書く
const NOT_HIRAGANA = /[^あ-ん]/;

let list = [];

$.ajax({
  type: "GET",
  url: "list.json",
  dataType: "json",
  async: false,
  cache: false,
  success: function (json) {
    list = json;
  },
});

function appendError(entry, message) {
  $("#error_message").append(entry.site.name + "：" + message + "<br>");
}

function checkData() {
  for (let i = 0; i < list.length; i++) {
    const entry = list[i];

    if (i != 0 && entry.site.yomi < list[i - 1].site.yomi) {
      appendError(entry, "yomi sort error");
    }

    if (NOT_HIRAGANA.test(entry.site.yomi)) {
      appendError(entry, "yomi aiueo error");
    }

    const needsWaybackTime = WAYBACK_LINK_STATES.includes(entry.state);
    if (needsWaybackTime && entry.wayback_time === undefined) {
      appendError(entry, "wayback_time is a must");
    }
    if (!needsWaybackTime && entry.wayback_time !== undefined) {
      appendError(entry, "wayback_time is not a must");
    }

    if (entry.url == entry.suburl) {
      appendError(entry, "url equal suburl");
    }
  }
}

$(function () {
  checkData();
});
