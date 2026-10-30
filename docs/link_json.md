# link.json データ仕様（案）

各サイトのリンク集から、どのサイトへリンクしているかを記録するデータです。`list.json` への登録作業を円滑にするために使います。

この文書は要件定義の段階の案です。「未決事項」に挙げた点は、決まりしだい書き直します。

## 目的

- サイトごとにリンク状況を明確にし、「そのサイトでの洗い出しが終わった」ことを管理する（主目的）。
- リンク先から、`list.json` に未登録のスーパー正男サイトを見つける。
- 正男サイトではないが、正男サイトを探す足がかりになるサイト（WWA・ゲーム系・カービィ系）も調査対象にする。

## 全体構成

1つのファイル（`link.json`）に、次の4つの項目を持つオブジェクトとして書きます。

```json
{
  "surveys": [ ... ],
  "urls": { ... },
  "banners": { ... },
  "excluded_prefixes": [ ... ]
}
```

| キー | 型 | 内容 |
|---|---|---|
| `surveys` | 配列 | サイトごとの調査記録（[surveys](#surveys)） |
| `urls` | オブジェクト | リンク先 URL ごとの判定（[urls](#urls)） |
| `banners` | オブジェクト | 収集したバナー画像（[banners](#banners)） |
| `excluded_prefixes` | 配列 | 収集しない URL の前方一致リスト（[excluded_prefixes](#excluded_prefixes)） |

## 全体のルール

- キー名は snake_case、決まった値は英語で書く（`list.json` に合わせる）。
- 項目が不明・該当なしのときは、そのキーを書かない（`null` や空文字は使わない）。
- データはスクリプトで登録する。ただし、次の2つは人が判断して書く。スクリプトはこれらを書き換えない。
  - `surveys` の `status` を `done` にすること
  - `urls` の `judge` を `pending` 以外にすること
- URL は、すべて正規化した値で書く（[URL の正規化](#url-の正規化)）。
- サイトの ID は `list.json` の `id` を使う（[list_json.md の id](list_json.md#id)）。

## surveys

1つの要素が、1つのサイトの調査記録を表します。`list.json` に無いサイト（WWA サイトなど）も対象にします。

| キー | 型 | 必須 | 内容 |
|---|---|---|---|
| `id` | 文字列 | 条件付き | `list.json` に登録済みのサイトの ID |
| `url` | 文字列 | 条件付き | 未登録のサイトの URL。`urls` のキーと同じ値 |
| `status` | 文字列 | ○ | 調査の状態（[status](#status)） |
| `pages` | 配列 |  | 調べたページ（[pages](#pages)） |
| `note` | 文字列 |  | メモ。完了と判断した理由（どの時期・どの URL まで見たか）など |

- `id` と `url` は、どちらか一方だけを書く。
- 未登録のサイトを `list.json` に登録したら、`url` を `id` に書き換える。

### status

| 値 | 意味 | 設定する人 |
|---|---|---|
| `pending` | 未着手 | スクリプト・人 |
| `in_progress` | 調査中 | スクリプト・人 |
| `done` | 完了。そのサイトのリンクをすべて拾い終えた | 人のみ |
| `unavailable` | 調査不能（リンク集ページが残っていないなど） | 人 |

- 「完了」は、リンク先をすべて見た時点とする。リンク先が正男サイトかどうかの判定は含まない（判定は `urls` で URL ごとに別に行う）。
- 現存サイトも Wayback Machine で過去にさかのぼる必要があること、URL の違うリンク集を複数持つことがあることから、完了は人が判断する。

### pages

1つの要素が、1つのリンク集ページを1つの時点で調べた記録です。同じページを別の時点で調べたときは、別の要素にします。

| キー | 型 | 必須 | 内容 |
|---|---|---|---|
| `url` | 文字列 | ○ | 調べたページの URL |
| `source` | 文字列 | ○ | 調べた先。`live`（現存サイト）・`wayback`・`geolog` |
| `wayback_time` | 数値 | 条件付き | Wayback Machine の日時。14桁（YYYYMMDDhhmmss） |
| `checked` | 文字列 | ○ | 調べた日。`YYYY-MM-DD` |
| `links` | 配列 | ○ | そのページにあったリンク（[links](#links)） |

- `wayback_time` は、`source` が `wayback` のときは必須、それ以外のときは書かない。`list.json` と同じく数値で書く。
- 1つの `surveys` の要素の中で、`url`・`source`・`wayback_time` の組み合わせは重複させない。
- 複数の時点で同じリンクが出てきても、ページごとにそのまま記録する（いつからいつまでリンクされていたかが分かるようにするため）。

### links

| キー | 型 | 必須 | 内容 |
|---|---|---|---|
| `url` | 文字列 | ○ | リンク先の URL。`urls` のキーと同じ値 |
| `text` | 文字列 |  | 文字リンクの文言、またはバナー画像の alt・title |
| `banner` | 文字列 |  | バナー画像のファイル名。`banners` のキーと同じ値 |

- 非正男サイト（`not_masao`）と判定される前に記録したリンクは、判定後も消さない。

## urls

キーが正規化したリンク先の URL、値がその URL の判定です。どのサイトからのリンクでも、同じ判定を使い回します。

| キー | 型 | 必須 | 内容 |
|---|---|---|---|
| `judge` | 文字列 | ○ | 確定した判定（[judge](#judge)）。人が書く |
| `id` | 文字列 |  | `list.json` に登録済みのときの ID |
| `category` | 文字列 | 条件付き | `judge` が `related` のときの分類（[category](#category)） |
| `guess` | 文字列 |  | スクリプトによる推定。`judge` と同じ値を使う |
| `guess_reason` | 文字列 |  | 推定の根拠 |
| `note` | 文字列 |  | メモ |

- `surveys` の `links` に出てくる URL は、必ず `urls` にもある。スクリプトは新しい URL を見つけたら、`judge` を `pending` にして追加する。
- `guess` は人が確認するための手がかり。人が `judge` を確定したら消してよい。

### judge

| 値 | 意味 | 以後の収集 |
|---|---|---|
| `pending` | 未判定 | 記録する |
| `masao` | スーパー正男サイト。`id` があれば登録済み、無ければ未登録（登録候補） | 記録する |
| `related` | 正男サイトではないが関連サイト。`surveys` の対象にできる | 記録する |
| `not_masao` | 無関係のサイト | 記録しない |
| `unreachable` | リンク切れで、アーカイブも無い | 記録する |

### category

`judge` が `related` のときだけ書きます。値の一覧は `js/common.js` に定義します。

| 値 | 意味 |
|---|---|
| `wwa` | WWA のサイト |
| `game` | ゲーム系サイト |
| `kirby` | 正男を置いていないカービィ系サイト |

`list.json` の `kind_masao` の「カービィ系」は、カービィを題材にした正男サイトのことで、`kirby` とは別のものです。

## banners

キーが収集したバナー画像のファイル名、値がその情報です。画像は `banner/collected/` に保存します（`banner/` と同じく git では管理しない）。

| キー | 型 | 必須 | 内容 |
|---|---|---|---|
| `src` | 文字列 / 配列 | ○ | 取得元の画像 URL。同じ画像が別の場所にあれば配列で書く |
| `hash` | 文字列 | ○ | 画像の中身から計算したハッシュ値 |
| `size.x` | 数値 | ○ | 画像の幅（px）。正の整数 |
| `size.y` | 数値 | ○ | 画像の高さ（px）。正の整数 |

- ファイル名は、収集した時点では連番にする（例: `b0001.gif`）。
- サイトが明確になったら、そのサイトの ID を使った名前に書き換え、`links` の `banner` も直す。命名は `list.json` の ID と同じく英小文字・数字・`-` だけで書く。
- バナーのファイル名は重複させない。1つのサイトに複数のバナーがあるときも、別の名前を付ける。
- `hash` が同じ画像は、同じファイルとして扱う（重複して保存しない）。
- 色数違い・リサイズ版など、見た目が同じで中身が違う画像は自動で判定できない。手動で統合し、参照を書き換える。
- `size` は `list.json` の `banner.size` と同じ形式。
- `list.json` に登録するときは、収集したバナーを `banner/` にコピーして使う。このとき、ファイル名（拡張子を除く）がそのまま新しいサイトの ID になる。

## excluded_prefixes

収集しない URL の前方一致リストです。検索エンジン、素材配布ではないソフト配布サイトなど、まとめて除外したいものに使います。

```json
["http://www.google.co.jp/", "http://www.vector.co.jp/"]
```

- ドメイン単位ではなく前方一致にする。geocities などのレンタルサーバーでは、同じドメインの中に正男サイトとそうでないサイトが混ざっているため。
- 個別の URL の除外は、`urls` の `judge` を `not_masao` にすれば足りる。

## URL の正規化

正規化の関数は `js/common.js` に置き、収集スクリプトと検査ページで共有します。ルールは未決です（[未決事項](#未決事項)）。

## list.json との関係

- `list.json` の各サイトに `id` を付け、`link.json` からはその ID でサイトを指す。ID のルールは [list_json.md の id](list_json.md#id) を参照。
- `id` を追加すると `list.json` のキーが15種類になるので、`js/check.js`・`CLAUDE.md` も直す。
- `_` や大文字を含む今のバナー画像は、ID を付ける前にファイル名を変え、`list.json` の `banner.image` も直す。

## 検査項目

`check.html` と同じように、検査ページを用意する想定です。

- `surveys` の各要素に、`id` と `url` のどちらか一方だけがある
- `surveys` の `id` が `list.json` にある
- `surveys` の `url` が `urls` にある
- `surveys` の中で、同じサイトが重複していない
- `pages` の `url`・`source`・`wayback_time` の組み合わせが重複していない
- `source` が `wayback` のとき、`wayback_time` が14桁の数値である。それ以外のときは書いていない
- `links` の `url` が `urls` にある
- `links` の `banner` が `banners` にある
- `urls` の `id` が `list.json` にある
- `judge`・`status`・`source`・`category` が決まった値である
- `category` は `judge` が `related` のときだけある
- `banners` のファイル名が英小文字・数字・`-` だけで書かれている（拡張子を除く）
- `banners` の `hash` が重複していない
- 参考表示: どこからも参照されていないバナー、同じサイズのバナーの一覧

`list.json` 側の検査（`js/check.js`）には、次を追加します。

- `id` がある
- `id` が英小文字・数字・`-` だけで書かれている
- `id` が重複していない
- `banner.image` のファイル名（拡張子を除く）が英小文字・数字・`-` だけで書かれている
- 参考表示: ID として不適切な可能性がある名前（`banner`・`bn1` など）の一覧

## 運用の流れ

1. スクリプトが、調査するサイトのリンク集ページを取得し、`pages` と `links` を追加する。`status` は `in_progress` にする。
2. 新しいリンク先 URL を `urls` に `judge: "pending"` で追加する。推定できれば `guess`・`guess_reason` も書く。`excluded_prefixes` に当たる URL と、`not_masao` の URL は記録しない。
3. バナー画像を `banner/collected/` に連番で保存し、`banners` に追加する。
4. 人が `urls` の `pending` を確認し、`judge` を確定する。
5. `masao` で未登録のものを `list.json` に登録する。バナーがあれば、その名前を ID にして `banner/` にコピーする。無ければ `yomi` から作った候補をもとに ID を決める。決めた ID を `urls` の `id` に書く。
6. `related` や未登録の正男サイトは、`surveys` に追加して調査対象にする。
7. 人が、そのサイトのリンクをすべて拾い終えたと判断したら、`status` を `done` にする。

## 未決事項

- 正男サイトの判定方法（スクリプトの推定ロジック）
- URL の正規化ルール
  - `http` と `https` を同じとみなすか
  - `www` の有無を同じとみなすか
  - 末尾の `/`、`index.html` の扱い
  - `oldurl`・`suburl` と一致したら同じサイトとみなすか
- 現存サイトの再調査の方法（差分だけを拾うか）

## 例

```json
{
  "surveys": [
    {
      "id": "aiueo",
      "status": "done",
      "pages": [
        {
          "url": "http://example.jp/masao/link.html",
          "source": "wayback",
          "wayback_time": 20050312093000,
          "checked": "2026-10-30",
          "links": [
            { "url": "http://foo.jp/masao/", "text": "フーの正男" },
            { "url": "http://wwa.example.jp/", "banner": "b0001.gif", "text": "WWAの部屋" }
          ]
        }
      ],
      "note": "2003年〜2008年のスナップショットを確認。リンク集は1ページのみ"
    },
    {
      "url": "http://wwa.example.jp/",
      "status": "in_progress"
    }
  ],
  "urls": {
    "http://foo.jp/masao/": { "judge": "masao", "id": "foo-masao" },
    "http://wwa.example.jp/": { "judge": "related", "category": "wwa" },
    "http://baz.jp/": { "judge": "pending", "guess": "masao", "guess_reason": "正男の起動ファイルを検出" }
  },
  "banners": {
    "b0001.gif": {
      "src": "http://wwa.example.jp/img/banner.gif",
      "hash": "3f2a9c...",
      "size": { "x": 200, "y": 40 }
    }
  },
  "excluded_prefixes": ["http://www.google.co.jp/"]
}
```
