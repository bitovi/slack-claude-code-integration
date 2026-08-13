# slack-oauth-onboarding

Self-serve Slack user-token issuance for Claude Code users at Bitovi.

A user opens the site, authorizes the Slack app, and lands on a page with their
`xoxp-` token already embedded in the two commands they need to run. No manual
code exchange, no tokens passed through Slack DMs.

## What it does

```
GET  /                  landing page, explains the flow
GET  /oauth/start       sets signed state cookie, redirects to Slack
GET  /oauth/callback    verifies state, exchanges code, renders setup commands
GET  /health            liveness/readiness probe
```

The token is rendered once and never persisted. There is no database.

## Environment

| Variable | Source | Notes |
|---|---|---|
| `SLACK_CLIENT_ID` | 1Password → `SLACK_OAUTH_CLIENT_ID` | |
| `SLACK_CLIENT_SECRET` | 1Password → `SLACK_OAUTH_CLIENT_SECRET` | never logged |
| `SLACK_STATE_SECRET` | 1Password → `SLACK_OAUTH_STATE_SECRET` | random 32+ bytes; **add this field before first deploy** |
| `SLACK_OAUTH_REDIRECT_URL` | manifest | must exactly match the Redirect URL in the Slack app |
| `SLACK_USER_SCOPES` | manifest | comma-separated, no spaces; subset of the app's User Token Scopes |
| `PORT` | manifest | defaults to 3000 |

The process exits at startup if any of these are missing.

Generate a state secret with:

```bash
openssl rand -hex 32
```

## Slack app prerequisites

1. **Agents** → enable the Slack MCP Server feature.
2. **OAuth & Permissions → User Token Scopes** — must include every scope listed in
   `SLACK_USER_SCOPES`. Bot scopes are not used.
3. **OAuth & Permissions → Redirect URLs** — add the deployed callback URL exactly.

Changing scopes invalidates existing tokens; users re-run the flow.

## Local development

```bash
npm install
SLACK_CLIENT_ID=… \
SLACK_CLIENT_SECRET=… \
SLACK_STATE_SECRET=$(openssl rand -hex 32) \
SLACK_OAUTH_REDIRECT_URL=https://localhost:3000/oauth/callback \
SLACK_USER_SCOPES=chat:write,channels:read \
npm start
```

Slack requires HTTPS redirect URLs, so a full local round trip needs a tunnel
(ngrok or similar) with that URL registered in the app.

## Build

```bash
docker build -t ghcr.io/bitovi/slack-oauth-onboarding:0.1.0 .
docker push ghcr.io/bitovi/slack-oauth-onboarding:0.1.0
```

Pin the tag in the Argo Application. Avoid `:latest` — this service handles the
client secret, and a silent image change on restart is not something you want here.

## Security notes

- The `state` parameter is HMAC-signed and mirrored in an `httpOnly`, `Secure`,
  `SameSite=Lax` cookie with a 10-minute TTL. Both are checked with a constant-time
  comparison on callback.
- Tokens, codes, and the client secret are never written to logs. Slack error codes
  are logged; response bodies are not.
- Success and error pages send `Cache-Control: no-store`.
- Container runs as the non-root `node` user.

## Things this deliberately does not do

- Store tokens. Users hold their own; revocation is done in the Slack app.
- Restrict who can authorize. Anyone reaching the URL and holding a Bitovi Slack
  account can issue themselves a token — the same as the manual flow. Put it behind
  the internal ALB or add SSO if that isn't acceptable.
