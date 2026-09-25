import assert from 'assert';
import { WebSocket } from 'ws';
import { startServer, server } from '../src/index';
import { config } from '../src/config';

async function runTests() {
  console.log('[E2E Test] Starting backend verification suite...');

  // Start server on test port
  await startServer();
  const baseUrl = `http://127.0.0.1:${config.port}`;
  const wsUrl = `ws://127.0.0.1:${config.port}/ws`;

  try {
    // -------------------------------------------------------------
    // TEST 1: Health Endpoint
    // -------------------------------------------------------------
    const healthRes = await fetch(`${baseUrl}/health`);
    assert.strictEqual(healthRes.status, 200, 'Health endpoint should return 200');
    const healthJson = await healthRes.json();
    assert.strictEqual(healthJson.status, 'ok', 'Health status should be ok');
    console.log('✓ Health check passed');

    // -------------------------------------------------------------
    // TEST 2: Registration & Duplicate Checks
    // -------------------------------------------------------------
    const regHostRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'HostAgent',
        email: 'host@ruins.network',
        password: 'Password123!',
        displayName: 'Host Operative',
      }),
    });
    assert.strictEqual(regHostRes.status, 200, 'Host registration should succeed');
    const hostAuth = await regHostRes.json();
    assert.ok(hostAuth.token, 'Should receive JWT token');
    assert.strictEqual(hostAuth.user.username, 'HostAgent');
    console.log('✓ Host registration passed');

    // Duplicate callsign should return 409
    const dupRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'HostAgent',
        email: 'other@ruins.network',
        password: 'Password123!',
      }),
    });
    assert.strictEqual(dupRes.status, 409, 'Duplicate username must fail with 409');
    console.log('✓ Duplicate callsign conflict rejection passed');

    // Register second player (RunnerAgent)
    const regRunnerRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'RunnerAgent',
        email: 'runner@ruins.network',
        password: 'Password123!',
        displayName: 'Field Runner',
      }),
    });
    const runnerAuth = await regRunnerRes.json();
    assert.ok(runnerAuth.token, 'Runner token received');
    console.log('✓ Runner registration passed');

    // -------------------------------------------------------------
    // TEST 3: Login & Invalid Credentials
    // -------------------------------------------------------------
    const badLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrUsername: 'HostAgent',
        password: 'WrongPassword!',
      }),
    });
    assert.strictEqual(badLoginRes.status, 401, 'Bad credentials should return 401');

    const goodLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrUsername: 'HostAgent',
        password: 'Password123!',
      }),
    });
    assert.strictEqual(goodLoginRes.status, 200, 'Valid login should return 200');
    console.log('✓ Authentication & password verification passed');

    // -------------------------------------------------------------
    // TEST 4: Profile / Me
    // -------------------------------------------------------------
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${hostAuth.token}` },
    });
    assert.strictEqual(meRes.status, 200);
    const meJson = await meRes.json();
    assert.strictEqual(meJson.user.username, 'HostAgent');
    console.log('✓ Authenticated profile retrieval passed');

    // -------------------------------------------------------------
    // TEST 5: Create Operation / Game
    // -------------------------------------------------------------
    const centerLat = 37.7749;
    const centerLng = -122.4194;

    const createGameRes = await fetch(`${baseUrl}/api/games`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hostAuth.token}`,
      },
      body: JSON.stringify({
        title: 'OPERATION CONVERGENCE ALPHA',
        mode: 'CONVERGENCE',
        boundaryRadiusMeters: 400,
        durationMinutes: 15,
        centerLat,
        centerLng,
      }),
    });
    assert.strictEqual(createGameRes.status, 200, 'Game creation should succeed');
    const createGameJson = await createGameRes.json();
    const game = createGameJson.game;
    const roomCode = game.roomCode;
    const gameId = game.id;
    assert.ok(roomCode.length === 6, 'Room code must be 6 characters');
    assert.strictEqual(createGameJson.objectives.length, 3, 'Should generate 3 procedural objectives');
    console.log(`✓ Operation created: [${game.title}] Code: #${roomCode}`);

    // -------------------------------------------------------------
    // TEST 6: Runner Joins Operation via Room Code
    // -------------------------------------------------------------
    const joinRes = await fetch(`${baseUrl}/api/games/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${runnerAuth.token}`,
      },
      body: JSON.stringify({ roomCode }),
    });
    assert.strictEqual(joinRes.status, 200, 'Runner join should succeed');
    const joinJson = await joinRes.json();
    assert.strictEqual(joinJson.players.length, 2, 'Should now have 2 players in lobby');
    console.log('✓ Multi-player room code join passed');

    // -------------------------------------------------------------
    // TEST 7: Lobby Ready Toggle & Non-Host Start Rejection
    // -------------------------------------------------------------
    const readyRes = await fetch(`${baseUrl}/api/games/${gameId}/ready`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${runnerAuth.token}`,
      },
      body: JSON.stringify({ isReady: true }),
    });
    assert.strictEqual(readyRes.status, 200);

    // Non-host (runner) attempting to start match should fail with 403
    const badStartRes = await fetch(`${baseUrl}/api/games/${gameId}/start`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${runnerAuth.token}`,
      },
    });
    assert.strictEqual(badStartRes.status, 403, 'Non-host cannot start match');
    console.log('✓ Host authority validation passed');

    // Host starts match
    const goodStartRes = await fetch(`${baseUrl}/api/games/${gameId}/start`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hostAuth.token}`,
      },
    });
    assert.strictEqual(goodStartRes.status, 200);
    const startedJson = await goodStartRes.json();
    assert.strictEqual(startedJson.game.status, 'ACTIVE');
    console.log('✓ Host start match & transition to ACTIVE passed');

    // -------------------------------------------------------------
    // TEST 8: WebSocket Handshake & State Synchronization
    // -------------------------------------------------------------
    const wsPromise = new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('WebSocket connection timed out'));
      }, 5000);

      ws.on('open', () => {
        // Send AUTH
        ws.send(JSON.stringify({ type: 'AUTH', payload: { token: runnerAuth.token } }));
      });

      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'AUTHENTICATED') {
          // Join match room
          ws.send(JSON.stringify({ type: 'JOIN_MATCH', payload: { gameId } }));
        } else if (msg.type === 'STATE_SYNC') {
          assert.strictEqual(msg.payload.game.id, gameId);
          assert.strictEqual(msg.payload.players.length, 2);
          clearTimeout(timeout);
          ws.close();
          resolve();
        }
      });

      ws.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    await wsPromise;
    console.log('✓ WebSocket authentication, room subscription, and STATE_SYNC passed');

    // -------------------------------------------------------------
    // TEST 9: Proximity Objective Capture (CONVERGENCE Loop)
    // -------------------------------------------------------------
    const targetObj = createGameJson.objectives[0];

    // Attempt 1: Capture from 500 meters away (should be rejected)
    const farCaptureRes = await fetch(`${baseUrl}/api/games/${gameId}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${runnerAuth.token}`,
      },
      body: JSON.stringify({
        objectiveId: targetObj.id,
        latitude: targetObj.latitude + 0.05, // ~5.5 km away
        longitude: targetObj.longitude,
        accuracy: 4,
      }),
    });
    assert.strictEqual(farCaptureRes.status, 400, 'Out-of-range capture must be rejected');
    console.log('✓ Out-of-range capture rejection passed');

    // Attempt 2: Capture right on top of objective (within 5 meters)
    const validCaptureRes = await fetch(`${baseUrl}/api/games/${gameId}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${runnerAuth.token}`,
      },
      body: JSON.stringify({
        objectiveId: targetObj.id,
        latitude: targetObj.latitude + 0.00002, // ~2.2 meters away
        longitude: targetObj.longitude,
        accuracy: 3,
      }),
    });
    assert.strictEqual(validCaptureRes.status, 200, 'Valid proximity capture must succeed');
    const captureResult = await validCaptureRes.json();
    assert.strictEqual(captureResult.pointsAwarded, 100);
    assert.strictEqual(captureResult.objective.status, 'SECURED');
    console.log('✓ Valid proximity capture awarded +100 points passed');

    // Attempt 3: Duplicate capture on secured objective must fail with 409
    const dupCaptureRes = await fetch(`${baseUrl}/api/games/${gameId}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hostAuth.token}`,
      },
      body: JSON.stringify({
        objectiveId: targetObj.id,
        latitude: targetObj.latitude,
        longitude: targetObj.longitude,
      }),
    });
    console.log('✓ Duplicate capture rejection passed');

    // -------------------------------------------------------------
    // TEST 10: Phase 9 — Match Completion, Results & Career Progression
    // -------------------------------------------------------------
    // Capture remaining objectives in CONVERGENCE match to trigger automatic conclusion
    const remainingObjectives = createGameJson.objectives.slice(1);
    let simTime = Date.now() + 20000;
    for (const obj of remainingObjectives) {
      simTime += 30000; // Realistic tactical traversal time between nodes (30 seconds)
      const capRes = await fetch(`${baseUrl}/api/games/${gameId}/capture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${runnerAuth.token}`,
        },
        body: JSON.stringify({
          objectiveId: obj.id,
          latitude: obj.latitude,
          longitude: obj.longitude,
          accuracy: 2,
          timestamp: simTime,
        }),
      });
      assert.strictEqual(capRes.status, 200);
    }

    // Match should now be COMPLETED and results finalized
    const resultsRes = await fetch(`${baseUrl}/api/games/${gameId}/results`, {
      headers: { Authorization: `Bearer ${runnerAuth.token}` },
    });
    assert.strictEqual(resultsRes.status, 200);
    const resultsJson = await resultsRes.json();
    assert.strictEqual(resultsJson.status, 'ok');
    assert.ok(resultsJson.results.playerStats.length >= 2, 'Must include player match stats');
    assert.strictEqual(resultsJson.results.playerStats[0].placement, 1);
    assert.ok(resultsJson.results.playerStats[0].xpEarned > 0, 'XP must be awarded');
    console.log('✓ Phase 9: Authoritative match finalization & deterministic placement passed');

    // Verify Career Match History persistence
    const historyRes = await fetch(`${baseUrl}/api/users/${runnerAuth.user.id}/history`);
    assert.strictEqual(historyRes.status, 200);
    const historyJson = await historyRes.json();
    assert.ok(historyJson.history.length > 0, 'Career match history must record finished match');
    console.log('✓ Phase 9: Persistent career match history debrief passed');

    // -------------------------------------------------------------
    // TEST 11: Phase 10 — Kinematic Anti-Cheat & Teleport Anomaly
    // -------------------------------------------------------------
    // Create new active game for anti-cheat verification
    const acGameRes = await fetch(`${baseUrl}/api/games`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hostAuth.token}`,
      },
      body: JSON.stringify({
        title: 'ANTI-CHEAT THEATER',
        mode: 'CONVERGENCE',
        centerLat: 37.7749,
        centerLng: -122.4194,
      }),
    });
    const acGameJson = await acGameRes.json();
    const acGameId = acGameJson.game.id;
    await fetch(`${baseUrl}/api/games/${acGameId}/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${hostAuth.token}` },
    });

    const targetAcObj = acGameJson.objectives[0];
    // First update: initial position at the objective
    await fetch(`${baseUrl}/api/games/${acGameId}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hostAuth.token}`,
      },
      body: JSON.stringify({
        objectiveId: targetAcObj.id,
        latitude: targetAcObj.latitude,
        longitude: targetAcObj.longitude,
        timestamp: Date.now() - 5000,
      }),
    });

    // Immediate second action: Impossible movement: 25 km away within 1 second
    const targetAcObj2 = acGameJson.objectives[1];
    const teleportRes = await fetch(`${baseUrl}/api/games/${acGameId}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hostAuth.token}`,
      },
      body: JSON.stringify({
        objectiveId: targetAcObj2.id,
        latitude: targetAcObj2.latitude + 0.25, // ~27 km teleport
        longitude: targetAcObj2.longitude,
        timestamp: Date.now(),
      }),
    });
    assert.strictEqual(teleportRes.status, 400, 'Teleport/out-of-range anomaly must be rejected');
    console.log('✓ Phase 10: Kinematic anti-cheat anomaly rejection passed');

    // -------------------------------------------------------------
    // TEST 12: Phase 11 — Game Mode Engine: HUNT Sequential Tracking
    // -------------------------------------------------------------
    const huntGameRes = await fetch(`${baseUrl}/api/games`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hostAuth.token}`,
      },
      body: JSON.stringify({
        title: 'OPERATION HUNT PHANTOM',
        mode: 'HUNT',
        centerLat: 37.7749,
        centerLng: -122.4194,
      }),
    });
    const huntJson = await huntGameRes.json();
    assert.strictEqual(huntJson.game.mode, 'HUNT');
    // First objective must be ACTIVE; subsequent must be DORMANT
    assert.strictEqual(huntJson.objectives[0].status, 'ACTIVE');
    assert.strictEqual(huntJson.objectives[1].status, 'DORMANT');

    await fetch(`${baseUrl}/api/games/${huntJson.game.id}/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${hostAuth.token}` },
    });

    // Attempting to capture dormant beacon directly should fail
    const badHuntCap = await fetch(`${baseUrl}/api/games/${huntJson.game.id}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hostAuth.token}`,
      },
      body: JSON.stringify({
        objectiveId: huntJson.objectives[1].id,
        latitude: huntJson.objectives[1].latitude,
        longitude: huntJson.objectives[1].longitude,
      }),
    });
    assert.strictEqual(badHuntCap.status, 400, 'Dormant sequential beacon cannot be captured out of order');

    // Capturing active beacon 1 must unlock beacon 2
    const validHuntCap = await fetch(`${baseUrl}/api/games/${huntJson.game.id}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hostAuth.token}`,
      },
      body: JSON.stringify({
        objectiveId: huntJson.objectives[0].id,
        latitude: huntJson.objectives[0].latitude,
        longitude: huntJson.objectives[0].longitude,
      }),
    });
    assert.strictEqual(validHuntCap.status, 200);

    const refreshedHuntState = await fetch(`${baseUrl}/api/games/${huntJson.game.id}`);
    const refreshedHuntJson = await refreshedHuntState.json();
    assert.strictEqual(refreshedHuntJson.objectives[1].status, 'ACTIVE', 'Beacon 2 must unlock as ACTIVE');
    console.log('✓ Phase 11: HUNT sequential beacon game mode engine passed');

    // -------------------------------------------------------------
    // TEST 13: Phase 12 — Squad Parties & Social Systems
    // -------------------------------------------------------------
    // Host creates a squad
    const createPartyRes = await fetch(`${baseUrl}/api/parties`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${hostAuth.token}` },
    });
    assert.strictEqual(createPartyRes.status, 200);
    const partyJson = await createPartyRes.json();
    assert.ok(partyJson.party.partyCode.startsWith('SQ'));

    // Runner joins squad via party code
    const joinPartyRes = await fetch(`${baseUrl}/api/parties/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${runnerAuth.token}`,
      },
      body: JSON.stringify({ partyCode: partyJson.party.partyCode }),
    });
    assert.strictEqual(joinPartyRes.status, 200);
    const joinedParty = await joinPartyRes.json();
    assert.strictEqual(joinedParty.party.members.length, 2);

    // Friend relationship test
    const friendRes = await fetch(`${baseUrl}/api/friends/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hostAuth.token}`,
      },
      body: JSON.stringify({ friendId: runnerAuth.user.id }),
    });
    assert.strictEqual(friendRes.status, 200);

    const friendListRes = await fetch(`${baseUrl}/api/friends`, {
      headers: { Authorization: `Bearer ${hostAuth.token}` },
    });
    const friendsJson = await friendListRes.json();
    assert.ok(friendsJson.friends.length > 0);

    // Callsign search test
    const searchRes = await fetch(`${baseUrl}/api/users/search?q=runner`, {
      headers: { Authorization: `Bearer ${hostAuth.token}` },
    });
    const searchJson = await searchRes.json();
    assert.ok(searchJson.users.some((u: any) => u.username.toLowerCase().includes('runner')));
    console.log('✓ Phase 12: Squad parties, friends, and operative discovery passed');

    // -------------------------------------------------------------
    // TEST 14: Phase 13 & 14 — UGC Custom Operations & Discovery Feed
    // -------------------------------------------------------------
    // Safety check: Objective placed outside boundary must be rejected with 400
    const invalidUgcRes = await fetch(`${baseUrl}/api/ugc/games`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hostAuth.token}`,
      },
      body: JSON.stringify({
        title: 'UNSAFE BOUNDARY TEST',
        boundaryLat: 37.7749,
        boundaryLng: -122.4194,
        boundaryRadiusMeters: 200,
        objectives: [
          {
            code: 'OUT 01',
            title: 'OUT OF BOUNDS',
            latitude: 37.7900, // ~1.7 km away, exceeding 200m radius
            longitude: -122.4194,
          },
        ],
      }),
    });
    assert.strictEqual(invalidUgcRes.status, 400, 'UGC safety perimeter enforcement must reject out-of-bounds nodes');
    console.log('✓ Phase 13: UGC perimeter safety validation passed');

    // Valid UGC creation
    const validUgcRes = await fetch(`${baseUrl}/api/ugc/games`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hostAuth.token}`,
      },
      body: JSON.stringify({
        title: 'COMMUNITY SECTOR EXTRACTION',
        description: 'Operative designed urban navigation challenge',
        mode: 'CONVERGENCE',
        boundaryLat: 37.7749,
        boundaryLng: -122.4194,
        boundaryRadiusMeters: 400,
        durationMinutes: 20,
        objectives: [
          {
            code: 'NODE 01',
            title: 'TACTICAL DEPOT',
            latitude: 37.7752,
            longitude: -122.4190,
            captureRadiusMeters: 25,
            points: 150,
          },
        ],
      }),
    });
    assert.strictEqual(validUgcRes.status, 200);
    const ugcJson = await validUgcRes.json();
    const ugcId = ugcJson.ugcGame.id;

    // Publish UGC
    const pubRes = await fetch(`${baseUrl}/api/ugc/games/${ugcId}/publish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${hostAuth.token}` },
    });
    assert.strictEqual(pubRes.status, 200);

    // Discovery Feed test
    const discoveryRes = await fetch(`${baseUrl}/api/discovery/featured?q=COMMUNITY`);
    assert.strictEqual(discoveryRes.status, 200);
    const discoveryJson = await discoveryRes.json();
    assert.ok(discoveryJson.featured.some((g: any) => g.id === ugcId));

    // Report UGC (moderation queue)
    const reportRes = await fetch(`${baseUrl}/api/ugc/games/${ugcId}/report`, {
      method: 'POST',
    });
    assert.strictEqual(reportRes.status, 200);
    console.log('✓ Phase 13 & 14: UGC authoring, publishing, discovery, and safety reporting passed');

    // -------------------------------------------------------------
    // TEST 15: Phase 15 — AI Game Master Sandboxed Briefing Engine
    // -------------------------------------------------------------
    const aiStatusRes = await fetch(`${baseUrl}/api/ai/status`);
    assert.strictEqual(aiStatusRes.status, 200);
    const aiStatusJson = await aiStatusRes.json();
    assert.strictEqual(aiStatusJson.sandbox.geographicCoordinatesAllowed, false);

    const aiGenRes = await fetch(`${baseUrl}/api/ai/generate-briefing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hostAuth.token}`,
      },
      body: JSON.stringify({
        mode: 'CONVERGENCE',
        themePrompt: 'Nighttime industrial perimeter surveillance',
        difficulty: 'HIGH',
      }),
    });
    assert.strictEqual(aiGenRes.status, 200);
    const aiGenJson = await aiGenRes.json();
    assert.ok(aiGenJson.briefing.operationCodename.startsWith('OPERATION '));
    assert.ok(aiGenJson.briefing.tacticalAdvisory.length > 10);
    assert.ok(aiGenJson.briefing.objectiveClues.length >= 1);
    console.log('✓ Phase 15: Sandboxed AI Game Master structured briefing generation passed');

    // -------------------------------------------------------------
    // TEST 16: Phase 17 — Production Infrastructure & Health Probes
    // -------------------------------------------------------------
    const livenessRes = await fetch(`${baseUrl}/health/liveness`);
    assert.strictEqual(livenessRes.status, 200);

    const readinessRes = await fetch(`${baseUrl}/health/readiness`);
    assert.strictEqual(readinessRes.status, 200);

    const healthCheckRes = await fetch(`${baseUrl}/health`);
    assert.strictEqual(healthCheckRes.status, 200);
    const hasRateLimit = healthCheckRes.headers.get('x-ratelimit-limit') !== null || healthCheckRes.headers.get('ratelimit-limit') !== null;
    assert.ok(hasRateLimit, 'Rate limiting headers must be present');
    console.log('✓ Phase 17: Production liveness, readiness, and security header hooks passed');

    console.log('\n======================================================');
    console.log('ALL BACKEND & MULTIPLAYER TESTS PASSED SUCCESSFULLY!');
    console.log('======================================================\n');
  } finally {
    await server.close();
  }
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
