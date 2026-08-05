#!/usr/bin/env bash

set -Eeuo pipefail

if [ "$#" -ne 6 ]; then
  printf 'Usage: %s <release-id> <archive-name> <deploy-home> <production-url> <prepare|activate> <origin-ip>\n' "$0" >&2
  exit 64
fi

release_id="$1"
archive_name="$2"
deploy_home="${3%/}"
production_url="${4%/}"
deployment_mode="$5"
origin_ip="$6"

if [[ ! "$release_id" =~ ^[0-9a-f]{40}-[0-9]+-[0-9]+$ ]]; then
  printf 'Release ID tidak valid: %s\n' "$release_id" >&2
  exit 64
fi

expected_archive="frontend-production-${release_id}.tar.gz"
if [ "$archive_name" != "$expected_archive" ]; then
  printf 'Nama archive tidak sesuai SHA: %s\n' "$archive_name" >&2
  exit 64
fi

if [[ "$deploy_home" != /home/* || "$deploy_home" == /home ]]; then
  printf 'Deploy home tidak aman: %s\n' "$deploy_home" >&2
  exit 64
fi

if [ "$production_url" != 'https://awankusuma.com' ]; then
  printf 'Production URL tidak valid: %s\n' "$production_url" >&2
  exit 64
fi

if [ "$deployment_mode" != prepare ] && [ "$deployment_mode" != activate ]; then
  printf 'Mode deployment tidak valid: %s\n' "$deployment_mode" >&2
  exit 64
fi

if [ "$deployment_mode" = activate ] && [ -z "$origin_ip" ]; then
  printf 'Origin IP wajib tersedia untuk aktivasi.\n' >&2
  exit 64
fi

# Production artifacts use their own root because the staging artifact for the
# same Git SHA intentionally has different robots, metadata, and analytics.
release_root="$deploy_home/frontend-production-releases"
shared_root="$deploy_home/frontend-shared"
control_root="$shared_root/deploy-control"
log_root="$shared_root/logs"
release_dir="$release_root/$release_id"
production_link="$deploy_home/frontend-current"
document_root="$deploy_home/awankusuma.com"
archive_path="$control_root/$archive_name"
checksum_path="${archive_path}.sha256"
temporary_release="$release_root/.${release_id}.tmp.$$"
temporary_link="$deploy_home/.frontend-current.tmp.$$"
release_list="$release_root/.release-list.$$"

cleanup() {
  rm -f -- "$temporary_link" "$archive_path" "$checksum_path" "$release_list"
  if [ -d "$temporary_release" ]; then
    rm -rf -- "$temporary_release"
  fi
}
trap cleanup EXIT

umask 022
mkdir -p -- "$release_root" "$control_root" "$log_root"
chmod 700 "$control_root"

if [ ! -f "$archive_path" ] || [ ! -f "$checksum_path" ]; then
  printf 'Archive atau checksum tidak ditemukan di deploy-control.\n' >&2
  exit 1
fi

(
  cd "$control_root"
  sha256sum -c "${archive_name}.sha256"
)

if ! tar -tzf "$archive_path" | awk '
  /^\// || /^\.\.\// || /\/\.\.\// || /\/\.\.$/ {
    printf "Path archive tidak aman: %s\\n", $0 > "/dev/stderr"
    invalid = 1
  }
  END { exit invalid }
'; then
  exit 1
fi

validate_release() {
  local candidate="$1"

  test -f "$candidate/index.html"
  test -f "$candidate/.htaccess"
  test -f "$candidate/robots.txt"
  test -d "$candidate/_astro"
  grep -Fq 'Allow: /' "$candidate/robots.txt"
  ! grep -Fxq 'Disallow: /' "$candidate/robots.txt"
  grep -Fq 'Sitemap: https://awankusuma.com/sitemap-index.xml' "$candidate/robots.txt"
  grep -Fq 'content="index, follow"' "$candidate/index.html"

  if find "$candidate" -type l -print -quit | grep -q .; then
    printf 'Artifact release tidak boleh mengandung symlink.\n' >&2
    return 1
  fi
}

if [ -e "$release_dir" ] || [ -L "$release_dir" ]; then
  if [ ! -d "$release_dir" ] || [ -L "$release_dir" ]; then
    printf 'Target release sudah ada tetapi bukan directory reguler: %s\n' "$release_dir" >&2
    exit 1
  fi
  validate_release "$release_dir"
else
  mkdir -- "$temporary_release"
  tar -xzf "$archive_path" -C "$temporary_release"
  validate_release "$temporary_release"
  mv -- "$temporary_release" "$release_dir"
fi

if [ "$deployment_mode" = prepare ]; then
  printf '%s\t%s\t%s\n' \
    "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
    "$release_id" \
    PREPARED \
    >> "$log_root/production-deploy.log"
  printf 'PRODUCTION_PREPARE_OK %s\n' "$release_id"
  exit 0
fi

if [ ! -L "$document_root" ]; then
  printf 'Document root production harus berupa symlink sebelum aktivasi: %s\n' "$document_root" >&2
  exit 1
fi

if [ "$(readlink -- "$document_root")" != "$production_link" ]; then
  printf 'Document root production tidak menunjuk ke symlink stabil: %s\n' "$document_root" >&2
  exit 1
fi

previous_target=''
if [ -L "$production_link" ]; then
  previous_target="$(readlink -- "$production_link")"
elif [ -e "$production_link" ]; then
  printf 'Pointer production sudah ada tetapi bukan symlink: %s\n' "$production_link" >&2
  exit 1
fi

ln -s -- "$release_dir" "$temporary_link"
mv -Tf -- "$temporary_link" "$production_link"

rollback_pointer() {
  local rollback_link="$deploy_home/.frontend-production-rollback.tmp.$$"

  rm -f -- "$rollback_link"
  if [ -n "$previous_target" ]; then
    ln -s -- "$previous_target" "$rollback_link"
    mv -Tf -- "$rollback_link" "$production_link"
  else
    rm -f -- "$production_link"
  fi
}

curl_origin() {
  curl --fail --silent --show-error --location --max-time 30 \
    --resolve "awankusuma.com:443:${origin_ip}" "$1"
}

health_failed=false
home_response=''
robots_response=''

# Capture the complete response before matching it. Piping curl into `grep -q`
# can make grep close early after a match; curl then exits with code 23 and
# pipefail incorrectly marks a healthy origin as failed.
if ! home_response="$(curl_origin "$production_url/")"; then
  health_failed=true
elif ! grep -Fq 'content="index, follow"' <<< "$home_response"; then
  health_failed=true
fi

if ! robots_response="$(curl_origin "$production_url/robots.txt")"; then
  health_failed=true
else
  if ! grep -Fq 'Sitemap: https://awankusuma.com/sitemap-index.xml' \
    <<< "$robots_response"; then
    health_failed=true
  fi
  if grep -Fxq 'Disallow: /' <<< "$robots_response"; then
    health_failed=true
  fi
fi

if [ "$health_failed" = true ]; then
  rollback_pointer
  printf 'Health check origin production gagal; pointer dikembalikan ke release sebelumnya.\n' >&2
  exit 1
fi

retain_releases() {
  local kept=0 candidate candidate_name active_production

  active_production="$(readlink -f -- "$production_link")"
  ls -1dt -- "$release_root"/* > "$release_list" 2>/dev/null || true

  while IFS= read -r candidate; do
    candidate_name="$(basename -- "$candidate")"
    [[ "$candidate_name" =~ ^[0-9a-f]{40}-[0-9]+-[0-9]+$ ]] || continue

    kept=$((kept + 1))
    if [ "$kept" -le 5 ] || [ "$candidate" = "$active_production" ]; then
      continue
    fi

    rm -rf -- "$candidate"
  done < "$release_list"
}

if ! retain_releases; then
  printf 'WARNING: release cleanup gagal; active release tetap sehat.\n' >&2
fi

printf '%s\t%s\t%s\n' \
  "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
  "$release_id" \
  ACTIVATED \
  >> "$log_root/production-deploy.log"

printf 'PRODUCTION_ACTIVATE_OK %s\n' "$release_id"
