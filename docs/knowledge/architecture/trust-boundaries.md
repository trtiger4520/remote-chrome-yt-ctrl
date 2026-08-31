---
type: Architecture
title: Trust boundaries
description: 定義第一版 LAN HTTP、pairing token、Extension loopback 與外部圖片來源的安全邊界
tags:
  - architecture
  - security
  - authentication
  - network
status: active
code_paths:
  - src/RemoteChromeYouTubeController.Server/Program.cs
  - src/RemoteChromeYouTubeController.Server/Authentication
  - src/RemoteChromeYouTubeController.Server/Services
  - apps/chrome-extension/manifest.json
  - apps/chrome-extension/src/targeting.ts
---

# Trust boundaries

## 信任模型

第一版假設 Server 電腦、手機與私人 LAN 可信，不提供公網等級的 session security

| 邊界 | 保護方式 | 已知限制 |
|---|---|---|
| 手機到 Remote Hub | persistent pairing token | LAN HTTP 可能被同網段側錄 |
| Chrome Extension 到 Extension Hub | loopback IP 加 Chrome Extension CORS | 沒有 bearer token，依賴同機與 loopback |
| Server 到 YouTube thumbnails | 固定 `i.ytimg.com` base address | 只代理圖片，不代理任意 URL |
| Extension navigation | Server 與 Extension 雙層 YouTube URL allowlist | 只接受特定 HTTPS video URL |
| Server process | Windows 使用者檔案與私人 firewall profile | 程式不自動設定 Firewall |

## Pairing token

- 使用 `RandomNumberGenerator.GetBytes(32)` 建立
- 轉成 URL-safe base64，長度驗證範圍為 40 到 100
- 預設保存於 `%LOCALAPPDATA%\RemoteChromeYouTubeController\pairing-token`
- 比較使用 `CryptographicOperations.FixedTimeEquals`
- QR URL 將 token 放在 fragment，首次 HTTP request 不會帶出 token
- Remote Web 保存 token 後立即移除 fragment
- `--reset-pairing` 會換發 token，既有手機必須重新配對

## HTTP endpoints

- `/hubs/remote` 與 `/api/status` 需要 pairing token
- `/hubs/extension` 必須來自 loopback
- `/api/pairing` 未驗證，只應在私人 LAN 使用
- `/api/youtube-thumbnail/{videoId}` 未驗證，因為 `<img>` 無法附帶 pairing bearer token
- thumbnail endpoint 有每 IP 每分鐘 60 次限制、5 秒 upstream timeout、1 MiB response 上限與 image content-type 檢查
- SignalR negotiate 每 IP 每分鐘最多 20 次

## Browser 與 URL

- Extension permissions 是 `tabs`、`storage`
- content script 只匹配 `https://*.youtube.com/*`
- 導航只允許 HTTPS 的 `youtube.com`、`www.youtube.com`、`m.youtube.com`、`youtu.be`
- 支援 `/watch?v=...`、`/shorts/{id}`、`/live/{id}` 與單一 youtu.be id
- URL 不允許 username 或 password
- youtu.be 會正規化成 `https://www.youtube.com/watch?v=...`

## Response hardening

Server 設定 CSP、`X-Content-Type-Options`、`X-Frame-Options` 與 `Referrer-Policy`

SignalR maximum receive message size 是 16 KiB

## 禁止事項

- 不可將 8154 做 router port forwarding 或直接公開
- 不可將 LAN token 直接沿用為 public tunnel credential
- 不可移除 Extension Hub loopback 雙重檢查只保留 CORS
- 不可擴大 URL allowlist 而沒有測試 SSRF、open navigation 與 credential handling
- 不可記錄完整 pairing URL、token 或 SignalR access token

## 公網化前置條件

加入 Cloudflare Tunnel 或其他公網入口前，至少需要新的 Decision 與威脅模型，涵蓋 HTTPS、forwarded headers、trusted proxies、Origin 和 Host allowlist、短期可撤銷 session、連線審計、token rotation 與 CORS

## 相關文件

- [Private LAN HTTP decision](../decisions/private-lan-http.md)
- [Authentication and endpoints](../contracts/authentication-and-endpoints.md)
- [Pairing and remote connection](../features/pairing-and-connection.md)
- [Security notes](../../../SECURITY.md)

