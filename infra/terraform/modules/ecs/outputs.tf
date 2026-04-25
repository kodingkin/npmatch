output "alb_dns_name" {
  value = aws_lb.this.dns_name
}

output "alb_arn" {
  value = aws_lb.this.arn
}

output "service_sg_id" {
  description = "ECS service SG - referenced by RDS ingress rule"
  value       = aws_security_group.service.id
}

output "qdrant_sg_id" {
  description = "Qdrant SG - referenced by ingestion task for direct upsert access"
  value       = aws_security_group.qdrant.id
}

output "qdrant_url_internal" {
  description = "Qdrant internal URL via Cloud Map DNS"
  value       = "http://qdrant.${var.project}.local:6333"
}

output "cluster_name" {
  value = aws_ecs_cluster.this.name
}
