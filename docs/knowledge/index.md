---
okf_version: "0.2"
---

# Remote Chrome YouTube Controller Knowledge

本目錄是專案架構、功能與操作知識的選讀入口

開始任務前先依下列路由選擇分類，不需要一次載入所有文件

## 每次功能工作

- [Architecture](architecture/index.md) - 跨元件邊界、執行流程、安全邊界與建置輸出
- [Features](features/index.md) - 現有使用者功能、行為規則、邊界情境與驗證方式
- [Contracts](contracts/index.md) - 即時協定、認證、HTTP endpoints 與設定契約

## 依任務選讀

- [Decisions](decisions/index.md) - 影響後續設計的重要取捨與不可破壞條件
- [Playbooks](playbooks/index.md) - 本機開發、驗證、發布與人工驗收方式
- [Quality](quality/index.md) - 測試分層、UI 品質與真實環境驗收界線
- [Templates](templates/index.md) - 新增知識文件時使用的專案模板

## 根層文件

- [Knowledge update log](log.md) - 重要知識庫更新紀錄
- [Product context](../../PRODUCT.md) - Impeccable 與產品範圍的共用依據
- [Design contract](../../DESIGN.md) - Remote Web 的視覺與互動契約
- [Security notes](../../SECURITY.md) - 第一版威脅模型與未來公開網路要求
- [Agent instructions](../../AGENTS.md) - 每次任務必讀的操作與文件維護契約

## 選讀原則

- 修改功能時先讀 `features/index.md`，再讀與任務直接相關的 Feature
- 修改跨元件流程時加讀 `architecture/runtime-flows.md`
- 修改 schema、SignalR、authentication 或設定時加讀 `contracts/index.md`
- 修改安全邊界或長期架構方向時加讀 `decisions/index.md`
- 文件說明設計意圖與穩定契約，實際 symbol 與 blast radius 使用 CodeGraph 確認

