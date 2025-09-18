const express = require("express");
const router = express.Router();
const portalMatcher = require('../services/portalMatcher');
const cacheService = require('../services/CacheService');

// Node.js v18+ has native fetch support

// Government services search endpoint with AI + Portal Matching + Caching
router.post("/search", async (req, res) => {
  const searchStartTime = Date.now();
  
  try {
    const { query, state, city } = req.body;

    if (!query || !state || !city) {
      return res.status(400).json({ 
        error: "Missing required fields: query, state, city" 
      });
    }

    console.log(`[SEARCH] Processing query: "${query}" for ${city}, ${state}`);

    // Check cache first
    const cachedResult = await cacheService.getCachedResult(query, state, city);
    if (cachedResult) {
      const responseTime = Date.now() - searchStartTime;
      console.log(`[SEARCH] Returning cached result (${responseTime}ms)`);
      return res.json({
        ...cachedResult,
        cached: true,
        response_time_ms: responseTime,
        cache_source: 'database'
      });
    }

    // First, get accurate portal links from our curated dataset
    const portalInfo = portalMatcher.getBestPortal(query, state, city);
    console.log(`[INFO] Found portal for "${query}": ${portalInfo.portal_name}`);

    // Use a hybrid approach: AI for general info + our dataset for accurate links

    const prompt = `You are an AI assistant helping Indian citizens find government services. 
User Query: "${query}"
Location: ${city}, ${state}

Instructions:
- Return ONLY valid JSON, no explanations
- Find relevant government services, offices, and procedures
- Focus on practical information: documents, timelines, fees, procedures
- Provide specific office locations and contact information for ${city}, ${state}
- DO NOT include portal links - these will be provided separately

JSON Format:
{
  "services": [
    {
      "title": "Service Name",
      "description": "What this service provides",
      "office": "Government office/department in ${city}",
      "location": "Specific address in ${city}, ${state}",
      "documents": ["Required document 1", "Required document 2"],
      "timeline": "Processing time",
      "fees": "Cost information",
      "contact": "Phone/email for ${city} office",
      "procedure": "Step-by-step process",
      "category": "service category"
    }
  ]
}`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:5000",
        "X-Title": "Portal Finder"
      },
      body: JSON.stringify({
        "model": "mistralai/mistral-7b-instruct",
        "messages": [
          {
            "role": "user",
            "content": prompt
          }
        ],
        "temperature": 0.3,
        "max_tokens": 1500
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    try {
      const parsedResult = JSON.parse(content);
      
      // Enhance AI results with accurate portal information
      if (parsedResult.services && Array.isArray(parsedResult.services)) {
        parsedResult.services = parsedResult.services.map(service => ({
          ...service,
          portal_link: portalInfo.portal_link,
          portal_description: portalInfo.portal_description,
          portal_name: portalInfo.portal_name
        }));
      }
      
      // Store successful result in cache for future requests
      await cacheService.storeResult(query, state, city, parsedResult);
      
      const responseTime = Date.now() - searchStartTime;
      console.log(`[SEARCH] API request completed (${responseTime}ms)`);
      
      res.json({
        ...parsedResult,
        cached: false,
        response_time_ms: responseTime,
        cache_source: 'api'
      });
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError);
      console.error("Raw content:", content);
      
      // Fallback response with accurate portal info
      const fallbackResult = {
        services: [
          {
            title: "Service Information Available",
            description: `For "${query}" in ${city}, ${state}`,
            office: "Local Government Office",
            location: `${city}, ${state}`,
            documents: ["Identity Proof", "Address Proof"],
            timeline: "Varies by service",
            fees: "As applicable",
            contact: "Visit local office for details",
            procedure: "Contact the relevant department for specific procedures",
            category: "General Services",
            portal_link: portalInfo.portal_link,
            portal_description: portalInfo.portal_description,
            portal_name: portalInfo.portal_name
          }
        ]
      };
      
      // Store fallback result in cache too
      await cacheService.storeResult(query, state, city, fallbackResult);
      
      const responseTime = Date.now() - searchStartTime;
      console.log(`[SEARCH] Fallback response used (${responseTime}ms)`);
      
      res.json({
        ...fallbackResult,
        cached: false,
        response_time_ms: responseTime,
        cache_source: 'fallback'
      });
    }

  } catch (error) {
    console.error("Search API Error:", error);
    res.status(500).json({ 
      error: "Failed to search services",
      details: error.message 
    });
  }
});

// Test endpoint for portal matching
router.get("/test-portal/:query", (req, res) => {
  try {
    const { query } = req.params;
    const portalInfo = portalMatcher.getBestPortal(query);
    const allMatches = portalMatcher.getRelevantPortals(query, null, null, 5);
    
    res.json({
      query: query,
      best_match: portalInfo,
      all_matches: allMatches
    });
  } catch (error) {
    console.error("Portal test error:", error);
    res.status(500).json({ error: "Portal matching failed" });
  }
});

module.exports = router;
