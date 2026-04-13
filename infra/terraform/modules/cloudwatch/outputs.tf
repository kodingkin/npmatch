output "frontend_log_group_name"  { value = aws_cloudwatch_log_group.frontend.name }
output "backend_log_group_name"   { value = aws_cloudwatch_log_group.backend.name }
output "qdrant_log_group_name"    { value = aws_cloudwatch_log_group.qdrant.name }
output "ingestion_log_group_name" { value = aws_cloudwatch_log_group.ingestion.name }
