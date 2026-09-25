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
    assert.strictEqual(dupCaptureRes.status, 409, 'Duplicate capture must return 409 conflict');
    console.log('✓ Duplicate capture rejection passed');

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
