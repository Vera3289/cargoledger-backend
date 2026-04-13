# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x     | ✅        |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Please email security reports to: `security@codegirlsinc.example`

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (optional)

You will receive an acknowledgement within 48 hours and a resolution timeline within 7 days.

## Security Design Notes

- Webhook signatures use HMAC-SHA256 with constant-time comparison to prevent timing attacks
- All amount fields use decimal strings to prevent floating-point precision exploits
- Helmet middleware enforces browser-facing security headers on every response
- The container runs as a non-root user (`cargoledger`)
- Secrets must never be committed — use environment variables only
- TLS termination is expected at the load balancer / reverse proxy layer
- Stellar public key format is validated on every inbound request
- Replay attacks are mitigated via the 300-second timestamp tolerance window on webhook deliveries
