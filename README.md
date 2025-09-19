# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Portal Finder is an AI-powered government services discovery platform that helps Indian citizens quickly find and access government services, offices, and procedures across all states and cities. The platform uses Mistral AI via OpenRouter API to provide intelligent search results based on natural language queries.

## Architecture

### Backend Structure
- **Express Server**: Main server file at `backend/server.js`
- **AI Integration**: Uses OpenRouter API to connect with Mistral AI
- **Routes**: Modular route handlers in `backend/routes/`
  - `search.js`: Handles government services search with AI processing
- **Data**: Static JSON data in `backend/data/`
  - `states.json`: Contains Indian states and their cities

### Frontend Structure
- **Modern UI**: Beautiful, responsive design with animations
- **Static Files**: Located in `frontend/` directory
  - `index.html`: Complete landing page with hero section, infographics, and search
  - `script.js`: Advanced JavaScript with animations and AI search integration
  - `styles.css`: Modern CSS with gradients, animations, and responsive design
- **Libraries**: Uses AOS (Animate On Scroll), Font Awesome, and Google Fonts

### API Architecture
- **REST Endpoints**:
  - `GET /api/states`: Returns states and cities data as array
  - `POST /api/search`: Processes natural language queries and returns government services
- **AI Integration**: Sends prompts to Mistral AI for intelligent service discovery
- **Static File Serving**: Frontend served from `/` route

## Development Commands

### Essential Commands
```bash
# Install dependencies
npm install

# Start development server
npm start

# Server runs on http://localhost:5000
```

### Development Workflow
1. Backend changes: Restart server with `npm start`
2. Frontend changes: Refresh browser (static files served directly)
3. API testing: Use the frontend form or tools like curl/Postman

## Key Implementation Details

### State/City Data Flow
The `states.json` file contains a nested object structure that gets converted to an array format in the `/api/states` endpoint for easier frontend consumption.

### Search Functionality
Currently implements dummy search results in `backend/routes/search.js`. The search endpoint accepts:
- `state`: Selected state name
- `city`: Selected city name  
- `budget`: Numeric budget value
- `days`: Trip duration in days

### Frontend State Management
- Uses vanilla JavaScript with DOM manipulation
- Implements cascading dropdowns (state selection updates city options)
- Form validation handled by HTML5 `required` attributes
- Results displayed dynamically without page refresh

## Environment Configuration

### Required Environment Variables
- `OPENROUTER_API_KEY`: API key for OpenRouter (stored in `.env`)
- **Note**: Current implementation doesn't use this API key - appears to be for future AI integration

### File Structure Notes
```
portal_finder/
├── backend/
│   ├── server.js           # Main Express server
│   ├── routes/
│   │   └── search.js       # Search API endpoints
│   └── data/
│       └── states.json     # State and city data
├── frontend/
│   ├── index.html          # Main UI
│   ├── script.js           # Client-side logic
│   └── styles.css          # Styling with glassmorphism
├── .env                    # Environment variables
└── package.json            # Dependencies and scripts
```

## Development Considerations

### Expanding Search Functionality
The current search implementation returns static dummy data. To enhance:
1. Replace dummy responses in `backend/routes/search.js`
2. Add database integration or external API calls
3. Consider using the OPENROUTER_API_KEY for AI-powered recommendations

### Frontend Enhancement
- CSS uses modern features (backdrop-filter, gradients)
- Consider adding error handling for failed API requests
- Form could benefit from loading states and user feedback

### Data Management
- `states.json` contains comprehensive Indian state/city data
- Data transformation happens server-side to convert object to array format
- Consider caching states data on frontend to reduce API calls

## Common Tasks

### Adding New API Endpoints
1. Create route handler in `backend/routes/`
2. Import and use in `backend/server.js`
3. Update frontend `script.js` to consume new endpoint

### Modifying Search Results
1. Edit `backend/routes/search.js`
2. Update response structure as needed
3. Adjust frontend result display in `script.js`

### Styling Updates
1. Modify `frontend/styles.css`
2. Current design uses glassmorphism with blue-green gradients
3. Responsive design already implemented
