output "endpoint" {
  description = "RDS endpoint (host:port)"
  value       = aws_db_instance.this.endpoint
  sensitive   = true
}

output "db_name" {
  value = aws_db_instance.this.db_name
}
