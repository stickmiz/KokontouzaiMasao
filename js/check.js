const STATE_CANVAS = "canvas";
const STATE_EXIST = "exist";
const STATE_CLOSED = "closed";
const STATE_ARCHIVED = "archived";
const STATE_VANISHED = "vanished";
const STATE_REMAINED = "remained";
const STATE_ARCHIVED_WAYBACK = "archived_wayback";
const STATE_ARCHIVED_GEOLOG = "archived_geolog";

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

function checkData(mode, order, kind_masao, feature) {
  let count = 0;
  let re;
  let beforeyomi;

  for (let i = 0; i < list.length; i++) {
    if (i != 0) {
      if (list[i].site.yomi < list[i - 1].site.yomi) {
        $("#error_message").append(list[i].site.name + "：yomi sort error<br>");
      }
    }

    re = /[^あ-ん]/;
    if (re.test(list[i].site.yomi) == true) {
      $("#error_message").append(list[i].site.name + "：yomi aiueo error<br>");
    }

    if (
      (list[i].state == STATE_CLOSED ||
        list[i].state == STATE_ARCHIVED ||
        list[i].state == STATE_ARCHIVED_WAYBACK ||
        list[i].state == STATE_REMAINED) &&
      list[i].wayback_time === undefined
    ) {
      $("#error_message").append(
        list[i].site.name + "：wayback_time is a must<br>",
      );
    }

    if (
      list[i].state != STATE_CLOSED &&
      list[i].state != STATE_ARCHIVED &&
      list[i].state != STATE_ARCHIVED_WAYBACK &&
      list[i].state != STATE_REMAINED &&
      list[i].wayback_time !== undefined
    ) {
      $("#error_message").append(
        list[i].site.name + "：wayback_time is not a must<br>",
      );
    }

    if (list[i].url == list[i].suburl) {
      $("#error_message").append(list[i].site.name + "：url equal suburl<br>");
    }

    //    if (list[i].archive != 0 && list[i].archive != 1 && list[i].archive != 2 && list[i].archive != 3 && list[i].archive != 4) {
    //      $("#error_message").append(list[i].site.name + "：archive value error " + list[i].archive + "<br>");
    //    }
  }
}

$(function () {
  var error_message = document.getElementById("error_message");
  checkData(0, 0, 0, 0);
});
