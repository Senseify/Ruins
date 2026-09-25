import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT) || 3001,
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ruins',
  jwtSecret: process.env.JWT_SECRET || 'ruins_classified_telemetry_jwt_secret_dev_32char',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  wsPingIntervalMs: Number(process.env.WS_PING_INTERVAL_MS) || 30000,
};
