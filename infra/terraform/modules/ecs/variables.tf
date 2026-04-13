variable "project"             { type = string }
variable "region"              { type = string }
variable "vpc_id"              { type = string }
variable "public_subnet_ids"   { type = list(string) }
variable "private_subnet_ids"  { type = list(string) }
variable "execution_role_arn"  { type = string }
variable "task_role_arn"       { type = string }
variable "frontend_image"      { type = string }
variable "backend_image"       { type = string }
variable "backend_log_group"   { type = string }
variable "frontend_log_group"  { type = string }
variable "qdrant_log_group"    { type = string }
variable "alb_log_bucket"      { type = string }
variable "db_connection_string" {
  type      = string
  sensitive = true
}
variable "openai_api_key" {
  type      = string
  sensitive = true
}
