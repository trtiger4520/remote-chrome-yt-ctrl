using System.Net;
using RemoteChromeYouTubeController.Server.Logging;

namespace RemoteChromeYouTubeController.Server.Services;

public enum YouTubeThumbnailFetchStatus
{
    InvalidVideoId,
    Success,
    NotFound,
    Unavailable,
}

public sealed record YouTubeThumbnailFetchResult(
    YouTubeThumbnailFetchStatus Status,
    byte[]? Content = null,
    string? ContentType = null);

public sealed class YouTubeThumbnailService(HttpClient httpClient, ILogger<YouTubeThumbnailService> logger)
{
    private const int MaxContentLength = 1024 * 1024;

    public async Task<YouTubeThumbnailFetchResult> FetchAsync(string? videoId, CancellationToken cancellationToken)
    {
        if (!IsValidVideoId(videoId))
        {
            return new(YouTubeThumbnailFetchStatus.InvalidVideoId);
        }

        try
        {
            using var response = await httpClient.GetAsync(
                $"vi/{Uri.EscapeDataString(videoId!)}/hqdefault.jpg",
                HttpCompletionOption.ResponseHeadersRead,
                cancellationToken);

            if (response.StatusCode == HttpStatusCode.NotFound)
            {
                return new(YouTubeThumbnailFetchStatus.NotFound);
            }

            if (!response.IsSuccessStatusCode)
            {
                ServerLog.ThumbnailUpstreamStatus(logger, response.StatusCode, videoId!);
                return new(YouTubeThumbnailFetchStatus.Unavailable);
            }

            var contentType = response.Content.Headers.ContentType?.MediaType;
            if (string.IsNullOrWhiteSpace(contentType) || !contentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
            {
                ServerLog.ThumbnailUpstreamInvalidContentType(logger, videoId!);
                return new(YouTubeThumbnailFetchStatus.Unavailable);
            }

            var content = await ReadContentAsync(response.Content, cancellationToken);
            return content is { Length: > 0 }
                ? new(YouTubeThumbnailFetchStatus.Success, content, contentType)
                : new(YouTubeThumbnailFetchStatus.Unavailable);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            ServerLog.ThumbnailUpstreamTimedOut(logger, videoId!);
            return new(YouTubeThumbnailFetchStatus.Unavailable);
        }
        catch (HttpRequestException exception)
        {
            ServerLog.ThumbnailFetchFailed(logger, exception, videoId!);
            return new(YouTubeThumbnailFetchStatus.Unavailable);
        }
    }

    public static bool IsValidVideoId(string? videoId) =>
        videoId is { Length: >= 1 and <= 100 } &&
        videoId.All(character => char.IsAsciiLetterOrDigit(character) || character is '-' or '_');

    private static async Task<byte[]?> ReadContentAsync(HttpContent content, CancellationToken cancellationToken)
    {
        if (content.Headers.ContentLength is > MaxContentLength)
        {
            return null;
        }

        await using var stream = await content.ReadAsStreamAsync(cancellationToken);
        using var output = new MemoryStream();
        var buffer = new byte[81920];
        var totalLength = 0;

        while (true)
        {
            var readLength = await stream.ReadAsync(buffer.AsMemory(), cancellationToken);
            if (readLength == 0)
            {
                break;
            }

            totalLength += readLength;
            if (totalLength > MaxContentLength)
            {
                return null;
            }

            output.Write(buffer, 0, readLength);
        }

        return output.ToArray();
    }
}
