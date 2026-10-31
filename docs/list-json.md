# list.json データ仕様

古今東西正男の一覧表（`index.html`）のデータです。ファイル全体は配列で、1つの要素（オブジェクト）が1つのサイトを表します。

データを直したら、`check.html` を開いてエラーが出ないことを確かめてください。以下のルールのうち、検査できるものはすべて `js/check.js` で検査しています。

## 全体のルール

- 要素は `site.yomi` の順（あいうえお順）に並べる。
- 使えるキーは、下の「項目一覧」にある15種類だけ。それ以外のキーはエラーになる。
- キーは camelCase で書く（例: `kindMasao`・`waybackTime`・`banner.backgroundColor`）。
- 値を1つ持つときは文字列、2つ以上持つときは配列で書く（`oldName`・`oldUrl`・`subUrl`・`kindMasao`・`feature`・`work`）。
- 項目が不明・該当なしのときは、そのキーを書かない（`null` や空文字は使わない）。

## 項目一覧

| キー | 型 | 必須 | 内容 | 表示・利用先 |
|---|---|---|---|---|
| `id` | 文字列 | ○ | サイトを指す ID（[id](#id)） | `link.json` からの参照 |
| `site` | オブジェクト | ○ | サイト名とよみ（[site](#site)） | サイト名の列 |
| `oldName` | 文字列 / 配列 |  | 以前のサイト名。新しいものから順に書く | サイト名の下に薄く表示 |
| `webmaster` | 文字列 |  | 管理人名（最新のもの） | 管理人の列。無ければ「？」 |
| `banner` | オブジェクト |  | バナー画像、または画像が無いときの色（[banner](#banner)） | バナーの列 |
| `url` | 文字列 | ○ | サイトの URL | バナーのリンク先 |
| `oldUrl` | 文字列 / 配列 |  | 以前の URL | 表示しない（記録用） |
| `subUrl` | 文字列 / 配列 |  | ミラーなど、今の URL 以外で正男を置いている URL | 例外サイトリスト |
| `year` | オブジェクト |  | 存在した・更新があった期間（[year](#year)） | 期間の列。無ければ「？」 |
| `kindMasao` | 文字列 / 配列 |  | 正男の種別（[kindMasao](#kindmasao)） | 「正男の種別」の絞り込み |
| `feature` | 文字列 / 配列 |  | サイトの特徴（[feature](#feature)） | 「サイトの特徴」の絞り込み |
| `work` | 文字列 / 配列 |  | 代表作 | 今は表示しない（機能停止中） |
| `waybackTime` | 数値 | 条件付き | Wayback Machine の日時（[waybackTime](#waybacktime)） | バナーのリンク先 |
| `state` | 文字列 | ○ | サイトの状態（[state](#state)） | 背景色・リンク先・絞り込み |
| `explanation` | 文字列 |  | 掲載の根拠などのメモ | 表示しない（記録用） |

## id

サイトを指す ID です。`link.json`（[link-json.md](link-json.md)）から、どのサイトかを指すのに使います。閉鎖・消滅したサイトを含め、すべての要素に付けます。

- 英小文字・数字・`-` だけで書く。単語の区切りは `-` にする（例: `game-island`）。
- JS の変数名などに使うときだけ、`-` を `_` に置き換える。
- ほかのサイトの ID と重複させない。
- 長さの上限は設けない。
- 一度付けたら変えない。サイト名・URL・バナーのファイル名が変わっても、ID はそのままにする。

ID は次のように決めます。

- バナー画像があるサイトは、画像のファイル名から拡張子を除いたものをそのまま使う（例: `crash-bandicoot-town.gif` → `crash-bandicoot-town`）。画像のファイル名は、ID に使えるよう [バナー画像のファイル名](#バナー画像のファイル名) のルールで付け直してある。
- バナー画像が無いサイトは、`site.yomi` をアルファベットにしたものを候補として作り、サイト名を見て人が決める。`yomi` は濁点や小さい文字を使わないため、機械的に変換しただけでは元の名前から遠くなることがある。候補は [バナー画像のファイル名](#バナー画像のファイル名) と同じルールで直す。

## site

| キー | 型 | 必須 | 内容 |
|---|---|---|---|
| `name` | 文字列 | ○ | サイト名（最新のもの） |
| `yomi` | 文字列 | ○ | 並べ替えと「先頭文字の行」の絞り込みに使うよみ。ひらがな（あ〜ん）だけで書き、濁点・半濁点・小さい文字は使わない（「じょ」→「しよ」） |

よみの書き方は今のデータに合わせます。

- 濁点・半濁点は付けない（「ゲーム」→「けえむ」）。
- 小さい文字は大きく書く（「しょ」→「しよ」）。
- 長音は母音で書く（「ルーム」→「るうむ」）。
- 英字は読みをひらがなで書く（「RF研」→「ああるえふけん」）。

## banner

画像があるときと、無いときで書き方が変わります。`banner` 自体が無いときは、灰色の背景に黒い文字で「NO BANNER」と表示します。

| キー | 型 | 内容 |
|---|---|---|
| `image` | 文字列 | `banner/` フォルダ内の画像のファイル名 |
| `size.x` | 数値 | 画像の幅（px）。正の整数。200 を超えるときは、縦横比を保って幅 200 に縮めて表示する |
| `size.y` | 数値 | 画像の高さ（px）。正の整数 |
| `color` | 文字列 | 画像が無いときの「NO BANNER」の文字色。`#RRGGBB`。省略時は `#000000` |
| `backgroundColor` | 文字列 | 画像が無いときの背景色。`#RRGGBB`。省略時は `#808080` |

- `image` を書くときは、`size.x` と `size.y` も書く。
- `image` と色（`color`・`backgroundColor`）は、両方は書かない。
- 画像のファイル名は、拡張子を除いた部分を英小文字・数字・`-` だけで書き、ほかの画像と重複させない（詳しくは次の節）。

### バナー画像のファイル名

ファイル名はそのまま `id` になるので、次のルールで付けます。

- 今のサイト名（`site.name`）から付ける。旧サイト名・管理人名・URL からは付けない（例: 「正男工房」→ `masao-kobo`）。
- 単語の区切りに `-` を入れる（例: `masao-no-heya`・`crash-bandicoot-town`）。
- 英語はそのまま書く（例: `game-station-fever`）。
- ローマ字はヘボン式で書く（shi・chi・tsu・fu・ji・sha・chu・jo など）。っち は tchi（例: `setchi`）。
- 助詞の「は」は `wa`、「を」は `o` と書く（例: `koko-wa-masao-o`）。
- 長音は書かない（例: 「工房」→ `kobo`、「同盟」→ `domei`、「倉庫」→ `soko`）。
- サイト名・管理人名・`url`・`oldUrl`・`subUrl` に英字の綴りがあるときは、ヘボン式でなくてもその綴りを使う（例: `tyukyu`（旧 URL が tyukyu.com）、`isiko`（isiko's page））。
- ほかの画像と重複するときは、サイト名の語を足して区別する（例: `kobo-no-homepage` と `masao-kobo`）。
- 画像は1週間キャッシュされるので、画像を差し替えるときはファイル名を変える。

## year

| キー | 型 | 内容 |
|---|---|---|
| `from` | 数値 | 始まりの年 |
| `to` | 数値 | 終わりの年 |

`year` を書くときは、`from` と `to` を両方、整数で書きます。値の意味は次のとおりです。

| 値 | 意味 | 表示 |
|---|---|---|
| 正の数 | その年 | `2005` |
| `-1` | 不明 | `？` |
| `-1` 以外の負の数 | 推定（その年ごろ） | `-2005` → `2005？` |
| `0`（`to` のみ） | 継続中 | `2005～` |

- `from` と `to` が同じ表示になるときは、1つだけ表示する（例: `2004`）。
- `from` ≦ `to` にする。負の数は絶対値で比べる。`-1` や `to: 0` のときは比べない。

## state

| 値 | 意味 | 背景色の class | リンク先 | `waybackTime` |
|---|---|---|---|---|
| `canvas` | JS 版正男（Canvas）を導入して現存 | `canvas` | `url` | 書かない |
| `exist` | 正男を掲載するサイトとして現存 | `exist` | `url` | 書かない |
| `closed` | 現存しない、または今は正男を扱っていない | `closed` | Wayback Machine | 必須 |
| `archived` | 正男のデータ（画像を含む）がアーカイブされている | `archived` | Wayback Machine | 必須 |
| `remained` | サイトが残っていて、正男のデータも残っている | `archived` | Wayback Machine | 必須 |
| `vanished` | データが消滅している | `vanished` | リンクしない | 書かない |
| `home` | 過疎村（当サイト） | （一覧表に表示しない） | （一覧表に表示しない） | 書かない |

`remained` の意味は、コードから読み取ったものです。必要に応じて直してください。

- Wayback Machine へのリンクは `https://web.archive.org/web/{waybackTime}/{url}` になる。
- 「サイトの状態」の絞り込みでは、次のとおり表示する。
  - 「現存サイトのみ」: `exist`・`canvas`
  - 「Canvas対応サイトのみ」: `canvas`
  - 「アーカイブに正男保存のサイトのみ」: `archived`・`remained`
- `home` のサイトは `index.html` の一覧表に表示せず、「正男サイトの総数」にも数えない。
- 例外サイトリストには、`exist`・`canvas`・`remained`・`home` の `url` と、すべての `subUrl` が入る。
  - URL はファイル名を除いた部分（最後の `/` まで）にし、重複を除いて並べる。
  - `list.json`・`anotherlist.json` のどちらかが読み込めなければ、一覧は出さずにエラーの文を出す。

## url・oldUrl・subUrl

- `url` は、`state` が `vanished` 以外のとき `http://` か `https://` で始める。`vanished` のときは空文字でもよい。
- `oldUrl`・`subUrl` に、今の `url` を含めない。
- 同じ `url` でも管理者が違う別サイトのことがあるので、ほかのサイトとの `url` の重複は誤りとしない。

## waybackTime

- 14桁の数字（YYYYMMDDhhmmss）。例: `20041220185135`
- `state` が `closed`・`archived`・`remained` のときは必須。それ以外のときは書かない。

## kindMasao

次の6つの値だけ使えます。`index.html` の「正男の種別」の絞り込みボタンは、この値から作ります。

`自動`・`一画面`・`ストーリー`・`JS拡張`・`カービィ系`・`SASUKE系`

## feature

次の5つの値だけ使えます。`index.html` の「サイトの特徴」の絞り込みボタンは、この値から作ります。

`正男100個以上`・`素材配布`・`エディタ`・`WWA`・`まさお3`

値を増やすときは、`js/common.js` の `FEATURE_VALUES` に足してください（`kindMasao` は `KIND_MASAO_VALUES`）。絞り込みボタンと検査の両方に反映されます。

## 例

画像のバナー、旧サイト名、旧 URL を持つ閉鎖サイトの例です。

```json
{
  "id": "aiueo",
  "site": {
    "name": "あいうえお・わーるど",
    "yomi": "あいうえおわあると"
  },
  "oldName": "あいうえお教室",
  "webmaster": "あいうえお",
  "banner": {
    "image": "aiueo.gif",
    "size": {
      "x": 88,
      "y": 31
    }
  },
  "url": "http://www.geocities.jp/aiueo_world/",
  "oldUrl": ["http://aiueo.daa.jp/", "http://www.geocities.jp/aiueo_koubou/"],
  "year": {
    "from": 2004,
    "to": -2005
  },
  "waybackTime": 20041220185135,
  "state": "closed"
}
```

ミラー（`subUrl`）、複数の種別、代表作を持つ Canvas 対応サイトの例です。

```json
{
  "id": "cloudy",
  "site": {
    "name": "A Cloudy Day",
    "yomi": "あくらうていてい"
  },
  "webmaster": "チャチャモ",
  "banner": {
    "image": "cloudy.gif",
    "size": {
      "x": 200,
      "y": 60
    }
  },
  "url": "http://masao0.web.fc2.com/",
  "subUrl": "http://chachamobrothers.web.fc2.com/",
  "year": {
    "from": 2010,
    "to": 2015
  },
  "kindMasao": ["ストーリー", "JS拡張"],
  "feature": "素材配布",
  "work": ["National Treason", "Slaughter a person", "Fourth False Force"],
  "state": "canvas"
}
```
