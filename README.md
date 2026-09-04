# Deutsch lernen · 德文學習

給家人朋友一起用的德文學習網頁。目前有兩塊:單字閃卡 + 間隔重複複習(SM-2,類似 Anki),以及 A1 文法課程 + 練習題。

## 快速開始

```bash
npm install
npm install --prefix server
npm run dev
```

打開 http://localhost:5173 ,輸入名字就可以開始。前端 5173、API 3001,資料存在 `server/german-learn.db`(SQLite,首次啟動自動建立並匯入單字)。

需求:Node.js 22 以上(使用內建 `node:sqlite`)。

## 目前功能

**共通**

- 多使用者:免密碼,輸入名字即可,各自記錄學習進度
- 德文發音:瀏覽器內建 TTS 唸出單字與例句

**Phase 1 · 單字閃卡**

- 166 個 A1 常用字,含詞性、分類、德中例句
- 間隔重複:SM-2 演算法,依「忘記了/有點難/記得/太簡單」安排下次複習日
- 鍵盤操作:空白鍵看答案,1–4 評分

**Phase 2 · 文法課程**

- 12 課 A1 基礎文法(名詞性別、現在式、語序、第四格、否定、複數、情態動詞、可分動詞、完成式…),每課先讀說明再做練習
- 課文支援段落、變化表、可發音的例句、小提醒四種區塊
- 72 題練習,分選擇題與填空題,作答後立刻給正解與解說
- 答案存在伺服器端不外流;填空題容許大小寫、標點差異,沒有德文鍵盤打 `Brueder` 也算對 `Brüder`
- 每課記錄最佳成績,首頁與課程列表顯示完成進度

## 部署到雲端(Fly.io)

前端會被打包進 `dist/`,由 Express 一起提供,所以線上只跑一個服務。學習進度存在掛載的永久磁碟 `/data`,重新部署不會消失。

第一次部署:

```bash
brew install flyctl                    # 已安裝可略過
fly auth login                         # 或 fly auth signup 註冊(需綁信用卡)
fly apps create german-learn-oliver    # 名稱被占用就換一個,並同步改 fly.toml 的 app
fly volumes create german_data --region nrt --size 1 --yes
fly deploy
fly open                               # 打開網址
```

之後每次更新:

```bash
fly deploy
```

注意事項:

- **只能跑一台機器**。SQLite 存在單一磁碟上,`fly scale count` 放大成多台會讓資料不同步。
- 沒有流量時機器會自動休眠(`auto_stop_machines`),有人打開網址時自動喚醒,第一次載入會慢幾秒。
- 費用約每月數美金(shared-cpu-1x 256MB + 1GB 磁碟),實際以 Fly.io 帳單為準。
- 備份資料:`fly ssh console -C "cat /data/german-learn.db" > backup.db`

## 之後規劃

- Phase 3:聽力測驗、情境對話練習
- 包成 PWA,手機可加到主畫面當 App 用

## 專案結構

```
src/                 前端(React + Vite + Tailwind)
  components/        使用者選擇、首頁、單字複習、文法課程列表與課程頁
  api.ts             API client
  speak.ts           德文 TTS
server/
  index.js           Express API
  srs.js             SM-2 間隔重複排程
  grammar.js         練習題答案比對(容錯處理)
  db.js              SQLite schema 與匯入
  data/seed-words.json       單字內容(要加字改這裡,重啟即匯入)
  data/grammar-lessons.json  文法課程與練習題
```

## 新增單字

編輯 `server/data/seed-words.json` 後重啟 API 即可。以 `german` 欄位為準,重複的字會更新而不是重複新增。

## 新增或修改文法課程

編輯 `server/data/grammar-lessons.json` 後重啟 API 即可。課程以 `slug` 為準、題目以「第幾題」為準做更新,改內容不會清掉大家已經累積的學習紀錄。

一課的格式:

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
