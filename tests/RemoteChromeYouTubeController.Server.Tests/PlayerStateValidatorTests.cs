using RemoteChromeYouTubeController.Server.Contracts;
using RemoteChromeYouTubeController.Server.Services;

namespace RemoteChromeYouTubeController.Server.Tests;

public sealed class PlayerStateValidatorTests
{
    [Fact]
    public void Accepts_loading_state_with_nullable_duration()
    {
        var state = CreateState(duration: null, isLive: false, canSeek: false);

        Assert.True(PlayerStateValidator.IsValid(state));
    }

    [Fact]
    public void Rejects_live_state_that_has_a_duration()
    {
        var state = CreateState(duration: 120, isLive: true, canSeek: false);

        Assert.False(PlayerStateValidator.IsValid(state));
    }

    private static PlayerState CreateState(double? duration, bool isLive, bool canSeek) =>
        new(ProtocolConstants.Version, 1, "42", "Fixture", "https://www.youtube.com/watch?v=fixture", 2, duration, false, false, 0.5, 1, isLive, canSeek, false, false, false, DateTimeOffset.UtcNow);
}
