output "cluster_name" {
  value = aws_ecs_cluster.ingestion.name
}

output "task_definition_arn" {
  value = aws_ecs_task_definition.ingestion.arn
}

output "schedule_name" {
  value = aws_scheduler_schedule.ingestion_weekly.name
}
