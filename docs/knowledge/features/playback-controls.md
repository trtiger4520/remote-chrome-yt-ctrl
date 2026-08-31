---
type: Feature
title: Playback controls
description: 定義手機可執行的 YouTube 播放器控制、值域、狀態限制與回覆語意
tags:
  - feature
  - playback
  - remote-web
  - chrome-extension
status: active
code_paths:
  - apps/remote-web/src/App.vue
  - apps/remote-web/src/lib/connection.ts
  - packages/protocol/src/index.ts
  - src/RemoteChromeYouTubeController.Server/Services/CommandValidator.cs
  - src/RemoteChromeYouTubeController.Server/Hubs/RemoteHub.cs
  - apps/chrome-extension/src/content-script.ts
---

# Playback controls

## 支援能力

| action | 值 | 行為 |
|---|---|---|
| `togglePlayback` | 無 | 播放或暫停目前 video |
| `seekTo` | 非負秒數 | 跳到絕對時間並限制在 duration 內 |
| `seekBy` | -60 到 60 秒 | 相對移動，目前 UI 使用前後十秒 |
| `setVolume` | 0 到 1 | 設定音量，大於零時解除 mute |
| `setMuted` | boolean | 設定靜音狀態 |
| `setPlaybackRate` | 0.5、0.75、1、1.25、1.5、1.75、2 | 設定播放速度 |
| `toggleCaptions` | 無 | 切換第一個 captions/subtitles track |
| `toggleFullscreen` | 無 | 切換目前 video 的 fullscreen |
| `toggleLike` | 無 | 操作目前 YouTube 頁面的按讚控制 |

`navigate` 屬於 [Target selection and navigation](target-selection-and-navigation.md)

## Command 路徑

1. Remote Web 以 protocol version、UUID commandId、action 與必要 value 建立 command
2. Shared Protocol schema 在 client 驗證結構與值域
3. `RemoteHub.SendCommand` 使用 `CommandValidator` 再驗證一次
4. Server 確認 Extension online 且 protocol compatible
5. Server 以 client result invocation 呼叫 Extension `executeCommand`
6. service worker 將非 navigate command 傳給 target tab 的 content script
7. content script 執行後立即發布新 PlayerState
8. 結果沿原路回傳 Remote Web

## 回覆語意

- `completed`：content script 已完成同步操作
- `accepted`：非同步工作已開始，目前只用於 navigation
- `rejected`：命令未執行，包含 errorCode 與可選 message

Server 預設等待 Extension 五秒，超時回傳 `timeout`

Remote Web 顯示 command error 五秒，不會因單次失敗重置 connection

## UI 可用性

- Remote Hub、Extension、target 與 PlayerState 都 ready 時才啟用一般控制
- live stream 或 `canSeek=false` 時停用 seek slider 與前後 seek
- `liked=null` 時停用按讚控制
- 控制 active state 以 Extension 回報的 PlayerState 為準，不以 local click 樂觀切換
- 音量使用兩欄寬的緊湊水平滑桿，拖動約每 100ms 合併送出，避免產生過多 command

## 失敗模式

| error | 典型原因 |
|---|---|
| `extension_offline` | Extension Hub 沒有目前連線 |
| `target_missing` | 沒有支援的 YouTube tab |
| `video_missing` | content script 或 video 尚未準備完成 |
| `invalid_command` | action、值型別或值域不合法 |
| `autoplay_blocked` | browser policy 阻擋 play |
| `protocol_mismatch` | Extension 與 Server protocol version 不同 |
| `timeout` | Extension 未在設定時間內回覆 |
| `internal_error` | DOM 操作或中繼發生未分類錯誤 |

## 非目標

- 沒有 command queue、retry 或 replay
- 沒有 optimistic UI state
- 沒有自動跳下一部影片
- 沒有 media key 或 OS-level media session 控制

## 驗證

- `packages/protocol/src/index.test.ts`
- `CommandValidatorTests`
- `apps/remote-web/src/App.test.ts`
- Extension fullscreen、like-button 相關 unit tests
- 真實 Chrome 驗證播放、seek、live、字幕、全螢幕與按讚

## 變更觸發

新增 action、改變值域、回覆語意、timeout、UI enable 規則或 content script 操作時必須更新本文件與 Realtime Protocol

## 相關文件

- [Realtime protocol](../contracts/realtime-protocol.md)
- [Player state synchronization](player-state-sync.md)
- [UI quality](../quality/testing-and-ui-quality.md)
