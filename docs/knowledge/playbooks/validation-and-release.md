---
type: Playbook
title: Validation and release
description: 依變更範圍執行文件、.NET、pnpm、Playwright、真實 Chrome 與發布驗證
tags:
  - playbook
  - validation
  - testing
  - release
status: active
code_paths:
  - package.json
  - scripts/validate-knowledge.ps1
  - scripts/publish.ps1
  - .github/workflows/ci.yml
  - tests
---

# Validation and release

## 文件驗證

所有知識文件變更先執行：

```powershell
pnpm docs:check
```

此檢查驗證：

- OKF root version
- 每個分類都有 `index.md`
- concept frontmatter 與必要欄位
- frontmatter 中已列出的 `code_paths`
- 同層 index 收錄
- 子目錄 index 導航
- Markdown local links
- `log.md` 日期格式

它無法判斷文件語意是否與程式一致，仍需使用 CodeGraph 與 review 確認

## 變更範圍

| 修改 | 最低檢查 |
|---|---|
| 知識文件 | `pnpm docs:check` |
| Remote Web | `pnpm --filter @remote-youtube/remote-web lint typecheck test build` |
| Extension | `pnpm --filter @remote-youtube/chrome-extension lint typecheck test build` |
| Protocol | protocol lint、typecheck、test、build，加兩個 app 的 typecheck、test、build |
| Server | Release build、相關 tests、dotnet format |
| UI | Remote Web checks，加 Playwright 或真實瀏覽器驗證 |
| 跨端協定 | 完整 .NET 與 pnpm checks |
| 發布 | 完整 checks、publish、artifacts inspection |

## 完整 CI

```powershell
pnpm docs:check
dotnet build RemoteChromeYouTubeController.slnx --configuration Release
dotnet test RemoteChromeYouTubeController.slnx --configuration Release --no-build
dotnet format RemoteChromeYouTubeController.slnx --verify-no-changes
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright test
```

Playwright 首次環境需要 Chromium：

```powershell
pnpm exec playwright install chromium
```

## 真實 Chrome 驗收

以下行為不能只用 unit test 或 mock page 取代：

- Extension service worker lifecycle 與 reconnect
- YouTube SPA navigation 與 video replacement
- active/remembered target tab selection
- autoplay policy
- captions 與 fullscreen
- YouTube like button DOM
- viewport video menu selectors
- 手機與私人 LAN 配對

## Publish

```powershell
pwsh ./scripts/publish.ps1
```

驗收 `artifacts/publish`：

- `server` 包含 framework-dependent win-x64 Server 與 Remote Web assets
- `chrome-extension` 可由 Chrome 直接載入
- `VERSION.json` 的 product version 與 protocol version 正確
- 不包含 pairing token、開發憑證或本機設定

## 完成證據

- 只有在目前工作階段實際執行並觀察 exit code 後才能宣稱檢查通過
- 若因環境無法執行真實 Chrome 或手機驗收，最終報告必須列為未驗證項目
- 文件修改需列出更新的 Feature、Architecture、Contract 或 Decision

## 相關文件

- [Testing and UI quality](../quality/testing-and-ui-quality.md)
- [Build artifacts](../architecture/build-artifacts.md)
