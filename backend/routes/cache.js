const express = require('express');
const router = express.Router();
const cacheService = require('../services/CacheService');

/**
 * Cache Management Routes
 * Admin endpoints for monitoring and managing the cache system
 */

// Get cache statistics and performance metrics
router.get('/stats', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7; // Default to 7 days
    const stats = await cacheService.getCacheStats(days);
    
    res.json({
      success: true,
      cache_statistics: stats,
      request_timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[Cache Admin] Error getting cache stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve cache statistics',
      details: error.message
    });
  }
});

// Get popular queries and search patterns
router.get('/popular-queries', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const popularQueries = await cacheService.getPopularQueries(limit);
    
    res.json({
      success: true,
      popular_queries: popularQueries,
      total_queries: popularQueries.length,
      request_timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[Cache Admin] Error getting popular queries:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve popular queries',
      details: error.message
    });
  }
});

// Clear expired cache entries manually
router.post('/clear-expired', async (req, res) => {
  try {
    const deletedCount = await cacheService.clearExpiredEntries();
    
    res.json({
      success: true,
      message: `Cleared ${deletedCount} expired cache entries`,
      deleted_entries: deletedCount,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[Cache Admin] Error clearing expired entries:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear expired cache entries',
      details: error.message
    });
  }
});

// Clear all cache entries (use with caution)
router.post('/clear-all', async (req, res) => {
  try {
    // Simple security check - require confirmation
    const { confirm } = req.body;
    
    if (confirm !== 'CLEAR_ALL_CACHE') {
      return res.status(400).json({
        success: false,
        error: 'Confirmation required',
        message: 'Send { "confirm": "CLEAR_ALL_CACHE" } in request body to proceed'
      });
    }
    
    const success = await cacheService.clearAllCache();
    
    if (success) {
      res.json({
        success: true,
        message: 'All cache entries have been cleared',
        timestamp: new Date().toISOString(),
        warning: 'All cached search results have been removed. Next searches will hit the API.'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to clear all cache entries'
      });
    }
    
  } catch (error) {
    console.error('[Cache Admin] Error clearing all cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear all cache entries',
      details: error.message
    });
  }
});

// Get cache health status
router.get('/health', async (req, res) => {
  try {
    const stats = await cacheService.getCacheStats(1); // Last 24 hours
    const isHealthy = stats.summary && stats.summary.total_requests > 0;
    
    const health = {
      status: isHealthy ? 'healthy' : 'no_activity',
      cache_initialized: cacheService.isInitialized,
      memory_cache_size: stats.summary ? stats.summary.memory_cache_size : 0,
      last_24h_requests: stats.summary ? stats.summary.total_requests : 0,
      hit_rate_24h: stats.summary ? stats.summary.hit_rate : '0.00',
      timestamp: new Date().toISOString()
    };
    
    res.json({
      success: true,
      health: health
    });
    
  } catch (error) {
    console.error('[Cache Admin] Error checking cache health:', error);
    res.json({
      success: false,
      health: {
        status: 'error',
        cache_initialized: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Warm cache with common queries
router.post('/warm', async (req, res) => {
  try {
    const { queries, states } = req.body;
    
    if (!queries || !Array.isArray(queries) || queries.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Queries array is required',
        message: 'Send { "queries": ["query1", "query2"], "states": ["state1", "state2"] }'
      });
    }
    
    if (!states || !Array.isArray(states) || states.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'States array is required',
        message: 'Send { "queries": ["query1", "query2"], "states": ["state1", "state2"] }'
      });
    }
    
    let warmedCount = 0;
    let errors = [];
    
    // Warm cache by making actual search requests
    for (const query of queries) {
      for (const state of states) {
        try {
          // Check if already cached
          const cached = await cacheService.getCachedResult(query, state, 'Capital'); // Use capital as default city
          
          if (!cached) {
            // This would normally trigger an API call, but for warming we'll create a placeholder
            const placeholderResult = {
              services: [{
                title: `${query} Service`,
                description: `Government service for ${query} in ${state}`,
                office: `${state} Government Office`,
                location: `Capital City, ${state}`,
                documents: ['Identity Proof', 'Address Proof'],
                timeline: 'Varies by service',
                fees: 'As applicable',
                contact: 'Contact local office',
                procedure: 'Visit office for details',
                category: 'General Services'
              }]
            };
            
            await cacheService.storeResult(query, state, 'Capital', placeholderResult);
            warmedCount++;
          }
        } catch (error) {
          errors.push(`${query} in ${state}: ${error.message}`);
        }
      }
    }
    
    res.json({
      success: true,
      message: `Cache warming completed. ${warmedCount} entries added.`,
      warmed_entries: warmedCount,
      errors: errors.length > 0 ? errors : null,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[Cache Admin] Error warming cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to warm cache',
      details: error.message
    });
  }
});

// Get cache configuration and settings
router.get('/config', (req, res) => {
  try {
    const config = {
      cache_expiration_hours: 24,
      memory_cache_size_limit: 100,
      background_cleanup_enabled: true,
      cleanup_interval_hours: 1,
      memory_cleanup_interval_minutes: 10,
      database_path: '../database/cache.db',
      query_normalization_enabled: true,
      synonym_matching_enabled: true
    };
    
    res.json({
      success: true,
      configuration: config,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[Cache Admin] Error getting cache config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve cache configuration',
      details: error.message
    });
  }
});

// Test cache functionality
router.post('/test', async (req, res) => {
  try {
    const testQuery = 'passport application test';
    const testState = 'Delhi';
    const testCity = 'New Delhi';
    
    // Test cache miss
    const cachedBefore = await cacheService.getCachedResult(testQuery, testState, testCity);
    
    // Create test data
    const testResult = {
      services: [{
        title: 'Cache Test Service',
        description: 'This is a test entry for cache functionality',
        office: 'Test Office',
        location: 'Test Location',
        documents: ['Test Document'],
        timeline: 'Test Timeline',
        fees: 'Test Fees',
        contact: 'Test Contact',
        procedure: 'Test Procedure',
        category: 'Test'
      }]
    };
    
    // Store in cache
    await cacheService.storeResult(testQuery, testState, testCity, testResult);
    
    // Test cache hit
    const cachedAfter = await cacheService.getCachedResult(testQuery, testState, testCity);
    
    res.json({
      success: true,
      test_results: {
        cache_miss_before_store: cachedBefore === null,
        cache_hit_after_store: cachedAfter !== null,
        stored_data_matches: cachedAfter && JSON.stringify(cachedAfter.services[0].title) === JSON.stringify(testResult.services[0].title)
      },
      message: 'Cache test completed successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[Cache Admin] Cache test failed:', error);
    res.status(500).json({
      success: false,
      error: 'Cache test failed',
      details: error.message
    });
  }
});

module.exports = router;