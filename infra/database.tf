# =============================================================================
# RDS PostgreSQL Database
# =============================================================================

# -----------------------------------------------------------------------------
# DB Subnet Group
# Places RDS in private subnets across multiple AZs
# -----------------------------------------------------------------------------

resource "aws_db_subnet_group" "main" {
  name        = "${var.app_name}-${var.environment}-db-subnet-group"
  description = "Database subnet group for ${var.app_name}"
  subnet_ids  = aws_subnet.private[*].id

  tags = {
    Name = "${var.app_name}-${var.environment}-db-subnet-group"
  }
}

# -----------------------------------------------------------------------------
# DB Parameter Group
# PostgreSQL 16 with custom parameters
# -----------------------------------------------------------------------------

resource "aws_db_parameter_group" "main" {
  name        = "${var.app_name}-${var.environment}-pg16"
  family      = "postgres16"
  description = "PostgreSQL 16 parameter group for ${var.app_name}"

  # Log settings for debugging (adjust for production)
  parameter {
    name  = "log_statement"
    value = "ddl"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000" # Log queries taking > 1 second
  }

  tags = {
    Name = "${var.app_name}-${var.environment}-pg16"
  }
}

# -----------------------------------------------------------------------------
# RDS PostgreSQL Instance
# -----------------------------------------------------------------------------

resource "aws_db_instance" "main" {
  identifier = "${var.app_name}-${var.environment}-db"

  # Engine configuration
  engine               = "postgres"
  engine_version       = "16.4"
  instance_class       = var.db_instance_class
  allocated_storage    = 20
  max_allocated_storage = 100 # Enable storage autoscaling up to 100GB

  # Database configuration
  db_name  = var.db_name
  username = var.db_username
  password = random_password.db_password.result
  port     = 5432

  # Network configuration
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false # CRITICAL: No public access

  # Parameter group
  parameter_group_name = aws_db_parameter_group.main.name

  # Encryption at rest with customer-managed KMS key
  storage_encrypted = true
  kms_key_id        = aws_kms_key.rds.arn

  # Backup configuration
  backup_retention_period = 7
  backup_window           = "03:00-04:00" # UTC
  maintenance_window      = "Mon:04:00-Mon:05:00"

  # Performance and monitoring
  performance_insights_enabled          = true
  performance_insights_retention_period = 7
  performance_insights_kms_key_id       = aws_kms_key.rds.arn

  # High availability
  # Multi-AZ disabled for pilot (cost savings); enable for production
  multi_az = false

  # Deletion protection (disable for dev, enable for production)
  deletion_protection = var.environment == "prod"

  # Skip final snapshot for dev (enable for production)
  skip_final_snapshot       = var.environment != "prod"
  final_snapshot_identifier = var.environment == "prod" ? "${var.app_name}-${var.environment}-final-snapshot" : null

  # Auto minor version upgrade
  auto_minor_version_upgrade = true

  # CloudWatch logs export
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  tags = {
    Name = "${var.app_name}-${var.environment}-db"
  }
}
