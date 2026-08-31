---
type: Playbook
title: Local development
description: 在 Windows 使用 .NET、pnpm、Vite 與 unpacked Chrome Extension 啟動完整開發環境
tags:
  - playbook
  - development
  - windows
  - chrome-extension
status: active
code_paths:
  - scripts/dev.ps1
  - apps/remote-web/vite.config.ts
  - apps/chrome-extension/scripts
  - src/RemoteChromeYouTubeController.Server
---

# Local development

## 前置需求

- Windows 10 或更新版本
- .NET SDK 10.0.303 或相容 feature band
- Node.js 24 或更新版本
- pnpm 11 或更新版本
- Chrome 116 或更新版本
- 手機與 Server 電腦位於同一私人 LAN

## 初次安裝

```powershell
pnpm install --frozen-lockfile
pnpm build
dotnet build RemoteChromeYouTubeController.slnx
```

若 pnpm 尚未啟用，可依本機 Node 安裝方式啟用 Corepack

## 開發程序

在三個 PowerShell terminal 分別執行：

```powershell
dotnet run --project src/RemoteChromeYouTubeController.Server
```

```powershell
pnpm dev:web
```

```powershell
pnpm dev:extension
```

`pwsh ./scripts/dev.ps1` 只檢查工具版本並列出上述步驟，不會自動開啟 Chrome 或修改 Windows Firewall

## Remote Web

Vite 預設使用 `http://localhost:5173`

開發 proxy 將 `/hubs` 與 `/api` 導向 `http://127.0.0.1:8154`

若要驗證 Server-hosted production build，先執行 `pnpm build`，再從 `http://localhost:8154` 開啟

## Chrome Extension

1. 開啟 `chrome://extensions`
2. 開啟開發人員模式
3. 選擇載入未封裝項目
4. 指定 `artifacts/chrome-extension`
5. watch build 後若 service worker 沒有自動更新，手動按重新載入
6. 在 Extension 詳細資料開啟 service worker console 觀察連線

## 配對

1. 在 Server 電腦開啟 `http://localhost:8154/connect`
2. 選擇與手機相同網路的 QR Code
3. 手機掃描後開啟 Remote Web
4. 確認 Server、Extension 與 YouTube 三層狀態

換發 token：

```powershell
dotnet run --project src/RemoteChromeYouTubeController.Server -- --reset-pairing
```

## 常見問題

### Extension offline

- 確認 Server 監聽 `127.0.0.1:8154`
- 在 `chrome://extensions` 重新載入
- 檢查 service worker console
- 確認 Extension 的 YouTube site access 沒有被停用

### Target missing

- 開啟支援的 `/watch`、`/shorts/{id}` 或 `/live/{id}`
- 確認 content script 已注入
- YouTube SPA 換頁後等待 video 與 DOM 完成載入
- 沒有 tab 時，可從手機貼上支援 URL 建立新 target

### 手機無法連線

- 確認手機與 Server 在同一私人 LAN
- 確認 Windows network profile 與 Firewall 只允許 Private profile 的 TCP 8154
- 選擇 `/connect` 中與手機同網段的 private IPv4 QR
- 不要使用 `127.0.0.1` QR 連接另一台裝置

## 相關文件

- [Pairing and remote connection](../features/pairing-and-connection.md)
- [Configuration](../contracts/configuration.md)
- [Build artifacts](../architecture/build-artifacts.md)

