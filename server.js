"use strict";

const express = require("express");
const crypto = require("crypto");
const { page, successPage, errorPage } = require("./views");

const {
  PORT = "3000",
  SLACK_OAUTH_CLIENT_ID,
  SLACK_OAUTH_CLIENT_SECRET,
  SLACK_OAUTH_STATE_SECRET,
  SLACK_OAUTH_REDIRECT_URL,
  SLACK_USER_SCOPES,
} = process.env;

for (const [name, value] of Object.entries({
  SLACK_OAUTH_CLIENT_ID,
  SLACK_OAUTH_CLIENT_SECRET,
  SLACK_OAUTH_STATE_SECRET,
  SLACK_OAUTH_REDIRECT_URL,
  SLACK_USER_SCOPES,
})) {
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
}

const STATE_COOKIE = "slack_oauth_state";
const STATE_TTL_MS = 10 * 60 * 1000;

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", true);

// --- state helpers -------------------------------------------------------

function sign(value) {
  return crypto
    .createHmac("sha256", SLACK_OAUTH_STATE_SECRET)
    .update(value)
    .digest("hex");
}

function makeState() {
  const nonce = crypto.randomBytes(24).toString("hex");
  const issued = Date.now().toString();
  const payload = `${nonce}.${issued}`;
  return `${payload}.${sign(payload)}`;
}

function verifyState(received, fromCookie) {
  if (!received || !fromCookie) return false;

  const a = Buffer.from(received);
  const b = Buffer.from(fromCookie);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;

  const parts = received.split(".");
  if (parts.length !== 3) return false;

  const [nonce, issued, mac] = parts;
  const expected = sign(`${nonce}.${issued}`);
  const macBuf = Buffer.from(mac);
  const expBuf = Buffer.from(expected);
  if (
    macBuf.length !== expBuf.length ||
    !crypto.timingSafeEqual(macBuf, expBuf)
  )
    return false;

  return Date.now() - Number(issued) < STATE_TTL_MS;
}

function readCookie(req, name) {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return null;
}

// --- routes --------------------------------------------------------------

app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));

app.get("/", (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.send(page());
});

app.get("/oauth/start", (_req, res) => {
  const state = makeState();

  res.cookie(STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: STATE_TTL_MS,
    path: "/",
  });

  const url = new URL("https://slack.com/oauth/v2/authorize");
  url.searchParams.set("client_id", SLACK_OAUTH_CLIENT_ID);
  url.searchParams.set("user_scope", SLACK_USER_SCOPES);
  url.searchParams.set("redirect_uri", SLACK_OAUTH_REDIRECT_URL);
  url.searchParams.set("state", state);

  res.redirect(url.toString());
});

app.get("/oauth/callback", async (req, res) => {
  res.set("Cache-Control", "no-store");
  res.clearCookie(STATE_COOKIE, { path: "/" });

  const { code, state, error } = req.query;

  if (error) {
    return res
      .status(400)
      .send(
        errorPage(
          "Authorization was cancelled",
          "Slack did not grant access. If that was a mistake, start again.",
        ),
      );
  }

  if (!verifyState(state, readCookie(req, STATE_COOKIE))) {
    return res
      .status(400)
      .send(
        errorPage(
          "This link has expired",
          "Authorization requests are valid for 10 minutes. Start again from the beginning.",
        ),
      );
  }

  if (!code) {
    return res
      .status(400)
      .send(
        errorPage(
          "Something went wrong",
          "Slack did not return an authorization code. Start again.",
        ),
      );
  }

  let data;
  try {
    const response = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: SLACK_OAUTH_CLIENT_ID,
        client_secret: SLACK_OAUTH_CLIENT_SECRET,
        code: String(code),
        redirect_uri: SLACK_OAUTH_REDIRECT_URL,
      }),
    });
    data = await response.json();
  } catch (err) {
    // Deliberately does not log the request body — it contains the client secret.
    console.error("Token exchange request failed:", err.message);
    return res
      .status(502)
      .send(
        errorPage(
          "Could not reach Slack",
          "The token exchange failed. Try again in a moment.",
        ),
      );
  }

  if (!data.ok) {
    // Slack error codes are safe to log; tokens and codes are not.
    console.error("Token exchange rejected by Slack:", data.error);
    const message =
      data.error === "invalid_code"
        ? "That authorization code was already used or has expired. Start again."
        : "Slack rejected the request. Contact the app owner if this keeps happening.";
    return res
      .status(400)
      .send(errorPage("Slack rejected the request", message));
  }

  const token = data.authed_user && data.authed_user.access_token;
  if (!token || !token.startsWith("xoxp-")) {
    console.error(
      "No user token in response; app may be requesting bot scopes only.",
    );
    return res
      .status(500)
      .send(
        errorPage(
          "No user token was issued",
          "The Slack app returned a bot token instead of a user token. Contact the app owner.",
        ),
      );
  }

  res.send(successPage(token));
});

app.use((_req, res) =>
  res
    .status(404)
    .send(errorPage("Page not found", "Start from the beginning.")),
);

app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`slack-oauth-onboarding listening on ${PORT}`);
});
