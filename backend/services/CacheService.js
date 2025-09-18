const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

/**
 * CacheService - Comprehensive caching system for Portal Finder
 * Features:
 * - SQLite database for persistence
 * - Query normalization for better hit rates
 * - Synonym matching
 * - Cache expiration and cleanup
 * - Performance statistics
 * - Memory caching for recent queries
 */
class CacheService {
  constructor() {
    this.db = null;
    this.memoryCache = new Map(); // In-memory cache for recent queries
    this.memoryCacheSize = 100; // Keep last 100 queries in memory
    this.isInitialized = false;
    this.defaultCacheExpiration = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  }

  /**
   * Initialize the cache service and database
   */
  async initialize() {
    try {
      // Ensure database directory exists
      const dbDir = path.join(__dirname, '../database');
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // Initialize SQLite database
      const dbPath = path.join(dbDir, 'cache.db');
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('[CacheService] Failed to connect to database:', err);
          throw err;
        }
        console.log('[CacheService] Connected to SQLite database');
      });

      // Create tables from schema
      await this.createTables();
      
      // Start background cleanup process
      this.startCleanupProcess();
      
      this.isInitialized = true;
      console.log('[CacheService] Cache service initialized successfully');
      
    } catch (error) {
      console.error('[CacheService] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Create database tables from schema
   */
  async createTables() {
    return new Promise((resolve, reject) => {
      const schemaPath = path.join(__dirname, '../database/schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      
      this.db.exec(schema, (err) => {
        if (err) {
          console.error('[CacheService] Failed to create tables:', err);
          reject(err);
        } else {
          console.log('[CacheService] Database tables created successfully');
          resolve();
        }
      });
    });
  }

  /**
   * Normalize query for better cache hit rates
   */
  normalizeQuery(query) {
    return query
      .toLowerCase()
      .trim()
      // Remove extra spaces
      .replace(/\s+/g, ' ')
      // Remove common words that don't affect search
      .replace(/\b(the|a|an|and|or|of|for|in|on|at|to|by|with)\b/g, '')
      // Remove punctuation
      .replace(/[^\w\s]/g, '')
      // Remove extra spaces again
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Generate cache key from normalized query, state, and city
   */
  generateCacheKey(query, state, city) {
    const normalizedQuery = this.normalizeQuery(query);
    const cacheString = `${normalizedQuery}|${state.toLowerCase()}|${city.toLowerCase()}`;
    return crypto.createHash('md5').update(cacheString).digest('hex');
  }

  /**
   * Check for synonyms of the query
   */
  async findSynonymQuery(normalizedQuery) {
    return new Promise((resolve) => {
      const query = `
        SELECT base_query 
        FROM query_synonyms 
        WHERE synonym_query = ? AND is_active = 1
        ORDER BY confidence_score DESC
        LIMIT 1
      `;
      
      this.db.get(query, [normalizedQuery], (err, row) => {
        if (err) {
          console.error('[CacheService] Error finding synonyms:', err);
          resolve(null);
        } else {
          resolve(row ? row.base_query : null);
        }
      });
    });
  }

  /**
   * Get cached result for a query
   */
  async getCachedResult(query, state, city) {
    if (!this.isInitialized) {
      console.warn('[CacheService] Cache not initialized');
      return null;
    }

    const startTime = Date.now();
    
    try {
      const normalizedQuery = this.normalizeQuery(query);
      const cacheKey = this.generateCacheKey(query, state, city);
      
      // Check memory cache first
      if (this.memoryCache.has(cacheKey)) {
        const cached = this.memoryCache.get(cacheKey);
        if (cached.expires_at > Date.now()) {
          console.log(`[CacheService] Memory cache hit for query: "${query}"`);
          this.updateCacheStats(true, Date.now() - startTime);
          return cached.results;
        } else {
          // Remove expired entry from memory
          this.memoryCache.delete(cacheKey);
        }
      }

      // Check database cache
      let dbResult = await this.queryDatabase(cacheKey);
      
      // If no direct match, try synonym
      if (!dbResult) {
        const synonymQuery = await this.findSynonymQuery(normalizedQuery);
        if (synonymQuery) {
          const synonymKey = this.generateCacheKey(synonymQuery, state, city);
          dbResult = await this.queryDatabase(synonymKey);
          if (dbResult) {
            console.log(`[CacheService] Synonym cache hit: "${query}" -> "${synonymQuery}"`);
          }
        }
      }

      if (dbResult) {
        // Update hit count and last accessed
        await this.updateHitCount(dbResult.id);
        
        // Add to memory cache
        this.addToMemoryCache(cacheKey, {
          results: JSON.parse(dbResult.search_results),
          expires_at: new Date(dbResult.expires_at).getTime()
        });

        this.updateCacheStats(true, Date.now() - startTime);
        console.log(`[CacheService] Database cache hit for query: "${query}"`);
        return JSON.parse(dbResult.search_results);
      }

      this.updateCacheStats(false, Date.now() - startTime);
      console.log(`[CacheService] Cache miss for query: "${query}"`);
      return null;

    } catch (error) {
      console.error('[CacheService] Error getting cached result:', error);
      this.updateCacheStats(false, Date.now() - startTime);
      return null;
    }
  }

  /**
   * Query database for cached result
   */
  async queryDatabase(cacheKey) {
    return new Promise((resolve) => {
      const query = `
        SELECT * FROM search_cache 
        WHERE query_hash = ? AND expires_at > datetime('now')
        LIMIT 1
      `;
      
      this.db.get(query, [cacheKey], (err, row) => {
        if (err) {
          console.error('[CacheService] Database query error:', err);
          resolve(null);
        } else {
          resolve(row);
        }
      });
    });
  }

  /**
   * Store search result in cache
   */
  async storeResult(query, state, city, results) {
    if (!this.isInitialized) {
      console.warn('[CacheService] Cache not initialized');
      return;
    }

    try {
      const normalizedQuery = this.normalizeQuery(query);
      const cacheKey = this.generateCacheKey(query, state, city);
      const expiresAt = new Date(Date.now() + this.defaultCacheExpiration);
      const resultsJson = JSON.stringify(results);

      // Store in database
      await this.insertCacheEntry(cacheKey, query, normalizedQuery, state, city, resultsJson, expiresAt);
      
      // Store in memory cache
      this.addToMemoryCache(cacheKey, {
        results: results,
        expires_at: expiresAt.getTime()
      });

      // Update popular queries
      await this.updatePopularQuery(normalizedQuery, state, results.services ? results.services.length : 0);
      
      console.log(`[CacheService] Cached result for query: "${query}"`);

    } catch (error) {
      console.error('[CacheService] Error storing result:', error);
    }
  }

  /**
   * Insert cache entry into database
   */
  async insertCacheEntry(cacheKey, originalQuery, normalizedQuery, state, city, resultsJson, expiresAt) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT OR REPLACE INTO search_cache 
        (query_hash, original_query, normalized_query, state, city, search_results, expires_at, created_at, updated_at, last_accessed)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'))
      `;
      
      this.db.run(query, [cacheKey, originalQuery, normalizedQuery, state, city, resultsJson, expiresAt.toISOString()], function(err) {
        if (err) {
          console.error('[CacheService] Error inserting cache entry:', err);
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  /**
   * Add entry to memory cache with LRU eviction
   */
  addToMemoryCache(key, data) {
    // If cache is full, remove oldest entry
    if (this.memoryCache.size >= this.memoryCacheSize) {
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
    }
    
    this.memoryCache.set(key, data);
  }

  /**
   * Update hit count for cache entry
   */
  async updateHitCount(cacheId) {
    return new Promise((resolve) => {
      const query = `
        UPDATE search_cache 
        SET hit_count = hit_count + 1, last_accessed = datetime('now')
        WHERE id = ?
      `;
      
      this.db.run(query, [cacheId], (err) => {
        if (err) {
          console.error('[CacheService] Error updating hit count:', err);
        }
        resolve();
      });
    });
  }

  /**
   * Update popular queries tracking
   */
  async updatePopularQuery(normalizedQuery, state, resultCount) {
    return new Promise((resolve) => {
      const checkQuery = `SELECT id, states_searched FROM popular_queries WHERE normalized_query = ?`;
      
      this.db.get(checkQuery, [normalizedQuery], (err, row) => {
        if (err) {
          console.error('[CacheService] Error checking popular query:', err);
          resolve();
          return;
        }

        if (row) {
          // Update existing entry
          let states = [];
          try {
            states = row.states_searched ? JSON.parse(row.states_searched) : [];
          } catch (e) {
            states = [];
          }
          
          if (!states.includes(state)) {
            states.push(state);
          }

          const updateQuery = `
            UPDATE popular_queries 
            SET search_count = search_count + 1, 
                last_searched = datetime('now'),
                avg_results = (avg_results + ?) / 2,
                states_searched = ?
            WHERE id = ?
          `;
          
          this.db.run(updateQuery, [resultCount, JSON.stringify(states), row.id], (err) => {
            if (err) {
              console.error('[CacheService] Error updating popular query:', err);
            }
            resolve();
          });
        } else {
          // Insert new entry
          const insertQuery = `
            INSERT INTO popular_queries 
            (normalized_query, search_count, avg_results, states_searched, last_searched)
            VALUES (?, 1, ?, ?, datetime('now'))
          `;
          
          this.db.run(insertQuery, [normalizedQuery, resultCount, JSON.stringify([state])], (err) => {
            if (err) {
              console.error('[CacheService] Error inserting popular query:', err);
            }
            resolve();
          });
        }
      });
    });
  }

  /**
   * Update cache statistics
   */
  async updateCacheStats(wasHit, responseTimeMs) {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    return new Promise((resolve) => {
      const checkQuery = `SELECT * FROM cache_stats WHERE date = ?`;
      
      this.db.get(checkQuery, [today], (err, row) => {
        if (err) {
          console.error('[CacheService] Error checking cache stats:', err);
          resolve();
          return;
        }

        if (row) {
          // Update existing stats
          const newTotalRequests = row.total_requests + 1;
          const newCacheHits = row.cache_hits + (wasHit ? 1 : 0);
          const newCacheMisses = row.cache_misses + (wasHit ? 0 : 1);
          const newApiCallsSaved = row.api_calls_saved + (wasHit ? 1 : 0);
          const newAvgResponseTime = ((row.avg_response_time_ms * row.total_requests) + responseTimeMs) / newTotalRequests;

          const updateQuery = `
            UPDATE cache_stats 
            SET total_requests = ?, cache_hits = ?, cache_misses = ?, 
                api_calls_saved = ?, avg_response_time_ms = ?
            WHERE date = ?
          `;
          
          this.db.run(updateQuery, [newTotalRequests, newCacheHits, newCacheMisses, newApiCallsSaved, newAvgResponseTime, today], (err) => {
            if (err) {
              console.error('[CacheService] Error updating cache stats:', err);
            }
            resolve();
          });
        } else {
          // Insert new stats entry
          const insertQuery = `
            INSERT INTO cache_stats 
            (date, total_requests, cache_hits, cache_misses, api_calls_saved, avg_response_time_ms)
            VALUES (?, 1, ?, ?, ?, ?)
          `;
          
          this.db.run(insertQuery, [today, wasHit ? 1 : 0, wasHit ? 0 : 1, wasHit ? 1 : 0, responseTimeMs], (err) => {
            if (err) {
              console.error('[CacheService] Error inserting cache stats:', err);
            }
            resolve();
          });
        }
      });
    });
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(days = 7) {
    return new Promise((resolve) => {
      const query = `
        SELECT * FROM cache_stats 
        WHERE date >= date('now', '-${days} days')
        ORDER BY date DESC
      `;
      
      this.db.all(query, [], (err, rows) => {
        if (err) {
          console.error('[CacheService] Error getting cache stats:', err);
          resolve({ error: 'Failed to get cache statistics' });
        } else {
          // Calculate summary statistics
          const totalRequests = rows.reduce((sum, row) => sum + row.total_requests, 0);
          const totalHits = rows.reduce((sum, row) => sum + row.cache_hits, 0);
          const totalMisses = rows.reduce((sum, row) => sum + row.cache_misses, 0);
          const totalApiCallsSaved = rows.reduce((sum, row) => sum + row.api_calls_saved, 0);
          const avgResponseTime = rows.length > 0 ? rows.reduce((sum, row) => sum + row.avg_response_time_ms, 0) / rows.length : 0;

          resolve({
            summary: {
              total_requests: totalRequests,
              cache_hits: totalHits,
              cache_misses: totalMisses,
              hit_rate: totalRequests > 0 ? ((totalHits / totalRequests) * 100).toFixed(2) : 0,
              api_calls_saved: totalApiCallsSaved,
              avg_response_time_ms: avgResponseTime.toFixed(2),
              memory_cache_size: this.memoryCache.size
            },
            daily_stats: rows
          });
        }
      });
    });
  }

  /**
   * Get popular queries
   */
  async getPopularQueries(limit = 20) {
    return new Promise((resolve) => {
      const query = `
        SELECT normalized_query, search_count, avg_results, states_searched, last_searched
        FROM popular_queries 
        ORDER BY search_count DESC, last_searched DESC
        LIMIT ?
      `;
      
      this.db.all(query, [limit], (err, rows) => {
        if (err) {
          console.error('[CacheService] Error getting popular queries:', err);
          resolve({ error: 'Failed to get popular queries' });
        } else {
          resolve(rows.map(row => ({
            ...row,
            states_searched: JSON.parse(row.states_searched || '[]')
          })));
        }
      });
    });
  }

  /**
   * Clear expired cache entries
   */
  async clearExpiredEntries() {
    return new Promise((resolve) => {
      const query = `DELETE FROM search_cache WHERE expires_at < datetime('now')`;
      
      this.db.run(query, [], function(err) {
        if (err) {
          console.error('[CacheService] Error clearing expired entries:', err);
          resolve(0);
        } else {
          console.log(`[CacheService] Cleared ${this.changes} expired cache entries`);
          resolve(this.changes);
        }
      });
    });
  }

  /**
   * Clear all cache entries
   */
  async clearAllCache() {
    return new Promise((resolve) => {
      this.db.run(`DELETE FROM search_cache`, [], function(err) {
        if (err) {
          console.error('[CacheService] Error clearing all cache:', err);
          resolve(false);
        } else {
          console.log(`[CacheService] Cleared all cache entries (${this.changes} entries)`);
          resolve(true);
        }
      });
    });
  }

  /**
   * Start background cleanup process
   */
  startCleanupProcess() {
    // Clean expired entries every hour
    setInterval(async () => {
      await this.clearExpiredEntries();
    }, 60 * 60 * 1000); // 1 hour

    // Clean memory cache of expired entries every 10 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [key, data] of this.memoryCache.entries()) {
        if (data.expires_at <= now) {
          this.memoryCache.delete(key);
        }
      }
    }, 10 * 60 * 1000); // 10 minutes

    console.log('[CacheService] Background cleanup process started');
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('[CacheService] Error closing database:', err);
        } else {
          console.log('[CacheService] Database connection closed');
        }
      });
    }
    this.memoryCache.clear();
  }
}

// Create singleton instance
const cacheService = new CacheService();

module.exports = cacheService;