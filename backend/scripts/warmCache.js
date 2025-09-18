const cacheService = require('../services/CacheService');

/**
 * Cache Warming Script
 * Pre-populate cache with common government service queries
 */

// Common queries users frequently search for
const commonQueries = [
  // Identity Documents
  'passport application',
  'passport renewal',
  'aadhaar card',
  'aadhaar update',
  'pan card application',
  'voter id card',
  'voter registration',
  
  // Licenses and Certificates
  'driving license',
  'dl renewal',
  'learner license',
  'birth certificate',
  'death certificate',
  'income certificate',
  'caste certificate',
  'domicile certificate',
  
  // Property and Housing
  'property registration',
  'mutation certificate',
  'land records',
  'housing scheme',
  'pm awas yojana',
  
  // Business and Employment
  'gst registration',
  'shop license',
  'trade license',
  'msme registration',
  'udyam registration',
  'epf withdrawal',
  'pf transfer',
  'esi registration',
  
  // Welfare Schemes
  'ration card',
  'pension scheme',
  'old age pension',
  'widow pension',
  'disability pension',
  'pm kisan',
  'ayushman bharat',
  'jan dhan account',
  
  // Utilities
  'electricity connection',
  'water connection',
  'gas connection',
  'lpg subsidy',
  
  // Education and Scholarships
  'scholarship',
  'education loan',
  'school admission',
  'college admission',
  
  // Legal and Police
  'police verification',
  'character certificate',
  'fir registration',
  'passport police clearance',
  
  // Tax Related
  'income tax return',
  'itr filing',
  'tax refund',
  'tds certificate',
  
  // Agriculture
  'kisan credit card',
  'crop insurance',
  'soil health card',
  'pm fasal bima',
  
  // Health Services
  'health card',
  'medical certificate',
  'disability certificate',
  'hospital registration'
];

// Major Indian states for cache warming
const majorStates = [
  'Andhra Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Delhi',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Tamil Nadu',
  'Telangana',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal'
];

// Major cities corresponding to states
const stateCities = {
  'Andhra Pradesh': 'Amaravati',
  'Assam': 'Guwahati',
  'Bihar': 'Patna',
  'Chhattisgarh': 'Raipur',
  'Delhi': 'New Delhi',
  'Gujarat': 'Gandhinagar',
  'Haryana': 'Chandigarh',
  'Himachal Pradesh': 'Shimla',
  'Jharkhand': 'Ranchi',
  'Karnataka': 'Bengaluru',
  'Kerala': 'Thiruvananthapuram',
  'Madhya Pradesh': 'Bhopal',
  'Maharashtra': 'Mumbai',
  'Odisha': 'Bhubaneswar',
  'Punjab': 'Chandigarh',
  'Rajasthan': 'Jaipur',
  'Tamil Nadu': 'Chennai',
  'Telangana': 'Hyderabad',
  'Uttar Pradesh': 'Lucknow',
  'Uttarakhand': 'Dehradun',
  'West Bengal': 'Kolkata'
};

/**
 * Generate realistic service data for cache warming
 */
function generateServiceData(query, state, city) {
  const services = [];
  
  // Create 1-3 services per query
  const serviceCount = Math.floor(Math.random() * 3) + 1;
  
  for (let i = 0; i < serviceCount; i++) {
    const service = {
      title: `${query} - Service ${i + 1}`,
      description: `Government service for ${query} in ${city}, ${state}. This service provides assistance with application procedures, document verification, and processing.`,
      office: `${state} Government Office - Department ${i + 1}`,
      location: `Government Complex, Sector ${i + 10}, ${city}, ${state}`,
      documents: generateDocuments(query),
      timeline: generateTimeline(query),
      fees: generateFees(query),
      contact: `011-${Math.floor(Math.random() * 9000000) + 1000000}`,
      procedure: generateProcedure(query),
      category: categorizeQuery(query)
    };
    
    services.push(service);
  }
  
  return { services };
}

/**
 * Generate appropriate documents for a query
 */
function generateDocuments(query) {
  const commonDocs = ['Identity Proof (Aadhaar/PAN)', 'Address Proof', 'Passport Size Photos'];
  const specificDocs = {
    'passport': ['Birth Certificate', 'Address Proof', 'Identity Proof'],
    'driving': ['Medical Certificate', 'Address Proof', 'Identity Proof', 'Age Proof'],
    'voter': ['Identity Proof', 'Address Proof', 'Age Proof'],
    'ration': ['Income Certificate', 'Address Proof', 'Identity Proof', 'Family Members Details'],
    'property': ['Property Documents', 'NOC from Society', 'Identity Proof'],
    'business': ['Business Plan', 'Identity Proof', 'Address Proof', 'Bank Details']
  };
  
  for (const [key, docs] of Object.entries(specificDocs)) {
    if (query.toLowerCase().includes(key)) {
      return docs;
    }
  }
  
  return commonDocs;
}

/**
 * Generate realistic timeline based on query type
 */
function generateTimeline(query) {
  const quickServices = ['certificate', 'verification', 'update'];
  const mediumServices = ['card', 'registration', 'license'];
  const slowServices = ['passport', 'property', 'pension'];
  
  const queryLower = query.toLowerCase();
  
  if (quickServices.some(s => queryLower.includes(s))) {
    return '7-15 working days';
  } else if (mediumServices.some(s => queryLower.includes(s))) {
    return '15-30 working days';
  } else if (slowServices.some(s => queryLower.includes(s))) {
    return '30-60 working days';
  }
  
  return '15-30 working days';
}

/**
 * Generate appropriate fees for a service
 */
function generateFees(query) {
  const queryLower = query.toLowerCase();
  
  if (queryLower.includes('passport')) return '₹1,500 - ₹3,500';
  if (queryLower.includes('driving') || queryLower.includes('dl')) return '₹200 - ₹1,000';
  if (queryLower.includes('pan')) return '₹110 - ₹250';
  if (queryLower.includes('voter')) return 'Free';
  if (queryLower.includes('aadhaar')) return 'Free (₹50 for updates)';
  if (queryLower.includes('ration')) return 'Free';
  if (queryLower.includes('certificate')) return '₹20 - ₹100';
  if (queryLower.includes('registration')) return '₹500 - ₹2,000';
  if (queryLower.includes('license')) return '₹300 - ₹1,500';
  
  return '₹50 - ₹500';
}

/**
 * Generate step-by-step procedure
 */
function generateProcedure(query) {
  return `1. Gather required documents\n2. Visit the designated office or apply online\n3. Fill the application form\n4. Submit documents and pay fees\n5. Get acknowledgment receipt\n6. Track application status\n7. Collect the processed document`;
}

/**
 * Categorize query for better organization
 */
function categorizeQuery(query) {
  const queryLower = query.toLowerCase();
  
  if (queryLower.includes('passport') || queryLower.includes('visa')) return 'identity';
  if (queryLower.includes('driving') || queryLower.includes('license')) return 'license';
  if (queryLower.includes('tax') || queryLower.includes('gst') || queryLower.includes('itr')) return 'tax';
  if (queryLower.includes('health') || queryLower.includes('medical')) return 'health';
  if (queryLower.includes('education') || queryLower.includes('scholarship')) return 'education';
  if (queryLower.includes('welfare') || queryLower.includes('pension') || queryLower.includes('ration')) return 'welfare';
  if (queryLower.includes('property') || queryLower.includes('housing')) return 'housing';
  if (queryLower.includes('business') || queryLower.includes('employment')) return 'employment';
  
  return 'general';
}

/**
 * Warm cache with common queries
 */
async function warmCache() {
  console.log('[CACHE WARM] Starting cache warming process...');
  
  try {
    await cacheService.initialize();
    
    let warmedCount = 0;
    let errors = [];
    
    // Select a subset of queries and states to avoid too many combinations
    const selectedQueries = commonQueries.slice(0, 20); // First 20 queries
    const selectedStates = majorStates.slice(0, 10); // First 10 states
    
    console.log(`[CACHE WARM] Warming cache with ${selectedQueries.length} queries across ${selectedStates.length} states...`);
    
    for (const query of selectedQueries) {
      for (const state of selectedStates) {
        try {
          const city = stateCities[state] || 'Capital City';
          
          // Check if already cached
          const cached = await cacheService.getCachedResult(query, state, city);
          
          if (!cached) {
            // Generate realistic service data
            const serviceData = generateServiceData(query, state, city);
            
            // Store in cache
            await cacheService.storeResult(query, state, city, serviceData);
            warmedCount++;
            
            // Log progress every 25 entries
            if (warmedCount % 25 === 0) {
              console.log(`[CACHE WARM] Warmed ${warmedCount} entries so far...`);
            }
          }
          
          // Small delay to prevent overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 10));
          
        } catch (error) {
          errors.push(`${query} in ${state}: ${error.message}`);
        }
      }
    }
    
    console.log(`\n[CACHE WARM] Cache warming completed!`);
    console.log(`   ✅ Successfully warmed: ${warmedCount} entries`);
    console.log(`   ❌ Errors: ${errors.length}`);
    
    if (errors.length > 0 && errors.length < 10) {
      console.log('   First few errors:', errors.slice(0, 5));
    }
    
    // Get final cache stats
    const stats = await cacheService.getCacheStats(1);
    console.log(`\n[CACHE WARM] Current cache statistics:`);
    console.log(`   📊 Total entries: ${warmedCount}`);
    console.log(`   💾 Memory cache size: ${stats.summary.memory_cache_size}`);
    
  } catch (error) {
    console.error('[CACHE WARM] Cache warming failed:', error);
  } finally {
    cacheService.close();
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  warmCache();
}

module.exports = { warmCache, commonQueries, majorStates };