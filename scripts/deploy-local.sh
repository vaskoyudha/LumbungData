#!/bin/bash
set -e
echo "Building and starting LumbungData full stack..."
docker compose build
docker compose up -d
echo "Services started. Web: http://localhost:3000, API: http://localhost:4000"
