output "site_url" { value = "https://${var.domain}" }
output "function_url" { value = aws_lambda_function_url.site.function_url }
output "distribution_id" { value = aws_cloudfront_distribution.site.id }
