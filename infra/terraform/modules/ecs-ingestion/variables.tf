variable "project"            { type = string }
variable "region"             { type = string }
variable "account_id"         { type = string }
variable "vpc_id"             { type = string }
variable "private_subnet_ids" { type = list(string) }
variable "execution_role_arn" { type = string }
variable "task_role_arn"      { type = string }
variable "scheduler_role_arn" { type = string }
variable "ecr_image_url"      { type = string }
variable "log_group_name"     { type = string }
variable "qdrant_url"         { type = string }
variable "qdrant_sg_id"       { type = string }

variable "db_connection_string" {
  type      = string
  sensitive = true
}

variable "openai_api_key" {
  type      = string
  sensitive = true
}
