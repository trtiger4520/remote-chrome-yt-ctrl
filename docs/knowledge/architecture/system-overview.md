---
type: Architecture
title: System overview
description: 描述 Remote Web、Server、Shared Protocol 與 Chrome Extension 的責任和依賴方向
tags:
  - architecture
  - signalr
  - vue
  - chrome-extension
  - aspnet-core
status: active
code_paths:
  - apps/remote-web
  - apps/chrome-extension
  - packages/protocol
  - src/RemoteChromeYouTubeController.Server
---

# System overview

## 產品形態

本專案是單一 Windows 電腦上運作的私人 LAN 工具，不是多服務分散式系統

Server 是唯一需要由手機存取的 process，Remote Web 由 Server 提供，Extension 只連向同一台電腦的 loopback endpoint

## 元件責任

### Remote Web

- Vue 3 SPA，手機優先
- 從 URL fragment 接收一次性傳遞的 pairing token，保存到 `localStorage` 後清除 fragment
- 使用 token 連線 `/hubs/remote`
- 顯示 Server、Extension 與 YouTube target 狀態
- 建立控制命令，顯示 command rejection，並在 reconnect 後重新取得 snapshot
- 不直接存取 Chrome 或 YouTube

### ASP.NET Core Server

- 監聽私人 LAN，預設 `0.0.0.0:8154`
- 提供 Remote Web 靜態檔案、配對 QR、狀態 API、縮圖代理與 health check
- `/hubs/remote` 驗證 pairing token，接收手機命令
- `/hubs/extension` 僅接受 loopback Extension client
- 驗證命令、協定版本、播放器狀態、影片選單與導航 URL
- `ExtensionRegistry` 只保存一個目前 Extension connection、最新 PlayerState 與 VideoMenu
- 沒有資料庫，也不保存播放紀錄

### Shared Protocol

- `packages/protocol` 是 TypeScript client 的 runtime schema 與型別來源
- Server 在 `Contracts/ProtocolModels.cs` 維護對等的 C# records
- protocol fixtures 驗證兩端 JSON 相容性
- protocol version 必須由兩端同步變更

### Chrome Extension

- Manifest V3 service worker 連線 loopback Extension Hub
- service worker 選擇或建立目標 YouTube tab，並將命令轉給 content script
- content script 操作目前頁面的 `HTMLVideoElement` 和必要的 YouTube DOM 控制
- content script 發布 PlayerState 與目前 viewport 中可見的影片選單
- 使用既有 Chrome Profile 與登入狀態，不透過 CDP，也不傳送 cookies 給 Server

## 依賴方向

```text
Remote Web ─┐
            ├─> Shared Protocol schemas
Extension ──┘

Remote Web ──SignalR──> Server ──SignalR──> Extension service worker
Extension content script ──Chrome messaging──> service worker
```

Server 不直接依賴 TypeScript package，而是透過 C# contracts 與 fixture tests 維持相容

## 主要入口

| 區域 | 入口 |
|---|---|
| Remote Web | `apps/remote-web/src/main.ts`、`App.vue`、`ConnectPage.vue` |
| Remote connection | `apps/remote-web/src/lib/connection.ts` |
| Extension service worker | `apps/chrome-extension/src/background.ts` |
| Extension content script | `apps/chrome-extension/src/content-script.ts` |
| Shared protocol | `packages/protocol/src/index.ts` |
| Server | `src/RemoteChromeYouTubeController.Server/Program.cs` |
| Remote Hub | `Hubs/RemoteHub.cs` |
| Extension Hub | `Hubs/ExtensionHub.cs` |
| Runtime registry | `Services/ExtensionRegistry.cs` |

## 架構限制

- 第一版只支援一個 Extension connection 與一個自動選定 target tab
- 沒有持久化狀態、工作佇列或 command replay
- navigation 回傳 `accepted` 表示瀏覽器已開始導向，不表示新影片已完成載入
- Extension 與 Server 必須在同一台電腦，Extension Hub 不能改成 LAN endpoint 而不重新設計安全性
- 若新增 database、public tunnel、多使用者、多 Extension 或 tab selector，必須先新增 Decision 並更新本文件

## 相關文件

- [Runtime flows](runtime-flows.md)
- [Trust boundaries](trust-boundaries.md)
- [Realtime protocol](../contracts/realtime-protocol.md)
- [Private LAN HTTP decision](../decisions/private-lan-http.md)

