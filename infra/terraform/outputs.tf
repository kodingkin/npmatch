output "ecr_repository_urls" {
  description = "ECR repository URLs keyed by service"
  value       = module.ecr.repository_urls
}

output "alb_dns_name" {
  description = "ALB public DNS - use this to access the app"
  value       = module.ecs.alb_dns_name
}

output "rds_endpoint" {
  description = "RDS Postgres endpoint"
  value       = module.rds.endpoint
  sensitive   = true
}

output "alb_log_bucket" {
  description = "S3 bucket for ALB access logs"
  value       = module.s3.alb_log_bucket_name
}

output "vpc_id" {
  description = "VPC ID"
  value       = module.networking.vpc_id
}
