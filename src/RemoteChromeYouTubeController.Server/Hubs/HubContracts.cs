using RemoteChromeYouTubeController.Server.Contracts;

namespace RemoteChromeYouTubeController.Server.Hubs;

public interface IRemoteClient
{
    Task PlayerState(PlayerState state);
    Task SystemStatus(SystemStatus status);
    Task ExtensionOffline();
}
