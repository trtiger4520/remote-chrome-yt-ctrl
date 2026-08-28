using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;
using RemoteChromeYouTubeController.Server.Services;

namespace RemoteChromeYouTubeController.Server.Authentication;

public sealed class PairingTokenAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    PairingTokenService pairingTokenService)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "PairingToken";

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Path.StartsWithSegments("/hubs/remote") && !Request.Path.StartsWithSegments("/api/status"))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var token = Request.Headers.Authorization.FirstOrDefault();
        if (token?.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase) == true)
        {
            token = token["Bearer ".Length..];
        }
        else if (Request.Path.StartsWithSegments("/hubs/remote"))
        {
            token = Request.Query["access_token"].FirstOrDefault();
        }

        if (!pairingTokenService.Validate(token))
        {
            return Task.FromResult(AuthenticateResult.Fail("Invalid pairing token"));
        }

        var identity = new ClaimsIdentity(
            [new Claim(ClaimTypes.NameIdentifier, "paired-remote")],
            SchemeName);
        return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identity), SchemeName)));
    }
}
