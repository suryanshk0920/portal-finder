-- Portal Finder Cache Database Schema
-- SQLite database for caching search results and improving performance

-- Create search_cache table to store cached search results
CREATE TABLE IF NOT EXISTS search_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query_hash TEXT NOT NULL UNIQUE,  -- MD5 hash of normalized query
    original_query TEXT NOT NULL,     -- Original user query for debugging
    normalized_query TEXT NOT NULL,   -- Normalized query for matching
    state TEXT NOT NULL,              -- State parameter
    city TEXT NOT NULL,               -- City parameter
    search_results TEXT NOT NULL,     -- JSON string of search results
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,     -- Cache expiration time
    hit_count INTEGER DEFAULT 1,      -- Number of times this cache was used
    last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create index on query_hash for fast lookups
CREATE INDEX IF NOT EXISTS idx_query_hash ON search_cache(query_hash);

-- Create index on expires_at for cleanup operations
CREATE INDEX IF NOT EXISTS idx_expires_at ON search_cache(expires_at);

-- Create index on state and city for location-based queries
CREATE INDEX IF NOT EXISTS idx_location ON search_cache(state, city);

-- Create index on created_at for analytics
CREATE INDEX IF NOT EXISTS idx_created_at ON search_cache(created_at);

-- Create cache_stats table to track cache performance
CREATE TABLE IF NOT EXISTS cache_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL UNIQUE,
    total_requests INTEGER DEFAULT 0,
    cache_hits INTEGER DEFAULT 0,
    cache_misses INTEGER DEFAULT 0,
    api_calls_saved INTEGER DEFAULT 0,
    avg_response_time_ms REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create index on date for stats queries
CREATE INDEX IF NOT EXISTS idx_stats_date ON cache_stats(date);

-- Create popular_queries table to track frequently searched terms
CREATE TABLE IF NOT EXISTS popular_queries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    normalized_query TEXT NOT NULL UNIQUE,
    search_count INTEGER DEFAULT 1,
    last_searched DATETIME DEFAULT CURRENT_TIMESTAMP,
    avg_results INTEGER DEFAULT 0,
    states_searched TEXT DEFAULT '',  -- JSON array of states where this was searched
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create index on search_count for popular query analysis
CREATE INDEX IF NOT EXISTS idx_search_count ON popular_queries(search_count DESC);

-- Create index on last_searched for recent activity
CREATE INDEX IF NOT EXISTS idx_last_searched ON popular_queries(last_searched DESC);

-- Create query_synonyms table for better cache hit rates
CREATE TABLE IF NOT EXISTS query_synonyms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    base_query TEXT NOT NULL,
    synonym_query TEXT NOT NULL,
    confidence_score REAL DEFAULT 1.0,  -- How confident we are about this synonym
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT 1
);

-- Create index on synonym lookup
CREATE INDEX IF NOT EXISTS idx_synonym_query ON query_synonyms(synonym_query);

-- Create index on base_query
CREATE INDEX IF NOT EXISTS idx_base_query ON query_synonyms(base_query);

-- Insert some common query synonyms to improve cache hit rates
INSERT OR IGNORE INTO query_synonyms (base_query, synonym_query, confidence_score) VALUES
-- Passport related synonyms
('passport application', 'passport apply', 0.95),
('passport application', 'apply for passport', 0.95),
('passport application', 'new passport', 0.90),
('passport renewal', 'renew passport', 0.95),
('passport renewal', 'passport reissue', 0.85),

-- Aadhaar related synonyms
('aadhaar card', 'aadhar card', 0.95),
('aadhaar enrollment', 'aadhaar registration', 0.90),
('aadhaar update', 'aadhaar correction', 0.85),

-- PAN card synonyms
('pan card', 'pan application', 0.90),
('pan card', 'permanent account number', 0.85),

-- Voter ID synonyms
('voter id', 'voter card', 0.95),
('voter id', 'election card', 0.85),
('voter registration', 'voter enrollment', 0.90),

-- Driving license synonyms
('driving license', 'driving licence', 0.95),
('driving license', 'dl', 0.85),
('dl renewal', 'driving license renewal', 0.95),
('learner license', 'learner licence', 0.95),

-- Ration card synonyms
('ration card', 'food card', 0.85),
('ration card', 'pds card', 0.80),

-- Property related synonyms
('property registration', 'property registry', 0.90),
('property registration', 'land registration', 0.85),

-- Income certificate synonyms
('income certificate', 'salary certificate', 0.80),
('income certificate', 'income proof', 0.85),

-- Birth certificate synonyms
('birth certificate', 'birth proof', 0.85),
('birth certificate', 'birth record', 0.80);

-- Create trigger to update updated_at timestamp on search_cache updates
CREATE TRIGGER IF NOT EXISTS update_search_cache_timestamp 
    AFTER UPDATE ON search_cache
    FOR EACH ROW
BEGIN
    UPDATE search_cache SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Create trigger to update updated_at timestamp on cache_stats updates
CREATE TRIGGER IF NOT EXISTS update_cache_stats_timestamp 
    AFTER UPDATE ON cache_stats
    FOR EACH ROW
BEGIN
    UPDATE cache_stats SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Create trigger to update updated_at timestamp on popular_queries updates
CREATE TRIGGER IF NOT EXISTS update_popular_queries_timestamp 
    AFTER UPDATE ON popular_queries
    FOR EACH ROW
BEGIN
    UPDATE popular_queries SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;