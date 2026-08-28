using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using RemoteChromeYouTubeController.Server.Configuration;
using RemoteChromeYouTubeController.Server.Logging;

namespace RemoteChromeYouTubeController.Server.Services;

public sealed class PairingTokenService(IOptions<PairingOptions> options, ILogger<PairingTokenService> logger)
{
    private readonly object sync = new();
    private string? token;

    public string TokenPath => options.Value.TokenPath ?? Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "RemoteChromeYouTubeController",
        "pairing-token");

    public string EnsureToken(bool reset = false)
    {
        lock (sync)
        {
            if (!reset && token is not null)
            {
                return token;
            }

            if (!reset && File.Exists(TokenPath))
            {
                var existing = File.ReadAllText(TokenPath, Encoding.UTF8).Trim();
                if (IsValidToken(existing))
                {
                    token = existing;
                    return token;
                }

                ServerLog.InvalidPairingToken(logger, TokenPath);
            }

            var bytes = RandomNumberGenerator.GetBytes(32);
            token = Convert.ToBase64String(bytes)
                .TrimEnd('=')
                .Replace('+', '-')
                .Replace('/', '_');

            var directory = Path.GetDirectoryName(TokenPath);
            if (!string.IsNullOrWhiteSpace(directory))
            {
                Directory.CreateDirectory(directory);
            }

            File.WriteAllText(TokenPath, token, Encoding.UTF8);
            ServerLog.PairingTokenCreated(logger, TokenPath);
            return token;
        }
    }

    public bool Validate(string? candidate)
    {
        if (string.IsNullOrWhiteSpace(candidate))
        {
            return false;
        }

        var expected = EnsureToken();
        var expectedBytes = Encoding.UTF8.GetBytes(expected);
        var candidateBytes = Encoding.UTF8.GetBytes(candidate.Trim());
        return CryptographicOperations.FixedTimeEquals(expectedBytes, candidateBytes);
    }

    private static bool IsValidToken(string value) => value.Length >= 40 && value.Length <= 100 && value.All(IsTokenCharacter);

    private static bool IsTokenCharacter(char character) =>
        character is >= 'A' and <= 'Z' ||
        character is >= 'a' and <= 'z' ||
        character is >= '0' and <= '9' ||
        character is '-' or '_';
}
