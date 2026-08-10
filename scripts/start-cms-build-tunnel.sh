#!/usr/bin/env bash

set -Eeuo pipefail

if [ "$#" -ne 5 ]; then
  printf 'Usage: %s <ssh-host> <ssh-port> <ssh-user> <private-key> <known-hosts>\n' "$0" >&2
  exit 64
fi

ssh_host="$1"
ssh_port="$2"
ssh_user="$3"
private_key="$4"
known_hosts="$5"
cms_host='cms.awankusuma.com'

for value in "$ssh_host" "$ssh_port" "$ssh_user" "$private_key" "$known_hosts"; do
  if [ -z "$value" ]; then
    printf 'Konfigurasi SSH tunnel CMS tidak lengkap.\n' >&2
    exit 64
  fi
done

if [[ ! "$ssh_port" =~ ^[0-9]+$ ]] || (( ssh_port < 1 || ssh_port > 65535 )); then
  printf 'Port SSH tunnel CMS tidak valid.\n' >&2
  exit 64
fi

if [ ! -f "$private_key" ] || [ ! -f "$known_hosts" ]; then
  printf 'Private key atau known_hosts untuk tunnel CMS tidak tersedia.\n' >&2
  exit 1
fi

# Bind the runner's local HTTPS port to LiteSpeed on the hosting server. The
# TLS session still uses cms.awankusuma.com as SNI, while the origin sees a
# localhost connection instead of a rotating GitHub-hosted runner address.
sudo --non-interactive ssh \
  -F /dev/null \
  -4 \
  -fNT \
  -p "$ssh_port" \
  -i "$private_key" \
  -o BatchMode=yes \
  -o ConnectTimeout=15 \
  -o ExitOnForwardFailure=yes \
  -o GlobalKnownHostsFile=/dev/null \
  -o IdentitiesOnly=yes \
  -o ServerAliveCountMax=3 \
  -o ServerAliveInterval=30 \
  -o StrictHostKeyChecking=yes \
  -o UserKnownHostsFile="$known_hosts" \
  -L '127.0.0.1:443:127.0.0.1:443' \
  "$ssh_user@$ssh_host"

if awk -v host="$cms_host" '
  $0 !~ /^[[:space:]]*#/ {
    for (field = 2; field <= NF; field += 1) {
      if ($field == host) found = 1
    }
  }
  END { exit found ? 0 : 1 }
' /etc/hosts; then
  printf '%s sudah memiliki override di /etc/hosts runner.\n' "$cms_host" >&2
  exit 1
fi

printf '127.0.0.1\t%s\n' "$cms_host" \
  | sudo --non-interactive tee -a /etc/hosts >/dev/null

if ! getent ahostsv4 "$cms_host" | awk '$1 == "127.0.0.1" { found = 1 } END { exit found ? 0 : 1 }'; then
  printf 'Hostname CMS tidak mengarah ke SSH tunnel lokal.\n' >&2
  exit 1
fi

curl \
  --fail \
  --silent \
  --show-error \
  --retry 2 \
  --retry-all-errors \
  --connect-timeout 10 \
  --max-time 30 \
  --header 'Accept: application/json' \
  "https://${cms_host}/api/system/status" \
  >/dev/null

printf 'CMS_BUILD_TUNNEL_OK %s\n' "$cms_host"
