# Slack + Claude Code — Pilot Setup

Connect Claude Code to Slack so it can search, read, and post **as you**.

Assumes you already have Claude Code working against the LiteLLM proxy.

Takes about 10 minutes, plus a short wait while someone sends you a token.

---

## Before you start

**Fill these in before sharing this doc** — every `«»` below refers back to this table.

| | Value |
|---|---|
| `«AUTHORIZE_URL»` | |
| `«TEST_CHANNEL_ID»` | |
| `«OWNER»` | |

---

## Step 1 — Authorize Slack

Open this link in your browser:

```
«AUTHORIZE_URL»
```

Review the permissions. It's a long list — reading your channels and DMs, searching the
workspace, posting and starting DMs on your behalf. That's what the Slack tools need in order
to be useful. Check that the workspace is Bitovi, then click **Allow**.

Your browser will land on an error page saying **"This site can't be reached"** or
**"localhost refused to connect."**

**This is expected.** Nothing is broken.

Look at the address bar. It contains a code:

```
localhost/?code=2374139173.11785338140791.e5b5edf10ba2b4b9f088f7ac...
```

Click into the address bar to see the whole thing — it's longer than what's displayed. Copy
everything after `code=` (stop at `&` if there is one).

## Step 2 — Send the code to «OWNER»

Send it promptly — **codes expire in about 10 minutes** and only work once. If yours expires,
just open the link in Step 1 again for a new one.

The code is useless on its own; converting it to a token needs a secret only `«OWNER»` has.

You'll get back a token starting with `xoxp-`, delivered through 1Password or another secure
channel.

**Treat it like a password.** It can act as you in Slack.

## Step 3 — Save your token

Add to `~/.zshrc` (or `~/.bashrc`):

```bash
export SLACK_MCP_TOKEN=xoxp-...
```

Then reload:

```bash
source ~/.zshrc
```

## Step 4 — Connect Slack to Claude Code

Run this in your **terminal** — not inside a Claude Code session:

```bash
claude mcp add --scope user --transport http slack https://mcp.slack.com/mcp \
  --header 'Authorization: Bearer ${SLACK_MCP_TOKEN}'
```

Copy it exactly. **The single quotes matter** — with double quotes, your token gets written
into a config file in plaintext.

You should see: `Added HTTP MCP server slack`.

## Step 5 — Verify

```bash
cd ~
claude
```

Type `/mcp`. You should see **slack** listed as **connected**, with no login prompt.

Then ask:

```
Post "testing slack setup" to channel «TEST_CHANNEL_ID»
```

Open Slack and find the message. **It should show your name and photo.** If it does, you're
done.

---

## If something goes wrong

**`/mcp` shows "failed" or mentions dynamic client registration**

Your token isn't reaching Slack. Check it's actually set:

```bash
echo $SLACK_MCP_TOKEN
```

Empty? Redo Step 3 and restart your terminal. Also try `claude mcp list`, which flags
unresolved variables.

**"Channel not found" for a channel you can obviously see**

Use the channel **ID**, not the name. This one catches everybody. In Slack, click the channel
name at the top → scroll to the bottom of the details panel → copy the ID starting with `C`.

**`/mcp` shows nothing at all**

The server was probably added to a single folder rather than globally. Re-run Step 4 with
`--scope user` included.

**The message posted, but from an app with a BOT tag**

You may have been given the wrong token type. Tell `«OWNER»`.

**Claude answered your `claude mcp add` command instead of running it**

You typed it inside a Claude session. `/exit` first, then run it at the terminal prompt.

**Weird answers about extracting Slack tokens from your browser**

You're probably running `claude` inside a repo with outdated setup docs, and it's reading
them. `cd ~` and try again. Never extract tokens from your browser — that's a different,
worse method we're not using.

---

## Good to know

- Your Slack token is tied to your account. If your laptop is lost or you think the token
  leaked, tell `«OWNER»` right away so it can be revoked.
- Everything Claude does in Slack shows up as you, so treat it the way you'd treat anything
  you post yourself.
- If the app's permissions change, your token stops working and you'll redo Steps 1–3.
- Questions or anything unclear: `«OWNER»`
