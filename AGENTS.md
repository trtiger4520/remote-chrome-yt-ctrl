# Remote Chrome YouTube Controller

## 專案契約

這是一套只供私人區網使用的 YouTube 手機遙控器

- Remote Web 讓手機送出控制命令並顯示即時播放器狀態
- ASP.NET Core Server 提供靜態網站、配對、驗證、SignalR 中繼與縮圖代理
- Chrome Manifest V3 Extension 操作使用者既有 Chrome Profile 中的 YouTube 分頁
- Shared Protocol 同時約束 TypeScript 與 C# 的訊息格式

第一版是 private-LAN HTTP，絕對不可將 TCP 8154 直接暴露到公網

## 快速架構

```text
Phone / Remote Web
  └─ authenticated SignalR /hubs/remote
       └─ ASP.NET Core Server
            ├─ ExtensionRegistry 保存目前連線、播放器狀態與影片選單
            ├─ Pairing、狀態 API、縮圖代理與靜態檔案
            └─ loopback-only SignalR /hubs/extension
                 └─ Chrome Extension service worker
                      └─ content script
                           └─ YouTube DOM 與 HTMLVideoElement
```

主要程式區域：

| 路徑 | 責任 |
|---|---|
| `apps/remote-web` | Vue 3 手機遙控介面、配對 Token 保存、Remote Hub client |
| `apps/chrome-extension` | Extension service worker、分頁選擇、YouTube content script |
| `packages/protocol` | TypeScript schemas、command actions、狀態與錯誤碼 |
| `src/RemoteChromeYouTubeController.Server` | ASP.NET Core、SignalR Hubs、驗證、狀態暫存與 HTTP endpoints |
| `tests` | .NET integration/unit tests、protocol fixtures、Playwright E2E |

完整架構與功能設計從 [`docs/knowledge/index.md`](docs/knowledge/index.md) 選讀

## 任務開始流程

所有程式修改與功能設計都必須依序完成：

1. 讀取 `docs/knowledge/index.md`
2. 依任務讀取相關分類的 `index.md`
3. 讀取相關 Feature、Contract、Decision 或 Playbook 文件
4. 若 `.codegraph/` 存在，使用 CodeGraph 確認受影響 symbol、呼叫鏈與目前實作
5. 在開始修改前確認文件影響與最低驗證範圍

不要為每個任務重新掃描整個 repository

知識文件是架構與功能意圖的入口，CodeGraph 是目前程式實作與影響範圍的依據

## 知識文件維護契約

新增或修改功能時，文件更新是 Definition of Done 的一部分

符合以下任一條件時，必須新增或更新 `docs/knowledge`：

- 新增使用者可觀察功能
- 改變既有功能行為、狀態、錯誤或邊界情境
- 改變 Remote Web、Server、Protocol、Extension 之間的資料流
- 改變 SignalR method、訊息 schema、protocol version 或公開 endpoint
- 改變 pairing、authentication、authorization、URL allowlist 或網路信任邊界
- 改變設定、啟動方式、build output、發布方式或必要工具版本
- 引入後續維護必須知道的重要設計決策

實作完成前必須：

1. 更新既有功能文件，或從 `docs/knowledge/templates/feature.md` 建立新文件
2. 將新文件加入同層 `index.md`，並確認上層索引仍能導向該分類
3. 更新文件中的程式位置、功能流程、限制與驗證方式
4. 若屬重要知識庫變更，在 `docs/knowledge/log.md` 加入紀錄
5. 執行 `pnpm docs:check`

只有內部重構、測試補強、拼字或格式修改，而且沒有改變既有契約時，才可不更新功能文件

最終報告必須列出已更新的知識文件；若沒有更新，必須說明判斷理由

不得將任務標記為完成，直到相關文件與驗證完成

## OKF 選讀規則

`docs/knowledge` 採用 Open Knowledge Format v0.2

- `index.md` 是 progressive disclosure 的必要入口
- 每個分類目錄都必須有 `index.md`
- 除保留的 `index.md`、`log.md` 外，每份 Markdown 都必須包含 YAML frontmatter 與非空白 `type`
- 本專案的 concept 文件還必須提供 `title`、`description`、`tags` 與 `status`
- 使用標準 Markdown 相對連結連接相關知識
- 功能文件描述目前成立的設計，歷史取捨放到 `decisions`
- 不保存可由 CodeGraph 即時取得的大量 class 或 symbol 清單

選讀路由：

| 任務 | 先讀 |
|---|---|
| 跨元件流程或 project 邊界 | `docs/knowledge/architecture/index.md` |
| 新增或修改使用者功能 | `docs/knowledge/features/index.md` |
| SignalR、schema、authentication、設定 | `docs/knowledge/contracts/index.md` |
| 變更安全或架構取捨 | `docs/knowledge/decisions/index.md` |
| 本機開發、驗證、發布 | `docs/knowledge/playbooks/index.md` |
| 測試、UI 品質、可及性 | `docs/knowledge/quality/index.md` |

## CodeGraph 使用原則

當 `.codegraph/` 存在且需要理解或定位程式時，在 `rg`、`find` 或大量讀檔前先使用：

```powershell
codegraph explore "<具體 symbol、檔案或呼叫鏈問題>"
```

適合：

- 找功能入口、呼叫鏈與 dynamic-dispatch 路徑
- 追蹤 RemoteHub、ExtensionHub、ExtensionRegistry 與 Extension 之間的關係
- 評估 symbol 的 blast radius 與相關測試
- 確認文件描述是否仍符合目前實作
- 讀取指定 symbol 或檔案的目前原始碼

不適合：

- 取代 build、test、lint、format 或實際瀏覽器驗證
- 查詢單一固定設定值、Git 狀態或檔案清單
- 使用寬泛問題取代明確的功能路徑查詢

## Skill 路由

### Impeccable

只用於前端 UI/UX 工作

- Remote Web target 使用 `apps/remote-web`
- Extension 只有新增可見 UI 時才以 `apps/chrome-extension` 為 target
- `packages/protocol`、Server、service worker 與非 UI content-script 邏輯不是 Impeccable target
- 根目錄 `PRODUCT.md` 與 `DESIGN.md` 是共用產品與設計依據
- 多個 target 存在時必須先選定 target，再執行 Impeccable workflow

適合 UI 規劃、視覺階層、responsive、accessibility、UX copy、狀態設計、audit、polish 與 harden

### .NET

- ASP.NET Core hosting、middleware、authentication：`dotnet-aspnet-core`
- SignalR hub、連線、reconnect 與即時訊息：`dotnet-signalr`
- 現代 C# 語法：`dotnet-modern-csharp`
- xUnit 測試：`dotnet-xunit`
- 格式驗證：`dotnet-format`
- project 邊界與架構：`dotnet-architecture`
- 無法分類的廣泛 .NET 任務才先使用 `dotnet` router

### Browser 與 Playwright

- UI 行為、responsive、可及性或真實頁面狀態需要瀏覽器驗證
- 自動化 E2E 使用 Playwright
- 需要既有登入 Chrome 與真實 YouTube 狀態時使用 Chrome 控制能力，不能以模擬頁面取代全部驗收

## 常見變更導航

| 目標 | 優先位置 | 同步檢查 |
|---|---|---|
| Remote Web 畫面或互動 | `apps/remote-web/src` | `DESIGN.md`、Feature、Playwright |
| 播放控制行為 | `content-script.ts` | Protocol、CommandValidator、Remote Web |
| Extension 連線或分頁選擇 | `background.ts`、`targeting.ts` | ExtensionHub、Feature |
| Remote command 中繼 | `RemoteHub.cs` | Protocol、Extension service worker |
| Extension 狀態發布 | `ExtensionHub.cs`、`ExtensionRegistry.cs` | PlayerState、VideoMenu、Remote Web |
| 配對與 Token | Authentication、Pairing services、`pairing.ts` | Security、pairing Feature |
| 共用訊息格式 | `packages/protocol`、Server Contracts | fixtures、兩端 validators、protocol version |
| 影片選單與縮圖 | `video-menu.ts`、App、thumbnail endpoint | URL validation、Feature |
| 建置或發布 | package scripts、Vite configs、`publish.ps1` | artifacts 文件、README |

## Toolchain

- Windows 10 或更新版本，主要 shell 是 PowerShell
- .NET SDK 10.0.303 或相容的最新 feature band
- Node.js 24 或更新版本
- pnpm 11 或更新版本
- Chrome 116 或更新版本

若任務需要 Docker，執行前先確認 Docker Desktop 已啟動

## 開發與建置

```powershell
pnpm install
pnpm build
dotnet build RemoteChromeYouTubeController.slnx
```

開發時分別啟動：

```powershell
dotnet run --project src/RemoteChromeYouTubeController.Server
pnpm dev:web
pnpm dev:extension
```

將 `artifacts/chrome-extension` 載入 Chrome 的 unpacked extension

## 驗證

文件變更至少執行：

```powershell
pnpm docs:check
```

程式變更依影響範圍執行最窄檢查，完成前執行所有相關檢查：

```powershell
dotnet build RemoteChromeYouTubeController.slnx --configuration Release
dotnet test RemoteChromeYouTubeController.slnx --configuration Release --no-build
dotnet format RemoteChromeYouTubeController.slnx --verify-no-changes
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright test
```

| 修改範圍 | 最低驗證 |
|---|---|
| OKF 知識文件 | `pnpm docs:check` |
| Remote Web | lint、typecheck、相關 test、build，UI 變更加 Playwright 或瀏覽器驗證 |
| Chrome Extension | lint、typecheck、相關 test、build，真實 YouTube 行為需手動驗收 |
| Shared Protocol | protocol test，加所有依賴端的 typecheck、test、build |
| Server | `dotnet build`、相關 `dotnet test`、`dotnet format` |
| 跨端協定或發布 | 完整 pnpm 與 dotnet 驗證，加 artifacts 結構檢查 |

測試只有在目前工作階段實際執行並觀察結果後才能宣稱通過

## 文件與提交文字

- 專案文件使用繁體中文，程式 identifier、協定名稱與工具名稱保留原文
- 註解、文件說明、提交訊息與 PR 訊息不使用句號 `。` 結尾
- 提交訊息與 PR 訊息以斷行分隔句子
- 不加入 `Co-Authored-By`
