'use strict';

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

const CSS = `
  :root {
    --ink: #14161a;
    --ink-soft: #545a66;
    --paper: #eff1f4;
    --card: #ffffff;
    --rule: #d9dde3;
    --aubergine: #4a154b;
    --signal: #0b7a75;
    --warn: #b4690e;
    --mono: ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace;
    --sans: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 48px 20px 80px;
    background: var(--paper);
    color: var(--ink);
    font-family: var(--sans);
    line-height: 1.55;
    -webkit-font-smoothing: antialiased;
  }
  main { max-width: 660px; margin: 0 auto; }
  .eyebrow {
    font-family: var(--mono);
    font-size: 12px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--aubergine);
    margin: 0 0 14px;
  }
  h1 {
    font-family: var(--mono);
    font-size: clamp(26px, 5vw, 34px);
    font-weight: 600;
    letter-spacing: -0.02em;
    line-height: 1.2;
    margin: 0 0 14px;
  }
  p { margin: 0 0 16px; color: var(--ink-soft); }
  p.lead { color: var(--ink); font-size: 17px; }
  .card {
    background: var(--card);
    border: 1px solid var(--rule);
    border-radius: 10px;
    padding: 28px;
    margin-top: 28px;
  }
  .step {
    display: flex;
    gap: 14px;
    padding: 18px 0;
    border-top: 1px solid var(--rule);
  }
  .step:first-of-type { border-top: 0; padding-top: 0; }
  .step-n {
    font-family: var(--mono);
    font-size: 13px;
    color: var(--aubergine);
    padding-top: 2px;
    min-width: 22px;
  }
  .step h2 { font-size: 15px; font-weight: 600; margin: 0 0 4px; }
  .step p { margin: 0; font-size: 14px; }
  .shell {
    position: relative;
    background: var(--ink);
    border-radius: 8px;
    padding: 18px 18px 18px 40px;
    margin: 14px 0 6px;
    overflow-x: auto;
  }
  .shell code {
    font-family: var(--mono);
    font-size: 13px;
    line-height: 1.7;
    color: #e8eaee;
    white-space: pre;
    display: block;
  }
  .shell::before {
    content: "$";
    position: absolute;
    left: 18px;
    top: 18px;
    font-family: var(--mono);
    font-size: 13px;
    line-height: 1.7;
    color: #6d7480;
  }
  .copy {
    position: absolute;
    top: 10px;
    right: 10px;
    background: #262a31;
    color: #cfd4dc;
    border: 1px solid #383d46;
    border-radius: 6px;
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 5px 10px;
    cursor: pointer;
  }
  .copy:hover { background: #31363f; color: #fff; }
  .copy:focus-visible { outline: 2px solid var(--signal); outline-offset: 2px; }
  .copy[data-copied="true"] { color: #7fd8c9; border-color: #2f5f58; }
  .cta {
    display: inline-block;
    background: var(--aubergine);
    color: #fff;
    font-family: var(--mono);
    font-size: 14px;
    text-decoration: none;
    padding: 13px 22px;
    border-radius: 8px;
    margin-top: 8px;
  }
  .cta:hover { background: #3a1039; }
  .cta:focus-visible { outline: 2px solid var(--ink); outline-offset: 3px; }
  .note {
    border-left: 3px solid var(--warn);
    padding: 2px 0 2px 14px;
    margin: 22px 0 0;
    font-size: 14px;
    color: var(--ink-soft);
  }
  .note strong { color: var(--ink); }
  .rule { height: 1px; background: var(--rule); margin: 32px 0; border: 0; }
  footer {
    margin-top: 34px;
    font-family: var(--mono);
    font-size: 12px;
    color: var(--ink-soft);
  }
  @media (prefers-reduced-motion: no-preference) {
    .copy { transition: background 120ms ease, color 120ms ease; }
  }
`;

function shell(id, text) {
  return `<div class="shell">
      <button class="copy" type="button" data-target="${id}">Copy</button>
      <code id="${id}">${escapeHtml(text)}</code>
    </div>`;
}

const COPY_SCRIPT = `
  document.querySelectorAll('.copy').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var el = document.getElementById(btn.dataset.target);
      navigator.clipboard.writeText(el.textContent).then(function () {
        btn.textContent = 'Copied';
        btn.dataset.copied = 'true';
        setTimeout(function () {
          btn.textContent = 'Copy';
          btn.dataset.copied = 'false';
        }, 1800);
      });
    });
  });
`;

function layout(title, body, script) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(title)}</title>
<style>${CSS}</style>
</head>
<body><main>${body}</main>${script ? `<script>${script}</script>` : ''}</body>
</html>`;
}

function page() {
  return layout(
    'Connect Slack to Claude Code',
    `<p class="eyebrow">Bitovi Platform</p>
     <h1>Connect Slack to Claude Code</h1>
     <p class="lead">Give Claude Code access to Slack so it can search, read, and post as you.</p>
     <p>You'll approve a set of Slack permissions, then get two commands to run in your terminal. Takes about two minutes.</p>
     <a class="cta" href="/oauth/start">Authorize Slack</a>
     <div class="card">
       <div class="step"><span class="step-n">01</span><div><h2>Approve access in Slack</h2><p>The permission list is long — Claude needs to read channels and DMs and post on your behalf.</p></div></div>
       <div class="step"><span class="step-n">02</span><div><h2>Copy your setup commands</h2><p>You'll land back here with everything filled in.</p></div></div>
       <div class="step"><span class="step-n">03</span><div><h2>Run them in your terminal</h2><p>Then start Claude Code and type <code style="font-family:var(--mono);font-size:13px">/mcp</code> to check the connection.</p></div></div>
     </div>
     <p class="note"><strong>Requires Claude Code already working against the LiteLLM proxy.</strong> If it isn't set up yet, do that first.</p>`
  );
}

function successPage(token) {
  const exportLine = `export SLACK_MCP_TOKEN=${token}`;
  const addLine =
    `claude mcp add --scope user --transport http slack https://mcp.slack.com/mcp \\\n` +
    `  --header 'Authorization: Bearer \${SLACK_MCP_TOKEN}'`;

  return layout(
    'Your Slack token',
    `<p class="eyebrow">Step 2 of 3</p>
     <h1>Slack is connected</h1>
     <p class="lead">Run these two commands in your terminal, then close this tab.</p>

     <p style="margin-top:26px;font-size:14px;color:var(--ink)"><strong>Add this to <code style="font-family:var(--mono)">~/.zshrc</code>, then run <code style="font-family:var(--mono)">source ~/.zshrc</code></strong></p>
     ${shell('cmd-export', exportLine)}

     <p style="margin-top:22px;font-size:14px;color:var(--ink)"><strong>Then register the Slack connection</strong></p>
     ${shell('cmd-add', addLine)}
     <p style="font-size:13px">The single quotes matter — they keep your token out of the config file.</p>

     <hr class="rule">

     <h2 style="font-family:var(--mono);font-size:16px;margin:0 0 10px">Check it worked</h2>
     <p style="font-size:14px">Start Claude Code and type <code style="font-family:var(--mono);font-size:13px">/mcp</code>. Slack should show as connected. Then ask it to post a message and confirm the message appears under your own name.</p>
     <p style="font-size:14px">If a channel isn't found, use the channel ID rather than the name — open the channel in Slack, click its name, and copy the ID at the bottom of the panel.</p>

     <p class="note"><strong>This token acts as you in Slack.</strong> It is shown once and not stored here. Close this tab when you're done, and tell the platform team if you think it has leaked.</p>

     <footer>Trouble? Ask in #project-litellm.</footer>`,
    COPY_SCRIPT
  );
}

function errorPage(title, detail) {
  return layout(
    title,
    `<p class="eyebrow" style="color:var(--warn)">Setup interrupted</p>
     <h1>${escapeHtml(title)}</h1>
     <p class="lead">${escapeHtml(detail)}</p>
     <a class="cta" href="/">Start again</a>
     <footer>Still stuck? Ask in #project-litellm.</footer>`
  );
}

module.exports = { page, successPage, errorPage, escapeHtml };
