---
type: Feature
title: Video menu and thumbnails
description: 定義目前 YouTube viewport 的影片連結收集、去重、同步、手動選擇與縮圖代理
tags:
  - feature
  - video-menu
  - thumbnails
  - youtube
status: active
code_paths:
  - apps/chrome-extension/src/video-menu.ts
  - apps/chrome-extension/src/content-script.ts
  - apps/chrome-extension/src/background.ts
  - src/RemoteChromeYouTubeController.Server/Services/VideoMenuValidator.cs
  - src/RemoteChromeYouTubeController.Server/Services/YouTubeThumbnailService.cs
  - apps/remote-web/src/App.vue
---

# Video menu and thumbnails

## 使用者目的

手機顯示目前 YouTube 畫面已載入且可見的其他影片，使用者可以明確點選後切換，不會自動續播

## 收集規則

content script：

- 掃描目前 viewport 中有尺寸且可見的 `a[href]`
- 從已知 YouTube card 與 title selectors 推導標題
- 正規化成支援的 HTTPS YouTube video URL
- 以 video id 去重
- 排除目前影片
- 最多保留 20 筆
- 空白或時間格式標題使用 `YouTube 影片` fallback
- title 最長 500 characters

DOM mutation、頁面 URL 變化、video ended 或 state refresh 會觸發 menu report，發布頻率至少間隔約 250ms

## 同步

- VideoMenu 有獨立 sequence，但與 PlayerState 使用相同 page instance targetKey
- service worker 加上 tab id，形成 `tabId:pageInstanceId`
- 只有目前 target tab 的 menu 可以發布
- Server 驗證 item 數量、標題與每個 URL
- `ExtensionRegistry` 忽略同 targetKey 的舊 sequence
- Remote Web 只顯示 targetKey 與目前 PlayerState 相同的 menu
- state clear、target change 或 Extension disconnect 時清除 menu

## Remote Web

- 每筆顯示標題與 thumbnail
- 點選 item 送出 `navigate`
- thumbnail 失敗時保留文字與編號底圖
- menu summary 明確說明必須由使用者點選才會切換

## Thumbnail proxy

Remote Web 從 URL 解析 video id，使用同源：

```text
/api/youtube-thumbnail/{videoId}
```

Server 只向固定 base address `https://i.ytimg.com/vi/{id}/hqdefault.jpg` 取圖

限制：

- video id 只接受 ASCII letter、digit、`-`、`_`，長度 1 到 100
- 不跟隨 redirect
- upstream timeout 五秒
- response 必須是 `image/*`
- 最大 1 MiB
- 成功回應 cache 一天
- 每 IP 每分鐘最多 60 次

## 非目標

- 不代表 YouTube recommendation 的完整排序
- 不會主動捲動畫面載入更多影片
- 不做 auto-play 或 auto-navigation
- 不保存歷史 menu
- 不代理任意圖片 URL

## 驗證

- `apps/chrome-extension/src/video-menu.test.ts`
- `VideoMenuValidatorTests`
- `ExtensionRegistryTests`
- `YouTubeThumbnailEndpointTests`
- `apps/remote-web/src/App.test.ts`
- 真實 YouTube 驗證不同 card layout、捲動、Shorts、Live 與圖片失敗 fallback

## 變更觸發

修改 selector、可見性、去重、數量上限、targetKey、thumbnail source、cache 或 rate limit 時必須更新本文件

## 相關文件

- [Target selection and navigation](target-selection-and-navigation.md)
- [Player state synchronization](player-state-sync.md)
- [Trust boundaries](../architecture/trust-boundaries.md)
