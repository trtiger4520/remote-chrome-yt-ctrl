---
type: Architecture
title: Runtime flows
description: 描述配對、命令中繼、狀態同步、影片選單與重新連線的端到端流程
tags:
  - architecture
  - runtime
  - signalr
  - state-sync
status: active
code_paths:
  - apps/remote-web/src/lib
  - apps/chrome-extension/src
  - src/RemoteChromeYouTubeController.Server/Hubs
  - src/RemoteChromeYouTubeController.Server/Services
---

# Runtime flows

## 配對

1. Server 啟動時由 `PairingTokenService` 載入或建立 32-byte random token
2. `/api/pairing` 針對每個 private IPv4 address 建立 `/#token=...` QR Code
3. 手機開啟 URL 後，Remote Web 從 fragment 讀取 token
4. 合法 token 寫入 `localStorage`，接著立即從 address bar 移除 fragment
5. Remote Web 使用 SignalR `accessTokenFactory` 連線 `/hubs/remote`
6. Server authentication handler 驗證 bearer header 或 Remote Hub 的 `access_token` query

## Extension 註冊

1. service worker 連線 `http://127.0.0.1:8154/hubs/extension`
2. HTTP middleware 與 `ExtensionHub` 都檢查 remote IP 是 loopback
3. Extension 呼叫 `RegisterExtension`，傳送 protocol version 與 extension version
4. `ExtensionRegistry` 將新 connection 設為唯一目前連線，並清除舊 state 和 menu
5. protocol 相容後，service worker 取得目前 target 的 state 與 menu 並發布

## Remote command

```text
App.vue
  └─ createCommand
       └─ RemoteHub.SendCommand
            ├─ CommandValidator
            ├─ YouTubeUrlValidator for navigate
            └─ Extension client executeCommand
                 ├─ service worker handles navigate
                 └─ content script handles player and YouTube DOM actions
```

Server 使用設定的 command timeout 等待 Extension 回覆，預設五秒

Server 會檢查回傳的 `commandId`，避免錯誤回覆被套用到另一個命令

## Target tab

service worker 依序選擇：

1. Chrome event 指定且支援的 preferred tab
2. `chrome.storage.local` 中保存且仍有效的 target tab
3. last-focused window 中目前 active 的支援 YouTube tab
4. 沒有可用 tab 時清除 target

收到支援頁面的 PlayerState 時，若尚未選定 target，該 sender tab 可以成為 target

`navigate` 優先更新既有 target；沒有 target 時建立新的 active tab

## PlayerState

1. content script 綁定目前支援頁面的第一個 `video`
2. play、pause、volume、rate、metadata、duration、ended、timeupdate、caption 或 DOM 變化觸發 report
3. timeupdate 最多約每 250ms 發布一次，其餘重要狀態可立即發布
4. service worker 驗證 schema，並將 `targetKey` 正規化為 `tabId:pageInstanceId`
5. `ExtensionHub.PublishState` 驗證 connection 與 state
6. `ExtensionRegistry` 依 targetKey 與 sequence 忽略過期狀態
7. Server 廣播 PlayerState 與 SystemStatus 給所有 Remote clients
8. Remote Web 再次依 targetKey 與 sequence 避免倒序套用

## VideoMenu

1. content script 收集 viewport 中可見的 YouTube video links
2. URL 經 allowlist 正規化，以 video id 去重並排除目前影片
3. 最多發布 20 筆，並與 PlayerState 使用相同 page instance targetKey
4. Server 驗證並保存最新 menu，再廣播 `VideoMenuUpdated`
5. Remote Web 只顯示與目前 PlayerState targetKey 相同的 menu
6. 使用者點選後才送出 `navigate`，系統不會自動續播

## Reconnect

- Remote Web 與 Extension 都使用 SignalR automatic reconnect delay `0, 2s, 10s, 30s`
- automatic reconnect 完全結束後，兩端另外以五秒間隔重新嘗試建立 connection
- Remote Web reconnect 後呼叫 `GetSnapshot`
- Extension reconnect 後重新註冊並重新發布 target state 和 menu
- Extension disconnect 時 Server 清除目前 connection、state、menu，並通知 Remote clients

## SPA navigation 與 DOM replacement

YouTube 可能在不完整 reload 的情況下更換 URL、DOM 或 `video`

content script 使用 video events、MutationObserver 與 YouTube navigation lifecycle 重新尋找並綁定 target，頁面 instance 的 sequence 與 menu 也必須保持一致

## 變更觸發

修改以下行為時必須更新本文件：

- target selection precedence
- SignalR method 或 reconnect 流程
- command acknowledgement 或 timeout 語意
- sequence、targetKey 或 snapshot 行為
- content script 的 report 觸發與節流
- VideoMenu 收集或清除時機

