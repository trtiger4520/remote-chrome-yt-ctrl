using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Text;
using QRCoder;

namespace RemoteChromeYouTubeController.Server.Services;

public static class PairingUrlPrinter
{
    public static void Print(PairingTokenService pairing, int port)
    {
        Console.WriteLine();
        Console.WriteLine("YouTube Remote pairing is available at:");
        Console.WriteLine($"  http://localhost:{port}/connect");
        Console.WriteLine("Open this page on the Server computer and scan its QR Code from a phone on the same private LAN");
        Console.WriteLine($"Token file: {pairing.TokenPath}");
        Console.WriteLine("Use --reset-pairing to rotate the token");
        Console.WriteLine();
    }

    public static IReadOnlyList<PairingQrCode> CreateQrCodes(int port, string token) =>
        GetPrivateUrls(port, token)
            .Select(url => new PairingQrCode(url, CreateQrCodeDataUrl(url)))
            .ToArray();

    private static string[] GetPrivateUrls(int port, string token)
    {
        var addresses = NetworkInterface.GetAllNetworkInterfaces()
            .Where(network => network.OperationalStatus == OperationalStatus.Up)
            .SelectMany(network => network.GetIPProperties().UnicastAddresses)
            .Select(address => address.Address)
            .Where(address => address.AddressFamily == AddressFamily.InterNetwork && !IPAddress.IsLoopback(address))
            .Where(IsPrivate)
            .Distinct()
            .OrderBy(address => address.ToString(), StringComparer.Ordinal)
            .ToArray();

        if (addresses.Length == 0)
        {
            return [$"http://127.0.0.1:{port}/#token={Uri.EscapeDataString(token)}"];
        }

        return addresses
            .Select(address => $"http://{address}:{port}/#token={Uri.EscapeDataString(token)}")
            .ToArray();
    }

    private static bool IsPrivate(IPAddress address)
    {
        var bytes = address.GetAddressBytes();
        return bytes[0] == 10 ||
               bytes[0] == 172 && bytes[1] is >= 16 and <= 31 ||
               bytes[0] == 192 && bytes[1] == 168;
    }

    private static string CreateQrCodeDataUrl(string url)
    {
        using var generator = new QRCodeGenerator();
        using var data = generator.CreateQrCode(url, QRCodeGenerator.ECCLevel.Q);
        var svg = new SvgQRCode(data).GetGraphic(10);
        return $"data:image/svg+xml;base64,{Convert.ToBase64String(Encoding.UTF8.GetBytes(svg))}";
    }
}

public sealed record PairingQrCode(string Url, string ImageUrl);
