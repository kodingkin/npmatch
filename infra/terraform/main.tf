terraform {
  required_version = ">= 1.5.7"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

module "ecr" {
  source  = "./modules/ecr"
  project = var.project
}

module "networking" {
  source  = "./modules/networking"
  project = var.project
}

module "s3" {
  source  = "./modules/s3"
  project = var.project
}

module "cloudwatch" {
  source  = "./modules/cloudwatch"
  project = var.project
}

module "iam" {
  source     = "./modules/iam"
  project    = var.project
  region     = var.aws_region
  account_id = var.aws_account_id
}

module "rds" {
  source             = "./modules/rds"
  project            = var.project
  vpc_id             = module.networking.vpc_id
  private_subnet_ids = module.networking.private_subnet_ids
  ecs_sg_id          = module.ecs.service_sg_id
  db_password        = var.db_password
}

module "ecs" {
  source               = "./modules/ecs"
  project              = var.project
  region               = var.aws_region
  vpc_id               = module.networking.vpc_id
  public_subnet_ids    = module.networking.public_subnet_ids
  private_subnet_ids   = module.networking.private_subnet_ids
  execution_role_arn   = module.iam.ecs_execution_role_arn
  task_role_arn        = module.iam.ecs_task_role_arn
  frontend_image       = "${module.ecr.repository_urls["frontend"]}:latest"
  backend_image        = "${module.ecr.repository_urls["backend"]}:latest"
  backend_log_group    = module.cloudwatch.backend_log_group_name
  frontend_log_group   = module.cloudwatch.frontend_log_group_name
  qdrant_log_group     = module.cloudwatch.qdrant_log_group_name
  alb_log_bucket       = module.s3.alb_log_bucket_name
  db_connection_string = "postgresql://${var.project}:${var.db_password}@${module.rds.endpoint}/${var.project}"
  openai_api_key       = var.openai_api_key
}

module "ecs_ingestion" {
  source               = "./modules/ecs-ingestion"
  project              = var.project
  region               = var.aws_region
  account_id           = var.aws_account_id
  vpc_id               = module.networking.vpc_id
  private_subnet_ids   = module.networking.private_subnet_ids
  execution_role_arn   = module.iam.ecs_execution_role_arn
  task_role_arn        = module.iam.ecs_task_role_arn
  scheduler_role_arn   = module.iam.eventbridge_scheduler_role_arn
  ecr_image_url        = "${module.ecr.repository_urls["ingestion"]}:latest"
  log_group_name       = module.cloudwatch.ingestion_log_group_name
  openai_api_key       = var.openai_api_key
  qdrant_url           = module.ecs.qdrant_url_internal
  qdrant_sg_id         = module.ecs.qdrant_sg_id
  db_connection_string = "postgresql://${var.project}:${var.db_password}@${module.rds.endpoint}/${var.project}"
}
