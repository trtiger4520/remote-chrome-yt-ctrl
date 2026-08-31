---
type: Contract
title: Realtime protocol
description: 定義 protocol version 3 的 SignalR methods、訊息 schema、值域與錯誤碼
tags:
  - contract
  - protocol
  - signalr
  - typescript
  - csharp
status: active
code_paths:
  - packages/protocol/src/index.ts
  - src/RemoteChromeYouTubeController.Server/Contracts/ProtocolModels.cs
  - src/RemoteChromeYouTubeController.Server/Hubs
  - tests/protocol-fixtures
---

# Realtime protocol

## Version

目前 `PROTOCOL_VERSION` 與 `ProtocolConstants.Version` 都是 `3`

TypeScript schema 是 browser clients 的 runtime validation 來源，C# records 與 validators 是 Server 的對等契約

## Remote Hub

Path：`/hubs/remote`

需要 PairingToken authentication

Client to Server：

| method | input | output |
|---|---|---|
| `SendCommand` | CommandRequest | CommandResult |
| `GetSnapshot` | 無 | RemoteSnapshot |

Server to Client：

| event | payload |
|---|---|
| `SystemStatus` | SystemStatus |
| `PlayerState` | PlayerState |
| `VideoMenuUpdated` | VideoMenu 或 null |
| `ExtensionOffline` | 無 |

## Extension Hub

Path：`/hubs/extension`

只接受 loopback，不使用 bearer token

Extension to Server：

| method | input | output |
|---|---|---|
| `RegisterExtension` | ExtensionHello | CommandResult |
| `PublishState` | PlayerState | 無 |
| `PublishVideoMenu` | VideoMenu | 無 |
| `ClearState` | 無 | 無 |
| `ClearVideoMenu` | 無 | 無 |
| `Heartbeat` | 無 | 無 |

Server to Extension：

| method | input | output |
|---|---|---|
| `executeCommand` | CommandRequest | CommandResult |

## CommandRequest

必要欄位：

- `protocolVersion` 必須等於 3
- `commandId` 必須是非空 UUID
- `action` 必須是支援 action

值規則：

| action | 唯一允許的 value |
|---|---|
| `seekTo` | `numberValue >= 0` |
| `seekBy` | `numberValue` 介於 -60 與 60 |
| `setVolume` | `numberValue` 介於 0 與 1 |
| `setPlaybackRate` | `numberValue` 為 0.5、0.75、1、1.25、1.5、1.75、2 |
| `setMuted` | `booleanValue` |
| `navigate` | 最長 2048 的 `stringValue`，且是支援 YouTube URL |
| toggle actions | 不允許任何 value |

## CommandResult

- `commandId` 必須對應 request
- `success` 表示 action 是否被接受或完成
- `status` 是 `completed`、`accepted` 或 `rejected`
- `errorCode` 只在失敗時使用
- `message` 最長 500 characters

## PlayerState

限制：

- `sequence` 是非負 integer
- `targetKey` 最長 100
- `title` 最長 500
- `url` 必須是 absolute URL
- currentTime 與非 null duration 是 finite non-negative
- live 的 duration 必須是 null
- volume 介於 0 與 1
- playbackRate 是 finite positive
- liked 是 boolean 或 null
- capturedAtUtc 必須是帶 offset 的 datetime

## VideoMenu

- `sequence` 是非負 integer
- `targetKey` 最長 100
- 最多 20 個 items
- item title 最長 500 且不可空白
- item URL 最長 2048，Server 還會套用支援 YouTube URL validation
- capturedAtUtc 必須是帶 offset 的 datetime

## SystemStatus

- `serverConnected`
- `extensionConnected`
- `targetStatus`：`none`、`loading`、`ready`、`unsupported`
- optional `targetTitle`，最長 500
- `protocolCompatible`
- `updatedAtUtc`

## ExtensionHello

- `protocolVersion` 必須等於 3
- `extensionVersion` 最長 50

## Error codes

- `extension_offline`
- `target_missing`
- `video_missing`
- `invalid_command`
- `unsupported_url`
- `autoplay_blocked`
- `protocol_mismatch`
- `timeout`
- `internal_error`

## Protocol change checklist

1. 更新 TypeScript schemas 與 types
2. 更新 C# records、hub contracts 與 validators
3. 決定是否提升 protocol version
4. 更新 JSON fixtures 與兩端 tests
5. 更新 Remote Web 與 Extension handling
6. 更新本文件與受影響 Feature
7. 執行完整 pnpm 與 dotnet 驗證

## 相關文件

- [Runtime flows](../architecture/runtime-flows.md)
- [Playback controls](../features/playback-controls.md)
- [Player state synchronization](../features/player-state-sync.md)

