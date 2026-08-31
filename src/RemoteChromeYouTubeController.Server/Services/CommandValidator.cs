using RemoteChromeYouTubeController.Server.Contracts;

namespace RemoteChromeYouTubeController.Server.Services;

public sealed class CommandValidator
{
    private static readonly double[] allowedRates = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

    public CommandResult? Validate(CommandRequest command)
    {
        if (command.ProtocolVersion != ProtocolConstants.Version)
        {
            return CommandResult.Rejected(command.CommandId, "protocol_mismatch", "Unsupported protocol version");
        }

        if (command.CommandId == Guid.Empty)
        {
            return CommandResult.Rejected(command.CommandId, "invalid_command", "commandId is required");
        }

        var action = command.Action?.Trim();
        if (string.IsNullOrWhiteSpace(action))
        {
            return CommandResult.Rejected(command.CommandId, "invalid_command", "action is required");
        }

        var result = action switch
        {
            "togglePlayback" or "toggleFullscreen" or "toggleCaptions" or "toggleLike" => RequireNoValues(command),
            "seekTo" => RequireNumber(command, value => value >= 0, "seekTo requires a non-negative number"),
            "seekBy" => RequireNumber(command, value => Math.Abs(value) <= 60, "seekBy must be between -60 and 60 seconds"),
            "setVolume" => RequireNumber(command, value => value is >= 0 and <= 1, "volume must be between 0 and 1"),
            "setMuted" => RequireBoolean(command),
            "setPlaybackRate" => RequireNumber(command, value => allowedRates.Contains(value), "unsupported playback rate"),
            "navigate" => ValidateNavigation(command),
            _ => "unsupported action",
        };

        return result is null
            ? null
            : CommandResult.Rejected(command.CommandId, "invalid_command", result);
    }

    private static string? RequireNoValues(CommandRequest command) =>
        command.NumberValue is not null || command.BooleanValue is not null || command.StringValue is not null
            ? $"{command.Action} does not accept a value"
            : null;

    private static string? RequireNumber(CommandRequest command, Func<double, bool> predicate, string message) =>
        command.NumberValue is null || command.BooleanValue is not null || command.StringValue is not null ||
        double.IsNaN(command.NumberValue.Value) || double.IsInfinity(command.NumberValue.Value) || !predicate(command.NumberValue.Value)
            ? message
            : null;

    private static string? RequireBoolean(CommandRequest command) =>
        command.BooleanValue is null || command.NumberValue is not null || command.StringValue is not null
            ? "setMuted requires only booleanValue"
            : null;

    private static string? ValidateNavigation(CommandRequest command) =>
        command.NumberValue is null && command.BooleanValue is null && YouTubeUrlValidator.TryNormalize(command.StringValue, out _)
            ? null
            : "stringValue must be a supported HTTPS YouTube video URL";
}
