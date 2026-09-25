# RUINS — Technical Verification & System Audit Matrix

**Repository:** `Senseify/Ruins`  
**Current Release Version:** `1.0.0`  
**Target Mobile OS:** Android & iOS (React Native Expo SDK 52)  
**Backend:** Fastify 4.x + PostGIS / WebSocket Gateway  
**Document Classification:** Definitive Integrity Audit  

---

## 1. Subsystem Verification Status Matrix

| Subsystem | Scope & Features | Status Classification | Verification Evidence / Details |
| :--- | :--- | :--- | :--- |
| **Shared Contracts & Domain Models** | Cross-platform DTOs, GeoCoordinates, GameMode, MatchResultDetails, UGCGameConfig | **CODE IMPLEMENTED & AUTOMATED TESTED** | `packages/shared/src/index.ts` compiled via `tsc`. Shared across client and server. |
| **Authentication & Session Security** | JWT generation/verification, bcrypt hashing, calls/rate limiting, hardware keychain token storage | **CODE IMPLEMENTED & AUTOMATED TESTED** | Mobile client uses `expo-secure-store` (iOS Keychain / Android KeyStore). Backend tests verify registration, duplicate rejection, and bad credential rejection. |
| **Relational & Spatial Database** | PostgreSQL 15+ with PostGIS, SQL migrations, foreign keys, spatial geometry (`location`), unique constraints | **CODE IMPLEMENTED — REAL DATABASE NOT EXECUTED ON HOST** | Full PostGIS DDL schema in `apps/server/migrations/001_initial_schema.sql`. Automated in-memory spatial engine verified in tests. Docker/PostgreSQL was not installed on this local Windows host. |
| **Production Database Fail-Fast** | `createDatabaseStore` strictly enforces `DATABASE_URL` in production, instantiates `PostgresDatabaseStore`, and verifies connection via `SELECT 1` | **CODE IMPLEMENTED & AUTOMATED TESTED** | Automated Test 17 verifies missing `DATABASE_URL` throws fatal error, never downgrades to in-memory, and rejects unreachable databases. |
| **WebSocket Real-Time Gateway** | Realtime socket lifecycle, JWT authentication, room isolation, 1 Hz location throttling, ping/pong | **CODE IMPLEMENTED & AUTOMATED TESTED** | Automated Test 18 verifies that players not enrolled in a theater cannot subscribe to its private room. Room cleanup on disconnect tested. |
| **Authoritative Gameplay Engine** | Proximity-based capture, server-calculated distance, server-authoritative timer, scoring, and win conditions | **CODE IMPLEMENTED & AUTOMATED TESTED** | Client cannot directly alter score or outcome. Tests 19 & 22 verify forged coordinates, NaN values, out-of-range coordinates, and non-host triggers are rejected. |
| **Concurrency & Objective Atomicity** | Atomic capture locking, row isolation, and duplicate finalization prevention | **CODE IMPLEMENTED & AUTOMATED TESTED** | Test 22 verifies concurrent capture race conditions: two simultaneous requests produce exactly one 200 OK and one 409 Conflict. Duplicate finalization is idempotent. |
| **Anti-Cheat & Kinematic Detection** | Suspicious telemetry & impossible movement detection (>14 m/s), 2.5m GPS noise deadband, clock-tampering detection | **CODE IMPLEMENTED & AUTOMATED TESTED** | Accurately documented as suspicious movement detection (not foolproof hardware GPS spoofing prevention). Tests verify stale (>60s) and future (>10s) timestamp rejections. |
| **User Generated Content (UGC)** | Custom operation builder, objective perimeter bounds, min 15m objective spacing, duplicate code checks, safety reporting | **CODE IMPLEMENTED & AUTOMATED TESTED** | Test 21 verifies that overlapping/stacked objectives (<15m) and duplicate codes fail validation. UGC is purely declarative JSON, preventing code execution. |
| **AI Tactical Game Master** | Sandboxed mission briefing generator with Gemini API integration and fallback to deterministic procedural generator | **CODE IMPLEMENTED & AUTOMATED TESTED** | AI is strictly optional. If `GEMINI_API_KEY` is missing or fails, procedural fallback is invoked. AI never generates coordinates or modifies scores/player state. |
| **Rate Limiting & DDoS Mitigation** | Global 120/min limit and granular per-route limits for auth (10/min), game creation (15/min), captures (60/min), UGC (10/min), AI (10/min) | **CODE IMPLEMENTED & AUTOMATED TESTED** | Verified via `@fastify/rate-limit` route configurations and HTTP security response headers (`x-ratelimit-limit`). |
| **Mobile Application UI & Screens** | Home (Map), Operations Directory, Create Game, Join Game, Lobby, Active Tactical HUD, Results Debrief, Profile Dossier, Settings | **CODE IMPLEMENTED & EXPO BUNDLED** | All screens bound to real backend state. Static mock placeholders in `ResultsScreen` replaced with live API debriefs. Exported cleanly via `expo export`. |
| **Location Hardware Permissions** | Foreground-only location permissions (`ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`), permission-denied banners | **CODE IMPLEMENTED — NOT PHYSICALLY FIELD TESTED** | Background location permissions intentionally removed to comply with Google Play / Apple App Store policies. Physical two-device field testing has not yet been conducted. |
| **Cloud / Server Deployment** | Multi-stage Docker container (`apps/server/Dockerfile`), docker-compose setup, Kubernetes health probes (`/health/liveness`, `/health/readiness`) | **CODE IMPLEMENTED — DEPLOYMENT NOT PERFORMED** | Dockerfile and compose manifests prepared. Cloud deployment to AWS ECS / GCP Cloud Run requires cloud infrastructure credentials. |
| **App Store / Play Store Publication** | Production bundle identifiers (`com.senseify.ruins`), release assets, privacy disclosure, and submission guidelines | **CODE IMPLEMENTED — STORE PUBLICATION PENDING** | Application bundle identifier configured. Submission to Apple App Store and Google Play Store requires active Apple Developer Program / Google Play Console developer accounts. |

---

## 2. Accurate Technical Clarifications & Limitations

1. **Hardware-Backed Auth Storage:**
   The mobile client uses `expo-secure-store`, which interfaces with the iOS Keychain (using `kSecAccessControl`) and Android KeyStore (AES-encrypted in encrypted SharedPreferences). In web environments, it falls back to standard `AsyncStorage`. No claims of custom cryptographic encryption are made for web storage.

2. **Kinematic Anti-Cheat Scope:**
   The server implements kinematic velocity bounds (flagging movement > 14 m/s with a 2.5m stationary noise buffer) and temporal checks (rejecting timestamps > 60s in the past or > 10s in the future). This system detects impossible movement and coarse GPS jumps, but does **not** provide complete protection against sophisticated low-speed GPS simulation or rooted device mock-location providers.

3. **Database Environment Notice:**
   The server includes complete PostgreSQL/PostGIS repository code with row-locking (`FOR UPDATE`) and spatial SQL queries (`ST_DWithin`, `ST_Distance`). However, during automated validation on this Windows host, Docker and local PostgreSQL were not available. In-memory spatial and relational logic was thoroughly validated across all automated tests.

4. **Background Location Policy:**
   In compliance with Google Play Store policies and Apple App Store Review Guidelines, RUINS requests only foreground location permissions (`ForegroundServiceType: location` is avoided until an approved background mode is certified). When the app is backgrounded or the screen is locked, location polling pauses; upon returning to foreground (`AppState: active`), WebSocket reconnects and location re-syncs automatically.
