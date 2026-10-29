const STATE_CANVAS = "canvas";
const STATE_EXIST = "exist";
const STATE_REMAINED = "remained";

const listUrl = "list.json";
const anotherListUrl = "anotherlist.json";

// 非同期データ取得（async/await対応）
const fetchJson = async (url) => {
  return $.ajax({
    type: "GET",
    url: url,
    dataType: "json",
    cache: false,
  });
};

// URLを抽出する処理
const extractUrls = (items) => {
  const urls = [];

  items.forEach((item) => {
    if ([STATE_EXIST, STATE_CANVAS, STATE_REMAINED].includes(item.state)) {
      urls.push(item.url);
    }

    if (item.suburl !== undefined) {
      urls.push(...(Array.isArray(item.suburl) ? item.suburl : [item.suburl]));
    }
  });

  return urls;
};

// テキストエリアを作成してDOMに追加
const appendTextArea = (text) => {
  const textAreaHtml = `<textarea rows="30" cols="80" readonly>${text}</textarea>`;
  $("#tarea").append(textAreaHtml);
};

// メイン処理（async）
const main = async () => {
  const [list, anotherList] = await Promise.all([
    fetchJson(listUrl),
    fetchJson(anotherListUrl),
  ]);

  const urls = [...extractUrls(list), ...anotherList.map((item) => item.url)];

  const formattedText = [...new Set(urls)]
    .filter((url) => url !== undefined)
    .sort()
    .map((url) => url.substring(0, url.lastIndexOf("/") + 1))
    .join("\n");

  appendTextArea(formattedText);
};

// 実行
$(document).ready(() => {
  main();
});
