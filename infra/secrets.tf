# =============================================================================
# KMS and Secrets Manager
# =============================================================================

# -----------------------------------------------------------------------------
# KMS Key for RDS Encryption
# Customer-managed key for audit control
# -----------------------------------------------------------------------------

resource "aws_kms_key" "rds" {
  description             = "KMS key for RDS encryption - ${var.app_name}-${var.environment}"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = {
    Name = "${var.app_name}-${var.environment}-rds-kms"
  }
}

resource "aws_kms_alias" "rds" {
  name          = "alias/${var.app_name}-${var.environment}-rds"
  target_key_id = aws_kms_key.rds.key_id
}

# -----------------------------------------------------------------------------
# KMS Key for Secrets Manager
# -----------------------------------------------------------------------------

resource "aws_kms_key" "secrets" {
  description             = "KMS key for Secrets Manager - ${var.app_name}-${var.environment}"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = {
    Name = "${var.app_name}-${var.environment}-secrets-kms"
  }
}

resource "aws_kms_alias" "secrets" {
  name          = "alias/${var.app_name}-${var.environment}-secrets"
  target_key_id = aws_kms_key.secrets.key_id
}

# -----------------------------------------------------------------------------
# Generate Random Password for Database
# -----------------------------------------------------------------------------

resource "random_password" "db_password" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# -----------------------------------------------------------------------------
# Secrets Manager - Database Credentials
# -----------------------------------------------------------------------------

resource "aws_secretsmanager_secret" "db_credentials" {
  name        = "${var.app_name}/${var.environment}/db-credentials"
  description = "Database credentials for ${var.app_name} ${var.environment}"
  kms_key_id  = aws_kms_key.secrets.arn

  tags = {
    Name = "${var.app_name}-${var.environment}-db-credentials"
  }
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = var.db_username
    password = random_password.db_password.result
    host     = aws_db_instance.main.address
    port     = aws_db_instance.main.port
    dbname   = var.db_name
  })

  depends_on = [aws_db_instance.main]
}

# -----------------------------------------------------------------------------
# Secrets Manager - Email Service API Key (placeholder)
# Will be populated manually or via CI/CD
# -----------------------------------------------------------------------------

resource "aws_secretsmanager_secret" "email_api_key" {
  name        = "${var.app_name}/${var.environment}/email-api-key"
  description = "Email service API key for ${var.app_name} ${var.environment}"
  kms_key_id  = aws_kms_key.secrets.arn

  tags = {
    Name = "${var.app_name}-${var.environment}-email-api-key"
  }
}

# Note: Secret value should be set manually or via CI/CD
# Do not store actual API keys in Terraform state
