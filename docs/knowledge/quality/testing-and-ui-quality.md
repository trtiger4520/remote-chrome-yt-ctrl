---
type: Quality Guide
title: Testing and UI quality
description: 定義 .NET、TypeScript、Playwright、Impeccable 與真實 Chrome 的品質責任邊界
tags:
  - quality
  - testing
  - ui
  - accessibility
status: active
code_paths:
  - tests
  - apps/remote-web/src
  - apps/chrome-extension/src
  - playwright.config.ts
  - DESIGN.md
---

# Testing and UI quality

## 測試分層

### TypeScript unit tests

- Protocol schema、action values 與 fixtures
- Remote Web pairing、connection state、command behavior 與 UI state
- Extension URL targeting、video menu、fullscreen 與 like-button helpers

### .NET unit and integration tests

- Command、PlayerState、VideoMenu 與 URL validators
- ExtensionRegistry connection replacement、sequence 與 status
- Pairing token 建立與驗證
- Protocol JSON fixtures
- Server endpoints、authentication、thumbnail proxy 與 headers

### Playwright

- 未配對引導
- 主要 viewport 與無水平 overflow
- reduced-motion
- 可在穩定 mock 狀態下驗證的 Remote Web 互動

### 真實 Chrome 與手機

- Manifest V3 service worker lifecycle
- Extension 到 localhost SignalR
- YouTube DOM 與 `HTMLVideoElement`
- SPA navigation、Shorts、Live、captions、fullscreen、like
- 實際 private LAN pairing 與手機觸控

## Impeccable

Impeccable 只用於前端介面設計與品質工作

### Remote Web

target 是 `apps/remote-web`

適用於：

- 新增或重塑操作介面
- 視覺階層、layout、typography、color 與 motion
- responsive、touch target 與一手操作
- accessibility、error、empty、loading、offline 與 reconnect states
- UX copy、audit、polish、harden 與 performance

使用前讀取根目錄 `PRODUCT.md`、`DESIGN.md` 與相關 Feature

### Extension

目前 Extension 沒有 popup 或 options UI

只有新增使用者可見 Extension UI 時才選擇 `apps/chrome-extension` target

service worker、targeting、protocol 或純 content-script 邏輯不使用 Impeccable

## UI 契約

- mobile-first，主要操作適合一手使用
- touch target 至少 44 CSS pixels
- keyboard focus 必須可見
- WCAG AA contrast
- `prefers-reduced-motion` 停止位移、縮放與脈動
- `aria-live` 只用於連線與錯誤，不播報高頻 timeupdate
- 320px 以上不得產生水平 overflow
- 360×800 與 390×844 的首屏應看得到主要播放控制
- command failure 不重置整個 connection

詳細視覺方向以根目錄 `DESIGN.md` 為準

## Review focus

- loading、offline、unsupported、live 與 reconnect 是否可區分
- 控制 enable state 是否來自 Server/Extension 回報，而不是 local assumption
- seek、volume 與 rate 是否可使用鍵盤和 touch
- 標題、URL 與影片清單長內容是否安全截斷
- thumbnail 失敗是否保留可操作內容
- reduced motion 與窄 viewport 是否仍完整可用

## 變更觸發

新增 UI surface、改變支援 viewport、可及性要求、測試分層或人工驗收責任時必須更新本文件與 `DESIGN.md`

## 相關文件

- [Playback controls](../features/playback-controls.md)
- [Video menu and thumbnails](../features/video-menu-and-thumbnails.md)
- [Validation and release](../playbooks/validation-and-release.md)
- [Design contract](../../../DESIGN.md)

