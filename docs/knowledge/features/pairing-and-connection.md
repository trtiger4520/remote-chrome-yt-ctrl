---
type: Feature
title: Pairing and remote connection
description: 定義 QR pairing、手機 Token 保存、Remote Hub authentication 與 reconnect 行為
tags:
  - feature
  - pairing
  - authentication
  - signalr
status: active
code_paths:
  - apps/remote-web/src/ConnectPage.vue
  - apps/remote-web/src/lib/pairing.ts
  - apps/remote-web/src/lib/connection.ts
  - src/RemoteChromeYouTubeController.Server/Authentication
  - src/RemoteChromeYouTubeController.Server/Services/PairingTokenService.cs
  - src/RemoteChromeYouTubeController.Server/Services/PairingUrlPrinter.cs
---

# Pairing and remote connection

## 使用者目的

使用者在 Server 電腦開啟 `/connect`，用同一私人 LAN 的手機掃描 QR 後即可使用 Remote Web，不需要輸入帳號或重新設定 Chrome

## 配對流程

1. Server 啟動時確保 persistent pairing token 存在
2. `/api/pairing` 回傳每個 private IPv4 介面的 QR Code
3. QR 導向 Remote Web 根路徑，token 放在 URL fragment
4. Remote Web 只接受符合 `[A-Za-z0-9_-]{40,100}` 的 token
5. 合法 token 寫入 `localStorage` key `remote-youtube.pairing-token`
6. 使用 `history.replaceState` 清除 fragment
7. Remote Web 使用 token 建立 `/hubs/remote` SignalR connection

沒有 private IPv4 時，配對頁會產生 loopback URL，只能在同一台電腦測試

## Remote Web 狀態

| phase | 意義 | UI 行為 |
|---|---|---|
| `unpaired` | 沒有本機 token | 顯示等待配對與 `/connect` 指引 |
| `connecting` | 初次連線中 | 顯示 pending 狀態並停用控制 |
| `connected` | Remote Hub 已連線 | 依 Extension 與 target status 決定控制可用性 |
| `reconnecting` | 暫時失去 Server | 保留最後資料、停用控制並持續重試 |
| `error` | token 被拒絕 | 提示重新配對，不再一般重試 |

## Reconnect

- SignalR automatic reconnect 使用 `0, 2000, 10000, 30000` milliseconds
- connection close 後，每五秒重新建立一次
- reconnect 成功後呼叫 `GetSnapshot` 恢復 status、PlayerState 與 VideoMenu
- 使用者可清除本機 token 並 reload 重新配對

## Token rotation

```powershell
dotnet run --project src/RemoteChromeYouTubeController.Server -- --reset-pairing
```

rotation 後所有既有手機 token 都失效，必須重新掃描 QR

## 非目標

- 沒有使用者帳號、權限層級或多使用者 session
- 沒有 token expiry、revocation list 或 device management
- 沒有公網身份驗證能力
- `/api/pairing` 沒有 authentication，依賴 private LAN 邊界

## 失敗與復原

- 401 或 Unauthorized：進入 `error`，要求重新配對
- Server offline：進入 `reconnecting`，五秒後重試
- QR API 失敗：配對頁顯示錯誤並提供重新載入
- token 檔案內容無效：Server 重新產生 token

## 驗證

- `PairingTokenServiceTests`
- `ServerEndpointTests`
- `apps/remote-web/src/lib/pairing.test.ts`
- `apps/remote-web/src/lib/connection.test.ts`
- Playwright 未配對引導
- 手動驗證 QR、手機 localStorage、fragment 清除與 token rotation

## 變更觸發

修改 token 格式、儲存位置、QR payload、authentication path、connection phase 或 reconnect 行為時必須更新本文件

## 相關文件

- [Authentication and endpoints](../contracts/authentication-and-endpoints.md)
- [Trust boundaries](../architecture/trust-boundaries.md)
- [Private LAN HTTP decision](../decisions/private-lan-http.md)

