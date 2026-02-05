# =============================================================================
# DNS and SSL/TLS Certificates
# =============================================================================

# -----------------------------------------------------------------------------
# ACM Certificate
# Note: For domains not in Route 53, use DNS validation with external DNS
# -----------------------------------------------------------------------------

resource "aws_acm_certificate" "main" {
  domain_name               = var.domain_name
  subject_alternative_names = ["*.${var.domain_name}"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "${var.app_name}-${var.environment}-cert"
  }
}

# -----------------------------------------------------------------------------
# Route 53 Zone (optional - set use_route53 = true to create)
# If using external DNS, create validation records manually
# -----------------------------------------------------------------------------

resource "aws_route53_zone" "main" {
  count = var.use_route53 ? 1 : 0
  name  = var.domain_name

  tags = {
    Name = "${var.app_name}-${var.environment}-zone"
  }
}

# Certificate DNS validation records (only if using Route 53)
resource "aws_route53_record" "cert_validation" {
  for_each = var.use_route53 ? {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  zone_id         = aws_route53_zone.main[0].zone_id
  name            = each.value.name
  type            = each.value.type
  records         = [each.value.record]
  ttl             = 60
  allow_overwrite = true
}

# Certificate validation (only if using Route 53)
resource "aws_acm_certificate_validation" "main" {
  count                   = var.use_route53 ? 1 : 0
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# -----------------------------------------------------------------------------
# DNS A Record pointing to ALB (only if using Route 53)
# -----------------------------------------------------------------------------

resource "aws_route53_record" "main" {
  count   = var.use_route53 ? 1 : 0
  zone_id = aws_route53_zone.main[0].zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

# www subdomain redirect
resource "aws_route53_record" "www" {
  count   = var.use_route53 ? 1 : 0
  zone_id = aws_route53_zone.main[0].zone_id
  name    = "www.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}
