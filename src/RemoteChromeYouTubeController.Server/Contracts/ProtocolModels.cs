namespace RemoteChromeYouTubeController.Server.Contracts;

public static class ProtocolConstants
{
    public const int Version = 3;
}

public sealed record CommandRequest(
    int ProtocolVersion,
    Guid CommandId,
    string Action,
    double? NumberValue = null,
    bool? BooleanValue = null,
    string? StringValue = null);

public sealed record CommandResult(
    Guid CommandId,
    bool Success,
    string Status,
    string? ErrorCode = null,
    string? Message = null)
{
    public static CommandResult Completed(Guid commandId, string? message = null) =>
        new(commandId, true, "completed", Message: message);

    public static CommandResult Accepted(Guid commandId, string? message = null) =>
        new(commandId, true, "accepted", Message: message);

    public static CommandResult Rejected(Guid commandId, string errorCode, string message) =>
        new(commandId, false, "rejected", errorCode, message);
}

public sealed record PlayerState(
    int ProtocolVersion,
    long Sequence,
    string TargetKey,
    string Title,
    string Url,
    double CurrentTime,
    double? Duration,
    bool Paused,
    bool Muted,
    double Volume,
    double PlaybackRate,
    bool IsLive,
    bool CanSeek,
    bool IsFullscreen,
    bool CaptionsEnabled,
    bool? Liked,
    DateTimeOffset CapturedAtUtc);

public sealed record VideoMenuItem(string Title, string Url);

public sealed record VideoMenu(
    int ProtocolVersion,
    long Sequence,
    string TargetKey,
    IReadOnlyList<VideoMenuItem> Items,
    DateTimeOffset CapturedAtUtc);

public sealed record SystemStatus(
    bool ServerConnected,
    bool ExtensionConnected,
    string TargetStatus,
    string? TargetTitle,
    bool ProtocolCompatible,
    DateTimeOffset UpdatedAtUtc);

public sealed record ExtensionHello(int ProtocolVersion, string ExtensionVersion);

public sealed record RemoteSnapshot(SystemStatus Status, PlayerState? State, VideoMenu? Menu);
