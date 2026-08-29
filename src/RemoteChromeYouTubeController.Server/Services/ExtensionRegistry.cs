using RemoteChromeYouTubeController.Server.Contracts;

namespace RemoteChromeYouTubeController.Server.Services;

public sealed class ExtensionRegistry
{
    private readonly object sync = new();
    private string? connectionId;
    private int protocolVersion;
    private string? extensionVersion;
    private PlayerState? state;
    private VideoMenu? menu;

    public bool Register(string id, ExtensionHello hello)
    {
        lock (sync)
        {
            connectionId = id;
            protocolVersion = hello.ProtocolVersion;
            extensionVersion = hello.ExtensionVersion;
            state = null;
            menu = null;
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
                menu = null;
            }
        }
    }

    public bool UpdateVideoMenu(string id, VideoMenu nextMenu)
    {
        lock (sync)
        {
            if (!string.Equals(connectionId, id, StringComparison.Ordinal))
            {
                return false;
            }

            if (menu is not null &&
                string.Equals(menu.TargetKey, nextMenu.TargetKey, StringComparison.Ordinal) &&
                nextMenu.Sequence <= menu.Sequence)
            {
                return false;
            }

            menu = nextMenu;
            return true;
        }
    }

    public void ClearVideoMenu(string id)
    {
        lock (sync)
        {
            if (string.Equals(connectionId, id, StringComparison.Ordinal))
            {
                menu = null;
            }
        }
    }

    public bool Disconnect(string id)
    {
        lock (sync)
        {
            if (!string.Equals(connectionId, id, StringComparison.Ordinal))
            {
                return false;
            }

            connectionId = null;
            protocolVersion = 0;
            extensionVersion = null;
            state = null;
            menu = null;
            return true;
        }
    }

    public PlayerState? GetState()
    {
        lock (sync)
        {
            return state;
        }
    }

    public VideoMenu? GetVideoMenu()
    {
        lock (sync)
        {
            return menu;
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
