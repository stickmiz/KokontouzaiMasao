// 古今東西正男の各ページで共通の定義（list.json の仕様）
// 各ページの JS より先に読み込む

const STATE_CANVAS = "canvas";
const STATE_EXIST = "exist";
const STATE_CLOSED = "closed";
const STATE_ARCHIVED = "archived";
const STATE_VANISHED = "vanished";
const STATE_REMAINED = "remained";
const STATE_ARCHIVED_WAYBACK = "archived_wayback";
const STATE_ARCHIVED_GEOLOG = "archived_geolog";

const KNOWN_STATES = [
  STATE_CANVAS,
  STATE_EXIST,
  STATE_CLOSED,
  STATE_ARCHIVED,
  STATE_VANISHED,
  STATE_REMAINED,
  STATE_ARCHIVED_WAYBACK,
  STATE_ARCHIVED_GEOLOG,
];

// Wayback Machine 内のページにリンクするため、wayback_time が必要な状態
const WAYBACK_LINK_STATES = [
  STATE_CLOSED,
  STATE_ARCHIVED,
  STATE_ARCHIVED_WAYBACK,
  STATE_REMAINED,
];

// kind_masao・feature に使える値。index.html の絞り込みボタンもこの順で作る
const KIND_MASAO_VALUES = [
  "自動",
  "一画面",
  "ストーリー",
  "JS拡張",
  "カービィ系",
  "SASUKE系",
];
const FEATURE_VALUES = [
  "正男100個以上",
  "素材配布",
  "エディタ",
  "WWA",
  "まさお3",
];
