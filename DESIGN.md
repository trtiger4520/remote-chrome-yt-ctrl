# YouTube Remote Design

## 已選定方向

本版採用 impeccable concept seed `7cca67cc` 的「暗房／琥珀安全燈」方向。介面把播放視為一個需要穩定讀數與明確操作的工作面，而不是資訊儀表板

- 基底色：石墨黑與暖灰，降低夜間使用時的視覺噪音
- 強調色：琥珀色，只用於連線狀態、目前進度與主要播放操作
- 讀數：等寬數字用於時間、音量與倍速，協助快速掃讀
- 進度：以曝光條與刻度取代裝飾性圖表
- 語氣：短句、動詞優先，錯誤訊息直接說明下一個可恢復動作

## 版面契約

第一個手機 viewport 依序呈現：

1. 頂端品牌與連線狀態
2. 目前影片標題、目標狀態與網址
3. 大型進度條與目前／總時間
4. 拇指可及區的後退、播放、前進
5. 音量、靜音與倍速等次要控制
6. 折疊式 YouTube URL 輸入

主要控制目標至少 44×44 CSS px。控制在 Extension 離線、無目標或影片尚未 ready 時維持 disabled，而不是讓點擊沒有回饋。`aria-live` 只用於連線與錯誤，不播報每次 timeupdate

## 狀態與動效

- 未配對：保留清楚的 QR 引導與重新檢查按鈕
- 連線中／重新連線：保留最後一份 player state，停用控制
- Extension offline：顯示安裝與啟用提示
- 無目標：只保留可用的網址輸入
- loading：顯示目標已找到但影片 metadata 尚未完成
- ready：顯示完整控制面板
- live：隱藏進度拖曳，保留播放、音量、靜音與倍速
- command error：顯示可消失的錯誤列，不重置整個連線

不使用裝飾性頁面載入動畫。`prefers-reduced-motion` 會關閉 transition 與平滑捲動，鍵盤 focus 使用高對比琥珀外框

## 視覺稿與實作對照

實作前比較了三個直向手機構圖：

- A／印刷台：標題與進度讀數最大，控制集中在下半部
- B／暗房工作台：狀態 rail、曝光條與 transport controls 形成單一垂直操作路徑
- C／剪輯台：設定卡片較多，適合低頻調整

選定 B，因為它最符合單手高頻操作與錯誤狀態可見性的要求。`apps/remote-web/src/App.vue` 的首個 template comment 保留 thesis、own-world、story、first viewport、form 與 finish line，作為後續 UI 修改的約束

## 可追溯性

- 產品邊界與目標：[PRODUCT.md](PRODUCT.md)
- UI 實作：[apps/remote-web/src/App.vue](apps/remote-web/src/App.vue)
- 視覺 token：[apps/remote-web/src/styles.css](apps/remote-web/src/styles.css)
- 狀態傳輸：[apps/remote-web/src/lib/connection.ts](apps/remote-web/src/lib/connection.ts)
