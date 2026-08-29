# Deployment

How Relay is actually deployed, as verified on 2026-08-28.

This document exists because `/infra` describes a different architecture that has never been applied. Where the two disagree, this document is the accurate one. Choosing which architecture to keep is tracked in [#7](https://github.com/Flatts3000/relay/issues/7).

## What runs

A single AWS EC2 instance running Docker Compose.

| Property         | Value                                                                                              |
| ---------------- | -------------------------------------------------------------------------------------------------- |
| Instance         | `i-06f4c5282dd5fb288` (`relay-prod`)                                                               |
| Type             | `t4g.small`, arm64                                                                                 |
| Region           | us-east-1                                                                                          |
| Launched         | 2026-02-24                                                                                         |
| Public IP        | 18.232.209.241                                                                                     |
| Instance profile | `relay-prod-ssm` - `AmazonSSMManagedInstanceCore` plus scoped S3 write access to the backup bucket |
| Domain           | relayfunds.org, A record to the instance IP                                                        |

There is no load balancer, no RDS instance, no Fargate cluster, no WAF, and no ECR repository. The instance is directly internet-facing on ports 80 and 443.

## Containers

Defined in `deploy/docker-compose.prod.yml`:

| Service    | Image                            | Role                                                                     |
| ---------- | -------------------------------- | ------------------------------------------------------------------------ |
| `caddy`    | `caddy:2-alpine`                 | TLS termination and reverse proxy. The only service with published ports |
| `frontend` | built from `frontend/Dockerfile` | nginx serving the built SPA                                              |
| `backend`  | built from `backend/Dockerfile`  | Express API on port 4000                                                 |
| `postgres` | `postgres:16-alpine`             | Database, persisted to the `postgres_data` Docker volume                 |

Routing is in `deploy/Caddyfile`: `/api/*` proxies to `backend:4000`, everything else to `frontend:80`. Security headers (HSTS, nosniff, `X-Frame-Options: DENY`, Referrer-Policy) are set at the Caddy layer.

The deployed Caddyfile was verified identical to the one in this repository on 2026-08-28, during the investigation of [#1](https://github.com/Flatts3000/relay/issues/1) - which turned out to be a missing database schema rather than anything to do with Caddy.

## Configuration

Runtime configuration lives in `deploy/.env.prod` on the host, which is not in version control. `deploy/.env.prod.example` documents the required keys: database credentials, `CORS_ORIGIN`, `FRONTEND_URL`, `TRUST_PROXY_HOPS`, Resend API key for transactional email, and `STAFF_ADMIN_EMAILS`. `AUTH_LOGIN_RATE_LIMIT_MAX` is optional and defaults to 10.

It holds **no AWS credentials**. The instance role supplies those, scoped to the backup bucket, so there is no long-lived AWS secret on the host.

AWS Secrets Manager is not used by the deployed application, despite being referenced in `CLAUDE.md` and `/infra`.

## Deploying

`deploy/deploy.sh` on the host. `deploy/setup.sh` covers first-time provisioning. Both assume the application lives at `/opt/relay`.

Deploys are automatic. `.github/workflows/deploy.yml` runs on every push to `main`: it gates on lint, typecheck and tests, then runs `deploy.sh` over SSH and verifies `/api/health/ready` through the public domain. `deploy.sh` itself health-gates and rolls back to the previous images on failure.

Note that `deploy.sh` git-pulls itself, so a change to that script takes effect on the deploy _after_ the one that ships it. See [#42](https://github.com/Flatts3000/relay/issues/42).

## Backups

`deploy/backup-db.sh` runs nightly at 03:00 UTC via cron:

1. `pg_dump` from the postgres container, gzipped to `/opt/relay/backups`
2. Uploaded to `s3://relay-backups-prod` with storage class `STANDARD_IA`
3. Prunes S3 objects older than 90 days and local files older than 30 days

The bucket has SSE-S3 encryption and a full public access block. Retention works as intended: 91 dumps were present on 2026-08-28, the oldest dated 2026-05-30.

Each dump is sanity-checked before upload: it must exceed a byte floor and define at least ten tables. `pg_dump` exiting 0 does not mean it produced a usable backup, and every dump this job had ever produced was the same ~3.3 KB, so nobody had a baseline against which a silent truncation would have stood out. A dump that fails any check is renamed to `.rejected` rather than deleted, so it can be diagnosed, and is excluded from both the upload and the `relay_*.sql.gz` prune glob. The job exits non-zero and the previous good backup is left in place.

**That non-zero exit currently reaches nobody.** `setup.sh` schedules the job with its output appended to `/opt/relay/backups/backup.log`, which suppresses cron's failure mail, and there is no alerting (see Monitoring below). So a failing backup is today indistinguishable from a passing one unless somebody reads the log: backups quietly stop, and the last good dump ages out of its 90-day retention with no warning. Wiring this to something that alarms is part of [#2](https://github.com/Flatts3000/relay/issues/2).

### Restoring

Verified working on 2026-08-28. To restore into a scratch database without touching the live one:

```bash
# on the host
BK=$(ls -t /opt/relay/backups/relay_*.sql.gz | head -1)

docker exec deploy-postgres-1 psql -U relay -d postgres -c 'CREATE DATABASE restore_test'
gunzip -c "$BK" | docker exec -i deploy-postgres-1 psql -U relay -d restore_test -v ON_ERROR_STOP=1

# check what came back
docker exec deploy-postgres-1 psql -U relay -d restore_test -c '\dt'

# clean up
docker exec deploy-postgres-1 psql -U relay -d postgres -c 'DROP DATABASE restore_test'
```

To restore over the live database:

```bash
docker compose -f /opt/relay/deploy/docker-compose.prod.yml stop backend
docker exec deploy-postgres-1 psql -U relay -d postgres -c 'DROP DATABASE relay'
docker exec deploy-postgres-1 psql -U relay -d postgres -c 'CREATE DATABASE relay'
gunzip -c "$BK" | docker exec -i deploy-postgres-1 psql -U relay -d relay -v ON_ERROR_STOP=1
docker compose -f /opt/relay/deploy/docker-compose.prod.yml start backend
```

Stop the backend first so nothing writes mid-restore and nothing holds a connection that would block the `DROP`.

The drop and recreate are not optional for dumps taken before 2026-08-29. Those were produced without `--clean`, so they contain no `DROP` statements and restoring one into an existing database fails on the first `CREATE TABLE` - and with `ON_ERROR_STOP=1` set, as it should be, psql aborts having restored nothing. Dumps taken after that date carry `--clean --if-exists` and will drop objects as they go, but the explicit recreate is still the safer path because it also removes anything the dump does not know about.

`ON_ERROR_STOP=1` matters in either case: without it psql continues past failures and leaves a half-restored database that looks like it worked.

Host access is through SSM rather than SSH - see the note under Access below.

## Access

The host has an IAM instance profile (`relay-prod-ssm`) granting `AmazonSSMManagedInstanceCore`, so it is reachable through Systems Manager without SSH keys:

```bash
aws ssm send-command --region us-east-1 --instance-ids i-06f4c5282dd5fb288 --document-name AWS-RunShellScript --parameters 'commands=["docker ps"]'
```

Retrieve output with `aws ssm get-command-invocation --command-id <id> --instance-id i-06f4c5282dd5fb288`.

There is also an SSH key at `deploy/relay-prod.pem` (gitignored), but SSM is preferred: no key distribution, and every command is recorded in CloudTrail.

## Monitoring

None. There are no CloudWatch alarms for Relay, EC2 detailed monitoring is disabled, and there is no uptime check or log shipping. The outage in [#1](https://github.com/Flatts3000/relay/issues/1) was found by manual probing. See [#2](https://github.com/Flatts3000/relay/issues/2).

## Costs

Roughly 15 to 20 USD per month at the time of writing, dominated by the EC2 instance. RDS and load balancer charges disappeared from the account in early August 2026, consistent with those resources being removed.
