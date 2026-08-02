terraform {
  required_version = ">= 1.10"
  backend "s3" {
    bucket       = "tf-state-addons-dosaki-net"
    key          = "site.tfstate"
    region       = "eu-west-1"
    use_lockfile = true
  }
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

provider "aws" {
  region = "eu-west-1"
}

# The certificate already exists and covers *.dosaki.net. CloudFront requires
# us-east-1, which is why this data source is region-pinned.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

data "aws_acm_certificate" "wildcard" {
  provider    = aws.us_east_1
  domain      = "dosaki.net"
  statuses    = ["ISSUED"]
  most_recent = true
}

data "aws_route53_zone" "dosaki" {
  zone_id = "Z09121021LFWFUARXHIR2"
}

resource "aws_iam_role" "lambda" {
  name = "addons-dosaki-net-lambda"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "logs" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_ssm_parameter" "app_key" {
  name  = "/addons-dosaki-net/app-private-key"
  type  = "SecureString"
  value = "placeholder - set out of band"

  # The real key is written with the CLI; Terraform must never hold it.
  lifecycle { ignore_changes = [value] }
}

resource "aws_iam_role_policy" "ssm" {
  name = "read-app-key"
  role = aws_iam_role.lambda.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["ssm:GetParameter"]
      Resource = aws_ssm_parameter.app_key.arn
    }]
  })
}

resource "aws_lambda_function" "site" {
  function_name    = "addons-dosaki-net"
  role             = aws_iam_role.lambda.arn
  runtime          = "nodejs22.x"
  architectures    = ["arm64"]
  handler          = "index.handler"
  memory_size      = 256
  timeout          = 10
  filename         = var.lambda_zip
  source_code_hash = filebase64sha256(var.lambda_zip)

  environment {
    variables = {
      APP_ID              = var.app_id
      APP_INSTALLATION_ID = var.app_installation_id
      APP_KEY_PARAM       = aws_ssm_parameter.app_key.name
      NODE_OPTIONS        = "--enable-source-maps"
    }
  }
}

resource "aws_lambda_function_url" "site" {
  function_name      = aws_lambda_function.site.function_name
  authorization_type = "AWS_IAM"
}

# OAC signs CloudFront's requests, so the Function URL cannot be called directly.
resource "aws_cloudfront_origin_access_control" "lambda" {
  name                              = "addons-dosaki-net"
  origin_access_control_origin_type = "lambda"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_lambda_permission" "cloudfront" {
  statement_id           = "AllowCloudFront"
  action                 = "lambda:InvokeFunctionUrl"
  function_name          = aws_lambda_function.site.function_name
  principal              = "cloudfront.amazonaws.com"
  source_arn             = aws_cloudfront_distribution.site.arn
  function_url_auth_type = "AWS_IAM"
}

# Lambda's "Dual Auth" rollout requires BOTH grants for a CloudFront OAC origin.
# The single-permission form works only until 2026-11-01, after which the origin
# returns 403 - a failure dated months after the config that causes it.
resource "aws_lambda_permission" "cloudfront_invoke" {
  statement_id           = "AllowCloudFrontInvoke"
  action                 = "lambda:InvokeFunction"
  function_name          = aws_lambda_function.site.function_name
  principal              = "cloudfront.amazonaws.com"
  source_arn             = aws_cloudfront_distribution.site.arn
  function_url_auth_type = "AWS_IAM"
}

locals {
  origin_id   = "lambda-url"
  origin_host = replace(replace(aws_lambda_function_url.site.function_url, "https://", ""), "/", "")
}

resource "aws_cloudfront_distribution" "site" {
  enabled         = true
  is_ipv6_enabled = true
  aliases         = [var.domain]
  comment         = "addons.dosaki.net"
  price_class     = "PriceClass_All"

  origin {
    domain_name              = local.origin_host
    origin_id                = local.origin_id
    origin_access_control_id = aws_cloudfront_origin_access_control.lambda.id

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # HTML: no-store, so a deploy is visible at once and no invalidation is needed.
  default_cache_behavior {
    target_origin_id       = local.origin_id
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    # Managed-CachingDisabled
    cache_policy_id = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
  }

  # Assets are version-scoped, so their URLs can never change meaning.
  ordered_cache_behavior {
    path_pattern           = "/assets/*"
    target_origin_id       = local.origin_id
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    # Managed-CachingOptimized
    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"
  }

  # A signed download URL is short-lived; a cached 302 would hand out a dead link.
  ordered_cache_behavior {
    path_pattern           = "/*/download"
    target_origin_id       = local.origin_id
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = false
    cache_policy_id        = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    acm_certificate_arn      = data.aws_acm_certificate.wildcard.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}

resource "aws_route53_record" "site" {
  zone_id = data.aws_route53_zone.dosaki.zone_id
  name    = var.domain
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = aws_cloudfront_distribution.site.hosted_zone_id
    evaluate_target_health = false
  }
}
