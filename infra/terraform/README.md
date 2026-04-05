# npmatch — AWS Infrastructure

Terraform IaC for the npmatch AWS deployment. This is a portfolio infrastructure showcase — not the live demo. The live demo runs on VPS (Docker Compose + Neon). This layer demonstrates production-grade AWS architecture for interview purposes.

---

## Architecture

```
Internet
    │
    ▼
ALB (public subnets, ap-northeast-1)
    │
    ├── /        → ECS frontend service  (Next.js,  port 3000)
    └── /api/*   → ECS backend service   (FastAPI,  port 8000)
                        │
                        ├── Qdrant (self-hosted Fargate + EFS, port 6333)
                        │     └── vector search
                        └── RDS Postgres 15 (package metadata, port 5432)
                              └── full-text search (hybrid)

ECR
├── npmatch-frontend
├── npmatch-backend
└── npmatch-ingestion

ECS ingestion cluster (separate)
└── Fargate task — triggered weekly by EventBridge (Sunday 2am UTC)
        ├── Pulls from npm-rank GitHub JSON (~5,000 packages)
        ├── Embeds via OpenAI text-embedding-3-small
        ├── Upserts vectors → Qdrant (internal VPC DNS)
        └── Upserts metadata → RDS Postgres

Secrets Manager
└── npmatch/openai-api-key           (backend)
└── npmatch/ingestion/openai-api-key (ingestion)

CloudWatch
├── Log groups: /ecs/npmatch/{frontend,backend,qdrant,ingestion}
├── ALB 5xx alarm
├── ALB p95 latency alarm
├── Backend CPU alarm
└── Ingestion task failure alarm

S3
└── ALB access logs (30-day expiry)
```

---

## Modules

| Module | Resources | Notes |
|---|---|---|
| `networking` | VPC, 2× public + private subnets, IGW, single NAT GW, route tables | Single NAT — cost-optimised accroding to size of project |
| `ecr` | 3 ECR repositories + lifecycle policies | Retains last 5 images per repo |
| `iam` | ECS execution role, ECS task role, EventBridge scheduler role | Includes EFS + Secrets Manager permissions |
| `ecs` | ECS cluster, ALB, target groups, listener rules, frontend + backend + Qdrant Fargate services, EFS, Cloud Map DNS | Qdrant self-hosted — no external dependency |
| `rds` | Postgres 15 db.t3.micro, subnet group, security group | Package metadata only |
| `ecs-ingestion` | Separate ECS cluster, Fargate task, EventBridge schedule | Writes to both Qdrant and RDS on each run |
| `s3` | ALB access log bucket | 30-day lifecycle expiry |
| `cloudwatch` | 4 log groups, 4 metric alarms | |

---

## Qdrant: Self-Hosted on ECS Fargate + EFS

Qdrant runs as a long-lived Fargate service in the private subnet. It is **not** exposed via the ALB — only reachable within the VPC.

```
Qdrant Fargate task (qdrant/qdrant:latest)
  └── EFS volume mounted at /qdrant/storage
        └── EFS access point /qdrant (uid/gid 1000, IAM auth)
              └── EFS file system (encrypted, bursting throughput)
                    └── Mount targets in each private subnet
```

**Why self-hosted over Qdrant Cloud:**
- No external network hop — VPC-internal latency (~1ms vs ~50-100ms)
- No egress cost on every query
- No external API key to manage
- Vectors stay within AWS

**Stable DNS via Cloud Map:**
Fargate task IPs are ephemeral. Cloud Map private DNS (`qdrant.npmatch.local`) always resolves to the current task IP. Both backend and ingestion use this hostname — no hardcoded IPs.

**Re-ingestion on destroy/apply:**
`terraform destroy` deletes the EFS volume and all vector data. Re-running the ingestion task after `terraform apply` repopulates Qdrant. Embedding cost at ~5,000 packages is negligible (~$0.01).

---

## Usage

### 1. Configure variables

```bash
cp terraform.tfvars.example terraform.tfvars
# Fill in:
#   aws_account_id  — 12-digit AWS account ID
#   db_password     — strong password for RDS
#   openai_api_key  — sk-...
```

### 2. Init

```bash
terraform init
```

### 3. Apply

```bash
# Stage 1 — ECR: images must exist before ECS services start
terraform apply -target=module.ecr

# Push images via GitHub Actions push_image_to_ecr

# Stage 2 — ECS: creates service_sg needed by RDS module
terraform apply -target=module.ecs

# Stage 3 — everything else
terraform apply
```

### 4. Post-apply

```bash
# App entry point
terraform output alb_dns_name

# Qdrant internal URL (VPC only — for debugging)
terraform output qdrant_url_internal

# RDS endpoint
terraform output rds_endpoint

# ECR URLs for GitHub Actions
terraform output -json ecr_repository_urls
```

### 5. Teardown

```bash
terraform destroy
# EFS data is deleted — re-ingest after next apply
```
