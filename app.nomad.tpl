job "discord-auth-proxy" {
  datacenters = ["cwdc"]
  group "server" {
    network {
      port  "http"{
        to = 8888
      }
    }
    service {
      name = "UI"
      port = "http"

      tags = [
        "traefik.enable=true",
        "traefik.http.routers.auth-proxy.rule=Host(`auth-proxy.cwdc.cbains.ca`)",
        "traefik.http.routers.auth-proxy.tls.certresolver=letsencrypt",
        "traefik.http.routers.auth-proxy.entrypoints=https",
      ]
      check {
        path     = "/health"
        type     = "http"
        interval = "2s"
        timeout  = "2s"
      }

    }
    task "server" {
      driver = "docker"
      config {
        image = "${artifact.image}:${artifact.tag}"
        ports = ["http"]
      }
      vault {        
        policies = ["discord-proxy","default"]
        change_mode   = "signal"        
        change_signal = "SIGUSR1"      
      }
      env {
        #Inject details about the environment like what port is being used
        %{ for k,v in entrypoint.env ~}
        ${k} = "${v}"
        %{ endfor ~}
      }
      template {
        data = <<EOH
{{ with secret "kv/projects/system/discord-auth" }}
{{ range $key, $pairs := .Data.data | explodeMap }}
{{ $key }}="{{ $pairs }}"
{{- end }}
{{ end}}
        EOH
        destination = "local/file.env"
        change_mode   = "restart"
        env         = true
        }
    }
  }
}