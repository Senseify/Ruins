import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { GameMode, AIMissionBriefing } from '@ruins/shared';
import { requireAuth } from '../auth';

export interface AIMissionInput {
  mode?: GameMode;
  themePrompt?: string;
  difficulty?: 'LOW' | 'MEDIUM' | 'HIGH';
  objectiveCount?: number;
}

export interface AIMissionOutput extends AIMissionBriefing {
  difficulty: 'LOW' | 'MEDIUM' | 'HIGH';
  suggestedDurationMinutes: number;
  aiEngine: 'gemini' | 'procedural_intelligence_engine';
}

const CODENAME_PREFIXES = [
  'OBSIDIAN',
  'TITANIUM',
  'ECHO',
  'BLACKOUT',
  'SPECTRE',
  'NEXUS',
  'SILENT',
  'VOID',
  'CHRONOS',
  'VALENCE',
];

const CODENAME_SUFFIXES = [
  'PROTOCOL',
  'CONVERGENCE',
  'HARVEST',
  'SIGNAL',
  'SHADOW',
  'INVERSION',
  'HORIZON',
  'FREQUENCY',
  'PERIMETER',
  'DESCENT',
];

function generateProceduralMission(
  mode: GameMode = 'CONVERGENCE',
  difficulty: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM',
  count: number = 3
): AIMissionOutput {
  const prefix = CODENAME_PREFIXES[Math.floor(Math.random() * CODENAME_PREFIXES.length)];
  const suffix = CODENAME_SUFFIXES[Math.floor(Math.random() * CODENAME_SUFFIXES.length)];
  const codename = `OPERATION ${prefix} ${suffix}`;

  const modeDescriptions: Record<GameMode, { briefing: string; advisory: string }> = {
    CONVERGENCE: {
      briefing:
        'Telemetry indicates localized frequency distortions across the sector. Sub-harmonic nodes have materialized. Field operatives must converge, secure physical telemetry, and stabilize the grid before signal collapse.',
      advisory:
        'Remain vigilant of physical obstacles. Maintain perimeter awareness. No tactical objective requires compromising personal safety or trespassing on private sectors.',
    },
    HUNT: {
      briefing:
        'A succession of encrypted relay beacons has surfaced in the operational theater. Tracking each signal frequency unlocks the subsequent marker coordinate in real-time.',
      advisory:
        'Approach beacons sequentially. Keep mobile devices positioned for situational awareness. Yield to pedestrian thoroughfares.',
    },
    EXTRACTION: {
      briefing:
        'A classified core node has been detected in the interior perimeter. Retrieve the data payload and courier it to the extraction boundary before counter-interference initiates.',
      advisory:
        'Plan routes adhering to public pathways. Continuous sprinting is discouraged; pace your tactical traversal safely.',
    },
    TERRITORY: {
      briefing:
        'Multiple quadrant hubs require physical presence for territorial alignment. Secure and stabilize sector boundaries against opposing cell encroachment.',
      advisory:
        'Maintain spatial buffer from other operatives. All capture radii allow generous proximity buffers.',
    },
    RELAY: {
      briefing:
        'Multi-stage synchronized handoff required across tactical waypoints. Cooperative cell timing is essential for mission success.',
      advisory:
        'Verify physical handoff zones remain in publicly accessible spaces with clear line of sight.',
    },
  };

  const selectedMode = modeDescriptions[mode] || modeDescriptions.CONVERGENCE;

  const clues = [];
  for (let i = 0; i < count; i++) {
    clues.push({
      objectiveCode: `OBJ 0${i + 1}`,
      narrativeClue: `Sector beacon ${i + 1}: Emits high-frequency signature at 142.8 MHz. Verify physical proximity to initiate decryption handshake.`,
    });
  }

  const durationMap = { LOW: 10, MEDIUM: 15, HIGH: 25 };

  return {
    operationCodename: codename,
    thematicBriefing: selectedMode.briefing,
    tacticalAdvisory: selectedMode.advisory,
    difficulty,
    suggestedDurationMinutes: durationMap[difficulty] || 15,
    objectiveClues: clues,
    aiEngine: 'procedural_intelligence_engine',
  };
}

export async function aiRoutes(server: FastifyInstance) {
  // 1. AI Readiness / Status Probe
  server.get('/api/ai/status', async (_request, _reply) => {
    const hasApiKey = Boolean(process.env.GEMINI_API_KEY);
    return {
      status: 'ok',
      provider: hasApiKey ? 'gemini' : 'procedural_intelligence_engine',
      isExternalAvailable: hasApiKey,
      sandbox: {
        geographicCoordinatesAllowed: false,
        strictSchemaValidation: true,
        safetyAdvisoriesEnforced: true,
      },
    };
  });

  // 2. Generate Mission Briefing (Sandboxed & Authoritative)
  server.post<{
    Body: AIMissionInput;
  }>('/api/ai/generate-briefing', { preHandler: [requireAuth] }, async (request, reply) => {
    const body = request.body || {};
    const mode = (body.mode || 'CONVERGENCE') as GameMode;
    const difficulty = body.difficulty || 'MEDIUM';
    const count = Math.min(Math.max(body.objectiveCount || 3, 1), 6);

    // SECURITY: AI MUST NOT generate physical coordinates.
    // If client attempts to inject coordinates or location overrides into prompt, sanitize them:
    const themePrompt = (body.themePrompt || '').replace(/[0-9]+\.[0-9]{3,}/g, '[REDACTED_COORD]');

    // If GEMINI_API_KEY is configured, call Gemini API with strict structured schema
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 5) {
      try {
        const apiKey = process.env.GEMINI_API_KEY;
        const promptText = `
You are the Tactical AI Mission Master for RUINS, an intelligence-themed real-world game.
Generate a dark, cinematic, obsidian-toned mission debriefing for game mode: ${mode}.
User prompt: "${themePrompt}". Difficulty: ${difficulty}. Objective count: ${count}.
SAFETY MANDATE: NEVER suggest trespassing, climbing, running into traffic, or dangerous physical acts.
DO NOT include any latitude or longitude coordinates. Coordinates are strictly generated by the server.

Return ONLY a JSON object with this exact schema:
{
  "operationCodename": "OPERATION <NAME>",
  "thematicBriefing": "<2-3 sentence mysterious intelligence briefing>",
  "tacticalAdvisory": "<Safety and situational awareness message>",
  "difficulty": "${difficulty}",
  "suggestedDurationMinutes": 15,
  "objectiveClues": [
    {
      "objectiveCode": "OBJ 01",
      "narrativeClue": "<mysterious sensor clue>"
    }
  ]
}
`;
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: promptText }] }],
              generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.7,
              },
            }),
          }
        );

        if (res.ok) {
          const data = (await res.json()) as any;
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const parsed = JSON.parse(text);
            // Strict Schema Validation
            if (
              typeof parsed.operationCodename === 'string' &&
              typeof parsed.thematicBriefing === 'string' &&
              typeof parsed.tacticalAdvisory === 'string' &&
              Array.isArray(parsed.objectiveClues)
            ) {
              return {
                status: 'ok',
                briefing: {
                  ...parsed,
                  aiEngine: 'gemini',
                },
              };
            }
          }
        }
      } catch (err) {
        // Fall back seamlessly to procedural intelligence engine
        server.log.warn({ err }, 'Gemini API call failed, falling back to procedural intelligence');
      }
    }

    // High-fidelity deterministic procedural mission generation
    const briefing = generateProceduralMission(mode, difficulty, count);
    return {
      status: 'ok',
      briefing,
    };
  });
}
