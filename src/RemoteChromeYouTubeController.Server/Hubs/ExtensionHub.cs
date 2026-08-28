using System.Net;
using Microsoft.AspNetCore.SignalR;
using RemoteChromeYouTubeController.Server.Contracts;
using RemoteChromeYouTubeController.Server.Logging;
using RemoteChromeYouTubeController.Server.Services;

namespace RemoteChromeYouTubeController.Server.Hubs;

public sealed class ExtensionHub(
    IHubContext<RemoteHub, IRemoteClient> remoteHub,
    ExtensionRegistry registry,
    ILogger<ExtensionHub> logger) : Hub
{
    public override Task OnConnectedAsync()
    {
        if (!IsLoopback())
        {
            ServerLog.NonLoopbackExtension(logger, Context.GetHttpContext()?.Connection.RemoteIpAddress);
            Context.Abort();
            return Task.CompletedTask;
        }

        return base.OnConnectedAsync();
    }

    public Task<CommandResult> RegisterExtension(ExtensionHello hello)
    {
        if (!IsLoopback())
        {
            return Task.FromResult(CommandResult.Rejected(Guid.Empty, "invalid_command", "Extension must connect from loopback"));
        }

        var compatible = registry.Register(Context.ConnectionId, hello);
        _ = BroadcastStatusAsync();
        return Task.FromResult(compatible
            ? CommandResult.Completed(Guid.Empty, "Extension registered")
            : CommandResult.Rejected(Guid.Empty, "protocol_mismatch", "Unsupported protocol version"));
    }

    public Task PublishState(PlayerState state)
    {
        if (!registry.IsCurrent(Context.ConnectionId) || !PlayerStateValidator.IsValid(state))
        {
            return Task.CompletedTask;
        }

        registry.UpdateState(Context.ConnectionId, state);
        return BroadcastStateAsync(state);
    }

    public Task ClearState()
    {
        if (!registry.IsCurrent(Context.ConnectionId))
        {
            return Task.CompletedTask;
        }

        registry.ClearState(Context.ConnectionId);
        return BroadcastStatusAsync();
    }

    public Task Heartbeat() => Task.CompletedTask;

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        registry.Disconnect(Context.ConnectionId);
        await remoteHub.Clients.All.ExtensionOffline();
        await BroadcastStatusAsync();
        await base.OnDisconnectedAsync(exception);
    }

    private bool IsLoopback()
    {
        var ip = Context.GetHttpContext()?.Connection.RemoteIpAddress;
        return ip is not null && IPAddress.IsLoopback(ip);
    }

    private async Task BroadcastStateAsync(PlayerState state)
    {
        await remoteHub.Clients.All.PlayerState(state);
        await BroadcastStatusAsync();
    }

    private Task BroadcastStatusAsync() => remoteHub.Clients.All.SystemStatus(registry.GetStatus());
}
