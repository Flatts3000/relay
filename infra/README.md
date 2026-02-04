# Infrastructure

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
