output "cloud_run_url" {
  value = google_cloud_run_v2_service.app.uri
}

# terraform output -raw fly_caller_key_json | base64 -d | fly secrets set GCP_SERVICE_ACCOUNT_KEY=-
output "fly_caller_key_json" {
  value     = google_service_account_key.fly_caller_key.private_key
  sensitive = true
}
