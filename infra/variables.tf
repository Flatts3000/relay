variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

variable "app_name" {
  description = "Application name"
  type        = string
  default     = "relay"
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "relay"
}

variable "db_username" {
  description = "Database username"
  type        = string
  default     = "relay_admin"
  sensitive   = true
}

variable "container_cpu" {
  description = "Fargate task CPU units"
  type        = number
  default     = 256
}

variable "container_memory" {
  description = "Fargate task memory (MiB)"
  type        = number
  default     = 512
}

variable "backend_port" {
  description = "Backend application port"
  type        = number
  default     = 4000
}

variable "frontend_port" {
  description = "Frontend application port"
  type        = number
  default     = 3000
}

variable "github_repo" {
  description = "GitHub repository in format owner/repo"
  type        = string
  default     = "Flatts3000/relay"
}

variable "create_github_oidc" {
  description = "Whether to create GitHub OIDC provider (set to false if already exists)"
  type        = bool
  default     = true
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "relayfunds.org"
}

variable "use_route53" {
  description = "Whether to use Route 53 for DNS (if false, create DNS records manually)"
  type        = bool
  default     = false
}
