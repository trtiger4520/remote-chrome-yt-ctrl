# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Vue 3 + TypeScript + Vite for the mobile web remote, TypeScript + Vite for the Chrome Extension, and ASP.NET Core 10 + SignalR for the local server

## Users

The primary user is one person controlling YouTube playback in their already signed-in Chrome profile from a phone on the same private LAN

## Product Purpose

The product lets a phone control YouTube playing in a normal Chrome tab without restarting Chrome, opening another profile, or using Chrome DevTools Protocol. Success means the user can pair once, see the current playback state, control it reliably, and recover from short connection or tab interruptions

## Positioning

The product bridges a phone, an ASP.NET Core server, and a Manifest V3 Extension that operates the existing YouTube video element in the user's current Chrome profile. It does not automate Chrome through CDP or require a second signed-in browser profile

## Operating Context

The server runs as a console application on a Windows computer and binds to the private LAN on port 5080. The phone opens the server-hosted web remote. The Extension is loaded as an unpacked developer-mode extension and connects only to localhost. YouTube may replace its video element during SPA navigation, and the Extension must rebind to the active element

## Capabilities and Constraints

- SignalR carries commands and live state between the phone and server, and between the server and Extension
- The first version supports play/pause, seek by ten seconds, absolute seek, volume, mute, playback rate, navigation, title, time, duration, and connection status
- The active or most recently active supported YouTube tab is the automatic target; there is no tab selector in version one
- Live streams are recognized and keep playback, volume, mute, and rate controls while seeking is disabled
- A QR pairing flow creates a persistent random token for the phone; the Extension endpoint accepts only loopback connections
- Version one is private-LAN HTTP only and must not be exposed directly to the public Internet
- Version one does not include a database, Docker, Windows Service, Cloudflare Tunnel, Chrome Web Store publication, or other browsers

## Brand Commitments

The working product name is Remote Chrome YouTube Controller and the web interface label is YouTube Remote. The interface is an operational, mobile-first control surface optimized for one-handed, high-frequency use

## Evidence on Hand

The supplied requirements document defines the Chrome Extension, ASP.NET Core server, SignalR transport, mobile remote, command/state messages, QR pairing intent, and LAN-first security concerns. No logos, customer claims, testimonials, commercial benchmarks, or other brand assets are available and none may be fabricated

## Product Principles

- Preserve the user's existing Chrome session and profile
- Make connection, target, and command failures explicit and recoverable
- Prefer the smallest permission and network surface that can operate the feature
- Keep playback state responsive while treating the server and Extension as reconnectable infrastructure
- Keep the first release personal, local, and easy to inspect

## Accessibility & Inclusion

The remote must support one-handed touch operation, touch targets of at least 44 CSS pixels, visible keyboard focus, semantic controls, WCAG AA contrast, reduced-motion preferences, and non-spammy announcements for connection and error changes
