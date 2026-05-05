#!/usr/bin/env bash
set -euo pipefail

site_url="${PHENOAGENT_SITE_URL:-https://phenoagent-demo.netlify.app}"
export VITE_CONVEX_URL="${VITE_CONVEX_URL:-https://nautical-seahorse-122.convex.cloud}"
export VITE_API_BASE_URL="${VITE_API_BASE_URL:-https://phenoagent-demo.netlify.app}"
convex_site_url="${PHENOAGENT_CONVEX_SITE_URL:-https://nautical-seahorse-122.convex.site}"
routes=(
  /
  /demo
  /dashboard
  /sleep
  /nutrition
  /training
  /bloodwork
  /supplements
  /journal
  /pheno
  /integrations
  /settings
  /login
)

if command -v curl >/dev/null 2>&1; then
  curl_bin="$(command -v curl)"
elif [ -x /usr/bin/curl ]; then
  curl_bin="/usr/bin/curl"
else
  echo "curl is required for deployed-site verification" >&2
  exit 1
fi

echo "== Local typecheck =="
npm run typecheck

echo "== Local production build =="
npm run build

echo "== Convex function validation =="
npx convex dev --once

echo "== Convex production auth endpoints =="
openid_status="$("$curl_bin" -sL -o /dev/null -w '%{http_code}' "${convex_site_url}/.well-known/openid-configuration")"
jwks_status="$("$curl_bin" -sL -o /dev/null -w '%{http_code}' "${convex_site_url}/.well-known/jwks.json")"
echo "${openid_status} /.well-known/openid-configuration"
echo "${jwks_status} /.well-known/jwks.json"
if [ "$openid_status" != "200" ] || [ "$jwks_status" != "200" ]; then
  echo "Convex production auth endpoints are not ready" >&2
  exit 1
fi

echo "== Dependency audit =="
npm audit --audit-level=moderate
npm audit --audit-level=moderate --prefix client
npm audit --audit-level=moderate --prefix server

echo "== Express server smoke test =="
server_port="${PHENOAGENT_VERIFY_PORT:-4107}"
server_log="$(mktemp -t phenoagent-server.XXXXXX.log)"
PORT="$server_port" \
CLIENT_ORIGIN="$site_url" \
CONVEX_URL="$VITE_CONVEX_URL" \
node server/dist/index.js >"$server_log" 2>&1 &
server_pid="$!"
cleanup_server() {
  kill "$server_pid" >/dev/null 2>&1 || true
  wait "$server_pid" 2>/dev/null || true
  rm -f "$server_log"
}
trap cleanup_server EXIT

for _ in 1 2 3 4 5 6 7 8 9 10; do
  if "$curl_bin" -s "http://127.0.0.1:${server_port}/health" >/dev/null; then
    break
  fi
  sleep 0.25
done

health="$("$curl_bin" -s "http://127.0.0.1:${server_port}/health")"
echo "$health"
if ! printf '%s' "$health" | grep -q '"ok":true'; then
  echo "Express health check failed" >&2
  cat "$server_log" >&2
  exit 1
fi

missing_auth="$("$curl_bin" -s -o /dev/null -w '%{http_code}' -X POST "http://127.0.0.1:${server_port}/api/pheno/chat" -H 'content-type: application/json' --data '{"message":"hello","history":[]}')"
echo "${missing_auth} /api/pheno/chat without bearer"
if [ "$missing_auth" != "401" ]; then
  echo "Pheno endpoint should reject missing bearer tokens" >&2
  exit 1
fi

garmin="$("$curl_bin" -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${server_port}/api/integrations/garmin/auth")"
echo "${garmin} /api/integrations/garmin/auth"
if [ "$garmin" != "501" ]; then
  echo "Garmin endpoint should remain explicitly blocked until API approval" >&2
  exit 1
fi

express_token="$(VITE_CONVEX_URL="$VITE_CONVEX_URL" node --input-type=module <<'NODE'
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";

const convexUrl = process.env.VITE_CONVEX_URL;
const timestamp = Date.now();
const client = new ConvexHttpClient(convexUrl, { logger: false });
const signIn = makeFunctionReference("auth:signIn");
const result = await client.action(signIn, {
  provider: "password",
  params: {
    email: `express-smoke+${timestamp}@phenoagent.local`,
    password: `Verify-${timestamp}-pass`,
    flow: "signUp",
  },
});
const token = result?.tokens?.token;
if (!token) throw new Error("Express smoke sign-up did not return an auth token.");
process.stdout.write(token);
NODE
)"

whoop_auth="$("$curl_bin" -s -o /dev/null -w '%{http_code}' -X POST "http://127.0.0.1:${server_port}/api/integrations/whoop/auth" -H "authorization: Bearer ${express_token}")"
oura_auth="$("$curl_bin" -s -o /dev/null -w '%{http_code}' -X POST "http://127.0.0.1:${server_port}/api/integrations/oura/auth" -H "authorization: Bearer ${express_token}")"
echo "${whoop_auth} /api/integrations/whoop/auth without credentials"
echo "${oura_auth} /api/integrations/oura/auth without credentials"
if [ "$whoop_auth" != "501" ] || [ "$oura_auth" != "501" ]; then
  echo "WHOOP/Oura auth endpoints should remain explicitly blocked until provider credentials are set" >&2
  exit 1
fi

cleanup_server
trap - EXIT

echo "== Netlify site linkage =="
npx netlify status

echo "== Deployed route checks =="
for route in "${routes[@]}"; do
  status="$("$curl_bin" -sL -o /dev/null -w '%{http_code}' "${site_url}${route}")"
  echo "${status} ${route}"
  if [ "$status" != "200" ]; then
    echo "Route ${route} returned ${status}" >&2
    exit 1
  fi
done

echo "== Hosted API checks =="
api_health="$("$curl_bin" -sL "${site_url}/api/health")"
api_pheno_missing="$("$curl_bin" -sL -o /dev/null -w '%{http_code}' -X POST "${site_url}/api/pheno/chat" -H 'content-type: application/json' --data '{"message":"hello","history":[]}')"
api_garmin="$("$curl_bin" -sL -o /dev/null -w '%{http_code}' "${site_url}/api/integrations/garmin/auth")"
api_whoop_get="$("$curl_bin" -sL -o /dev/null -w '%{http_code}' "${site_url}/api/integrations/whoop/auth")"
api_oura_get="$("$curl_bin" -sL -o /dev/null -w '%{http_code}' "${site_url}/api/integrations/oura/auth")"
api_whoop_post="$("$curl_bin" -sL -o /dev/null -w '%{http_code}' -X POST "${site_url}/api/integrations/whoop/auth" -H 'content-type: application/json' --data '{}')"
api_oura_post="$("$curl_bin" -sL -o /dev/null -w '%{http_code}' -X POST "${site_url}/api/integrations/oura/auth" -H 'content-type: application/json' --data '{}')"
echo "$api_health"
echo "${api_pheno_missing} /api/pheno/chat without bearer"
echo "${api_garmin} /api/integrations/garmin/auth"
echo "${api_whoop_get} GET /api/integrations/whoop/auth without credentials"
echo "${api_oura_get} GET /api/integrations/oura/auth without credentials"
echo "${api_whoop_post} POST /api/integrations/whoop/auth without credentials"
echo "${api_oura_post} POST /api/integrations/oura/auth without credentials"
if ! printf '%s' "$api_health" | grep -q '"ok":true'; then
  echo "Hosted API health check failed" >&2
  exit 1
fi
if [ "$api_pheno_missing" != "401" ] || [ "$api_garmin" != "501" ] || [ "$api_whoop_get" != "501" ] || [ "$api_oura_get" != "501" ] || [ "$api_whoop_post" != "501" ] || [ "$api_oura_post" != "501" ]; then
  echo "Hosted API auth/approval checks failed" >&2
  exit 1
fi

echo "== Deployed bundle check =="
html="$("$curl_bin" -sL "$site_url/")"
asset_path="$(printf '%s' "$html" | sed -n 's/.*src="\(\/assets\/index[^"]*\.js\)".*/\1/p' | head -n 1)"
if [ -z "$asset_path" ]; then
  echo "Could not find deployed JS asset in live HTML" >&2
  exit 1
fi
echo "asset ${asset_path}"

bundle="$("$curl_bin" -sL "${site_url}${asset_path}")"
if printf '%s' "$bundle" | grep -Eq 'localhost:4000|127\.0\.0\.1:3210'; then
  echo "Deployed bundle contains local development API URLs" >&2
  exit 1
fi

local_asset="client/dist${asset_path}"
if [ ! -f "$local_asset" ]; then
  echo "Local build did not produce ${local_asset}" >&2
  exit 1
fi
local_hash="$(shasum -a 256 "$local_asset" | awk '{print $1}')"
remote_hash="$(printf '%s' "$bundle" | shasum -a 256 | awk '{print $1}')"
echo "local sha256  ${local_hash}"
echo "remote sha256 ${remote_hash}"
if [ "$local_hash" != "$remote_hash" ]; then
  echo "Local build asset does not match deployed bundle" >&2
  exit 1
fi

echo "Verification complete."
