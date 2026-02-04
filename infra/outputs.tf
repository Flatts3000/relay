output "aws_region" {
  description = "AWS region"
  value       = var.aws_region
}

output "environment" {
  description = "Environment name"
  value       = var.environment
}

# Uncomment as resources are created
# output "alb_dns_name" {
#   description = "ALB DNS name"
#   value       = aws_lb.main.dns_name
# }

# output "rds_endpoint" {
#   description = "RDS endpoint"
#   value       = aws_db_instance.main.endpoint
#   sensitive   = true
# }

# output "ecr_repository_url" {
#   description = "ECR repository URL"
#   value       = aws_ecr_repository.app.repository_url
# }
