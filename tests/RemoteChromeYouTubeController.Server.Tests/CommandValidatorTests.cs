using RemoteChromeYouTubeController.Server.Contracts;
using RemoteChromeYouTubeController.Server.Services;

namespace RemoteChromeYouTubeController.Server.Tests;

public sealed class CommandValidatorTests
{
    private readonly CommandValidator validator = new();

    [Fact]
    public void Accepts_all_supported_actions_with_valid_values()
    {
        var commands = new[]
        {
            new CommandRequest(ProtocolConstants.Version, Guid.NewGuid(), "togglePlayback"),
            new CommandRequest(ProtocolConstants.Version, Guid.NewGuid(), "toggleFullscreen"),
            new CommandRequest(ProtocolConstants.Version, Guid.NewGuid(), "toggleCaptions"),
            new CommandRequest(ProtocolConstants.Version, Guid.NewGuid(), "toggleLike"),
            new CommandRequest(ProtocolConstants.Version, Guid.NewGuid(), "seekTo", NumberValue: 30),
            new CommandRequest(ProtocolConstants.Version, Guid.NewGuid(), "seekBy", NumberValue: -10),
            new CommandRequest(ProtocolConstants.Version, Guid.NewGuid(), "setVolume", NumberValue: 0.5),
            new CommandRequest(ProtocolConstants.Version, Guid.NewGuid(), "setMuted", BooleanValue: true),
            new CommandRequest(ProtocolConstants.Version, Guid.NewGuid(), "setPlaybackRate", NumberValue: 1.25),
            new CommandRequest(ProtocolConstants.Version, Guid.NewGuid(), "navigate", StringValue: "https://www.youtube.com/watch?v=abc123"),
        };

        Assert.All(commands, command => Assert.Null(validator.Validate(command)));
    }

    [Theory]
    [InlineData("setVolume", 1.01)]
    [InlineData("setVolume", -0.01)]
    [InlineData("seekBy", 61)]
    [InlineData("setPlaybackRate", 1.1)]
    public void Rejects_out_of_range_values(string action, double value)
    {
        var result = validator.Validate(new CommandRequest(ProtocolConstants.Version, Guid.NewGuid(), action, NumberValue: value));

        Assert.NotNull(result);
        Assert.Equal("invalid_command", result!.ErrorCode);
    }

    [Fact]
    public void Rejects_wrong_protocol_and_missing_command_id()
    {
        var protocolResult = validator.Validate(new CommandRequest(ProtocolConstants.Version + 1, Guid.NewGuid(), "togglePlayback"));
        var idResult = validator.Validate(new CommandRequest(ProtocolConstants.Version, Guid.Empty, "togglePlayback"));

        Assert.Equal("protocol_mismatch", protocolResult?.ErrorCode);
        Assert.Equal("invalid_command", idResult?.ErrorCode);
    }
}
