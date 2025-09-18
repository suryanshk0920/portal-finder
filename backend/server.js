require("dotenv").config({ path: require('path').join(__dirname, '../.env') });

const express = require("express");
const cors = require("cors");
const path = require("path");
const searchRoutes = require("./routes/search");
const cacheRoutes = require("./routes/cache");
const cacheService = require("./services/CacheService");
const { 
  requireAdminAuth, 
  requireAdminAuthForStatic, 
  adminRateLimit, 
  securityHeaders 
} = require("./middleware/adminAuth");

const app = express();

// Enhanced CORS configuration for production
const corsOptions = {
  origin: [
    'http://localhost:5000',
    'https://portal-finder.netlify.app',
    'https://portal-finder.onrender.com',
    /\.netlify\.app$/,
    /\.onrender\.com$/
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// Add CORS headers manually as fallback
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Enable trust proxy for accurate IP addresses (important for rate limiting)
app.set('trust proxy', 1);

// Use routes
app.use("/api", searchRoutes);

// Admin cache routes (authentication removed - open for all)
app.use("/api/cache", cacheRoutes);

// Serve states.json (convert object → array for frontend)
// Serve states.json (convert object → array for frontend)
app.get("/api/states", (req, res) => {
  try {
    const raw = require("./data/states.json");
    const statesArr = Object.keys(raw).map((state) => ({
      state,
      cities: raw[state]
    }));
    res.json(statesArr);
  } catch (err) {
    console.error("[ERROR] Cannot load states.json:", err);
    res.status(500).json({ error: "Failed to load states.json" });
  }
});

// Serve admin dashboard (separate from main frontend) - OPEN FOR ALL
app.use('/admin', express.static(path.join(__dirname, "../admin")));

// Admin authentication endpoint (now always returns success)
app.post('/api/admin/authenticate', (req, res) => {
  // Authentication disabled - always return success
  res.json({
    success: true,
    message: 'Authentication disabled - open access',
    timestamp: new Date().toISOString()
  });
});

// Serve frontend
app.use(express.static(path.join(__dirname, "../frontend")));

const PORT = 5000;

// Initialize cache service
async function initializeServices() {
  try {
    console.log('[SERVER] Initializing cache service...');
    await cacheService.initialize();
    console.log('[SERVER] Cache service initialized successfully');
  } catch (error) {
    console.error('[SERVER] Failed to initialize cache service:', error);
    console.log('[SERVER] Continuing without cache (searches will always hit API)');
  }
}

// Start server
app.listen(PORT, async () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  
  // Initialize services after server starts
  await initializeServices();
  
  console.log('\n📊 Available endpoints:');
  console.log(`   🔍 Search API: http://localhost:${PORT}/api/search`);
  console.log(`   🗺️  States API: http://localhost:${PORT}/api/states`);
  console.log(`   🏠 Frontend: http://localhost:${PORT}`);
  console.log('\n🔓 Open Admin Endpoints:');
  console.log(`   🎛️  Admin Dashboard: http://localhost:${PORT}/admin`);
  console.log(`   📈 Cache Stats: http://localhost:${PORT}/api/cache/stats`);
  console.log(`   🔥 Cache Health: http://localhost:${PORT}/api/cache/health`);
  console.log(`   🧪 Cache Test: POST http://localhost:${PORT}/api/cache/test`);
  console.log(`   🔑 Admin Auth: POST http://localhost:${PORT}/api/admin/authenticate`);
  console.log('\n⚠️  Security: Authentication disabled - admin endpoints are open to all');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[SERVER] Shutting down gracefully...');
  cacheService.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[SERVER] Shutting down gracefully...');
  cacheService.close();
  process.exit(0);
});
