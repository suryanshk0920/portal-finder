const governmentPortals = require('../data/government_portals.json');

class PortalMatcher {
  constructor() {
    this.portals = governmentPortals;
    this.keywordMap = this.buildKeywordMap();
  }

  // Build a comprehensive keyword mapping for fuzzy matching
  buildKeywordMap() {
    const keywordMap = new Map();
    
    // Add central government services
    Object.entries(this.portals.central_government).forEach(([category, services]) => {
      Object.entries(services).forEach(([serviceKey, serviceData]) => {
        serviceData.services.forEach(keyword => {
          if (!keywordMap.has(keyword.toLowerCase())) {
            keywordMap.set(keyword.toLowerCase(), []);
          }
          keywordMap.get(keyword.toLowerCase()).push({
            ...serviceData,
            category: category,
            type: 'central'
          });
        });
        
        // Also map service names
        if (!keywordMap.has(serviceData.name.toLowerCase())) {
          keywordMap.set(serviceData.name.toLowerCase(), []);
        }
        keywordMap.get(serviceData.name.toLowerCase()).push({
          ...serviceData,
          category: category,
          type: 'central'
        });
      });
    });

    // Add common portals
    Object.entries(this.portals.common_portals).forEach(([portalKey, portalData]) => {
      portalData.services.forEach(keyword => {
        if (!keywordMap.has(keyword.toLowerCase())) {
          keywordMap.set(keyword.toLowerCase(), []);
        }
        keywordMap.get(keyword.toLowerCase()).push({
          ...portalData,
          category: 'common',
          type: 'common'
        });
      });
    });

    // Add state-specific services
    if (this.portals.state_specific) {
      Object.entries(this.portals.state_specific).forEach(([stateName, stateData]) => {
        Object.entries(stateData).forEach(([serviceKey, serviceData]) => {
          if (serviceData.services && Array.isArray(serviceData.services)) {
            serviceData.services.forEach(keyword => {
              if (!keywordMap.has(keyword.toLowerCase())) {
                keywordMap.set(keyword.toLowerCase(), []);
              }
              keywordMap.get(keyword.toLowerCase()).push({
                ...serviceData,
                category: 'state_specific',
                type: 'state',
                state: stateName
              });
            });
          }
          
          // Also map service names
          if (serviceData.name && !keywordMap.has(serviceData.name.toLowerCase())) {
            keywordMap.set(serviceData.name.toLowerCase(), []);
          }
          if (serviceData.name) {
            keywordMap.get(serviceData.name.toLowerCase()).push({
              ...serviceData,
              category: 'state_specific',
              type: 'state',
              state: stateName
            });
          }
        });
      });
    }

    // Add detailed state services
    if (this.portals.detailed_state_services) {
      Object.entries(this.portals.detailed_state_services).forEach(([stateName, stateServices]) => {
        Object.entries(stateServices).forEach(([serviceCategory, serviceData]) => {
          if (serviceData.services && Array.isArray(serviceData.services)) {
            serviceData.services.forEach(keyword => {
              if (!keywordMap.has(keyword.toLowerCase())) {
                keywordMap.set(keyword.toLowerCase(), []);
              }
              keywordMap.get(keyword.toLowerCase()).push({
                ...serviceData,
                category: serviceCategory,
                type: 'state_detailed',
                state: stateName
              });
            });
          }
          
          // Also map service names
          if (serviceData.name && !keywordMap.has(serviceData.name.toLowerCase())) {
            keywordMap.set(serviceData.name.toLowerCase(), []);
          }
          if (serviceData.name) {
            keywordMap.get(serviceData.name.toLowerCase()).push({
              ...serviceData,
              category: serviceCategory,
              type: 'state_detailed',
              state: stateName
            });
          }
        });
      });
    }

    return keywordMap;
  }

  // Find matching portals based on user query
  findMatchingPortals(query, state = null, city = null) {
    const queryLower = query.toLowerCase();
    const matches = [];
    const seenUrls = new Set();
    
    console.log(`[DEBUG] Searching for "${query}" in state: ${state || 'none'}`);

    // Normalize state name for comparison
    const normalizedState = state ? state.toLowerCase().replace(/\s+/g, '_') : null;
    
    // Direct keyword matching
    let directMatches = 0;
    this.keywordMap.forEach((portals, keyword) => {
      if (queryLower.includes(keyword) || keyword.includes(queryLower)) {
        directMatches++;
        portals.forEach(portal => {
          if (!seenUrls.has(portal.url)) {
            let score = this.calculateRelevance(queryLower, keyword, portal, state);
            
            // Boost state-specific portals when state is provided
            if (state && portal.type === 'state' && portal.state === normalizedState) {
              score += 0.5; // Significant boost for matching state
            } else if (state && (portal.type === 'state_detailed' || portal.type === 'state') && portal.state === normalizedState) {
              score += 0.4; // Good boost for state detailed services
            }
            matches.push({
              ...portal,
              relevanceScore: score,
              matchedKeyword: keyword
            });
            seenUrls.add(portal.url);
          }
        });
      }
    });

    // Fuzzy matching for partial matches
    if (matches.length === 0) {
      this.keywordMap.forEach((portals, keyword) => {
        const similarity = this.calculateSimilarity(queryLower, keyword);
        if (similarity > 0.3) { // 30% similarity threshold
          portals.forEach(portal => {
            if (!seenUrls.has(portal.url)) {
              matches.push({
                ...portal,
                relevanceScore: similarity
              });
              seenUrls.add(portal.url);
            }
          });
        }
      });
    }

    // Enhanced state-specific matching
    if (state) {
      const stateKey = state.toLowerCase().replace(/\s+/g, '_');
      const statePortals = this.portals.state_specific[stateKey];
      
      if (statePortals) {
        // Check if query mentions the state name
        const stateInQuery = queryLower.includes(state.toLowerCase());
        
        Object.entries(statePortals).forEach(([serviceType, portal]) => {
          if (portal.services) {
            portal.services.forEach(service => {
              if (queryLower.includes(service.toLowerCase()) || service.toLowerCase().includes(queryLower)) {
                if (!seenUrls.has(portal.url)) {
                  matches.push({
                    ...portal,
                    relevanceScore: stateInQuery ? 0.95 : 0.85, // Higher score if state mentioned
                    type: 'state',
                    matchedKeyword: service
                  });
                  seenUrls.add(portal.url);
                }
              }
            });
          }
        });
        
        // If no specific matches but query is generic (like just "electricity bill")
        if (matches.length === 0) {
          Object.entries(statePortals).forEach(([serviceType, portal]) => {
            matches.push({
              ...portal,
              relevanceScore: 0.7,
              type: 'state'
            });
          });
        }
      }
    }

    // Sort by relevance score
    const sortedMatches = matches.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    if (sortedMatches.length > 0) {
      console.log(`[DEBUG] Found ${sortedMatches.length} matches, top: ${sortedMatches[0].name} (score: ${sortedMatches[0].relevanceScore})`);
    }
    
    return sortedMatches;
  }

  // Calculate relevance score
  calculateRelevance(query, keyword, portal, state = null) {
    let score = 0;
    
    // Exact match gets highest score
    if (query === keyword) score += 1.0;
    else if (query.includes(keyword)) score += 0.8;
    else if (keyword.includes(query)) score += 0.6;
    
    // Boost popular services
    const popularServices = ['passport', 'aadhaar', 'pan', 'driving license', 'voter id', 'income tax'];
    if (popularServices.some(service => keyword.includes(service))) {
      score += 0.2;
    }
    
    // Additional boost for utility services (electricity, water, gas)
    const utilityServices = ['electricity', 'water', 'gas', 'lpg'];
    if (utilityServices.some(service => keyword.includes(service))) {
      score += 0.1;
    }
    
    return Math.min(score, 1.0);
  }

  // Calculate string similarity
  calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  // Calculate Levenshtein distance for fuzzy matching
  levenshteinDistance(str1, str2) {
    const matrix = Array(str2.length + 1).fill().map(() => Array(str1.length + 1).fill(0));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // insertion
          matrix[j - 1][i] + 1, // deletion
          matrix[j - 1][i - 1] + substitutionCost // substitution
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  // Get the best matching portal for a query
  getBestPortal(query, state = null, city = null) {
    const matches = this.findMatchingPortals(query, state, city);
    
    if (matches.length > 0) {
      const bestMatch = matches[0];
      console.log(`[INFO] Best match for "${query}": ${bestMatch.name}`);
      return {
        portal_link: bestMatch.url,
        portal_description: bestMatch.description,
        portal_name: bestMatch.name
      };
    }
    
    console.log(`[INFO] No specific matches found for "${query}", using fallback`);
    // Fallback to common portals
    return {
      portal_link: this.portals.common_portals.india_gov.url,
      portal_description: this.portals.common_portals.india_gov.description,
      portal_name: this.portals.common_portals.india_gov.name
    };
  }

  // Get multiple relevant portals
  getRelevantPortals(query, state = null, city = null, limit = 3) {
    const matches = this.findMatchingPortals(query, state, city);
    return matches.slice(0, limit).map(match => ({
      portal_link: match.url,
      portal_description: match.description,
      portal_name: match.name,
      relevance_score: match.relevanceScore
    }));
  }
}

module.exports = new PortalMatcher();
