using RemoteChromeYouTubeController.Server.Services;

namespace RemoteChromeYouTubeController.Server.Tests;

public sealed class YouTubeUrlValidatorTests
{
    [Theory]
    [InlineData("https://youtube.com/watch?v=abc", "https://youtube.com/watch?v=abc")]
    [InlineData("https://www.youtube.com/shorts/abc", "https://www.youtube.com/shorts/abc")]
    [InlineData("https://m.youtube.com/live/abc", "https://m.youtube.com/live/abc")]
    [InlineData("https://youtu.be/abc", "https://www.youtube.com/watch?v=abc")]
    public void Normalizes_supported_urls(string input, string expected)
    {
        var accepted = YouTubeUrlValidator.TryNormalize(input, out var normalized);

        Assert.True(accepted);
        Assert.Equal(expected, normalized);
    }

    [Theory]
    [InlineData("http://www.youtube.com/watch?v=abc")]
    [InlineData("https://youtube.com/embed/abc")]
    [InlineData("https://evil.example/watch?v=abc")]
    [InlineData("https://www.youtube.com.evil.example/watch?v=abc")]
    [InlineData("https://www.youtube.com/watch")]
    public void Rejects_unsupported_urls(string input)
    {
        Assert.False(YouTubeUrlValidator.TryNormalize(input, out _));
    }
}
