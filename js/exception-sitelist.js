// STATE_* は js/common.js で定義

// 例外サイトリストに今の url を入れる状態（正男が今も見られるサイト）
const EXCEPTION_LIST_STATES = [
  STATE_EXIST,
  STATE_CANVAS,
  STATE_REMAINED,
  STATE_HOME,
];

const listUrl = "list.json";
const anotherListUrl = "anotherlist.json";

// 非同期データ取得（async/await対応）
const fetchJson = async (url) => {
  try {
    return await $.ajax({
      type: "GET",
      url: url,
      dataType: "json",
      cache: false,
    });
  } catch (xhr) {
    // $.ajax の失敗では jqXHR が返り、どのファイルか分からないので、ファイル名を入れた Error にする。
    // status が 200 なのに失敗したのは、JSON として読めなかったとき
    const reason = xhr.status == 200 ? "JSON として読めません" : xhr.status;
    throw new Error(`${url} の読み込みに失敗しました（${reason}）`);
  }
};

// URLを抽出する処理
const extractUrls = (items) => {
  const urls = [];

  items.forEach((item) => {
    if (EXCEPTION_LIST_STATES.includes(item.state)) {
      urls.push(item.url);
    }

    if (item.subUrl !== undefined) {
      urls.push(...(Array.isArray(item.subUrl) ? item.subUrl : [item.subUrl]));
    }
  });

  return urls;
};

// テキストエリアを作成してDOMに追加（URL は html ではなく文字として入れる）
const appendTextArea = (text) => {
  const textarea = document.createElement("textarea");
  textarea.rows = 30;
  textarea.cols = 80;
  textarea.readOnly = true;
  textarea.textContent = text;
  document.getElementById("tarea").append(textarea);
};

// 読み込みなどに失敗したときは、URL 一覧の代わりにエラーの文を出す
const appendErrorMessages = (messages) => {
  const tarea = document.getElementById("tarea");
  for (const message of [
    ...messages,
    "時間をおいて再読み込みしてください。",
  ]) {
    const p = document.createElement("p");
    p.textContent = message;
    tarea.append(p);
  }
};

// メイン処理（async）
const main = async () => {
  // 片方だけ読めても、欠けた一覧を貼られないよう一覧は出さない
  const results = await Promise.allSettled([
    fetchJson(listUrl),
    fetchJson(anotherListUrl),
  ]);
  const errors = results
    .filter((result) => result.status == "rejected")
    .map((result) => result.reason.message);
  if (errors.length > 0) {
    appendErrorMessages(errors);
    return;
  }
  const [list, anotherList] = results.map((result) => result.value);

  const urls = [...extractUrls(list), ...anotherList.map((item) => item.url)];

  // ファイル名を除いてから重複を除く（同じディレクトリの URL を1つにまとめる）
  const directories = urls
    .filter((url) => url !== undefined)
    .map((url) => url.substring(0, url.lastIndexOf("/") + 1));
  const formattedText = [...new Set(directories)].sort().join("\n");

  appendTextArea(formattedText);
};

// 実行
$(document).ready(() => {
  // データの形が違うなど、読み込み後の処理で失敗したときもエラーの文を出す
  main().catch((error) => appendErrorMessages([error.message]));
});
