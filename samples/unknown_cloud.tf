resource "aws_efs_file_system" "shared" {
  creation_token = "app-shared"
  encrypted      = false
}

resource "aws_elasticsearch_domain" "logs" {
  domain_name           = "corp-logs"
  elasticsearch_version = "7.10"
  encrypt_at_rest {
    enabled = false
  }
}

resource "aws_redshift_cluster" "warehouse" {
  cluster_identifier  = "corp-dw"
  publicly_accessible = true
  encrypted           = false
}
