# Deutsch lernen · 德文學習

給家人朋友一起用的德文學習網頁。Phase 1 是單字閃卡 + 間隔重複複習(SM-2,類似 Anki)。

## 快速開始

```bash
npm install
npm install --prefix server
npm run dev
```

打開 http://localhost:5173 ,輸入名字就可以開始。前端 5173、API 3001,資料存在 `server/german-learn.db`(SQLite,首次啟動自動建立並匯入單字)。

需求:Node.js 22 以上(使用內建 `node:sqlite`)。

## 目前功能(Phase 1)

- 多使用者:免密碼,輸入名字即可,各自記錄學習進度
- 單字閃卡:166 個 A1 常用字,含詞性、分類、德中例句
- 間隔重複:SM-2 演算法,依「忘記了/有點難/記得/太簡單」安排下次複習日
- 德文發音:瀏覽器內建 TTS 唸出單字與例句
- 鍵盤操作:空白鍵看答案,1–4 評分

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

- Phase 2:文法教學 + 練習題
- Phase 3:聽力測驗、情境對話練習
- 包成 PWA,手機可加到主畫面當 App 用

## 專案結構

```
src/                 前端(React + Vite + Tailwind)
  components/        使用者選擇、首頁、複習流程
  api.ts             API client
  speak.ts           德文 TTS
server/
  index.js           Express API
  srs.js             SM-2 間隔重複排程
  db.js              SQLite schema 與匯入
  data/seed-words.json  單字內容(要加字改這裡,重啟即匯入)
```

## 新增單字

編輯 `server/data/seed-words.json` 後重啟 API 即可。以 `german` 欄位為準,重複的字會更新而不是重複新增。
