using System.ComponentModel.DataAnnotations;

namespace RemoteChromeYouTubeController.Server.Configuration;

public sealed class ServerOptions
{
    public const string SectionName = "Server";

    [Range(1, 65535)]
    public int Port { get; set; } = 8154;

    public string BindAddress { get; set; } = "0.0.0.0";

    [Range(1, 60)]
    public int CommandTimeoutSeconds { get; set; } = 5;
}

public sealed class PairingOptions
{
    public const string SectionName = "Pairing";

    public string? TokenPath { get; set; }
}
