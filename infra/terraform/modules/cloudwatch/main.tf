resource "aws_cloudwatch_log_group" "frontend" {
  name              = "/ecs/${var.project}/frontend"
  retention_in_days = 7
  tags              = { Project = var.project }
}

resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/${var.project}/backend"
  retention_in_days = 7
  tags              = { Project = var.project }
}

resource "aws_cloudwatch_log_group" "qdrant" {
  name              = "/ecs/${var.project}/qdrant"
  retention_in_days = 7
  tags              = { Project = var.project }
}

resource "aws_cloudwatch_log_group" "ingestion" {
  name              = "/ecs/${var.project}/ingestion"
  retention_in_days = 7
  tags              = { Project = var.project }
}

resource "aws_cloudwatch_metric_alarm" "alb_5xx" {
  alarm_name          = "${var.project}-alb-5xx-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "Backend 5xx errors exceeded 10 in 1 minute"
  treat_missing_data  = "notBreaching"
  tags                = { Project = var.project }
}

resource "aws_cloudwatch_metric_alarm" "alb_latency" {
  alarm_name          = "${var.project}-alb-latency-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  extended_statistic  = "p95"
  threshold           = 5
  alarm_description   = "p95 response time exceeded 5s"
  treat_missing_data  = "notBreaching"
  tags                = { Project = var.project }
}

resource "aws_cloudwatch_metric_alarm" "backend_cpu" {
  alarm_name          = "${var.project}-backend-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Backend CPU > 80%"
  treat_missing_data  = "notBreaching"

  dimensions = {
    ClusterName = var.project
    ServiceName = "${var.project}-backend"
  }

  tags = { Project = var.project }
}

resource "aws_cloudwatch_metric_alarm" "ingestion_failed" {
  alarm_name          = "${var.project}-ingestion-task-failed"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "FailedTaskCount"
  namespace           = "ECS/ContainerInsights"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Ingestion ECS task failed"
  treat_missing_data  = "notBreaching"

  dimensions = {
    ClusterName = "${var.project}-ingestion"
  }

  tags = { Project = var.project }
}
