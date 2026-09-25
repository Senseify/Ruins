-- ============================================================================
-- RUINS Complete Production Migration Schema
-- PostgreSQL 15+ with PostGIS Extension
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

-- 2. Games / Operations Table
CREATE TABLE IF NOT EXISTS games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    host_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    room_code VARCHAR(6) UNIQUE NOT NULL,
    title VARCHAR(64) NOT NULL,
    mode VARCHAR(32) NOT NULL DEFAULT 'CONVERGENCE', -- 'CONVERGENCE', 'HUNT', 'EXTRACTION', 'TERRITORY', 'RELAY'
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

-- 5. Match Results (Phase 9: Persistent Debriefs)
CREATE TABLE IF NOT EXISTS match_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID UNIQUE NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    room_code VARCHAR(6) NOT NULL,
    title VARCHAR(64) NOT NULL,
    mode VARCHAR(32) NOT NULL,
    outcome VARCHAR(16) NOT NULL, -- 'VICTORY', 'DEFEAT', 'DRAW'
    winning_team_index INT,
    score_team_alpha INT DEFAULT 0,
    score_team_omega INT DEFAULT 0,
    duration_seconds INT NOT NULL,
    completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Player Match Statistics & Placement (Phase 9)
CREATE TABLE IF NOT EXISTS player_match_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_result_id UUID NOT NULL REFERENCES match_results(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    username VARCHAR(32) NOT NULL,
    team_index INT NOT NULL,
    placement INT NOT NULL,
    score INT NOT NULL,
    objectives_captured INT NOT NULL,
    distance_traveled_meters DOUBLE PRECISION NOT NULL,
    xp_earned INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. User Generated Content (Phase 13: UGC Custom Games)
CREATE TABLE IF NOT EXISTS ugc_games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(64) NOT NULL,
    description TEXT NOT NULL,
    mode VARCHAR(32) NOT NULL,
    boundary_lat DOUBLE PRECISION NOT NULL,
    boundary_lng DOUBLE PRECISION NOT NULL,
    boundary_radius_meters INT NOT NULL,
    duration_minutes INT NOT NULL,
    max_players INT NOT NULL DEFAULT 8,
    objectives JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(16) NOT NULL DEFAULT 'DRAFT', -- 'DRAFT', 'PUBLISHED', 'ARCHIVED', 'REPORTED'
    report_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Parties & Social Squads (Phase 12)
CREATE TABLE IF NOT EXISTS parties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    party_code VARCHAR(6) UNIQUE NOT NULL,
    leader_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    current_game_id UUID REFERENCES games(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS party_members (
    party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (party_id, user_id)
);

-- 9. Friends & Relationships (Phase 12)
CREATE TABLE IF NOT EXISTS friends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(16) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'ACCEPTED', 'BLOCKED'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, friend_id)
);

-- 10. Anti-Cheat & Telemetry Audit Trail (Phase 10)
CREATE TABLE IF NOT EXISTS anti_cheat_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    incident_type VARCHAR(32) NOT NULL, -- 'SPEED_ANOMALY', 'OUT_OF_BOUNDS', 'SPOOF_FLAG'
    calculated_value DOUBLE PRECISION,
    threshold_value DOUBLE PRECISION,
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Game Audit Events Trail
CREATE TABLE IF NOT EXISTS game_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(64) NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for spatial, search, and lookups
CREATE INDEX IF NOT EXISTS idx_games_room_code ON games(room_code);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_ugc_status ON ugc_games(status);
CREATE INDEX IF NOT EXISTS idx_match_results_game ON match_results(game_id);
CREATE INDEX IF NOT EXISTS idx_player_match_user ON player_match_results(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_user ON friends(user_id);
CREATE INDEX IF NOT EXISTS idx_game_events_game ON game_events(game_id);

