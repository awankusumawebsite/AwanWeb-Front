#!/usr/bin/env bash

set -Eeuo pipefail

if [ "$#" -ne 4 ]; then
  printf 'Usage: %s <git-sha> <archive-name> <deploy-home> <staging-url>\n' "$0" >&2
  exit 64
fi

release_sha="$1"
archive_name="$2"
deploy_home="${3%/}"
staging_url="${4%/}"

if [[ ! "$release_sha" =~ ^[0-9a-f]{40}$ ]]; then
  printf 'Git SHA tidak valid: %s\n' "$release_sha" >&2
  exit 64
fi

expected_archive="frontend-${release_sha}.tar.gz"
if [ "$archive_name" != "$expected_archive" ]; then
  printf 'Nama archive tidak sesuai SHA: %s\n' "$archive_name" >&2
  exit 64
fi

if [[ "$deploy_home" != /home/* || "$deploy_home" == /home ]]; then
  printf 'Deploy home tidak aman: %s\n' "$deploy_home" >&2
  exit 64
fi

if [[ ! "$staging_url" =~ ^https://[A-Za-z0-9.-]+$ ]]; then
  printf 'Staging URL tidak valid: %s\n' "$staging_url" >&2
  exit 64
fi

release_root="$deploy_home/frontend-releases"
shared_root="$deploy_home/frontend-shared"
control_root="$shared_root/deploy-control"
log_root="$shared_root/logs"
release_dir="$release_root/$release_sha"
staging_link="$deploy_home/frontend-staging-current"
document_root="$deploy_home/staging.awankusuma.com"
archive_path="$control_root/$archive_name"
checksum_path="${archive_path}.sha256"
temporary_release="$release_root/.${release_sha}.tmp.$$"
temporary_link="$deploy_home/.frontend-staging-current.tmp.$$"
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

if [ ! -L "$document_root" ]; then
  printf 'Document root staging harus berupa symlink sebelum deployment: %s\n' "$document_root" >&2
  exit 1
fi

if [ "$(readlink -- "$document_root")" != "$staging_link" ]; then
  printf 'Document root staging tidak menunjuk ke symlink stabil: %s\n' "$document_root" >&2
  exit 1
fi

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
  grep -Fq 'Disallow: /' "$candidate/robots.txt"

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

previous_target=''
if [ -L "$staging_link" ]; then
  previous_target="$(readlink -- "$staging_link")"
elif [ -e "$staging_link" ]; then
  printf 'Pointer staging sudah ada tetapi bukan symlink: %s\n' "$staging_link" >&2
  exit 1
fi

ln -s -- "$release_dir" "$temporary_link"
mv -Tf -- "$temporary_link" "$staging_link"

rollback_pointer() {
  local rollback_link="$deploy_home/.frontend-staging-rollback.tmp.$$"

  rm -f -- "$rollback_link"
  if [ -n "$previous_target" ]; then
    ln -s -- "$previous_target" "$rollback_link"
    mv -Tf -- "$rollback_link" "$staging_link"
  else
    rm -f -- "$staging_link"
  fi
}

health_failed=false
if ! curl --fail --silent --show-error --location --max-time 30 \
  "$staging_url/" >/dev/null; then
  health_failed=true
fi

if ! curl --fail --silent --show-error --location --max-time 30 \
  "$staging_url/robots.txt" | grep -Fq 'Disallow: /'; then
  health_failed=true
fi

if [ "$health_failed" = true ]; then
  rollback_pointer
  printf 'Health check staging gagal; pointer dikembalikan ke release sebelumnya.\n' >&2
  exit 1
fi

active_staging="$(readlink -f -- "$staging_link")"
active_production=''
if [ -L "$deploy_home/frontend-current" ]; then
  active_production="$(readlink -f -- "$deploy_home/frontend-current")"
fi

retain_releases() {
  local kept=0 candidate candidate_name

  ls -1dt -- "$release_root"/* > "$release_list" 2>/dev/null || true

  while IFS= read -r candidate; do
    candidate_name="$(basename -- "$candidate")"
    [[ "$candidate_name" =~ ^[0-9a-f]{40}$ ]] || continue

    kept=$((kept + 1))
    if [ "$kept" -le 5 ] \
      || [ "$candidate" = "$active_staging" ] \
      || { [ -n "$active_production" ] && [ "$candidate" = "$active_production" ]; }; then
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
  "$release_sha" \
  "$staging_url" \
  >> "$log_root/staging-deploy.log"

printf 'STAGING_DEPLOY_OK %s\n' "$release_sha"
