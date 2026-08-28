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

    private static string ReadFixture(string name) =>
        File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "protocol-fixtures", name));
}
