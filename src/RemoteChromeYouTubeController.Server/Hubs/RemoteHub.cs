using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Options;
using RemoteChromeYouTubeController.Server.Authentication;
using RemoteChromeYouTubeController.Server.Configuration;
using RemoteChromeYouTubeController.Server.Contracts;
using RemoteChromeYouTubeController.Server.Logging;
using RemoteChromeYouTubeController.Server.Services;

namespace RemoteChromeYouTubeController.Server.Hubs;

[Authorize(AuthenticationSchemes = PairingTokenAuthenticationHandler.SchemeName)]
public sealed class RemoteHub(
    IHubContext<ExtensionHub> extensionHub,
    ExtensionRegistry registry,
    CommandValidator commandValidator,
    IOptions<ServerOptions> options,
    ILogger<RemoteHub> logger) : Hub<IRemoteClient>
{
    public override async Task OnConnectedAsync()
    {
        await Clients.Caller.SystemStatus(registry.GetStatus());
        var state = registry.GetState();
        if (state is not null)
        {
            await Clients.Caller.PlayerState(state);
        }
        var menu = registry.GetVideoMenu();
        if (menu is not null)
        {
            await Clients.Caller.VideoMenuUpdated(menu);
        }

        await base.OnConnectedAsync();
    }

    public async Task<CommandResult> SendCommand(CommandRequest command)
    {
        var validationError = commandValidator.Validate(command);
        if (validationError is not null)
        {
            return validationError;
        }

        if (string.Equals(command.Action, "navigate", StringComparison.Ordinal) &&
            YouTubeUrlValidator.TryNormalize(command.StringValue, out var normalizedUrl))
        {
            command = command with { StringValue = normalizedUrl };
        }

        if (!registry.HasConnection)
        {
            return CommandResult.Rejected(command.CommandId, "extension_offline", "Chrome Extension is not connected");
        }

        if (!registry.GetStatus().ProtocolCompatible || !registry.TryGetConnectionId(out var extensionConnectionId))
        {
            return CommandResult.Rejected(command.CommandId, "protocol_mismatch", "Chrome Extension protocol is not compatible");
        }

        var timeout = TimeSpan.FromSeconds(options.Value.CommandTimeoutSeconds);
        using var cancellation = new CancellationTokenSource(timeout);

        try
        {
            var result = await extensionHub.Clients.Client(extensionConnectionId)
                .InvokeAsync<CommandResult>("executeCommand", command, cancellation.Token);

            if (result.CommandId != command.CommandId)
            {
                ServerLog.MismatchedCommandId(logger, result.CommandId, command.CommandId);
                return CommandResult.Rejected(command.CommandId, "internal_error", "Extension returned an invalid command result");
            }

            return result;
        }
        catch (OperationCanceledException)
        {
            return CommandResult.Rejected(command.CommandId, "timeout", "Extension did not complete the command in time");
        }
        catch (Exception exception)
        {
            ServerLog.CommandFailed(logger, exception, command.CommandId);
            return CommandResult.Rejected(command.CommandId, "internal_error", "Unable to deliver command to Extension");
        }
    }

    public Task<RemoteSnapshot> GetSnapshot() =>
        Task.FromResult(new RemoteSnapshot(registry.GetStatus(), registry.GetState(), registry.GetVideoMenu()));
}
