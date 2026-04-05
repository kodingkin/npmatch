resource "aws_security_group" "ingestion" {
  name        = "${var.project}-ingestion-sg"
  description = "Ingestion task — outbound only"
  vpc_id      = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project}-ingestion-sg", Project = var.project }
}

# Allow ingestion to reach self-hosted Qdrant
resource "aws_security_group_rule" "ingestion_to_qdrant" {
  type                     = "ingress"
  from_port                = 6333
  to_port                  = 6333
  protocol                 = "tcp"
  security_group_id        = var.qdrant_sg_id
  source_security_group_id = aws_security_group.ingestion.id
  description              = "Qdrant REST from ingestion task"
}

resource "aws_ecs_cluster" "ingestion" {
  name = "${var.project}-ingestion"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = { Project = var.project }
}

resource "aws_secretsmanager_secret" "openai_api_key" {
  name                    = "${var.project}/ingestion/openai-api-key"
  description             = "OpenAI API key for npmatch ingestion task"
  recovery_window_in_days = 0

  tags = { Project = var.project }
}

resource "aws_secretsmanager_secret_version" "openai_api_key" {
  secret_id     = aws_secretsmanager_secret.openai_api_key.id
  secret_string = var.openai_api_key
}

resource "aws_ecs_task_definition" "ingestion" {
  family                   = "${var.project}-ingestion"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = var.execution_role_arn
  task_role_arn            = var.task_role_arn

  container_definitions = jsonencode([
    {
      name      = "ingestion"
      image     = var.ecr_image_url
      essential = true

      environment = [
        { name = "QDRANT_URL",           value = var.qdrant_url },
        { name = "DATABASE_URL",         value = var.db_connection_string }
      ]

      secrets = [
        { name = "OPENAI_API_KEY", valueFrom = aws_secretsmanager_secret.openai_api_key.arn }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = var.log_group_name
          "awslogs-region"        = var.region
          "awslogs-stream-prefix" = "ingestion"
        }
      }
    }
  ])

  tags = { Project = var.project }
}

resource "aws_scheduler_schedule" "ingestion_weekly" {
  name       = "${var.project}-ingestion-weekly"
  group_name = "default"

  flexible_time_window {
    mode = "OFF"
  }

  schedule_expression          = "cron(0 2 ? * SUN *)"
  schedule_expression_timezone = "UTC"

  target {
    arn      = aws_ecs_cluster.ingestion.arn
    role_arn = var.scheduler_role_arn

    ecs_parameters {
      task_definition_arn = aws_ecs_task_definition.ingestion.arn
      launch_type         = "FARGATE"

      network_configuration {
        assign_public_ip = false
        subnets          = var.private_subnet_ids
        security_groups  = [aws_security_group.ingestion.id]
      }
    }
  }
}
