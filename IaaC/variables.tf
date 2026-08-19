variable "project_id" {
  description = "GCP Project ID"
  type = string
}

variable "region" {
  description = "GCP region"
  type = string
  default = "us-central1"
}

variable "service_name" {
  description = "Cloud Run Service name"
  type = string
  default = "code-pulse-ai"
}

variable "container_image" {
  description = "Container image URL"
  type = string
}

variable "gpu_accelerator" {
  description = "GPU type for Cloud Run (L4 is the only type Cloud Run supports as of writing)"
  type    = string
  default = "nvidia-l4"
}

variable "gpu_cpu" {
  description = "vCPUs per instance (Cloud Run GPU requires 4 or 8)"
  type    = string
  default = "8"
}

variable "gpu_memory" {
  description = "Memory per instance (Cloud Run GPU allows up to 32Gi with 1 L4)"
  type    = string
  default = "32Gi"
}


