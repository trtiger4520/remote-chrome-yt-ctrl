# Contracts

修改跨元件訊息、endpoint、authentication、設定或 protocol version 時閱讀本分類

- [Realtime protocol](realtime-protocol.md) - CommandRequest、PlayerState、VideoMenu、SystemStatus、Hubs 與 error codes
- [Authentication and endpoints](authentication-and-endpoints.md) - pairing token、HTTP endpoints、rate limits 與 authorization
- [Configuration](configuration.md) - Server options、環境變數、Extension storage 與 Remote Web storage

任何 contract 變更都必須檢查 TypeScript、C#、fixtures、兩個 SignalR clients 與功能文件

