using System.Net;
using System.Net.Http.Headers;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;

namespace RemoteChromeYouTubeController.Server.Tests;

public sealed class ServerEndpointTests
{
    [Fact]
    public async Task Health_is_public_status_requires_pairing_token_and_remote_negotiate_accepts_it()
    {
        using var factory = new TestServerFactory();
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });

        using var health = await client.GetAsync("/health/live", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, health.StatusCode);

        using var unauthorized = await client.GetAsync("/api/status", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Unauthorized, unauthorized.StatusCode);

        using var authorizedRequest = new HttpRequestMessage(HttpMethod.Get, "/api/status");
        authorizedRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", factory.PairingToken);
        using var authorized = await client.SendAsync(authorizedRequest, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, authorized.StatusCode);

        using var negotiateRequest = new HttpRequestMessage(
            HttpMethod.Post,
            "/hubs/remote/negotiate?negotiateVersion=1");
        negotiateRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", factory.PairingToken);
        using var negotiate = await client.SendAsync(negotiateRequest, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, negotiate.StatusCode);
    }

    private sealed class TestServerFactory : WebApplicationFactory<Program>
    {
        private readonly string tokenPath = Path.Combine(
            Path.GetTempPath(),
            "remote-youtube-tests",
            Guid.NewGuid().ToString("N"),
            "pairing-token");

        public string PairingToken => File.ReadAllText(tokenPath).Trim();

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Production");
            builder.ConfigureAppConfiguration((_, configuration) =>
                configuration.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Server:Url"] = "http://127.0.0.1:0",
                    ["Pairing:TokenPath"] = tokenPath
                }));
        }

        protected override void Dispose(bool disposing)
        {
            base.Dispose(disposing);
            var directory = Path.GetDirectoryName(tokenPath);
            if (directory is not null && Directory.Exists(directory))
            {
                Directory.Delete(directory, recursive: true);
            }
        }
    }
}
