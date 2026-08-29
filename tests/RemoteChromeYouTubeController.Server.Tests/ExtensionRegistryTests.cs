using RemoteChromeYouTubeController.Server.Contracts;
using RemoteChromeYouTubeController.Server.Services;

namespace RemoteChromeYouTubeController.Server.Tests;

public sealed class ExtensionRegistryTests
{
    [Fact]
    public void New_connection_replaces_old_and_old_disconnect_cannot_clear_it()
    {
        var registry = new ExtensionRegistry();
        var hello = new ExtensionHello(ProtocolConstants.Version, "0.1.0");

        Assert.True(registry.Register("old", hello));
        Assert.True(registry.Register("new", hello));
        Assert.False(registry.Disconnect("old"));

        Assert.True(registry.HasConnection);
        Assert.True(registry.IsCurrent("new"));
    }

    [Fact]
    public void Older_sequence_does_not_replace_newer_state()
    {
        var registry = new ExtensionRegistry();
        var hello = new ExtensionHello(ProtocolConstants.Version, "0.1.0");
        registry.Register("connection", hello);
        registry.UpdateState("connection", CreateState(2));
        registry.UpdateState("connection", CreateState(1));

        Assert.Equal(2, registry.GetState()?.Sequence);
    }

    [Fact]
    public void Reports_loading_ready_and_live_targets()
    {
        var registry = new ExtensionRegistry();
        registry.Register("connection", new ExtensionHello(1, "0.1.0"));

        registry.UpdateState("connection", CreateState(1, duration: null, isLive: false, canSeek: false));
        Assert.Equal("loading", registry.GetStatus().TargetStatus);

        registry.UpdateState("connection", CreateState(2, duration: 60, isLive: false, canSeek: true));
        Assert.Equal("ready", registry.GetStatus().TargetStatus);

        registry.UpdateState("connection", CreateState(3, duration: null, isLive: true, canSeek: false));
        Assert.Equal("ready", registry.GetStatus().TargetStatus);
    }

    [Fact]
    public void Stores_the_latest_video_menu_and_clears_it_with_state()
    {
        var registry = new ExtensionRegistry();
        var connectionId = "connection";
        registry.Register(connectionId, new ExtensionHello(ProtocolConstants.Version, "0.1.0"));

        var menu = CreateMenu(2);
        Assert.True(registry.UpdateVideoMenu(connectionId, menu));
        Assert.Equal(menu, registry.GetVideoMenu());

        Assert.False(registry.UpdateVideoMenu(connectionId, CreateMenu(1)));
        registry.ClearState(connectionId);

        Assert.Null(registry.GetVideoMenu());
    }

    [Fact]
    public void A_new_target_can_restart_video_menu_sequence()
    {
        var registry = new ExtensionRegistry();
        var connectionId = "connection";
        registry.Register(connectionId, new ExtensionHello(ProtocolConstants.Version, "0.1.0"));
        registry.UpdateVideoMenu(connectionId, CreateMenu(10, "first-page"));

        Assert.True(registry.UpdateVideoMenu(connectionId, CreateMenu(1, "second-page")));
        Assert.Equal("second-page", registry.GetVideoMenu()?.TargetKey);
    }

    private static PlayerState CreateState(long sequence, double? duration = 60, bool isLive = false, bool canSeek = true) =>
        new(ProtocolConstants.Version, sequence, "42", "Test", "https://www.youtube.com/watch?v=test", 1, duration, false, false, 0.5, 1, isLive, canSeek, false, false, DateTimeOffset.UtcNow);

    private static VideoMenu CreateMenu(long sequence, string targetKey = "page") =>
        new(
            ProtocolConstants.Version,
            sequence,
            targetKey,
            [new VideoMenuItem("Next", "https://www.youtube.com/watch?v=next")],
            DateTimeOffset.UtcNow);
}
