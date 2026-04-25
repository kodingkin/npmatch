variable "project" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "ecs_sg_id" {
  description = "ECS service security group - allowed to connect to Postgres"
  type        = string
}

variable "db_password" {
  type      = string
  sensitive = true
}
