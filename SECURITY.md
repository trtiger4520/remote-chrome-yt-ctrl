# Security Notes

## 第一版威脅模型

這是單一 Windows 電腦、單一 Chrome Profile、私人區網的個人工具。配對 Token 是 32 bytes 的 cryptographically secure random value，保存於使用者 LocalAppData，手機只在首次載入時從 URL fragment 讀取並立即清除 fragment

LAN HTTP 的限制仍然存在：SignalR 在 WebSocket transport 可能把 access token 放在 query string，同網段能觀察流量的攻擊者可能取得 token。Token 不是使用者帳號，也沒有細粒度權限，因此第一版的安全邊界是可信私人網路，而不是公網身份驗證

## 已實作的邊界

- `/hubs/remote` 與 `/api/status` 需要配對 Token
- `access_token` query 只在 Remote Hub 路徑讀取
- Extension Hub 在 HTTP middleware 與 Hub 內雙重檢查 loopback
- Extension CORS 只接受 `chrome-extension://` origin
- 導航 URL 在 Server 與 Extension 兩層驗證 HTTPS YouTube allowlist
- Server 不記錄完整配對 URL，也不把 access token 寫入 structured log
- CSP、`X-Content-Type-Options`、`X-Frame-Options`、`Referrer-Policy` 已設定
- SignalR message size 上限 16 KiB，command timeout 5 秒

## Windows Firewall

請由管理者只為私人網路 profile 建立 8154 TCP 入站規則。不要為 Public profile 開放，也不要把埠口轉發到路由器或雲端。程式不會自動改寫 Firewall 規則

## 未來 Cloudflare Tunnel 必須重新設計

加入 Tunnel 前至少需要 HTTPS、可信 proxy 與 forwarded headers 邊界、短期且可撤銷的 session token、Origin／Host allowlist、連線審計與 token rotation。第一版的持久 LAN Token 不應直接沿用為公網憑證
