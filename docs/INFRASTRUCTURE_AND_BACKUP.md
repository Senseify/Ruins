# RUINS — Production Infrastructure & Backup Strategy

This document details the production backend architecture, database connection pooling, continuous backup strategy, and recovery procedures for the RUINS real-world multiplayer platform.

---

## 1. Production Architecture Overview

* **Runtime:** Node.js 20 LTS (Alpine Linux Container)
* **Framework:** Fastify 4.28+ with `@fastify/websocket` (1 Hz throttled geospatial relay)
* **Primary Database:** PostgreSQL 16+ with PostGIS 3.4 spatial extensions
* **Containerization:** Docker multi-stage build with Docker Compose orchestration
* **Security Layer:**
  - `@fastify/helmet`: HTTP security headers (CSP, HSTS, X-Content-Type-Options, Frameguard)
  - `@fastify/rate-limit`: In-memory / Redis rate limiting (120 req/min default with burst buffers)
  - Bcrypt password hashing (12 salt rounds)
  - High-entropy HS256/RS256 JWT tokens with automatic expiry checks

---

## 2. Database Connection Pooling

The PostgreSQL connection pool (`pg.Pool`) in `apps/server/src/db/index.ts` is configured with:
* **Max Connections:** 20 connections per server node
* **Idle Timeout:** 30,000 ms (30 seconds)
* **Connection Timeout:** 5,000 ms (5 seconds fail-fast threshold)
* **SSL / TLS:** In production cloud environments (AWS RDS, Neon, Supabase, GCP Cloud SQL), SSL is enabled with `rejectUnauthorized: true`.

---

## 3. PostGIS Spatial Optimization

* **Spatial Indexes:**
  - `idx_games_room_code` (B-Tree for instant lobby joins)
  - `idx_games_status` (Filtered index for active lobbies and matches)
  - PostGIS spatial query geometry:
    ```sql
    ST_DWithin(
      ST_MakePoint(boundary_lng, boundary_lat)::geography,
      ST_MakePoint($1, $2)::geography,
      $3 -- max distance in meters
    )
    ```
* **Atomicity:** Match finalization, placement calculation, career XP assignment, and objective captures utilize explicit ACID transactions (`BEGIN` ... `COMMIT` / `ROLLBACK`).

---

## 4. Backup & Disaster Recovery Strategy

### A. Continuous Archiving (WAL Archiving)
* Configure PostgreSQL Write-Ahead Logging (`wal_level = replica`).
* Archive WAL segments to an encrypted, write-once object store (e.g. AWS S3 Glacier with Object Lock or GCS Bucket):
  ```ini
  archive_mode = on
  archive_command = 'aws s3 cp %p s3://ruins-db-wal-archive/%f'
  archive_timeout = 300 # Force rotation every 5 minutes
  ```
* **Recovery Point Objective (RPO):** < 5 minutes
* **Recovery Time Objective (RTO):** < 30 minutes

### B. Automated Daily Physical Snapshots (`pg_dump`)
* A scheduled cron job executes daily logical dumps at 03:00 UTC:
  ```bash
  #!/bin/bash
  DATE=$(date +%Y%m%d_%H%M%S)
  BACKUP_FILE="/backups/ruins_db_${DATE}.dump"

  pg_dump -h $DB_HOST -U $DB_USER -d ruins -F c -b -v -f $BACKUP_FILE
  gzip -9 $BACKUP_FILE
  aws s3 cp ${BACKUP_FILE}.gz s3://ruins-db-backups/daily/

  # Retention Policy: Delete backups older than 30 days
  find /backups -name "ruins_db_*.dump.gz" -mtime +30 -delete
  ```

### C. Restoration Drill Procedure
To restore the database from an encrypted backup archive to a staging or disaster recovery instance:
1. Provision target PostgreSQL 16 instance with PostGIS installed.
2. Download target snapshot:
   ```bash
   aws s3 cp s3://ruins-db-backups/daily/ruins_db_20260925_030000.dump.gz .
   gunzip ruins_db_20260925_030000.dump.gz
   ```
3. Restore database with postgis extension preserved:
   ```bash
   createdb -h $TARGET_HOST -U postgres ruins
   pg_restore -h $TARGET_HOST -U postgres -d ruins -v -c ruins_db_20260925_030000.dump
   ```
4. Verify schema and table integrity:
   ```sql
   SELECT count(*) FROM users;
   SELECT count(*) FROM games;
   SELECT count(*) FROM match_results;
   ```
