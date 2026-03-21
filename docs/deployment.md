# LumbungData — Production Deployment Guide

This guide covers deploying LumbungData on a VPS for NGO or cooperative use.

## Prerequisites

| Requirement | Minimum | Recommended |
| :--- | :--- | :--- |
| OS | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |
| CPU | 2 vCPU | 4 vCPU |
| RAM | 4 GB | 8 GB |
| Disk | 40 GB SSD | 80 GB SSD |
| Docker | 24.0+ | latest |
| Domain | Required (for HTTPS) | — |

> **Note**: Hyperledger Besu in dev mode uses ~1.5 GB RAM. CouchDB uses ~300 MB. Leave 1 GB for web + API.

## Step-by-Step Deployment

### 1. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
docker --version   # Verify: Docker version 24.x or higher
```

### 2. Clone the Repository

```bash
git clone https://github.com/vaskoyudha/LumbungData.git
cd LumbungData
```

### 3. Configure Environment Variables

```bash
cp .env.example .env
nano .env
```

Set these values in `.env`:

```env
# CouchDB credentials — CHANGE THESE
COUCHDB_USER=admin
COUCHDB_PASSWORD=your_secure_password_here

# Application URLs
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_BESU_RPC_URL=http://besu:8545
NEXT_PUBLIC_COUCHDB_URL=http://couchdb:5984

# API internal connection
COUCHDB_URL=http://couchdb:5984
```

### 4. Start Services

```bash
# Build and start all services
docker compose up -d

# Check service health
docker compose ps

# Expected output: all services "Up" or "healthy"
```

### 5. Initialize CouchDB

CouchDB requires one-time setup:

```bash
# Initialize single-node cluster
curl -X POST -H "Content-Type: application/json" \
  http://admin:your_password@localhost:5984/_cluster_setup \
  -d '{"action":"finish_cluster"}'

# Create the lumbung database
curl -X PUT http://admin:your_password@localhost:5984/lumbung

# Verify
curl http://admin:your_password@localhost:5984/lumbung
# Expected: {"db_name":"lumbung",...}
```

### 6. Verify All Services

```bash
# Web PWA
curl -I http://localhost:3000
# Expected: HTTP/1.1 200 OK

# API health
curl http://localhost:4000/health
# Expected: {"status":"ok"}

# CouchDB
curl http://localhost:5984/_up
# Expected: {"status":"ok"}

# Besu RPC
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://localhost:8545
# Expected: {"jsonrpc":"2.0","id":1,"result":"0x..."}
```

## Service Ports

| Service | Internal Port | Description |
| :--- | :--- | :--- |
| Web PWA | 3000 | Next.js production server |
| API | 4000 | Express REST API |
| CouchDB | 5984 | Database + replication endpoint |
| Besu RPC | 8545 | Ethereum JSON-RPC |
| Besu WS | 8546 | Ethereum WebSocket |

## Smart Contract Deployment

The SubsidyLedger contract must be deployed to your Besu node:

```bash
# Enter the blockchain app directory
cd apps/blockchain

# Install Hardhat dependencies
pnpm install

# Deploy to local Besu dev node
npx hardhat run scripts/deploy.js --network besu_dev

# The contract address is printed — save it to .env:
# NEXT_PUBLIC_SUBSIDY_CONTRACT_ADDRESS=0x...
```

If there is no `scripts/deploy.js`, create a minimal one:

```javascript
const hre = require("hardhat");
async function main() {
  const SubsidyLedger = await hre.ethers.getContractFactory("SubsidyLedger");
  const contract = await SubsidyLedger.deploy();
  await contract.waitForDeployment();
  console.log("SubsidyLedger deployed to:", await contract.getAddress());
}
main().catch(console.error);
```

## CouchDB Production Hardening

For production, increase CouchDB security:

```bash
# Disable admin party (if not already configured via env)
curl -X PUT http://localhost:5984/_node/nonode@nohost/_config/admins/admin \
  -d '"your_secure_password"'

# Set CORS for PWA origin (replace with your actual domain)
curl -X PUT http://admin:your_password@localhost:5984/_node/nonode@nohost/_config/cors/origins \
  -d '"https://yourdomain.com"'

curl -X PUT http://admin:your_password@localhost:5984/_node/nonode@nohost/_config/cors/credentials \
  -d '"true"'

curl -X PUT http://admin:your_password@localhost:5984/_node/nonode@nohost/_config/cors/methods \
  -d '"GET, PUT, POST, HEAD, DELETE"'
```

## Backup Strategy

### CouchDB Backup

```bash
# Full database dump to JSON
curl -X GET "http://admin:your_password@localhost:5984/lumbung/_all_docs?include_docs=true" \
  > backup/lumbung-$(date +%Y%m%d).json

# Schedule daily backups with cron
echo "0 2 * * * curl -X GET 'http://admin:password@localhost:5984/lumbung/_all_docs?include_docs=true' > /opt/backups/lumbung-\$(date +\%Y\%m\%d).json" | crontab -
```

### Besu State Backup

```bash
# Stop Besu before backup
docker compose stop besu

# Backup the data volume
docker run --rm -v lumbungdata_besu_data:/data -v $(pwd)/backup:/backup \
  ubuntu tar czf /backup/besu-$(date +%Y%m%d).tar.gz /data

# Restart Besu
docker compose start besu
```

## Monitoring

### Health Check Endpoints

```bash
# CouchDB active tasks
curl http://admin:password@localhost:5984/_active_tasks

# CouchDB database stats
curl http://admin:password@localhost:5984/lumbung

# Besu peer count
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"net_peerCount","params":[],"id":1}'
```

### Recommended Monitoring Stack

For production deployments serving multiple villages, add:
- **Uptime Kuma** (lightweight, self-hosted) — check `http://localhost:3000`, `http://localhost:5984/_up`
- **CouchDB Fauxton** — built-in admin UI at `http://localhost:5984/_utils`

## Updating LumbungData

```bash
cd LumbungData

# Pull latest code
git pull origin main

# Rebuild and restart
docker compose down
docker compose build --no-cache
docker compose up -d
```

## Troubleshooting

| Issue | Likely Cause | Fix |
| :--- | :--- | :--- |
| Web shows blank page | Missing `.env` | Ensure `NEXT_PUBLIC_API_URL` is set |
| CouchDB connection refused | Service not ready | `docker compose logs couchdb` — wait for `started on http` |
| Besu exits immediately | Low memory | Ensure ≥ 4 GB RAM on VPS |
| Sync not working | CORS not configured | Run CouchDB CORS setup commands above |
| Build fails with OOM | Low memory during build | Increase swap: `fallocate -l 2G /swapfile && mkswap /swapfile && swapon /swapfile` |
