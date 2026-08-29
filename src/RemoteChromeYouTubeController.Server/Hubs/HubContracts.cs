using RemoteChromeYouTubeController.Server.Contracts;

namespace RemoteChromeYouTubeController.Server.Hubs;

public interface IRemoteClient
{
    Task PlayerState(PlayerState state);
    Task VideoMenuUpdated(VideoMenu? menu);
    Task SystemStatus(SystemStatus status);
    Task ExtensionOffline();
}
