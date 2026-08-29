using RemoteChromeYouTubeController.Server.Contracts;

namespace RemoteChromeYouTubeController.Server.Services;

public static class VideoMenuValidator
{
    public const int MaxItems = 20;

    public static bool IsValid(VideoMenu? menu)
    {
        if (menu is null ||
            menu.ProtocolVersion != ProtocolConstants.Version ||
            menu.Sequence < 0 ||
            string.IsNullOrWhiteSpace(menu.TargetKey) || menu.TargetKey.Length > 100 ||
            menu.Items is null || menu.Items.Count > MaxItems ||
            menu.CapturedAtUtc == default)
        {
            return false;
        }

        return menu.Items.All(item =>
            item is not null &&
            !string.IsNullOrWhiteSpace(item.Title) && item.Title.Length <= 500 &&
            YouTubeUrlValidator.TryNormalize(item.Url, out _));
    }
}
