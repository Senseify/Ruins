# Ruins

A real-world multiplayer mobile game platform.

## Repository Structure

```
Ruins/
├── apps/
│   ├── mobile/         # React Native (Expo) client
│   └── server/         # Fastify real-time backend
├── packages/
│   └── shared/         # Shared TypeScript contracts & schemas
├── .gitignore
└── README.md
```

## Prerequisites

- **Node.js**: v18+ (tested on v24)
- **npm**: v9+ (tested on v11)
- **Expo Go** mobile app (available on iOS App Store & Google Play)

## Getting Started

### 1. Install Dependencies
Run from the root directory:
```bash
npm install
```

### 2. Build the Shared Package
Ensure the shared TypeScript types are compiled:
```bash
npm run build:shared
```

### 3. Running the Server
Start the Fastify backend in watch/development mode:
```bash
npm run dev:server
```
By default, the server listens at `http://localhost:3001`.

Verify the server health endpoint:
```bash
curl http://localhost:3001/health
```
Response:
```json
{
  "status": "ok",
  "uptimeSeconds": 12,
  "timestamp": "2026-09-25T10:15:00.000Z",
  "version": "0.1.0"
}
```

### 4. Running the Mobile App
Start the Expo Metro bundler:
```bash
npm run start:mobile
```
- Press `a` in the terminal for Android emulator.
- Press `w` for Web preview.
- Or scan the terminal QR code with the **Expo Go** app on your physical mobile device.
