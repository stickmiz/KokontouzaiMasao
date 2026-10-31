# テスト

`js/` の各ファイルのテストです。Node.js 組み込みの `node:test` と、DOM のために jsdom を使います。
実際の html（`index.html`・`check.html`・`exception-sitelist.html`）と本番の js をそのまま読み込み、通信（`$.ajax`・`fetch`）だけをスタブにしています。

`test/` と `package.json` はサイトには公開しません（アップロードしない）。

## 準備

Google ドライブ上のフォルダでは `npm install` が失敗する（EBADF）ので、jsdom はローカルディスクに入れます。

```
mkdir "%LOCALAPPDATA%\kokontouzai-test"
cd /d "%LOCALAPPDATA%\kokontouzai-test"
npm init -y
npm install --save-dev jsdom@29
```

テストは、まず通常どおり `require("jsdom")` を試し、見つからなければ `%LOCALAPPDATA%\kokontouzai-test` から読み込みます。
別の場所に入れたときは、環境変数 `KOKONTOUZAI_TEST_MODULES` にそのフォルダを指定します。
Google ドライブ以外にクローンした場合は、kokontouzai で `npm install` すればそのまま動きます。

## 実行

kokontouzai のフォルダで次を実行します（Node.js 22 で確認）。

```
npm test
```

## ファイル

| ファイル | 内容 |
|---|---|
| `helpers/load-page.js` | html と js を jsdom で読み込む |
| `helpers/fixtures.js` | テスト用の list.json の要素を作る |
| `common.test.js` | `js/common.js` の定義が仕様（`docs/list-json.md`）と合っているか |
| `kokon.test.js` | `js/kokon.js`（一覧表の表示・絞り込み） |
| `check.test.js` | `js/check.js`（list.json の検査） |
| `exception-sitelist.test.js` | `js/exception-sitelist.js`（例外サイトリスト） |

`{ todo: ... }` を付けたテストは、本番コードの不具合が分かっていて、まだ直していないものです。失敗しても全体は失敗になりません。直したら `todo` を外します。
