-- ============================================================================
-- RUINS Migration 001: Initial Geospatial Schema
-- PostgreSQL 15+ with PostGIS extension
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(32) UNIQUE NOT NULL,
    display_name VARCHAR(64) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    xp BIGINT DEFAULT 0,
    level INT DEFAULT 1,
    games_played INT DEFAULT 0,
    wins INT DEFAULT 0,
    total_score BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Games / Matches Table
CREATE TABLE IF NOT EXISTS games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    host_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    room_code VARCHAR(6) UNIQUE NOT NULL,
    title VARCHAR(64) NOT NULL,
    mode VARCHAR(32) NOT NULL DEFAULT 'CONVERGENCE',
    status VARCHAR(16) NOT NULL DEFAULT 'LOBBY', -- 'LOBBY', 'ACTIVE', 'COMPLETED', 'ABORTED'
    boundary_lat DOUBLE PRECISION NOT NULL,
    boundary_lng DOUBLE PRECISION NOT NULL,
    boundary_radius_meters INT NOT NULL CHECK (boundary_radius_meters BETWEEN 50 AND 5000),
    duration_seconds INT NOT NULL DEFAULT 900,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Game Players / Match Membership
CREATE TABLE IF NOT EXISTS game_players (
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_index INT NOT NULL DEFAULT 0, -- 0 = Alpha, 1 = Omega
    is_host BOOLEAN NOT NULL DEFAULT FALSE,
    is_ready BOOLEAN NOT NULL DEFAULT FALSE,
    score INT DEFAULT 0,
    objectives_captured INT DEFAULT 0,
    distance_traveled_meters DOUBLE PRECISION DEFAULT 0.0,
    last_known_lat DOUBLE PRECISION,
    last_known_lng DOUBLE PRECISION,
    last_telemetry_at TIMESTAMPTZ,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (game_id, user_id)
);

-- 4. Objectives Table
CREATE TABLE IF NOT EXISTS objectives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    code VARCHAR(16) NOT NULL, -- e.g. 'OBJ 01'
    title VARCHAR(64) NOT NULL, -- e.g. 'THE SIGNAL'
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    capture_radius_meters INT NOT NULL DEFAULT 20,
    points INT NOT NULL DEFAULT 100,
    status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE', -- 'DORMANT', 'ACTIVE', 'CAPTURING', 'SECURED'
    captured_by_team INT,
    captured_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    captured_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Game Sessions / Socket Heartbeats
CREATE TABLE IF NOT EXISTS game_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    socket_id VARCHAR(128),
    is_online BOOLEAN DEFAULT TRUE,
    connected_at TIMESTAMPTZ DEFAULT NOW(),
    last_heartbeat_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Game Events Log (Server Authoritative Audit Trail)
CREATE TABLE IF NOT EXISTS game_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(64) NOT NULL, -- e.g. 'OBJECTIVE_CAPTURED', 'PLAYER_JOINED'
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for high performance lookup
CREATE INDEX IF NOT EXISTS idx_games_room_code ON games(room_code);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_game_players_user ON game_players(user_id);
CREATE INDEX IF NOT EXISTS idx_objectives_game ON objectives(game_id);
CREATE INDEX IF NOT EXISTS idx_game_events_game ON game_events(game_id);
