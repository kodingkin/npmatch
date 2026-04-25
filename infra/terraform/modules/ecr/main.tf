locals {
  services = ["frontend", "backend", "ingestion"]
}

resource "aws_ecr_repository" "this" {
  for_each             = toset(local.services)
  name                 = "${var.project}-${each.value}"
  force_delete         = true
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration { scan_on_push = true }

  tags = { Project = var.project, Service = each.value }
}

resource "aws_ecr_lifecycle_policy" "this" {
  for_each   = aws_ecr_repository.this
  repository = each.value.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 5 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 5
      }
      action = { type = "expire" }
    }]
  })
}
