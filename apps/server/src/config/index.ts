import 'dotenv/config';

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

const port = Number(process.env.PORT) || 3001;
const host = process.env.HOST || '0.0.0.0';
const databaseUrl = process.env.DATABASE_URL;
const jwtSecret = process.env.JWT_SECRET || 'ruins_dev_secret_only_for_local_testing_min32chars';
const corsOrigin = process.env.CORS_ORIGIN || '*';
const wsPingIntervalMs = Number(process.env.WS_PING_INTERVAL_MS) || 25000;

// Production Security Validation: Fail clearly at startup if invalid configuration
if (isProduction) {
  if (!databaseUrl) {
    throw new Error(
      '[FATAL CONFIG ERROR] DATABASE_URL environment variable is required in production mode. ' +
        'Production must never silently downgrade to in-memory infrastructure.'
    );
  }
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error(
      '[FATAL CONFIG ERROR] High-entropy JWT_SECRET (minimum 32 characters) must be explicitly configured in production.'
    );
  }
}

export const config = {
  port,
  host,
  nodeEnv,
  isProduction,
  databaseUrl: databaseUrl || 'postgresql://postgres:postgres@localhost:5432/ruins',
  hasDatabaseUrl: Boolean(databaseUrl),
  jwtSecret,
  corsOrigin,
  wsPingIntervalMs,
};
