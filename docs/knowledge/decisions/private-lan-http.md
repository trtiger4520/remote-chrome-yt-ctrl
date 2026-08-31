---
type: Decision
title: Private LAN HTTP for the first release
description: 第一版採用私人 LAN HTTP，Extension 保持 loopback，且禁止直接公開 Server port
tags:
  - decision
  - security
  - network
  - release-v1
status: accepted
code_paths:
  - src/RemoteChromeYouTubeController.Server/Program.cs
  - apps/chrome-extension/src/background.ts
  - SECURITY.md
---

# Private LAN HTTP for the first release

## Context

產品目的是讓同一個私人網路上的手機控制使用者既有 Chrome Profile 中的 YouTube

第一版優先降低安裝與操作複雜度，不加入公網身份系統、TLS certificate 管理、Cloudflare Tunnel 或 Windows Service

## Decision

- Server 預設使用 HTTP 監聽私人 LAN 的 8154
- 手機 pairing token 是 private LAN 中的 bearer credential
- Chrome Extension 只連 `127.0.0.1` 的 Extension Hub
- Windows Firewall 必須由管理者只對 Private profile 人工設定
- 8154 不得直接公開、轉發到 router 或接入 public tunnel

## Consequences

正面：

- 保留既有 Chrome Profile 與登入狀態
- 不需要 CDP、第二個 browser profile 或瀏覽器 restart
- 本機部署與偵錯簡單

限制：

- 同網段流量觀察者可能取得 SignalR access token
- persistent token 沒有 expiry、session isolation 或 revocation list
- `/api/pairing` 與 thumbnail endpoint 依賴 private LAN boundary
- 此設計不能直接延伸到 Internet

## Rejected for version one

- Cloudflare Tunnel
- public HTTPS hosting
- OAuth 或帳號系統
- short-lived session service
- Docker 或 Kubernetes deployment
- Windows Service installer

## 重新檢視條件

出現以下需求時必須建立新的 Decision，不能直接修改本決策內容後沿用：

- 從私人 LAN 外控制
- 多使用者或多裝置權限
- Server 長期背景服務
- public DNS、Tunnel 或 reverse proxy
- 需要 session expiry、revocation 或 audit log

新設計至少涵蓋 HTTPS、trusted proxies、forwarded headers、Origin/Host validation、短期可撤銷 session、token rotation、連線審計與 CORS

## 相關文件

- [Trust boundaries](../architecture/trust-boundaries.md)
- [Authentication and endpoints](../contracts/authentication-and-endpoints.md)
- [Security notes](../../../SECURITY.md)
