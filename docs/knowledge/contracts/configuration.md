---
type: Contract
title: Configuration
description: 定義 Server options、YTREMOTE 環境變數、Extension storage 與 Remote Web localStorage
tags:
  - contract
  - configuration
  - storage
  - operations
status: active
code_paths:
  - src/RemoteChromeYouTubeController.Server/appsettings.json
  - src/RemoteChromeYouTubeController.Server/Configuration/ServerOptions.cs
  - apps/chrome-extension/src/background.ts
  - apps/remote-web/src/lib/pairing.ts
---

# Configuration

## Server options

設定來源包含 `appsettings.json`、environment-specific settings、command-line hosting configuration 與 `YTREMOTE_` prefix environment variables

| Key | Default | Validation | 用途 |
|---|---|---|---|
| `Server:Port` | `8154` | 1 到 65535 | HTTP port |
| `Server:BindAddress` | `0.0.0.0` | string | LAN bind address |
| `Server:CommandTimeoutSeconds` | `5` | 1 到 60 | Remote command timeout |
| `Server:Url` | 未設定 | hosting URL | 設定時覆蓋 BindAddress 與 Port 組合 |
| `Pairing:TokenPath` | null | optional path | 覆蓋 LocalAppData token 路徑 |

環境變數範例：

```powershell
$env:YTREMOTE_Server__Port = '8154'
$env:YTREMOTE_Server__BindAddress = '0.0.0.0'
$env:YTREMOTE_Server__CommandTimeoutSeconds = '5'
```

Options 在 Server startup 時驗證，錯誤設定應阻止啟動

## Extension storage

| Key | Default | 用途 |
|---|---|---|
| `remote-youtube.server-url` | `http://127.0.0.1:8154` | Extension Hub base URL |
| `remote-youtube.target-tab-id` | null | 最近選定的支援 YouTube tab id |

目前沒有使用者可見的 Extension options page，server URL 只保留作為 storage-based configuration

## Remote Web storage

| Key | 用途 |
|---|---|
| `remote-youtube.pairing-token` | 手機目前 pairing token |

清除並重新配對只移除此 localStorage key，不會換發 Server token

## 持久化邊界

- Server 只持久化 pairing token
- Extension 只持久化 server URL 與 target tab id
- Remote Web 只持久化 pairing token
- PlayerState、VideoMenu、connection 與 command 不持久化

## 變更觸發

新增設定、環境變數、storage key、預設值、validation 或設定 UI 時必須更新本文件與相關 Playbook

## 相關文件

- [Local development](../playbooks/local-development.md)
- [Pairing and remote connection](../features/pairing-and-connection.md)
- [Build artifacts](../architecture/build-artifacts.md)

