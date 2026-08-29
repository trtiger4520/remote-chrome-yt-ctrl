using RemoteChromeYouTubeController.Server.Contracts;
using RemoteChromeYouTubeController.Server.Services;

namespace RemoteChromeYouTubeController.Server.Tests;

public sealed class VideoMenuValidatorTests
{
    [Fact]
    public void Accepts_a_valid_menu()
    {
        var menu = CreateMenu();

        Assert.True(VideoMenuValidator.IsValid(menu));
    }

    [Fact]
    public void Rejects_unsupported_urls_and_oversized_menus()
    {
        var unsupportedUrl = CreateMenu() with
        {
            Items = [new VideoMenuItem("External", "https://example.com/video")]
        };
        var oversized = CreateMenu() with
        {
            Items = Enumerable.Range(0, VideoMenuValidator.MaxItems + 1)
                .Select(index => new VideoMenuItem($"Video {index}", $"https://www.youtube.com/watch?v={index}"))
                .ToArray()
        };

        Assert.False(VideoMenuValidator.IsValid(unsupportedUrl));
        Assert.False(VideoMenuValidator.IsValid(oversized));
    }

    private static VideoMenu CreateMenu() =>
        new(
            ProtocolConstants.Version,
            1,
            "page",
            [new VideoMenuItem("Next", "https://www.youtube.com/watch?v=next")],
            DateTimeOffset.UtcNow);
}
