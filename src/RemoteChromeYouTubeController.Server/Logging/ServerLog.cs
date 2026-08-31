using System.Net;
using Microsoft.Extensions.Logging;

namespace RemoteChromeYouTubeController.Server.Logging;

internal static partial class ServerLog
{
    [LoggerMessage(Level = LogLevel.Warning, Message = "Rejected non-loopback Extension connection from {RemoteIp}")]
    public static partial void NonLoopbackExtension(ILogger logger, IPAddress? remoteIp);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Extension returned mismatched command id {ReturnedCommandId} for {CommandId}")]
    public static partial void MismatchedCommandId(ILogger logger, Guid returnedCommandId, Guid commandId);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Command {CommandId} failed while invoking the Extension")]
    public static partial void CommandFailed(ILogger logger, Exception exception, Guid commandId);

    [LoggerMessage(Level = LogLevel.Warning, Message = "YouTube thumbnail upstream returned {StatusCode} for {VideoId}")]
    public static partial void ThumbnailUpstreamStatus(ILogger logger, HttpStatusCode statusCode, string videoId);

    [LoggerMessage(Level = LogLevel.Warning, Message = "YouTube thumbnail upstream returned an invalid content type for {VideoId}")]
    public static partial void ThumbnailUpstreamInvalidContentType(ILogger logger, string videoId);

    [LoggerMessage(Level = LogLevel.Warning, Message = "YouTube thumbnail upstream timed out for {VideoId}")]
    public static partial void ThumbnailUpstreamTimedOut(ILogger logger, string videoId);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Unable to fetch YouTube thumbnail for {VideoId}")]
    public static partial void ThumbnailFetchFailed(ILogger logger, Exception exception, string videoId);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Pairing token file was invalid and will be replaced: {TokenPath}")]
    public static partial void InvalidPairingToken(ILogger logger, string tokenPath);

    [LoggerMessage(Level = LogLevel.Information, Message = "Pairing token created at {TokenPath}")]
    public static partial void PairingTokenCreated(ILogger logger, string tokenPath);

    [LoggerMessage(Level = LogLevel.Information, Message = "Remote Chrome YouTube Controller listening on port {Port}")]
    public static partial void ServerStarted(ILogger logger, int port);

    [LoggerMessage(Level = LogLevel.Information, Message = "Server is stopping")]
    public static partial void ServerStopping(ILogger logger);
}
