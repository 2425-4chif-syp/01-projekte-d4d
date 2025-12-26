#!/bin/bash
# Generate self-signed SSL certificates for local development

CERT_DIR="./nginx/certs"

# Create directory if it doesn't exist
mkdir -p "$CERT_DIR"

# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "$CERT_DIR/localhost-key.pem" \
  -out "$CERT_DIR/localhost.pem" \
  -subj "/C=AT/ST=Oberoesterreich/L=Leonding/O=HTL Leonding/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1"

echo "✓ SSL certificates generated in $CERT_DIR"
