using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using RemoteChromeYouTubeController.Server.Configuration;
using RemoteChromeYouTubeController.Server.Services;

namespace RemoteChromeYouTubeController.Server.Tests;

public sealed class PairingTokenServiceTests
{
    [Fact]
    public void Creates_persists_validates_and_resets_token()
    {
        var directory = Path.Combine(Path.GetTempPath(), "remote-youtube-tests", Guid.NewGuid().ToString("N"));
        var path = Path.Combine(directory, "pairing-token");
        try
        {
            var service = new PairingTokenService(
                Options.Create(new PairingOptions { TokenPath = path }),
                NullLogger<PairingTokenService>.Instance);

            var first = service.EnsureToken();
            Assert.Equal(43, first.Length);
            Assert.True(File.Exists(path));
            Assert.True(service.Validate(first));
            Assert.False(service.Validate(first + "x"));

            var persisted = new PairingTokenService(
                Options.Create(new PairingOptions { TokenPath = path }),
                NullLogger<PairingTokenService>.Instance);
            Assert.Equal(first, persisted.EnsureToken());

            var reset = persisted.EnsureToken(reset: true);
            Assert.NotEqual(first, reset);
            Assert.True(persisted.Validate(reset));
        }
        finally
        {
            if (Directory.Exists(directory))
            {
                Directory.Delete(directory, recursive: true);
            }
        }
    }
}
