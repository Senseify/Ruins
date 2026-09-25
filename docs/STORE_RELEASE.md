# RUINS — Mobile Production Store Release Specification

This document details the complete store metadata, release configuration, permissions justifications, and manual steps required for publishing RUINS to the Apple App Store and Google Play Store.

---

## 1. App Identity & Store Metadata

### General
* **App Name:** RUINS
* **Tagline / Subtitle:** Real-World Intelligence & Tactical Operations
* **Primary Category:** Games / Location-Based Games
* **Secondary Category:** Entertainment / Multiplayer
* **Bundle Identifier (iOS):** `com.senseify.ruins`
* **Package Name (Android):** `com.senseify.ruins`
* **Version:** `1.0.0`
* **Build Number:** `1`
* **Age Rating:** 12+ (Infrequent/Mild Realistic Violence, Location Tracking)

### Short Description (Google Play — 80 chars max)
The real world is the map. Join operations, capture objectives, and survive.

### Full Store Description (App Store & Google Play)
```
RUINS is a real-world multiplayer mobile game where the physical world becomes the operational theater.

Operatives track their true physical coordinates across obsidian-toned vector maps, discovering live sector frequencies, converging on physical objective waypoints, securing territory, and extracting critical telemetry in real time.

FEATURES:
• Real-World Map Operations: Every building, plaza, and path is part of the active theater.
• Multiple Operational Modes:
  - CONVERGENCE: Synchronous node extraction across active sectors.
  - HUNT: Sequential breadcrumb beacon tracking.
  - EXTRACTION: High-value core payload retrieval and courier perimeter escape.
  - TERRITORY: Area dominance and regional quadrant defense.
  - RELAY: Coordinated multi-operative physical checkpoints.
• Server-Authoritative Kinematics: Real-time velocity verification, anti-teleport checks, and proximity capture buffers.
• User Generated Operations (UGC): Design custom theater perimeters and publish community missions within safe geometric boundaries.
• Squad Parties & Social: Form operatives squads, join private room codes, and coordinate with friends.
• Deterministic Career Progression: Track career XP, operative rankings, placement history, and debrief dossiers.
• Dark Obsidian Aesthetic: Minimalist, physical intelligence interface engineered for situational focus.

SAFETY NOTICE:
RUINS requires full physical and environmental awareness. Never trespass, enter restricted facilities, climb hazardous structures, or cross roadways unsafely. Operations are bounded exclusively to publicly accessible outdoor spaces.
```

### Keywords (iOS App Store — 100 chars max)
`real-world game,gps,multiplayer,geospatial,intelligence,scavenger hunt,tactical,coop,territory`

---

## 2. Platform Permissions & Privacy Descriptions

### iOS Info.plist Keys
1. **`NSLocationWhenInUseUsageDescription`**
   - *Value:* `"RUINS requires real-time physical location telemetry to track your operative position relative to mission objectives on the tactical map."`
2. **`NSLocationAlwaysAndWhenInUseUsageDescription`**
   - *Value:* `"RUINS requires location access while an operation is active to verify proximity captures and update live squad positions."`
3. **`UIBackgroundModes`**
   - *Values:* `["location"]`

### Android Permissions (AndroidManifest.xml)
1. `android.permission.ACCESS_FINE_LOCATION` — Required for meter-accurate proximity capture calculations.
2. `android.permission.ACCESS_COARSE_LOCATION` — Fallback network triangulation.
3. `android.permission.ACCESS_BACKGROUND_LOCATION` — Real-time match telemetry while device screen is dimmed or navigating.
4. `android.permission.FOREGROUND_SERVICE` & `android.permission.FOREGROUND_SERVICE_LOCATION` — Authoritative background location service adherence on Android 14+.

---

## 3. Human Accounts & Production Store Release Steps

The following steps require human developer accounts and private credentials that cannot be performed autonomously:

### Apple App Store (iOS)
1. **Apple Developer Account:** An active Apple Developer Program membership ($99/year) under Senseify is required.
2. **Certificates & Profiles:**
   - Create an App ID for `com.senseify.ruins` with `Location Services` enabled.
   - Generate an iOS Distribution Certificate and App Store Provisioning Profile.
3. **App Store Connect Record:**
   - Create app record for `RUINS` with primary language English (U.S.).
   - Upload App Icon (1024x1024 PNG, no alpha).
   - Upload 6.7" (iPhone 16 Pro Max) and 6.5" screenshots showing live dark map and objective debriefs.
4. **Build Distribution:**
   - Run `eas build --platform ios --profile production` or archive in Xcode.
   - Upload binary via Transporter / EAS Submit.
5. **App Review Information:**
   - Provide demo credentials (username and password) for Apple App Review testers.
   - Attach video demonstration of outdoor GPS capture behavior.

### Google Play Store (Android)
1. **Google Play Console Account:** A registered Google Play Developer account ($25 one-time fee).
2. **Release Keystore:**
   - Generate production upload keystore (`ruins-release-key.keystore`).
   - Configure Play App Signing.
3. **Store Listing Assets:**
   - App Icon: 512x512 32-bit PNG.
   - Feature Graphic: 1024x500 JPG/PNG.
   - Minimum 4 phone screenshots (16:9 or 9:16).
4. **Data Safety Questionnaire:**
   - Location Data: Disclose that Location (Precise & Approximate) is collected for gameplay functionality and anti-cheat verification.
   - Account Info: Username and Email collected for account management.
5. **App Bundle Upload:**
   - Build signed AAB: `npx expo run:android --variant release` or `eas build -p android`.
   - Create release in Production or Closed Testing track and submit for review.
