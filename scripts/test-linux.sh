#!/usr/bin/env bash
# Isolated Linux fallback for macOS hosts where Firefox cannot start.
set -euo pipefail
cd "$(dirname "$0")/.."
name="party-integrity-$$"
artifacts="${PARTY_TEST_ARTIFACTS:-$HOME/.hermes/cache/scratch/party-linux-artifacts}"
mkdir -p "$artifacts"
trap 'docker rm -f "$name" >/dev/null 2>&1 || true' EXIT
# Source is read-only. Dependencies, emulators and browser profiles live only
# inside this disposable container; no ports or production data are mounted.
set +e
docker run --name "$name" --mount "type=bind,source=$PWD,target=/source,readonly" \
  mcr.microsoft.com/playwright:v1.64.0-noble bash -lc '
    set -euo pipefail
    apt-get update -qq
    apt-get install -y -qq openjdk-21-jre-headless python3 curl xz-utils >/dev/null
    case "$(uname -m)" in aarch64) arch=arm64;; x86_64) arch=x64;; *) exit 2;; esac
    curl -fsSL "https://nodejs.org/dist/v24.12.0/node-v24.12.0-linux-$arch.tar.xz" | tar -xJ -C /opt
    export PATH="/opt/node-v24.12.0-linux-$arch/bin:$PATH"
    mkdir /work
    tar -C /source --exclude=node_modules --exclude=test-results --exclude=playwright-report --exclude="*-debug.log" -cf - . | tar -C /work -xf -
    cd /work
    node --version
    npm ci
    npm test
    npm run test:regressions
  '
result=$?
set -e
docker cp "$name:/work/playwright-report" "$artifacts/" || true
docker cp "$name:/work/test-results" "$artifacts/" || true
docker cp "$name:/work/database-debug.log" "$artifacts/" || true
printf 'Linux artifacts: %s\n' "$artifacts"
exit "$result"
