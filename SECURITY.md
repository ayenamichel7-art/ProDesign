# 🔐 ProDesign Security Policy

## Supported Versions

Only the latest production build of ProDesign is supported for security updates. 

| Version | Supported          |
| ------- | ------------------ |
| 2.1.x   | ✅ Yes              |
| 2.0.x   | ❌ No               |
| < 2.0   | ❌ No               |

## Reporting a Vulnerability

**Do not open a public GitHub Issue for security vulnerabilities.**

If you discover a security vulnerability within ProDesign, please send an e-mail to security@prodesign.com (or your private contact). 

Please include:
- A description of the vulnerability.
- Steps to reproduce (POC).
- Potential impact.

We aim to acknowledge all reports within 48 hours and provide a fix or mitigation strategy as quickly as possible.

## Security Controls in Place

ProDesign implements a "Security-by-Design" approach:
- **Gitleaks**: Automatic scanning for secrets in git history.
- **Snyk & OSV-Scanner**: Real-time dependency vulnerability tracking.
- **Semgrep**: Static Analysis Security Testing (SAST) for code patterns.
- **Non-privileged Containers**: All Docker services run with `security_opt` and `cap_drop`.
- **ZRT (Zero Trust)**: Infrastructure behind Cloudflare Tunnels (Desksuite ecosystem).
