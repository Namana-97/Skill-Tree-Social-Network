# Security Policy

## Implemented Security Measures

### Authentication & Authorization

- JWT-based authentication with bcrypt password hashing
- Token expiration via `JWT_EXPIRES_IN`
- Protected routes with bearer-token authentication
- Admin-only routes enforced with explicit admin checks

### Rate Limiting

- **Auth endpoints**: 5 attempts per 15 minutes per IP
- **General API endpoints**: 100 requests per 15 minutes per IP
- **GitHub verification**: 20 requests per hour per IP
- **Vouch creation**: 10 vouches per hour per IP

### Input Validation

- Zod schema validation on critical API endpoints
- Type-safe validation for:
  - Authentication payloads
  - Skill creation payloads
  - Vouch creation payloads
  - Skill edge creation payloads

### Data Protection

- Prisma ORM parameterization protects against SQL injection
- CSP and other browser security headers reduce XSS and clickjacking risk
- Environment-variable based secrets management
- Upload scanning pipeline supports external virus scanners

### Security Headers

- `Strict-Transport-Security`
- `X-Frame-Options`
- `X-Content-Type-Options`
- `X-XSS-Protection`
- `Content-Security-Policy`
- `Referrer-Policy`
- `Permissions-Policy`

### Third-Party Integrations

- GitHub API token support with explicit verification flow
- SendGrid notification queueing
- Algolia indexing queue for search sync

## Dependency Security

- CI runs `npm audit`
- Weekly security workflow included

## Reporting Vulnerabilities

If you discover a security vulnerability, report it privately before opening a public issue.

Include:

- A clear description of the issue
- Steps to reproduce
- Potential impact
- Suggested remediation if known

## Best Practices for Contributors

1. Never commit `.env` files or secrets.
2. Keep security-sensitive changes covered by tests.
3. Run `npm audit` before large dependency updates.
4. Prefer least-privilege third-party credentials.
