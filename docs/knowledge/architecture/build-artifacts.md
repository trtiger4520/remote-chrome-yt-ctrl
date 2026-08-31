---
type: Architecture
title: Build artifacts
description: 描述 pnpm workspace、Vite 輸出、Server web root 與 Windows 發布目錄
tags:
  - architecture
  - build
  - artifacts
  - release
status: active
code_paths:
  - package.json
  - apps/remote-web/vite.config.ts
  - apps/chrome-extension/scripts
  - scripts/publish.ps1
  - src/RemoteChromeYouTubeController.Server/Program.cs
---

# Build artifacts

## Workspace build 順序

根目錄 `pnpm build` 依序執行：

1. `@remote-youtube/protocol`
2. `@remote-youtube/remote-web`
3. `@remote-youtube/chrome-extension`

Protocol 必須先產生 `dist`，兩個 app 才能使用 workspace export

## Development outputs

| 輸出 | 來源 | 使用者 |
|---|---|---|
| `packages/protocol/dist` | TypeScript compiler | Remote Web 與 Extension build |
| `artifacts/remote-web` | Remote Web Vite build | ASP.NET Core static web root |
| `artifacts/chrome-extension` | Extension Vite builds 加 manifest/icon copy | Chrome unpacked extension |

Server 啟動時只有在 `artifacts/remote-web` 已存在時才將它設成 web root，否則使用 project 的預設 `wwwroot`

Remote Web development server 預設是 `http://localhost:5173`，並將 `/hubs` 與 `/api` proxy 到 `http://127.0.0.1:8154`

## Publish outputs

`pwsh ./scripts/publish.ps1` 會：

1. 執行 `pnpm build`
2. 以 framework-dependent `win-x64` 發布 Server
3. 複製可直接載入的 Extension
4. 產生包含 product version、protocol version、configuration 與 timestamp 的 `VERSION.json`

```text
artifacts/publish/
├─ server/
├─ chrome-extension/
└─ VERSION.json
```

發布內容不可包含 pairing token、開發憑證或本機設定

## 變更觸發

修改 workspace package、Vite output、Server web root、publish runtime、protocol version 或 artifacts 目錄時，必須同步更新本文件、README 與相關 Playbook

## 相關文件

- [Local development](../playbooks/local-development.md)
- [Validation and release](../playbooks/validation-and-release.md)
