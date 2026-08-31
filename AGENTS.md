# Remote Chrome YouTube Controller

## Toolchain

- .NET SDK 10.0.303 or a compatible latest feature band
- Node.js 24 or newer
- pnpm 11 or newer
- Chrome 116 or newer for the Manifest V3 Extension

## Commands

```powershell
pnpm install
pnpm build
dotnet build RemoteChromeYouTubeController.slnx
dotnet test RemoteChromeYouTubeController.slnx
dotnet format RemoteChromeYouTubeController.slnx --verify-no-changes
```

Run the Server with `dotnet run --project src/RemoteChromeYouTubeController.Server` and load `artifacts/chrome-extension` as an unpacked Chrome extension

The first release is private-LAN HTTP only. Never expose port 8154 directly to the public Internet
