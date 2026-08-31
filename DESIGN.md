# YouTube Remote Design

## 已選定方向

本版採用使用者指定的 iOS 26 控制中心語彙，將 YouTube Remote 重塑為手機優先的 Liquid Glass 操作面板。視覺參考材質與模組關係，但不複製 Apple 控制中心或加入沒有實際功能的控制

- 基底色：近黑色環境光與深藍灰，適合夜間私人 LAN 遙控情境
- 材質：半透明磨砂玻璃、柔和高光邊緣、有限度陰影與 CSS 環境光
- 語意色：藍色代表播放與主要操作，綠色代表連線，黃色代表等待與倍速，珊瑚色代表錯誤與靜音
- 圖示：App 內嵌 SVG sprite，維持一致的線條粗細與幾何語彙
- 讀數：系統 sans-serif 搭配 tabular numbers，用於時間、音量與倍速等快速掃讀資訊

## 版面契約

第一個手機 viewport 依序呈現：

1. YouTube Remote 與連線狀態膠囊
2. Server、Extension、YouTube 三層連線模組
3. 目前影片、目標狀態、網址與播放狀態
4. 影片進度、目前時間與總時間
5. 大型倒退、播放／暫停、前進控制
6. 音量與靜音、倍速、字幕、全螢幕快速控制
7. 畫面上的影片清單，手動選擇下一部
8. 折疊式 YouTube URL 輸入

控制中心使用四欄 responsive grid。320px 以上維持雙欄上層模組，360×800 與 390×844 必須在首屏看見主要播放控制，桌面版維持最大約 760px 置中寬度

## 狀態與動效

- 未配對：使用置中的玻璃引導卡，保留 `/connect` 說明與重新檢查
- 連線中／重新連線：保留最後播放器資料，停用控制並讓連線指示低頻脈動
- Extension offline、無 target、loading、unsupported：在連線模組與狀態列清楚說明下一步
- ready：啟用完整控制面板，toggle 的 active 樣式以遠端回傳狀態為準
- live 或 `canSeek=false`：停用進度與前後 seek，保留播放、音量、倍速、全螢幕與字幕
- 影片選單：顯示目前 YouTube 畫面已載入的其他影片連結與由影片 ID 推導的 YouTube 預覽圖，使用者點選後才切換
- command error：顯示五秒可消失的錯誤列，不重置整個連線

按下控制時使用約 160ms 的縮放回饋與約 220ms 的回彈，狀態切換使用短促的背景與邊緣轉換。`prefers-reduced-motion` 會關閉位移、縮放與脈動，`aria-live` 僅用於連線與錯誤，不播報每次 timeupdate

## 內容與邊界

- 影片標題沿用協定允許的最多 500 字元並限制視覺行數，完整內容保留於 title
- 影片 URL 沿用協定的 URL 驗證與省略顯示，影片選單由 watch、shorts、live 或 youtu.be URL 推導同源 `/api/youtube-thumbnail/{id}` 預覽圖，由 Server 代抓固定的 YouTube 圖片來源；預覽圖失敗時保留編號底圖
- 影片選單使用獨立的 `VideoMenu` 狀態，來源是 Extension 從目前 YouTube DOM 擷取的可見影片連結
- 手機選單只送出使用者明確點選的 `navigate` 指令，不自動續播或自動切換
- `/connect` 配對頁與其既有工作樹修改維持原樣
- 第一版維持私人 LAN HTTP，介面不暗示公開網路部署或額外安全能力

## 可追溯性

- 產品邊界與目標：[PRODUCT.md](PRODUCT.md)
- UI 實作：[apps/remote-web/src/App.vue](apps/remote-web/src/App.vue)
- 視覺 token：[apps/remote-web/src/styles.css](apps/remote-web/src/styles.css)
- 狀態傳輸：[apps/remote-web/src/lib/connection.ts](apps/remote-web/src/lib/connection.ts)
