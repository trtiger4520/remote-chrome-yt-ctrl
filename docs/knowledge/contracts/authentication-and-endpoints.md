---
type: Contract
title: Authentication and endpoints
description: 定義 pairing authentication、公開 HTTP endpoints、SignalR paths 與 rate limits
tags:
  - contract
  - authentication
  - http
  - security
status: active
code_paths:
  - src/RemoteChromeYouTubeController.Server/Program.cs
  - src/RemoteChromeYouTubeController.Server/Authentication
  - src/RemoteChromeYouTubeController.Server/Services/PairingTokenService.cs
---

# Authentication and endpoints

## Authentication scheme

Scheme name 是 `PairingToken`

只處理 `/hubs/remote` 與 `/api/status`

Token 來源優先順序：

1. `Authorization: Bearer <token>`
2. `/hubs/remote` 的 `access_token` query

其他 path 回傳 NoResult，不會套用 pairing authentication

## Endpoints

| Path | Method | Authentication | 限制與用途 |
|---|---|---|---|
| `/` | GET | 無 | Remote Web SPA |
| `/connect` | GET | 無 | 配對頁，SPA fallback |
| `/health/live` | GET | 無 | process health |
| `/api/pairing` | GET | 無 | private interface QR codes |
| `/api/status` | GET | PairingToken | 目前 status、state 與 menu snapshot |
| `/api/youtube-thumbnail/{videoId}` | GET | 無 | 固定 YouTube thumbnail proxy，60/min/IP |
| `/hubs/remote` | SignalR | PairingToken | Remote client，negotiate 20/min/IP |
| `/hubs/extension` | SignalR | loopback 加 Extension CORS | Chrome Extension client |

## Extension Hub

HTTP middleware 與 Hub lifecycle 都必須檢查 loopback

CORS policy 只接受 `chrome-extension://` 開頭的 origin，允許 credentials、headers 與 methods

Loopback 是主要安全邊界，CORS 不是 authentication 的替代品

## Server limits

- SignalR maximum receive message size：16 KiB
- keep alive：15 seconds
- client timeout：45 seconds
- command timeout：預設 5 seconds
- Remote Hub negotiate：20 requests per minute per remote IP
- thumbnail：60 requests per minute per remote IP
- thumbnail upstream timeout：5 seconds
- thumbnail body：最多 1 MiB

## Static files

Server 使用 default files、static files 與 fallback to `index.html`

若 `artifacts/remote-web` 存在，它是 web root；否則回到 project `wwwroot`

## Security headers

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: no-referrer`
- CSP 限制 self resources、local websocket/http connect、data image 與禁止 frame ancestors

## 變更觸發

新增 endpoint、改變 authentication path、rate limit、CORS、CSP、SignalR limit 或 static hosting 時必須更新本文件、安全邊界與 endpoint tests

## 相關文件

- [Trust boundaries](../architecture/trust-boundaries.md)
- [Pairing and remote connection](../features/pairing-and-connection.md)
- [Configuration](configuration.md)

