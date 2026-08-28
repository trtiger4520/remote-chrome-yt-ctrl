using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using RemoteChromeYouTubeController.Server.Authentication;
using RemoteChromeYouTubeController.Server.Configuration;
using RemoteChromeYouTubeController.Server.Contracts;
using RemoteChromeYouTubeController.Server.Hubs;
using RemoteChromeYouTubeController.Server.Logging;
using RemoteChromeYouTubeController.Server.Services;

var builtWebRoot = Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "artifacts", "remote-web"));
var builder = WebApplication.CreateBuilder(new WebApplicationOptions
{
    Args = args,
    WebRootPath = Directory.Exists(builtWebRoot) ? builtWebRoot : null,
});

builder.Configuration.AddEnvironmentVariables("YTREMOTE_");
builder.Services.AddOptions<ServerOptions>()
    .Bind(builder.Configuration.GetSection(ServerOptions.SectionName))
    .ValidateDataAnnotations()
    .ValidateOnStart();
builder.Services.AddOptions<PairingOptions>()
    .Bind(builder.Configuration.GetSection(PairingOptions.SectionName));

var serverOptions = builder.Configuration.GetSection(ServerOptions.SectionName).Get<ServerOptions>() ?? new ServerOptions();
builder.WebHost.UseUrls(builder.Configuration["Server:Url"] ?? $"http://{serverOptions.BindAddress}:{serverOptions.Port}");


builder.Services.AddSingleton<PairingTokenService>();
builder.Services.AddSingleton<ExtensionRegistry>();
builder.Services.AddSingleton<CommandValidator>();
builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = PairingTokenAuthenticationHandler.SchemeName;
        options.DefaultChallengeScheme = PairingTokenAuthenticationHandler.SchemeName;
    })
    .AddScheme<AuthenticationSchemeOptions, PairingTokenAuthenticationHandler>(PairingTokenAuthenticationHandler.SchemeName, _ => { });
builder.Services.AddAuthorization();
builder.Services.AddCors(options => options.AddPolicy("Extension", policy => policy
    .SetIsOriginAllowed(origin => origin.StartsWith("chrome-extension://", StringComparison.OrdinalIgnoreCase))
    .AllowAnyHeader()
    .AllowAnyMethod()
    .AllowCredentials()));
builder.Services.AddRateLimiter(options => options.AddPolicy("hub-negotiate", context =>
    RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 20,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0,
        })));
builder.Services.AddHealthChecks().AddCheck("process", () => HealthCheckResult.Healthy());
builder.Services.AddSignalR(options =>
{
    options.EnableDetailedErrors = builder.Environment.IsDevelopment();
    options.MaximumReceiveMessageSize = 16 * 1024;
    options.KeepAliveInterval = TimeSpan.FromSeconds(15);
    options.ClientTimeoutInterval = TimeSpan.FromSeconds(45);
}).AddJsonProtocol(options =>
{
    options.PayloadSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    options.PayloadSerializerOptions.DictionaryKeyPolicy = JsonNamingPolicy.CamelCase;
    options.PayloadSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
});

var app = builder.Build();
var pairing = app.Services.GetRequiredService<PairingTokenService>();
var resetPairing = args.Any(argument => string.Equals(argument, "--reset-pairing", StringComparison.OrdinalIgnoreCase));
var showPairing = args.Any(argument => string.Equals(argument, "--show-pairing", StringComparison.OrdinalIgnoreCase));
pairing.EnsureToken(resetPairing);

if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}
else
{
    app.UseExceptionHandler(exceptionApp => exceptionApp.Run(async context =>
    {
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsJsonAsync(new { error = "internal_error" });
    }));
}

app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    context.Response.Headers["Referrer-Policy"] = "no-referrer";
    context.Response.Headers["Content-Security-Policy"] = "default-src 'self'; connect-src 'self' ws: http://localhost:* http://127.0.0.1:*; img-src 'self' data:; style-src 'self'; script-src 'self'; base-uri 'none'; frame-ancestors 'none'";
    await next();
});

// SignalR's Extension hub has no bearer token by design. Keep the loopback
// check at the HTTP boundary as well as inside the hub to cover every
// transport and negotiation request.
app.Use(async (context, next) =>
{
    if (context.Request.Path.StartsWithSegments("/hubs/extension"))
    {
        var remoteAddress = context.Connection.RemoteIpAddress;
        if (remoteAddress is null || !System.Net.IPAddress.IsLoopback(remoteAddress))
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            await context.Response.WriteAsync("Extension hub accepts loopback connections only");
            return;
        }
    }

    await next();
});
app.UseRouting();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();
app.UseDefaultFiles();
app.UseStaticFiles();

app.MapHealthChecks("/health/live");
app.MapGet("/api/status", (ExtensionRegistry registry) =>
    Results.Ok(new RemoteSnapshot(registry.GetStatus(), registry.GetState())))
    .RequireAuthorization();
app.MapHub<RemoteHub>("/hubs/remote").RequireRateLimiting("hub-negotiate");
app.MapHub<ExtensionHub>("/hubs/extension").RequireCors("Extension");
app.MapFallbackToFile("index.html");

app.Lifetime.ApplicationStarted.Register(() =>
{
    PairingUrlPrinter.Print(pairing, serverOptions.Port, showPairing);
    ServerLog.ServerStarted(app.Logger, serverOptions.Port);
});

app.Lifetime.ApplicationStopping.Register(() => ServerLog.ServerStopping(app.Logger));

await app.RunAsync();

public partial class Program;
