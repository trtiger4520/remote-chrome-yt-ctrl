# Remote Chrome YouTube Controller

YouTube Remote 是一套只在私人區網使用的手機遙控器。手機開啟 Server 提供的 Vue 介面，Server 透過 SignalR 將指令轉給 Chrome Manifest V3 Extension，再由 YouTube 分頁中的 `<video>` 元素直接執行控制；目前畫面上的其他影片連結也會整理成手機上的手動選單，不會自動續播

第一版刻意不使用 CDP、不要求重新開啟 Chrome、不建立第二個 Chrome Profile，也不會把既有登入狀態送到 Server

## 前置需求

- Windows 10 或更新版本
- .NET SDK 10.0.303（同 feature band 可更新）
- Node.js 24 或更新版本
- pnpm 11 或更新版本
- Chrome 116 或更新版本
- 手機與執行 Server 的電腦位於同一個私人網路

## 從空目錄建置

```powershell
pnpm install
pnpm build
dotnet build RemoteChromeYouTubeController.slnx --configuration Release
```

若系統尚未啟用 pnpm，可先執行 `corepack enable`，或使用使用者已安裝的 pnpm 路徑。`pnpm install` 只會安裝 workspace 內鎖定的套件版本

## 開發

先啟動 Server：

```powershell
dotnet run --project src/RemoteChromeYouTubeController.Server
```

再分別啟動前端與 Extension watch build：

```powershell
pnpm dev:web
pnpm dev:extension
```

Vite 遙控介面預設使用 `http://localhost:5173`，並將 `/hubs` 與 `/api` 代理至 `http://127.0.0.1:8154`。Server 本身在 `artifacts/remote-web` 存在時會使用該目錄提供靜態檔案

`pwsh ./scripts/dev.ps1` 只檢查版本並列出啟動步驟，不會替使用者自動開啟 Chrome 或修改 Windows Firewall

## 首次配對

1. 執行 Server，於 Server 電腦開啟 `http://localhost:8154/connect` 顯示配對 QR Code
2. 在 Chrome 的 `chrome://extensions` 開啟開發人員模式
3. 選擇「載入未封裝項目」，指定 `artifacts/chrome-extension`
4. 在 Chrome 開啟 YouTube 影片，確認 Extension service worker 已連線
5. 用手機掃描 `/connect` 頁面的 QR Code，手機頁面會讀取 URL fragment 中的 Token，存入 `localStorage` 後立即清除 fragment
6. 回到 YouTube 分頁操作播放、暫停、前後十秒、進度、音量、靜音、倍速、字幕、全螢幕與按讚，或從「畫面上的影片」選單手動切換
7. 需要時可在折疊式輸入區貼上 HTTPS YouTube 網址

配對 Token 會保存於 `%LOCALAPPDATA%\RemoteChromeYouTubeController\pairing-token`。需要換發 Token 時使用 `--reset-pairing`，之後重新整理 `/connect` 頁面即可顯示新的 QR Code

## 發佈

```powershell
pwsh ./scripts/publish.ps1
```

腳本會先建置 protocol、Vue 遙控介面與 Extension，再以 framework-dependent `win-x64` 發佈 Server 至 `artifacts/publish/server`，並複製可直接載入的 Extension 至 `artifacts/publish/chrome-extension`。發佈目錄另有 `VERSION.json` 記錄產品版本與 protocol version，不會包含配對 Token、開發憑證或本機設定

## 安全界線

第一版是 LAN HTTP。Token 放在 URL fragment，不會隨首次頁面 request 傳送，但同網段的封包側錄仍可能取得後續 SignalR access token。請勿將 8154 直接暴露至公網，也不要將配對網址貼到公開頻道

Server 只允許 Remote Hub 使用配對 Token，Extension Hub 只接受 `127.0.0.1` 與 `::1`。導航網址在 Server 與 Extension 兩層限制為 HTTPS YouTube `youtube.com`、`www.youtube.com`、`m.youtube.com` 或 `youtu.be` 的影片網址

Windows Firewall 請只針對私人網路 profile 建立 TCP 8154 入站規則，並由管理者依環境人工設定。程式不會自動修改 Firewall

未來若加入 Cloudflare Tunnel，必須改成 HTTPS、正確處理 forwarded headers、加入可信 proxy 邊界、改用短期可撤銷 session token，並重新檢視 CORS 與 Origin 驗證

## 驗證命令

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

Playwright 目前涵蓋未配對引導、行動／窄螢幕／桌面 viewport、無水平溢位與 reduced-motion；真實 Chrome、手機與 YouTube 控制仍需依手動端到端清單驗收。其餘 protocol、配對、狀態序列、指令驗證與前端單元測試可直接由上述命令執行

## 故障排除

### Extension 顯示離線

- 在 `chrome://extensions` 按 Extension 的重新載入
- 開啟 Extension 詳細資料的 Service worker 檢查主控台
- 確認 Server 正在 `127.0.0.1:8154` 監聽
- 確認 Chrome 沒有停用 Extension 的 YouTube 網站存取權

### 找不到影片或控制沒有反應

- 確認目前分頁是支援的 YouTube 影片網址，而不是首頁或嵌入播放器
- 開啟該分頁的 DevTools Console，確認 content script 已重新注入
- YouTube SPA 換頁時 Extension 會透過 `yt-navigate-finish`、MutationObserver 與 video lifecycle event 重新綁定 `<video>`
- 「畫面上的影片」選單只整理目前畫面已載入且可見的其他影片連結；在 YouTube 捲動或等待內容載入後，清單會重新整理
- 沒有目標分頁時，先在手機的網址區貼上 HTTPS YouTube 影片網址，Extension 會建立並鎖定新分頁

### 連接埠或多張網卡問題

- 確認 8154 沒有被其他程式占用
- `/connect` 會為每個私人 IPv4 介面顯示獨立 QR，手機請掃描與自身網路相同的介面
- 若看不到私人位址，先檢查 Windows 網路 profile 與 Firewall；`127.0.0.1` 只適合在同一台電腦測試

### Token 無效

- 在 Server 使用 `dotnet run --project src/RemoteChromeYouTubeController.Server -- --reset-pairing`
- 重新掃描新的 QR
- 手機畫面也可按「清除並重新配對」刪除本機 Token

## 專案文件

- [PRODUCT.md](PRODUCT.md)：產品資訊與約束
- [DESIGN.md](DESIGN.md)：已選定的行動版視覺方向與 UI 契約
- [SECURITY.md](SECURITY.md)：LAN HTTP 威脅模型與未來 HTTPS 變更
- [AGENTS.md](AGENTS.md)：Agent 操作、工具路由、知識選讀與文件維護契約
- [docs/knowledge/index.md](docs/knowledge/index.md)：OKF v0.2 架構、功能、契約、決策、操作與品質知識入口
