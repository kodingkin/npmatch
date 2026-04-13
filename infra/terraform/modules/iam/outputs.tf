output "ecs_execution_role_arn"       { value = aws_iam_role.ecs_execution.arn }
output "ecs_task_role_arn"            { value = aws_iam_role.ecs_task.arn }
output "eventbridge_scheduler_role_arn" { value = aws_iam_role.eventbridge_scheduler.arn }
