variable "domain" {
  description = "Hostname the site answers on."
  type        = string
  default     = "addons.dosaki.net"
}

variable "app_id" {
  description = "GitHub App id (Aia - Addon Assistant)."
  type        = string
  default     = "4458698"
}

variable "app_installation_id" {
  description = "Installation id of the App on the addon repositories."
  type        = string
}

variable "lambda_zip" {
  description = "Path to the built deployment package."
  type        = string
  default     = "../dist/lambda.zip"
}
