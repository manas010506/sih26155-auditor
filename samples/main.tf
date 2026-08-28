terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "ap-south-1"
}

# --------------------------------------------------------------------------
# Storage
# --------------------------------------------------------------------------
resource "aws_s3_bucket" "sensitive_data" {
  bucket = "corp-sensitive-data-prod"
}

resource "aws_s3_bucket_acl" "sensitive_data" {
  bucket = aws_s3_bucket.sensitive_data.id
  acl    = "public-read"
}

resource "aws_s3_bucket" "app_logs" {
  bucket = "corp-app-logs-prod"
}

resource "aws_s3_bucket_server_side_encryption_configuration" "app_logs" {
  bucket = aws_s3_bucket.app_logs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "app_logs" {
  bucket = aws_s3_bucket.app_logs.id

  versioning_configuration {
    status = "Enabled"
  }
}

# --------------------------------------------------------------------------
# Network
# --------------------------------------------------------------------------
resource "aws_security_group" "web" {
  name        = "web-tier-sg"
  description = "Web tier"

  ingress {
    description = "SSH from anywhere"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "RDP from anywhere"
    from_port   = 3389
    to_port     = 3389
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Temporary debug access"
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# --------------------------------------------------------------------------
# Identity
# --------------------------------------------------------------------------
resource "aws_iam_policy" "app_policy" {
  name = "app-runtime-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "*"
        Resource = "*"
      }
    ]
  })
}

# --------------------------------------------------------------------------
# Data
# --------------------------------------------------------------------------
resource "aws_db_instance" "app_db" {
  identifier                 = "app-db-prod"
  engine                     = "postgres"
  instance_class             = "db.t3.medium"
  allocated_storage          = 100
  publicly_accessible        = true
  storage_encrypted          = false
  backup_retention_period    = 1
  deletion_protection        = true
  auto_minor_version_upgrade = true
}

# --------------------------------------------------------------------------
# Keys and audit
# --------------------------------------------------------------------------
resource "aws_kms_key" "app_key" {
  description         = "Application data key"
  enable_key_rotation = false
}

resource "aws_cloudtrail" "main" {
  name                          = "corp-trail"
  s3_bucket_name                = aws_s3_bucket.app_logs.id
  is_multi_region_trail         = false
  enable_log_file_validation    = false
  include_global_service_events = true
}
