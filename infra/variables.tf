variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
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
