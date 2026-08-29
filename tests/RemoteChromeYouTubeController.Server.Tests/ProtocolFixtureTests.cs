using System.Text.Json;
using System.Text.Json.Serialization;
using RemoteChromeYouTubeController.Server.Contracts;

namespace RemoteChromeYouTubeController.Server.Tests;

public sealed class ProtocolFixtureTests
{
    private static readonly JsonSerializerOptions jsonOptions = new(JsonSerializerDefaults.Web)
    {
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    [Fact]
    public void Command_fixture_deserializes_with_camel_case_contract()
    {
        var fixture = ReadFixture("command-request.json");
        var command = JsonSerializer.Deserialize<CommandRequest>(fixture, jsonOptions);

        Assert.NotNull(command);
        Assert.Equal(ProtocolConstants.Version, command!.ProtocolVersion);
        Assert.Equal("seekTo", command.Action);
        Assert.Equal(12.5, command.NumberValue);
    }

    [Fact]
    public void Player_state_fixture_deserializes_with_nullable_duration()
    {
        var fixture = ReadFixture("player-state.json");
        var state = JsonSerializer.Deserialize<PlayerState>(fixture, jsonOptions);

        Assert.NotNull(state);
        Assert.Equal(ProtocolConstants.Version, state!.ProtocolVersion);
        Assert.Equal(120, state.Duration);
        Assert.True(state.CanSeek);
    }

    [Fact]
    public void Video_menu_fixture_deserializes_with_video_items()
    {
        var fixture = ReadFixture("video-menu.json");
        var menu = JsonSerializer.Deserialize<VideoMenu>(fixture, jsonOptions);

        Assert.NotNull(menu);
        Assert.Equal(ProtocolConstants.Version, menu!.ProtocolVersion);
        Assert.Equal(2, menu.Items.Count);
        Assert.Equal("https://www.youtube.com/watch?v=next", menu.Items[0].Url);
    }

    private static string ReadFixture(string name) =>
        File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "protocol-fixtures", name));
}
