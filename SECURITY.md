# Security Policy

The Weave team takes the security of our workflow execution engine, sandboxed evaluation environments, and user credentials seriously.

---

## Supported Versions

Only the latest release branch and `main` branch receive active security updates.

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

---

## Reporting a Vulnerability

If you discover a potential security vulnerability within Weave (such as an expression sandbox escape, privilege escalation in human gates, credential leakage in prompt redaction, or SSRF in tool runners):

1. **Do NOT report security vulnerabilities via public GitHub issues.**
2. Send a detailed report via email to **senaabebe4@gmail.com** or open a [Private Vulnerability Advisory](https://github.com/Senasphy/weave/security/advisories/new) on GitHub.
3. Include the following details in your report:
   - Type of issue (e.g. CEL sandbox escape, unauthenticated API endpoint, SSRF in HTTP tool).
   - Step-by-step instructions or proof-of-concept workflow graph to reproduce the issue.
   - Potential impact and affected components.

---

## Disclosure Process

- We will acknowledge receipt of your vulnerability report within **48 hours**.
- We will provide a status update and estimated timeline for a patch within **7 business days**.
- Once a fix is verified and released, we will publicly credit the reporter (unless you request to remain anonymous).
