using System.Net;
using System.Net.Http.Headers;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using RemoteChromeYouTubeController.Server.Services;

namespace RemoteChromeYouTubeController.Server.Tests;

public sealed class YouTubeThumbnailEndpointTests
{
    [Fact]
    public async Task Thumbnail_returns_upstream_image_without_pairing_token()
    {
        const string videoId = "TpnQZ4q2UI0";
        var expectedContent = new byte[] { 0xFF, 0xD8, 0xFF, 0xD9 };
        var handler = new StubThumbnailHandler(HttpStatusCode.OK, expectedContent, "image/jpeg");
        using var factory = new ThumbnailTestServerFactory(handler);
        using var client = factory.CreateClient();

        using var response = await client.GetAsync(
            $"/api/youtube-thumbnail/{videoId}",
            TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("image/jpeg", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal(TimeSpan.FromDays(1), response.Headers.CacheControl?.MaxAge);
        Assert.Equal(expectedContent, await response.Content.ReadAsByteArrayAsync(TestContext.Current.CancellationToken));
        Assert.Equal(
            new Uri($"https://i.ytimg.com/vi/{videoId}/hqdefault.jpg"),
            handler.RequestUri);
    }

    [Fact]
    public async Task Thumbnail_rejects_video_ids_that_are_not_safe_path_segments()
    {
        var handler = new StubThumbnailHandler(HttpStatusCode.OK, [0xFF, 0xD8], "image/jpeg");
        using var factory = new ThumbnailTestServerFactory(handler);
        using var client = factory.CreateClient();

        using var response = await client.GetAsync(
            "/api/youtube-thumbnail/invalid.id",
            TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Null(handler.RequestUri);
    }

    [Fact]
    public async Task Thumbnail_returns_not_found_when_upstream_thumbnail_is_missing()
    {
        var handler = new StubThumbnailHandler(HttpStatusCode.NotFound, [], null);
        using var factory = new ThumbnailTestServerFactory(handler);
        using var client = factory.CreateClient();

        using var response = await client.GetAsync(
            "/api/youtube-thumbnail/missing",
            TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Thumbnail_returns_bad_gateway_when_upstream_is_unavailable()
    {
        var handler = new StubThumbnailHandler(HttpStatusCode.ServiceUnavailable, [], null);
        using var factory = new ThumbnailTestServerFactory(handler);
        using var client = factory.CreateClient();

        using var response = await client.GetAsync(
            "/api/youtube-thumbnail/unavailable",
            TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.BadGateway, response.StatusCode);
    }

    private sealed class ThumbnailTestServerFactory(HttpMessageHandler thumbnailHandler) : WebApplicationFactory<Program>
    {
        private readonly string tokenPath = Path.Combine(
            Path.GetTempPath(),
            "remote-youtube-tests",
            Guid.NewGuid().ToString("N"),
            "pairing-token");

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Production");
            builder.ConfigureAppConfiguration((_, configuration) =>
                configuration.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Server:Url"] = "http://127.0.0.1:0",
                    ["Pairing:TokenPath"] = tokenPath,
                }));
            builder.ConfigureServices(services =>
                services.AddHttpClient<YouTubeThumbnailService>()
                    .ConfigurePrimaryHttpMessageHandler(() => thumbnailHandler));
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

    private sealed class StubThumbnailHandler(
        HttpStatusCode statusCode,
        byte[] content,
        string? contentType) : HttpMessageHandler
    {
        public Uri? RequestUri { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            RequestUri = request.RequestUri;
            var response = new HttpResponseMessage(statusCode);
            if (contentType is not null)
            {
                response.Content = new ByteArrayContent(content);
                response.Content.Headers.ContentType = new MediaTypeHeaderValue(contentType);
            }

            return Task.FromResult(response);
        }
    }
}
