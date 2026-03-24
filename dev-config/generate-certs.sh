#!/bin/bash
# Generate self-signed TLS certificates for local MoQ relay development.
# WebTransport requires HTTPS, so we need certs even for local dev.

set -e

CERT_DIR="$(dirname "$0")/certs"
mkdir -p "$CERT_DIR"

if [ -f "$CERT_DIR/fullchain.pem" ] && [ -f "$CERT_DIR/privkey.pem" ]; then
  echo "Certificates already exist in $CERT_DIR"
  echo "Delete them and re-run this script to regenerate."
  exit 0
fi

echo "Generating self-signed TLS certificates for localhost..."
echo "Note: Max 14 days validity required for WebTransport serverCertificateHashes"

openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 \
  -keyout "$CERT_DIR/privkey.pem" \
  -out "$CERT_DIR/fullchain.pem" \
  -days 14 \
  -nodes \
  -subj "/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

# Generate the certificate fingerprint (needed for WebTransport with self-signed certs)
openssl x509 -in "$CERT_DIR/fullchain.pem" -outform der \
  | openssl dgst -sha256 -binary \
  | openssl enc -base64 > "$CERT_DIR/fingerprint.b64"

echo ""
echo "Certificates generated in $CERT_DIR"
echo "Certificate fingerprint (base64 SHA-256):"
cat "$CERT_DIR/fingerprint.b64"
echo ""
echo "To trust in Chrome, use: --origin-to-force-quic-on=localhost:4443"
echo "Or pass the fingerprint to WebTransport options."
