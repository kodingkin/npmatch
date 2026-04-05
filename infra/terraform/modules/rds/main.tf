# Subnet Group

resource "aws_db_subnet_group" "this" {
  name       = "${var.project}-rds-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = { Name = "${var.project}-rds-subnet-group", Project = var.project }
}

# Security Group

resource "aws_security_group" "rds" {
  name        = "${var.project}-rds-sg"
  description = "Postgres — allow from ECS services only"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Postgres from ECS services"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [var.ecs_sg_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project}-rds-sg", Project = var.project }
}

# RDS Instance

resource "aws_db_instance" "this" {
  identifier        = "${var.project}-postgres"
  engine            = "postgres"
  engine_version    = "15.7"
  instance_class    = "db.t3.micro"
  allocated_storage = 20
  storage_type      = "gp2"
  storage_encrypted = true

  db_name  = var.project
  username = var.project
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  backup_retention_period = 1
  skip_final_snapshot     = true
  deletion_protection     = false

  tags = { Project = var.project }
}
