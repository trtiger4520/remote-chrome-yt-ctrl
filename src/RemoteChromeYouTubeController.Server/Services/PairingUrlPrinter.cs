using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Text;
using QRCoder;

namespace RemoteChromeYouTubeController.Server.Services;

public static class PairingUrlPrinter
{
    public static void Print(PairingTokenService pairing, int port, bool showPairing)
    {
        var urls = GetPrivateUrls(port, pairing.EnsureToken()).ToArray();
        Console.WriteLine();
        Console.WriteLine("YouTube Remote pairing");
        Console.WriteLine("Scan one of these URLs from a phone on the same private LAN:");
        foreach (var url in urls)
        {
            Console.WriteLine($"  {url}");
            PrintQr(url);
        }

        Console.WriteLine($"Token file: {pairing.TokenPath}");
        Console.WriteLine(showPairing
            ? "Pairing QR printed by --show-pairing"
            : "Use --show-pairing to explicitly reprint pairing details, or --reset-pairing to rotate the token");
        Console.WriteLine();
    }

    private static IEnumerable<string> GetPrivateUrls(int port, string token)
    {
        var addresses = NetworkInterface.GetAllNetworkInterfaces()
            .Where(network => network.OperationalStatus == OperationalStatus.Up)
            .SelectMany(network => network.GetIPProperties().UnicastAddresses)
            .Select(address => address.Address)
            .Where(address => address.AddressFamily == AddressFamily.InterNetwork && !IPAddress.IsLoopback(address))
            .Where(IsPrivate)
            .Distinct()
            .OrderBy(address => address.ToString(), StringComparer.Ordinal);

        foreach (var address in addresses)
        {
            yield return $"http://{address}:{port}/#token={Uri.EscapeDataString(token)}";
        }

        if (!addresses.Any())
        {
            yield return $"http://127.0.0.1:{port}/#token={Uri.EscapeDataString(token)}";
        }
    }

    private static bool IsPrivate(IPAddress address)
    {
        var bytes = address.GetAddressBytes();
        return bytes[0] == 10 ||
               bytes[0] == 172 && bytes[1] is >= 16 and <= 31 ||
               bytes[0] == 192 && bytes[1] == 168;
    }

    private static void PrintQr(string url)
    {
        using var generator = new QRCodeGenerator();
        using var data = generator.CreateQrCode(url, QRCodeGenerator.ECCLevel.Q);
        var ascii = new AsciiQRCode(data).GetGraphic(1);
        Console.WriteLine(ascii);
    }
}
