---
type: Feature
title: Player state synchronization
description: 定義播放器狀態擷取、節流、sequence ordering、target status 與 reconnect snapshot
tags:
  - feature
  - state-sync
  - signalr
  - youtube
status: active
code_paths:
  - apps/chrome-extension/src/content-script.ts
  - apps/chrome-extension/src/background.ts
  - src/RemoteChromeYouTubeController.Server/Hubs/ExtensionHub.cs
  - src/RemoteChromeYouTubeController.Server/Services/ExtensionRegistry.cs
  - apps/remote-web/src/lib/connection.ts
  - apps/remote-web/src/App.vue
---

# Player state synchronization

## 狀態內容

PlayerState 包含：

- protocol version、sequence、targetKey
- title、URL、currentTime、duration
- paused、muted、volume、playbackRate
- isLive、canSeek、isFullscreen、captionsEnabled、liked
- capturedAtUtc

`liked` 可為 null，代表目前 DOM 無法可靠判斷或控制

live stream 的 duration 必須是 null，seek 不可用

## 擷取

content script 只在 `/watch`、`/shorts/` 或 `/live/` 且找到 `video` 時建立 PlayerState

以下事件立即或節流觸發狀態發布：

- play、pause、volumechange、ratechange
- loadedmetadata、durationchange、ended
- timeupdate
- captions track change、addtrack、removetrack
- YouTube DOM replacement 與 SPA navigation
- command 完成

timeupdate report 最多約每 250ms 一次

## Ordering

- 每個 content script page instance 產生 UUID `pageInstanceId`
- content script 每次狀態增加 sequence
- service worker 將 targetKey 轉為 `tabId:pageInstanceId`
- Server 與 Remote Web 都只在同一 targetKey 下比較 sequence
- 新 targetKey 可從較小 sequence 重新開始
- 過期或其他 Extension connection 的更新必須忽略

## SystemStatus

Server 依 ExtensionRegistry 建立：

| targetStatus | 條件 |
|---|---|
| `none` | 沒有 PlayerState |
| `loading` | 非 live 且 duration 為 null |
| `ready` | live，或一般影片可以 seek |
| `unsupported` | 有 duration 但 `canSeek=false` |

`protocolCompatible` 只有目前 Extension 已連線且 version 相同時為 true

## Remote Web

- 連線後取得 snapshot，包含 status、state、menu
- 接收即時 `SystemStatus`、`PlayerState` 與 `VideoMenuUpdated`
- 播放中時以 capturedAtUtc 與 playbackRate 在 client 端推算顯示時間
- seek 或 volume 操作期間使用 local draft，收到接近的 server state 後清除 draft
- reconnect 時保留最後資料但停用控制，成功後重新套用 snapshot
- Extension offline 時清除 player 與 video menu

## 清除時機

- current Extension disconnect
- target 不存在或 content script 回傳 null
- Extension 註冊取代舊 connection
- content script 離開支援頁面

清除 PlayerState 時 VideoMenu 也必須清除

## 非目標

- 沒有歷史狀態或 event sourcing
- 沒有多 target state
- 沒有 Server-side clock interpolation
- 沒有跨 process 持久化

## 驗證

- `ExtensionRegistryTests`
- `PlayerStateValidatorTests`
- `apps/remote-web/src/lib/connection.test.ts`
- `apps/remote-web/src/App.test.ts`
- protocol fixture tests
- 真實 YouTube 驗證 SPA 換頁、live、reconnect 與 video replacement

## 變更觸發

修改 PlayerState 欄位、sequence、targetKey、status mapping、report 節流、snapshot 或清除時機時必須更新本文件

## 相關文件

- [Runtime flows](../architecture/runtime-flows.md)
- [Realtime protocol](../contracts/realtime-protocol.md)
- [Video menu and thumbnails](video-menu-and-thumbnails.md)

