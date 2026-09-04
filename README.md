# Deutsch lernen · 德文學習

給家人朋友一起用的德文學習網頁。兩塊功能:單字閃卡 + 間隔重複複習(SM-2,類似 Anki),以及 A1 文法課程 + 練習題。

**線上版**:https://ohhshen.github.io/german-learn/

不用註冊、不用密碼,輸入名字就能開始。

## 快速開始(本機開發)

```bash
npm install
npm run dev
```

打開終端機顯示的網址即可。需求:Node.js 22 以上。

## 目前功能

**共通**

- 多使用者:免密碼,同一台裝置上輸入不同名字各自記錄進度
- 德文發音:瀏覽器內建 TTS 唸出單字與例句
- 純前端:沒有伺服器與資料庫,內容打包在網頁裡,進度存在瀏覽器本機

**Phase 1 · 單字閃卡**

- 166 個 A1 常用字,含詞性、分類、德中例句
- 間隔重複:SM-2 演算法,依「忘記了/有點難/記得/太簡單」安排下次複習日
- 鍵盤操作:空白鍵看答案,1–4 評分

**Phase 2 · 文法課程**

- 12 課 A1 基礎文法(名詞性別、現在式、語序、第四格、否定、複數、情態動詞、可分動詞、完成式…),每課先讀說明再做練習
- 課文支援段落、變化表、可發音的例句、小提醒四種區塊
- 72 題練習,分選擇題與填空題,作答後立刻給正解與解說
- 填空題容許大小寫、標點差異,沒有德文鍵盤打 `Brueder` 也算對 `Brüder`
- 每課記錄最佳成績,首頁與課程列表顯示完成進度

## 學習進度存在哪裡

存在每個人自己瀏覽器的 `localStorage`,所以:

- **不跨裝置同步**:手機上練的進度,電腦上看不到
- 清除瀏覽器資料、換瀏覽器、或用無痕模式,進度會不見
- 資料不會離開自己的裝置,也不會傳給任何人

當初為了免費、零維運才這樣設計。之後若真的需要跨裝置同步,得改回有後端的版本(commit `763956e` 有可用的 Express + SQLite 實作,可以從 git 歷史取回)。

## 部署

推到 `main` 就會自動建置並發佈到 GitHub Pages(`.github/workflows/deploy.yml`),不需要手動操作。

```bash
git push
```

若之後改成自訂網域或改 repo 名稱,記得同步改 `vite.config.ts` 的 `base`。

## 專案結構

```
src/
  components/        使用者選擇、首頁、單字複習、文法課程列表與課程頁
  api.ts             資料層:內容查詢、複習排程、練習判定(對元件維持 async 介面)
  store.ts           localStorage 存取
  srs.ts             SM-2 間隔重複排程
  speak.ts           德文 TTS
  data/words.json            單字內容
  data/grammar-lessons.json  文法課程與練習題
.github/workflows/deploy.yml  推上 main 自動部署到 GitHub Pages
```

## 新增單字

編輯 `src/data/words.json`,以 `german` 欄位當唯一鍵(學習進度也是記在這個字上,所以改動已存在的 `german` 會讓該字的進度重新來過)。

```jsonc
{ "german": "der Tisch", "chinese": "桌子", "pos": "noun", "category": "日常物品",
  "example_de": "Der Tisch ist neu.", "example_zh": "這張桌子是新的。" }
```

## 新增或修改文法課程

編輯 `src/data/grammar-lessons.json`。課程以 `slug`、題目以「第幾題」為準,改內容不會清掉已存的成績。

```jsonc
{
  "slug": "akkusativ",          // 唯一代碼,不要改動已上線的
  "title": "第四格 Akkusativ",
  "subtitle": "一句話說明這課在講什麼",
  "minutes": 7,                 // 預估閱讀時間
  "sections": [                 // 課文,四種區塊可混用
    { "type": "text",     "heading": "標題", "body": "段落文字" },
    { "type": "tip",      "body": "黃色小提醒" },
    { "type": "examples", "heading": "看幾個句子", "items": [{ "de": "…", "zh": "…" }] },
    { "type": "table",    "heading": "變化表", "headers": ["…"], "rows": [["…"]] }
  ],
  "exercises": [
    { "type": "choice", "prompt": "題目", "options": ["A", "B"], "answer": 0, "explanation": "解說" },
    { "type": "fill",   "prompt": "題目", "answers": ["可接受的答案", "另一種寫法"], "explanation": "解說" }
  ]
}
```

填空題比對時會忽略大小寫、頭尾空白與句尾標點,並把 `ä/ö/ü/ß` 和 `ae/oe/ue/ss` 視為相同。若這題就是要考大小寫(例如名詞大寫),加上 `"caseSensitive": true`。

## 之後規劃

- Phase 3:聽力測驗、情境對話練習
- 包成 PWA,手機可加到主畫面當 App 用
