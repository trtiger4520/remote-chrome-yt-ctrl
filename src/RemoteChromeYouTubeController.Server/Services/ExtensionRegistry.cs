using RemoteChromeYouTubeController.Server.Contracts;

namespace RemoteChromeYouTubeController.Server.Services;

public sealed class ExtensionRegistry
{
    private readonly object sync = new();
    private string? connectionId;
    private int protocolVersion;
    private string? extensionVersion;
    private PlayerState? state;

    public bool Register(string id, ExtensionHello hello)
    {
        lock (sync)
        {
            connectionId = id;
            protocolVersion = hello.ProtocolVersion;
            extensionVersion = hello.ExtensionVersion;
            state = null;
            return hello.ProtocolVersion == ProtocolConstants.Version;
        }
    }

    public bool IsCurrent(string id)
    {
        lock (sync)
        {
            return string.Equals(connectionId, id, StringComparison.Ordinal);
        }
    }

    public bool TryGetConnectionId(out string id)
    {
        lock (sync)
        {
            id = connectionId ?? string.Empty;
            return connectionId is not null && protocolVersion == ProtocolConstants.Version;
        }
    }

    public bool HasConnection
    {
        get
        {
            lock (sync)
            {
                return connectionId is not null;
            }
        }
    }

    public void UpdateState(string id, PlayerState nextState)
    {
        lock (sync)
        {
            if (!string.Equals(connectionId, id, StringComparison.Ordinal))
            {
                return;
            }

            if (state is not null && string.Equals(state.TargetKey, nextState.TargetKey, StringComparison.Ordinal) && nextState.Sequence <= state.Sequence)
            {
                return;
            }

            state = nextState;
        }
    }

    public void ClearState(string id)
    {
        lock (sync)
        {
            if (string.Equals(connectionId, id, StringComparison.Ordinal))
            {
                state = null;
            }
        }
    }

    public void Disconnect(string id)
    {
        lock (sync)
        {
            if (string.Equals(connectionId, id, StringComparison.Ordinal))
            {
                connectionId = null;
                protocolVersion = 0;
                extensionVersion = null;
                state = null;
            }
        }
    }

    public PlayerState? GetState()
    {
        lock (sync)
        {
            return state;
        }
    }

    public SystemStatus GetStatus()
    {
        lock (sync)
        {
            var extensionConnected = connectionId is not null;
            var targetStatus = state is null
                ? "none"
                : state.IsLive
                    ? "ready"
                    : state.Duration is null
                        ? "loading"
                        : state.CanSeek
                            ? "ready"
                            : "unsupported";
            return new SystemStatus(
                ServerConnected: true,
                ExtensionConnected: extensionConnected,
                TargetStatus: targetStatus,
                TargetTitle: state?.Title,
                ProtocolCompatible: extensionConnected && protocolVersion == ProtocolConstants.Version,
                UpdatedAtUtc: DateTimeOffset.UtcNow);
        }
    }

    public string? ExtensionVersion
    {
        get
        {
            lock (sync)
            {
                return extensionVersion;
            }
        }
    }
}
