# Infrastructure

> **This Terraform has never been applied, and is not what runs in production.**
>
> Production is a single EC2 instance running Docker Compose. That is the
> deliberate architecture as of 2026-08-28, not a temporary state. What actually
> runs is documented in [../docs/deployment.md](../docs/deployment.md); read that
> first.
>
> These files describe a Fargate, RDS, ALB and WAF stack that was planned and
> never built. `terraform apply` against the current AWS account would **build a
> second parallel stack** rather than converge on the existing one, which is why
> this warning is here rather than in a commit message.
>
> Kept rather than deleted because it is a reasonable starting point if the
> deployment ever outgrows one host. Treat it as a design sketch: nothing here
> has been validated against a real apply, and the provider versions are from
> February 2026.
>
> See [#7](https://github.com/Flatts3000/relay/issues/7).

Terraform configurations for Relay AWS infrastructure.

## Prerequisites

- [Terraform](https://www.terraform.io/downloads) >= 1.0
- AWS CLI configured with appropriate credentials
- S3 bucket for remote state (optional but recommended)

## Setup

1. Copy the example variables file:

   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

2. Edit `terraform.tfvars` with your values

3. Initialize Terraform:

   ```bash
   terraform init
   ```

4. Plan changes:

   ```bash
   terraform plan
   ```

5. Apply changes:
   ```bash
   terraform apply
   ```

## Structure

```
infra/
├── main.tf              # Provider and backend configuration
├── variables.tf         # Input variables
├── outputs.tf           # Output values
├── terraform.tfvars.example  # Example variables (committed)
└── modules/             # Reusable modules (future)
```

## Environments

Use workspaces or separate state files for different environments:

```bash
# Using workspaces
terraform workspace new prod
terraform workspace select prod
```
