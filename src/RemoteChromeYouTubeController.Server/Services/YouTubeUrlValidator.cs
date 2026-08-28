namespace RemoteChromeYouTubeController.Server.Services;

public static class YouTubeUrlValidator
{
    private static readonly HashSet<string> allowedHosts = new(StringComparer.OrdinalIgnoreCase)
    {
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "youtu.be",
    };

    public static bool TryNormalize(string? rawUrl, out string normalizedUrl)
    {
        normalizedUrl = string.Empty;
        if (string.IsNullOrWhiteSpace(rawUrl) || !Uri.TryCreate(rawUrl.Trim(), UriKind.Absolute, out var uri))
        {
            return false;
        }

        if (!string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase) ||
            !allowedHosts.Contains(uri.Host) ||
            uri.UserInfo.Length > 0)
        {
            return false;
        }

        if (string.Equals(uri.Host, "youtu.be", StringComparison.OrdinalIgnoreCase))
        {
            var videoId = uri.AbsolutePath.Trim('/');
            if (videoId.Length is < 1 or > 100 || videoId.Contains('/'))
            {
                return false;
            }

            normalizedUrl = $"https://www.youtube.com/watch?v={Uri.EscapeDataString(videoId)}";
            return true;
        }

        var path = uri.AbsolutePath.TrimEnd('/');
        if (path.Equals("/watch", StringComparison.OrdinalIgnoreCase))
        {
            var videoId = uri.Query
                .TrimStart('?')
                .Split('&', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(part => part.Split('=', 2))
                .Where(parts => parts.Length == 2 && string.Equals(parts[0], "v", StringComparison.OrdinalIgnoreCase))
                .Select(parts => Uri.UnescapeDataString(parts[1]))
                .FirstOrDefault(value => value.Length is >= 1 and <= 100);

            if (videoId is null)
            {
                return false;
            }
        }
        else if (path.StartsWith("/shorts/", StringComparison.OrdinalIgnoreCase) ||
                 path.StartsWith("/live/", StringComparison.OrdinalIgnoreCase))
        {
            var prefixLength = path.StartsWith("/shorts/", StringComparison.OrdinalIgnoreCase) ? "/shorts/".Length : "/live/".Length;
            var videoId = path[prefixLength..];
            if (videoId.Length is < 1 or > 100 || videoId.Contains('/'))
            {
                return false;
            }
        }
        else if (!path.Equals("/watch", StringComparison.OrdinalIgnoreCase) &&
                 !path.StartsWith("/shorts/", StringComparison.OrdinalIgnoreCase) &&
                 !path.StartsWith("/live/", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        normalizedUrl = uri.ToString();
        return normalizedUrl.Length <= 2048;
    }
}
