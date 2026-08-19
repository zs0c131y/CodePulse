terraform {
  required_providers {
    google = {
      source = "hashicorp/google"
      version = "~> 7.0"
    }
  }
}

provider "google" {
  project = var.project_id 
  region = var.region
}

resource "google_project_service" "run_api" {
  service            = "run.googleapis.com"
  disable_on_destroy = false
}

resource "google_cloud_run_v2_service" "app" {
  name     = var.service_name
  location = var.region

  deletion_protection = false

  template {
    # Single-zone GPU placement — required to allow scale-to-zero (redundant
    # multi-zone GPU capacity can't scale below 1 instance).
    gpu_zonal_redundancy_disabled = true

    containers {
      image = var.container_image

      resources {
        limits = {
          cpu              = var.gpu_cpu
          memory           = var.gpu_memory
          "nvidia.com/gpu" = "1"
        }
        # GPU workloads need CPU always allocated, not throttled between requests.
        cpu_idle = false
      }

      ports {
        container_port = 8080
      }
    }

    node_selector {
      accelerator = var.gpu_accelerator
    }
  }

  depends_on = [google_project_service.run_api]
}

# Fly.io calls this service, so it needs its own identity rather than using allUsers
# (Cloud Run v2 has no public access by default).
resource "google_service_account" "fly_caller" {
  account_id   = "${var.service_name}-fly"
  display_name = "Fly.io caller for ${var.service_name}"
}

resource "google_cloud_run_v2_service_iam_member" "fly_invoker" {
  name     = google_cloud_run_v2_service.app.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.fly_caller.email}"
}

# Key for backend/index.js to authenticate as fly_caller from outside GCP (Fly has
# no metadata server). Simplest option for a solo project; swap for Workload
# Identity Federation if key rotation/leakage ever becomes a real concern.
resource "google_service_account_key" "fly_caller_key" {
  service_account_id = google_service_account.fly_caller.name
}




