using RemoteChromeYouTubeController.Server.Contracts;

namespace RemoteChromeYouTubeController.Server.Services;

public static class PlayerStateValidator
{
    public static bool IsValid(PlayerState state)
    {
        if (state.ProtocolVersion != ProtocolConstants.Version ||
            state.Sequence < 0 ||
            string.IsNullOrWhiteSpace(state.TargetKey) || state.TargetKey.Length > 100 ||
            state.Title is null || state.Title.Length > 500 ||
            !Uri.TryCreate(state.Url, UriKind.Absolute, out _) ||
            !IsFiniteNonNegative(state.CurrentTime) ||
            (state.Duration is not null && !IsFiniteNonNegative(state.Duration.Value)) ||
            state.IsLive && state.Duration is not null ||
            state.Volume is < 0 or > 1 || !double.IsFinite(state.Volume) ||
            !double.IsFinite(state.PlaybackRate) || state.PlaybackRate <= 0 ||
            state.CapturedAtUtc == default)
        {
            return false;
        }

        return true;
    }

    private static bool IsFiniteNonNegative(double value) => double.IsFinite(value) && value >= 0;
}
