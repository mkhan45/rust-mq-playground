#!/bin/sh

export FLY_API_HOSTNAME="127.0.0.1:4280" # or set to `127.0.0.1:4280` when using 'flyctl proxy'
export FLY_API_TOKEN=$(fly auth token)

REGION=$1

# notable regions: iad, ord, lax, dfw?

curl -i -X POST \
-H "Authorization: Bearer ${FLY_API_TOKEN}" -H "Content-Type: application/json" \
"http://${FLY_API_HOSTNAME}/v1/apps/rust-mq/machines" \
-d '{
  "name": "compiler-'${REGION}'-octa-2",
  "region": '\"${REGION}\"',
  "config": {
    "image": "mkhan45/test-runner:latest",
    "env": {
      "APP_ENV": "production"
    },
    "services": [
      {
        "ports": [
          {
            "port": 443,
            "handlers": [
              "tls",
              "http"
            ]
          },
          {
            "port": 80,
            "handlers": [
              "http"
            ]
          }
        ],
        "protocol": "tcp",
        "internal_port": 4000
      }
    ],
    "guest": {
        "cpu_kind": "shared",
        "cpus": 8,
        "memory_mb": 4096
    }
  }
}'
