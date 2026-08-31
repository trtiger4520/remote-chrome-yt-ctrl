# Features

新增或修改使用者可觀察行為時，先從本索引選讀相關 Feature

- [Pairing and remote connection](pairing-and-connection.md) - QR 配對、Token 保存、Remote Hub 連線與重新配對
- [Playback controls](playback-controls.md) - 播放、seek、音量、靜音、倍速、字幕、全螢幕與按讚
- [Target selection and navigation](target-selection-and-navigation.md) - YouTube tab 選擇、URL allowlist 與手動導向
- [Player state synchronization](player-state-sync.md) - PlayerState 擷取、sequence、targetKey、status 與 reconnect snapshot
- [Video menu and thumbnails](video-menu-and-thumbnails.md) - 可見影片收集、手動選擇與縮圖代理

## 建立新功能

1. 複製 [Feature template](../templates/feature.md) 的結構
2. 以一個可獨立理解的使用者能力為文件邊界
3. 記錄目前行為、非目標、資料流、失敗模式、程式位置與驗證方式
4. 將文件加入本索引
5. 更新相關 Architecture、Contract 或 Decision
6. 在重要功能新增時更新根層 `log.md`

不要為每個 class 或 endpoint 建立 Feature，也不要把多個無關能力塞入同一份文件

