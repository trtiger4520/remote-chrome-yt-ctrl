---
type: Feature
title: Target selection and navigation
description: 定義自動目標分頁選擇、持久 target、YouTube URL allowlist 與手動導向
tags:
  - feature
  - chrome-extension
  - navigation
  - youtube
status: active
code_paths:
  - apps/chrome-extension/src/background.ts
  - apps/chrome-extension/src/targeting.ts
  - src/RemoteChromeYouTubeController.Server/Services/YouTubeUrlValidator.cs
  - src/RemoteChromeYouTubeController.Server/Hubs/RemoteHub.cs
  - apps/remote-web/src/App.vue
---

# Target selection and navigation

## 使用者目的

使用者不需要手動選擇 Chrome tab，系統自動操作目前或最近使用的支援 YouTube 影片頁面

## Target precedence

Extension service worker 依序選擇：

1. Chrome tab activation event 指定的支援頁面
2. `chrome.storage.local` key `remote-youtube.target-tab-id` 保存且仍存在的 tab
3. last-focused window 中 active 的支援 YouTube tab
4. 沒有可用 target 時清除保存值

支援頁面的 PlayerState 也可在尚未選定 target 時建立 target

target tab 被關閉、離開支援 URL 或無法再存取時，重新執行 selection

## 支援 URL

- protocol 必須是 HTTPS
- host 必須是 `youtube.com`、`www.youtube.com`、`m.youtube.com` 或 `youtu.be`
- 不允許 username 或 password
- `watch` 必須有長度 1 到 100 的 `v`
- `shorts` 與 `live` 必須只有一段長度 1 到 100 的 video id
- `youtu.be` 必須只有一段 video id，並正規化成 `www.youtube.com/watch?v=...`
- URL 最長 2048 characters

Server 與 Extension 各自驗證 allowlist，任何一層拒絕都不可導向

## Navigation

- Remote Web URL 輸入與 VideoMenu 都送出 `navigate`
- 若已有 target，service worker 使用 `chrome.tabs.update`
- 若沒有 target，使用 `chrome.tabs.create` 建立 active tab 並保存 id
- navigation 成功只代表 Chrome 接受導向，回傳 status 是 `accepted`
- 新頁面完成載入並發布 PlayerState 後，Remote Web 才會顯示 ready

## 非目標

- 第一版沒有 tab selector
- 不支援首頁、playlist page、channel page 或任意網站
- 不自動選取下一部影片
- 不保證目前 visually active tab 永遠覆蓋先前 target，只有支援的 Chrome lifecycle event 會觸發重新選擇

## 失敗與復原

- 不支援 URL：`unsupported_url`
- 沒有 target 且 command 不是 navigate：`target_missing`
- content script 未注入或 video 尚未準備：`video_missing`
- tab 被移除或 URL 離開 allowlist：清除或重新選 target，Server state 隨後清除

## 驗證

- `apps/chrome-extension/src/targeting.test.ts`
- `YouTubeUrlValidatorTests`
- `CommandValidatorTests`
- Remote Web navigation unit tests
- 真實 Chrome 驗證 active tab、保存 target、tab close、SPA navigation 與建立新 tab

## 變更觸發

修改 precedence、storage key、host/path allowlist、URL normalization、tab creation 或新增 tab selector 時必須更新本文件與安全邊界

## 相關文件

- [Playback controls](playback-controls.md)
- [Trust boundaries](../architecture/trust-boundaries.md)
- [Authentication and endpoints](../contracts/authentication-and-endpoints.md)

