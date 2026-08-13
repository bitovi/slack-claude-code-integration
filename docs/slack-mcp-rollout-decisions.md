# Slack MCP Rollout — Options & Open Questions

**Status:** proof of concept working end to end. Decisions needed before rolling out.

---

## What's proven

A single user (Nicole) can run Claude Code with model traffic routed through the LiteLLM
proxy and post to Slack **as themselves**, with no Anthropic account involved.

That validates the core goal: per-user Slack integration on top of centrally governed model
access.

## Constraints we found along the way

These shape every option below.

1. **Slack does not support dynamic client registration.** MCP clients can't self-register.
   A Slack app must exist in advance, and the client must arrive already holding credentials.
2. **Per-user attribution requires a per-user token.** There's no shared credential that
   preserves "this action was Nicole." One `xoxp-` per person, or no attribution.
3. **Bedrock rules out the API-native path.** Our models are `bedrock/*.anthropic.*`, so
   Anthropic's server-side `mcp_servers` request parameter isn't available. MCP must execute
   either in the client or in the LiteLLM gateway.
4. **The proxy repo is a config overlay.** `claude-usage-proxy` is fronted by Argo CD over
   `bitovi/litellm`. Any gateway-side change is a PR, not a console edit.

---

## Decision 1 — Where does MCP execute?

### Option A: Client-side (what the PoC uses)

Each user holds a Slack token locally; Claude Code talks to `mcp.slack.com` directly.

| | |
|---|---|
| **Effort** | Low — working today |
| **Model governance** | Unchanged; still through LiteLLM |
| **Tool-level audit** | None. Proxy never sees Slack calls |
| **Token exposure** | `xoxp-` on every laptop, plaintext or env var |
| **Rotation** | Manual, per person |
| **Headless/service use** | Not supported — needs a human to consent |

### Option B: LiteLLM MCP Gateway

Slack registered as an MCP server in the proxy; users consent through it via OAuth
passthrough. No raw tokens on laptops.

| | |
|---|---|
| **Effort** | Higher — config PR, Proxy Admin, OAuth client setup |
| **Model governance** | Unchanged |
| **Tool-level audit** | Yes — Slack calls logged next to model spend |
| **Token exposure** | Held by proxy, not distributed |
| **Rotation** | Centralized |
| **Headless/service use** | Supported |

### Suggested framing

Option A is right for a pilot and probably fine up to a handful of people. Option B is what
you want once any of these become true: a compliance ask for tool-level audit, a tier of users
who should be read-only, a service account that needs Slack access, or enough users that
manual token rotation stops being realistic.

They're not exclusive — humans on A, services on B is a legitimate steady state.

---

## Decision 2 — How do users get tokens? (only if Option A)

| Mechanism | Effort | Good for |
|---|---|---|
| **Manual OAuth** — send authorize URL, exchange the code by hand | None (no infra) | 5–10 people |
| **Bolt sample app** — Slack's template handles install + code exchange | Small service to host | 10+ people |
| **Gateway** — skip local tokens entirely | See Option B | Any scale |

---

## Open questions for the team

### Ownership
- Who is Proxy Admin on the LiteLLM gateway? (Needed for per-user virtual keys and any
  gateway-side MCP config. Nicole is currently Internal User only.)
- Who owns the Slack workspace, and does installing this app need their approval?
- Who owns the Slack app long-term — including revoking tokens when someone leaves?

### Scope of rollout
- How many people, and on what timeline?
- Which teams? Does everyone get the same permissions, or do we need tiers?
- Do we need private channel access, or public only? (Changes the required permissions.)
- Any channels that should be off-limits to automated posting?

### Security & governance
- Is a Slack token in a laptop env var acceptable, or does that block Option A outright?
- Do we need an audit trail of Slack actions taken via Claude? If yes, that forces Option B.
- What's the token rotation cadence, and what's the offboarding process?
- Does anything here need Security or Legal review before it goes wider?

### Future needs
- Any headless or scheduled use cases coming? (n8n workflows, bots, CI.) Those can't use
  Option A at all.
- Other MCP servers likely to follow? If we're adding several, the gateway pays for itself
  sooner.

---

## Recommended next steps

1. Run 2–3 pilot users through manual OAuth this week; capture what breaks.
2. Identify the Proxy Admin and open the gateway conversation now — lead time isn't zero.
3. Confirm the required Slack permissions with the workspace owner.
4. Revisit Option A vs B once the pilot has data.
