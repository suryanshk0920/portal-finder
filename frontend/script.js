// Initialize AOS animations
if (typeof AOS !== 'undefined') {
  AOS.init({
    duration: 800,
    easing: 'ease-out-cubic',
    once: true,
    offset: 100
  });
}


// Global state management
let statesData = [];
let isSearching = false;

// Get API URL based on environment
function getApiUrl(endpoint) {
  // Check if we're on Render (or any production environment)
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  if (!isLocalhost && window.API_CONFIG && window.API_CONFIG.STATES_API) {
    // Using separate frontend/backend deployments
    switch(endpoint) {
      case 'states': return window.API_CONFIG.STATES_API;
      case 'search': return window.API_CONFIG.SEARCH_API;
      default: return `${window.API_CONFIG.STATES_API.replace('/api/states', '')}/api/${endpoint}`;
    }
  }
  
  // Default: same-origin requests (localhost or same-domain deployment)
  return `/api/${endpoint}`;
}

// Load states and cities
function loadStates() {
  fetch(getApiUrl('states'))
    .then((res) => res.json())
    .then((data) => {
      statesData = data;
      console.log("[INFO] Loaded states:", data.length, "states");

      const stateSelect = document.getElementById("state");
      
      // Add states to select
      statesData.forEach((item) => {
        const option = document.createElement("option");
        option.value = item.state;
        option.textContent = item.state;
        stateSelect.appendChild(option);
      });

      // Add state change listener
      stateSelect.addEventListener("change", handleStateChange);
      
      // Add smooth animation on load
      setTimeout(() => {
        stateSelect.style.transform = 'scale(1)';
        stateSelect.style.opacity = '1';
      }, 100);
    })
    .catch((err) => {
      console.error("[ERROR] Failed to load states:", err);
      showNotification("Failed to load states. Please refresh the page.", "error");
    });
}

// Handle state selection change
function handleStateChange() {
  const stateSelect = document.getElementById("state");
  const citySelect = document.getElementById("city");
  
  // Reset city select
  citySelect.innerHTML = '<option value="">Select City</option>';
  citySelect.disabled = true;
  
  const selectedState = stateSelect.value;
  if (!selectedState) return;
  
  const selectedStateData = statesData.find((s) => s.state === selectedState);
  
  if (selectedStateData && selectedStateData.cities) {
    // Add cities with animation
    selectedStateData.cities.forEach((city, index) => {
      setTimeout(() => {
        const option = document.createElement("option");
        option.value = city;
        option.textContent = city;
        citySelect.appendChild(option);
        
        if (index === 0) {
          citySelect.disabled = false;
          citySelect.style.opacity = '1';
        }
      }, index * 2); // Stagger the loading
    });
  }
}

// Handle form submission
function handleSearch(e) {
  e.preventDefault();
  
  if (isSearching) return; // Prevent double submission
  
  const query = document.getElementById("query").value.trim();
  const state = document.getElementById("state").value;
  const city = document.getElementById("city").value;
  
  // Validation
  if (!query) {
    showNotification("Please enter what service you need", "error");
    document.getElementById("query").focus();
    return;
  }
  
  if (!state) {
    showNotification("Please select a state", "error");
    document.getElementById("state").focus();
    return;
  }
  
  if (!city) {
    showNotification("Please select a city", "error");
    document.getElementById("city").focus();
    return;
  }
  
  console.log("[INFO] Searching for:", { query, state, city });
  
  // Start loading state
  setSearchLoading(true);
  
  // API call
  fetch(getApiUrl('search'), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, state, city })
  })
    .then(async (res) => {
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`API Error: ${res.status} - ${errorText}`);
      }
      return res.json();
    })
    .then((data) => {
      console.log("[INFO] Search results:", data);
      displayResults(data, query, city, state);
      
      // Scroll to results with smooth animation
      setTimeout(() => {
        document.getElementById('results').scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
      }, 300);
    })
    .catch((err) => {
      console.error("[ERROR] Search failed:", err);
      showNotification("Search failed. Please try again.", "error");
      displayErrorState();
    })
    .finally(() => {
      setSearchLoading(false);
    });
}

// Set loading state for search button
function setSearchLoading(loading) {
  isSearching = loading;
  const searchBtn = document.querySelector('.search-btn');
  const btnText = searchBtn.querySelector('.btn-text');
  const btnLoader = searchBtn.querySelector('.btn-loader');
  const btnIcon = searchBtn.querySelector('.fas.fa-search');
  
  if (loading) {
    searchBtn.classList.add('loading');
    btnText.textContent = 'Searching...';
    btnLoader.classList.remove('hidden');
    btnIcon.style.display = 'none';
    searchBtn.disabled = true;
  } else {
    searchBtn.classList.remove('loading');
    btnText.textContent = 'Find Services';
    btnLoader.classList.add('hidden');
    btnIcon.style.display = 'block';
    searchBtn.disabled = false;
  }
}

// Display search results
function displayResults(data, query, city, state) {
  const resultsSection = document.getElementById('results');
  const resultsQuery = document.getElementById('resultsQuery');
  const serviceCards = document.getElementById('serviceCards');
  
  // Update results header
  resultsQuery.textContent = `Found ${data.services?.length || 0} services for "${query}" in ${city}, ${state}`;
  
  // Clear previous results
  serviceCards.innerHTML = '';
  
  if (!data.services || data.services.length === 0) {
    displayNoResults(query);
    return;
  }
  
  // Create service cards
  data.services.forEach((service, index) => {
    const serviceCard = createServiceCard(service, index);
    serviceCards.appendChild(serviceCard);
  });
  
  // Show results section with animation
  resultsSection.classList.remove('hidden');
  
  // Animate cards in sequence
  const cards = serviceCards.querySelectorAll('.service-card');
  cards.forEach((card, index) => {
    setTimeout(() => {
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, index * 150);
  });
}

// Create service card element
function createServiceCard(service, index) {
  const card = document.createElement('div');
  card.className = 'service-card';
  card.style.opacity = '0';
  card.style.transform = 'translateY(30px)';
  card.style.transition = 'all 0.6s ease';
  
  // Service category icon mapping
  const categoryIcons = {
    'identity': 'fa-id-card',
    'passport': 'fa-passport',
    'license': 'fa-certificate',
    'tax': 'fa-calculator',
    'health': 'fa-hospital',
    'education': 'fa-graduation-cap',
    'welfare': 'fa-heart',
    'legal': 'fa-gavel',
    'housing': 'fa-home',
    'employment': 'fa-briefcase',
    'default': 'fa-cog'
  };
  
  const iconClass = categoryIcons[service.category?.toLowerCase()] || categoryIcons.default;
  
  card.innerHTML = `
    <div class="service-header">
      <div class="service-icon">
        <i class="fas ${iconClass}"></i>
      </div>
      <h3 class="service-title">${service.title || 'Government Service'}</h3>
      <span class="service-category">${service.category || 'General'}</span>
    </div>
    
    <p class="service-description">${service.description || 'Service information not available.'}</p>
    
    <div class="service-details">
      <div class="detail-item">
        <div class="detail-label">
          <i class="fas fa-building"></i>
          Office
        </div>
        <div class="detail-content">${service.office || 'Contact local government office'}</div>
      </div>
      
      <div class="detail-item">
        <div class="detail-label">
          <i class="fas fa-map-marker-alt"></i>
          Location
        </div>
        <div class="detail-content">
          ${service.location || 'Location details not available'}
          ${service.location && service.location !== 'Location details not available' ? `
            <div class="location-actions">
              <button class="view-map-btn" onclick="openMapModal('${service.office || 'Government Office'}', '${service.location}', '${service.contact || ''}', '${service.title || 'Government Service'}')">
                <i class="fas fa-map"></i>
                View on Map
              </button>
            </div>
          ` : ''}
        </div>
      </div>
      
      <div class="detail-item">
        <div class="detail-label">
          <i class="fas fa-clock"></i>
          Timeline
        </div>
        <div class="detail-content">${service.timeline || 'Processing time varies'}</div>
      </div>
      
      <div class="detail-item">
        <div class="detail-label">
          <i class="fas fa-rupee-sign"></i>
          Fees
        </div>
        <div class="detail-content">${service.fees || 'Fee information not available'}</div>
      </div>
      
      <div class="detail-item">
        <div class="detail-label">
          <i class="fas fa-phone"></i>
          Contact
        </div>
        <div class="detail-content">${service.contact || 'Visit office for contact details'}</div>
      </div>
      
      <div class="detail-item">
        <div class="detail-label">
          <i class="fas fa-list-ol"></i>
          Procedure
        </div>
        <div class="detail-content">${service.procedure || 'Procedure details not available'}</div>
      </div>
    </div>
    
    ${service.documents && service.documents.length > 0 ? `
      <div class="detail-item" style="margin-top: 1.5rem;">
        <div class="detail-label">
          <i class="fas fa-file-alt"></i>
          Required Documents
        </div>
        <div class="documents-list">
          ${service.documents.map(doc => `<span class="document-tag">${doc}</span>`).join('')}
        </div>
      </div>
    ` : ''}
    
    ${service.portal_link ? `
      <div class="portal-section" style="margin-top: 2rem; padding: 1.5rem; background: #f0f8ff; border-radius: 12px; border-left: 4px solid #667eea;">
        <div class="detail-label" style="margin-bottom: 0.5rem;">
          <i class="fas fa-globe"></i>
          ${service.portal_name || 'Official Government Portal'}
        </div>
        <p style="color: #4a5568; margin-bottom: 1rem; line-height: 1.5;">${service.portal_description || 'Access this service through the official government portal'}</p>
        <a href="${service.portal_link}" target="_blank" class="portal-link-btn" style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.5rem; background: linear-gradient(135deg, #667eea, #764ba2); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
          <i class="fas fa-external-link-alt"></i>
          Visit ${service.portal_name || 'Portal'}
        </a>
      </div>
    ` : ''}
  `;
  
  return card;
}

// Display no results state
function displayNoResults(query) {
  const serviceCards = document.getElementById('serviceCards');
  serviceCards.innerHTML = `
    <div class="no-results" style="text-align: center; padding: 3rem; color: #718096;">
      <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 1rem; color: #cbd5e0;"></i>
      <h3 style="margin-bottom: 1rem; color: #4a5568;">No Services Found</h3>
      <p>We couldn't find any services matching "${query}". Try rephrasing your search or contact your local government office directly.</p>
      <div style="margin-top: 2rem;">
        <button onclick="clearSearch()" style="padding: 0.75rem 2rem; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer;">Try Another Search</button>
      </div>
    </div>
  `;
}

// Display error state
function displayErrorState() {
  const serviceCards = document.getElementById('serviceCards');
  serviceCards.innerHTML = `
    <div class="error-state" style="text-align: center; padding: 3rem; color: #718096;">
      <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem; color: #f56565;"></i>
      <h3 style="margin-bottom: 1rem; color: #4a5568;">Search Error</h3>
      <p>There was an error processing your search. Please try again or contact support if the problem persists.</p>
      <div style="margin-top: 2rem;">
        <button onclick="clearSearch()" style="padding: 0.75rem 2rem; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer;">Try Again</button>
      </div>
    </div>
  `;
}

// Clear search and hide results
function clearSearch() {
  document.getElementById('searchForm').reset();
  document.getElementById('results').classList.add('hidden');
  document.getElementById('city').innerHTML = '<option value="">Select City</option>';
  document.getElementById('city').disabled = true;
  document.getElementById('query').focus();
}

// Show notification
function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.style.cssText = `
    position: fixed;
    top: 100px;
    right: 20px;
    background: ${type === 'error' ? '#f56565' : '#48bb78'};
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    z-index: 10000;
    transform: translateX(400px);
    transition: transform 0.3s ease;
    max-width: 300px;
  `;
  
  notification.innerHTML = `
    <div style="display: flex; align-items: center; gap: 0.5rem;">
      <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle'}"></i>
      <span>${message}</span>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
  }, 100);
  
  // Auto remove
  setTimeout(() => {
    notification.style.transform = 'translateX(400px)';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 5000);
}

// Smooth scrolling for navigation links with navbar offset
function initializeNavigation() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      
      const targetId = this.getAttribute('href').substring(1);
      const targetElement = document.getElementById(targetId);
      
      if (targetElement) {
        const navHeight = document.querySelector('.nav').offsetHeight || 80;
        const targetPosition = targetElement.offsetTop - navHeight - 20;
        
        window.scrollTo({
          top: Math.max(0, targetPosition),
          behavior: 'smooth'
        });
      }
    });
  });
}

// Test Google Apps Script connection
async function testGoogleScriptConnection() {
  try {
    const scriptUrl = window.GOOGLE_SCRIPT_URL;
    if (!scriptUrl || scriptUrl === 'REPLACE_WITH_YOUR_GOOGLE_SCRIPT_URL') {
      console.warn('[WARNING] Google Script URL not configured');
      return false;
    }
    
    // Test with a simple GET request
    const response = await fetch(scriptUrl, {
      method: 'GET',
      mode: 'no-cors'
    });
    
    console.log('[INFO] Google Apps Script connection test completed');
    return true;
  } catch (error) {
    console.error('[ERROR] Google Apps Script connection test failed:', error);
    return false;
  }
}

// Handle contact form submission
async function handleContactForm(e) {
  e.preventDefault();
  
  const submitBtn = e.target.querySelector('.contact-submit-btn');
  const originalText = submitBtn.innerHTML;
  
  // Get form data
  const formData = {
    name: document.getElementById('contactName').value.trim(),
    email: document.getElementById('contactEmail').value.trim(),
    subject: document.getElementById('contactSubject').value,
    message: document.getElementById('contactMessage').value.trim()
  };
  
  // Validate form
  if (!formData.name || !formData.email || !formData.subject || !formData.message) {
    showNotification('Please fill in all fields', 'error');
    return;
  }
  
  // Validate email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(formData.email)) {
    showNotification('Please enter a valid email address', 'error');
    return;
  }
  
  // Show loading state
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
  submitBtn.disabled = true;
  
  try {
    // Check if Google Apps Script is configured
    const scriptUrl = window.GOOGLE_SCRIPT_URL || '';
    
    if (!scriptUrl || scriptUrl === 'REPLACE_WITH_YOUR_GOOGLE_SCRIPT_URL') {
      throw new Error('Contact form is not yet configured. Please try again later or contact us directly via email.');
    }
    
    // Use no-cors mode for Google Apps Script (required for cross-origin requests)
    const response = await fetch(scriptUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData)
    });
    
    // With no-cors mode, we can't read the response status
    // If we reach here without throwing an error, assume success
    showNotification('Message sent successfully! We\'ll get back to you soon.', 'success');
    
    // Reset form
    document.getElementById('contactForm').reset();
    
  } catch (error) {
    console.error('[ERROR] Failed to send contact form:', error);
    
    // Provide more helpful error message
    let errorMessage = 'Failed to send message. ';
    if (error.message.includes('Failed to fetch')) {
      errorMessage += 'Please check your internet connection and try again.';
    } else if (error.message.includes('not configured')) {
      errorMessage = error.message;
    } else {
      errorMessage += 'Please try again or email us directly at support@portalfinder.gov.in';
    }
    
    showNotification(errorMessage, 'error');
  } finally {
    // Restore button state
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Load states
  loadStates();
  
  // Initialize navigation
  initializeNavigation();
  
  // Add form submit listener
  document.getElementById('searchForm').addEventListener('submit', handleSearch);
  
  // Add input animations
  const inputs = document.querySelectorAll('input, select');
  inputs.forEach(input => {
    input.addEventListener('focus', function() {
      this.parentNode.style.transform = 'scale(1.02)';
    });
    
    input.addEventListener('blur', function() {
      this.parentNode.style.transform = 'scale(1)';
    });
  });
  
  // Add example suggestions for query input
  const queryInput = document.getElementById('query');
  const suggestions = [
    'Passport application',
    'Voter ID card',
    'Ration card registration', 
    'Driving license renewal',
    'PAN card application',
    'Birth certificate',
    'Income certificate',
    'Property registration',
    'Business license',
    'Senior citizen card'
  ];
  
  let suggestionIndex = 0;
  queryInput.addEventListener('focus', function() {
    if (!this.value) {
      this.placeholder = suggestions[suggestionIndex % suggestions.length];
      suggestionIndex++;
    }
  });
  
  // Add contact form handler if it exists
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', handleContactForm);
    
    // Test Google Apps Script connection
    setTimeout(() => {
      testGoogleScriptConnection();
    }, 2000);
  }
  
  console.log('[INFO] Portal Finder initialized successfully');
});

// ===== MAP FUNCTIONALITY =====

// Global map variables
let currentMap = null;
let currentOfficeMarker = null;
let currentUserMarker = null;
let currentRoute = null;
let currentOfficeData = {};

// Geocoding service using Nominatim (free OpenStreetMap service)
async function geocodeAddress(address) {
  try {
    console.log('[INFO] Geocoding address:', address);
    
    // Clean and enhance the address for better geocoding
    let cleanAddress = address;
    if (!address.toLowerCase().includes('india')) {
      cleanAddress += ', India';
    }
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanAddress)}&limit=3&countrycodes=in&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'Portal-Finder-Map'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('[INFO] Geocoding results:', data);
    
    if (data && data.length > 0) {
      // Pick the best result (usually the first one)
      const result = data[0];
      return {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        display_name: result.display_name
      };
    }
    
    console.warn('[WARNING] No geocoding results for:', cleanAddress);
    return null;
  } catch (error) {
    console.error('[ERROR] Geocoding failed:', error);
    
    // Try a fallback with just the city/state if the full address fails
    if (address.includes(',')) {
      const parts = address.split(',');
      if (parts.length >= 2) {
        const cityState = parts.slice(-2).join(',').trim();
        console.log('[INFO] Trying fallback geocoding with:', cityState);
        return await geocodeAddressFallback(cityState);
      }
    }
    
    return null;
  }
}

// Fallback geocoding for city/state only
async function geocodeAddressFallback(cityState) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityState + ', India')}&limit=1&countrycodes=in`,
      {
        headers: {
          'User-Agent': 'Portal-Finder-Map'
        }
      }
    );
    
    const data = await response.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        display_name: data[0].display_name
      };
    }
    return null;
  } catch (error) {
    console.error('[ERROR] Fallback geocoding failed:', error);
    return null;
  }
}

// Reverse geocoding to get address from coordinates
async function reverseGeocode(lat, lng) {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&countrycodes=in`);
    const data = await response.json();
    return data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  } catch (error) {
    console.error('[ERROR] Reverse geocoding failed:', error);
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
}

// Get routing data using OSRM (free routing service)
async function getRoute(startCoords, endCoords) {
  try {
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${startCoords.lng},${startCoords.lat};${endCoords.lng},${endCoords.lat}?overview=full&geometries=geojson&steps=true`
    );
    const data = await response.json();
    
    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      return {
        geometry: data.routes[0].geometry,
        distance: data.routes[0].distance,
        duration: data.routes[0].duration,
        steps: data.routes[0].legs[0].steps
      };
    }
    return null;
  } catch (error) {
    console.error('[ERROR] Routing failed:', error);
    return null;
  }
}

// Open map modal with office location
async function openMapModal(officeName, officeLocation, officeContact, serviceTitle) {
  // Store current office data
  currentOfficeData = {
    name: officeName,
    location: officeLocation,
    contact: officeContact,
    service: serviceTitle
  };
  
  // Update modal content
  document.getElementById('mapModalTitle').textContent = `${serviceTitle} - Location`;
  document.getElementById('officeDetailsTitle').textContent = officeName;
  document.getElementById('officeDetailsAddress').textContent = officeLocation;
  document.getElementById('officeDetailsContact').textContent = officeContact || 'Contact information not available';
  
  // Show modal
  const modal = document.getElementById('mapModal');
  modal.classList.remove('hidden');
  
  // Initialize map after modal is visible
  setTimeout(async () => {
    await initializeMap(officeLocation);
  }, 100);
  
  // Reset user location input
  document.getElementById('userLocation').value = '';
  hideUserLocationElements();
}

// Initialize the map with office location
async function initializeMap(officeLocation) {
  // Remove existing map
  if (currentMap) {
    currentMap.remove();
    currentMap = null;
  }
  
  try {
    // Geocode the office location
    showMapLoading(true);
    const officeCoords = await geocodeAddress(officeLocation);
    
    if (!officeCoords) {
      console.error('[ERROR] Could not geocode office location:', officeLocation);
      showNotification(`Could not find "${officeLocation}" on the map. The address might be too general or unavailable.`, 'error');
      
      // Show map anyway with a default location
      const defaultCoords = { lat: 28.6139, lng: 77.2090 }; // New Delhi as fallback
      
      currentMap = L.map('map').setView([defaultCoords.lat, defaultCoords.lng], 10);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
      }).addTo(currentMap);
      
      // Add a generic marker
      const genericIcon = L.divIcon({
        className: 'custom-marker',
        html: '<i class="fas fa-map-marker-alt" style="color: white; transform: rotate(45deg); margin-top: 6px; margin-left: 8px;"></i>',
        iconSize: [30, 30],
        iconAnchor: [15, 30]
      });
      
      L.marker([defaultCoords.lat, defaultCoords.lng], { icon: genericIcon })
        .addTo(currentMap)
        .bindPopup(`
          <div style="font-size: 14px; line-height: 1.4;">
            <strong>Location Not Found</strong><br>
            <i class="fas fa-exclamation-triangle" style="color: #f56565;"></i> ${officeLocation}<br>
            <small>Please contact the office directly for exact location</small>
          </div>
        `);
      
      showMapLoading(false);
      return;
    }
    
    // Initialize Leaflet map
    currentMap = L.map('map').setView([officeCoords.lat, officeCoords.lng], 15);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18
    }).addTo(currentMap);
    
    // Add office marker
    const officeIcon = L.divIcon({
      className: 'custom-marker',
      html: '<i class="fas fa-building" style="color: white; transform: rotate(45deg); margin-top: 6px; margin-left: 6px;"></i>',
      iconSize: [30, 30],
      iconAnchor: [15, 30]
    });
    
    currentOfficeMarker = L.marker([officeCoords.lat, officeCoords.lng], { icon: officeIcon })
      .addTo(currentMap)
      .bindPopup(`
        <div style="font-size: 14px; line-height: 1.4;">
          <strong>${currentOfficeData.name}</strong><br>
          <i class="fas fa-map-marker-alt" style="color: #667eea;"></i> ${currentOfficeData.location}<br>
          ${currentOfficeData.contact ? `<i class="fas fa-phone" style="color: #667eea;"></i> ${currentOfficeData.contact}` : ''}
        </div>
      `);
    
    showMapLoading(false);
    
  } catch (error) {
    console.error('[ERROR] Failed to initialize map:', error);
    showNotification('Failed to load map. Please try again.', 'error');
    showMapLoading(false);
  }
}

// Close map modal
function closeMapModal() {
  const modal = document.getElementById('mapModal');
  modal.classList.add('hidden');
  
  // Clean up map
  if (currentMap) {
    currentMap.remove();
    currentMap = null;
  }
  
  // Reset markers and routes
  currentOfficeMarker = null;
  currentUserMarker = null;
  currentRoute = null;
  
  // Reset UI elements
  hideUserLocationElements();
  document.getElementById('userLocation').value = '';
}

// Get user's current location using browser geolocation
function getCurrentUserLocation() {
  if (!navigator.geolocation) {
    showNotification('Geolocation is not supported by this browser', 'error');
    return;
  }
  
  const locationBtn = document.getElementById('getCurrentLocation');
  locationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;
      
      try {
        // Reverse geocode to get address
        const address = await reverseGeocode(latitude, longitude);
        document.getElementById('userLocation').value = address;
        
        showNotification('Current location detected successfully!', 'info');
        
      } catch (error) {
        console.error('[ERROR] Failed to get address:', error);
        document.getElementById('userLocation').value = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      }
      
      locationBtn.innerHTML = '<i class="fas fa-crosshairs"></i>';
    },
    (error) => {
      console.error('[ERROR] Geolocation error:', error);
      let message = 'Could not get your current location';
      
      switch (error.code) {
        case error.PERMISSION_DENIED:
          message = 'Location access was denied. Please enable location access.';
          break;
        case error.POSITION_UNAVAILABLE:
          message = 'Location information is unavailable.';
          break;
        case error.TIMEOUT:
          message = 'Location request timed out.';
          break;
      }
      
      showNotification(message, 'error');
      locationBtn.innerHTML = '<i class="fas fa-crosshairs"></i>';
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000 // 5 minutes
    }
  );
}

// Get directions between user location and office
async function getDirections() {
  const userLocationInput = document.getElementById('userLocation').value.trim();
  
  if (!userLocationInput) {
    showNotification('Please enter your location first', 'error');
    document.getElementById('userLocation').focus();
    return;
  }
  
  if (!currentOfficeMarker) {
    showNotification('Office location not available', 'error');
    return;
  }
  
  const directionsBtn = document.getElementById('getDirections');
  const originalContent = directionsBtn.innerHTML;
  directionsBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Getting Directions...';
  directionsBtn.disabled = true;
  
  try {
    // Geocode user location
    const userCoords = await geocodeAddress(userLocationInput);
    
    if (!userCoords) {
      showNotification('Could not find your location. Please try a different address.', 'error');
      return;
    }
    
    // Add user location marker
    if (currentUserMarker) {
      currentMap.removeLayer(currentUserMarker);
    }
    
    const userIcon = L.divIcon({
      className: 'custom-marker user-marker',
      html: '<i class="fas fa-user" style="color: white; transform: rotate(45deg); margin-top: 6px; margin-left: 8px; font-size: 12px;"></i>',
      iconSize: [25, 25],
      iconAnchor: [12, 25]
    });
    
    currentUserMarker = L.marker([userCoords.lat, userCoords.lng], { icon: userIcon })
      .addTo(currentMap)
      .bindPopup(`
        <div style="font-size: 14px; line-height: 1.4;">
          <strong>Your Location</strong><br>
          <i class="fas fa-map-marker-alt" style="color: #007bff;"></i> ${userCoords.display_name}
        </div>
      `);
    
    // Get route
    const officeCoords = {
      lat: currentOfficeMarker.getLatLng().lat,
      lng: currentOfficeMarker.getLatLng().lng
    };
    
    const routeData = await getRoute(userCoords, officeCoords);
    
    if (routeData) {
      // Remove existing route
      if (currentRoute) {
        currentMap.removeLayer(currentRoute);
      }
      
      // Add route to map
      currentRoute = L.geoJSON(routeData.geometry, {
        style: {
          color: '#28a745',
          weight: 5,
          opacity: 0.8,
          dashArray: '10, 10'
        }
      }).addTo(currentMap);
      
      // Fit map to show both locations and route
      const group = L.featureGroup([currentUserMarker, currentOfficeMarker, currentRoute]);
      currentMap.fitBounds(group.getBounds().pad(0.1));
      
      // Show route information
      const distance = (routeData.distance / 1000).toFixed(1);
      const duration = Math.round(routeData.duration / 60);
      
      showNotification(`Route found: ${distance} km, ${duration} minutes`, 'info');
      
      // Show legend elements
      showUserLocationElements();
      
    } else {
      showNotification('Could not find a route to the destination', 'error');
    }
    
  } catch (error) {
    console.error('[ERROR] Failed to get directions:', error);
    showNotification('Failed to get directions. Please try again.', 'error');
  } finally {
    directionsBtn.innerHTML = originalContent;
    directionsBtn.disabled = false;
  }
}

// Show/hide user location related UI elements
function showUserLocationElements() {
  document.getElementById('userLocationLegend').style.display = 'flex';
  document.getElementById('routeLegend').style.display = 'flex';
}

function hideUserLocationElements() {
  document.getElementById('userLocationLegend').style.display = 'none';
  document.getElementById('routeLegend').style.display = 'none';
}

// Show/hide map loading state
function showMapLoading(isLoading) {
  const mapContainer = document.getElementById('map');
  
  if (isLoading) {
    mapContainer.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #718096; flex-direction: column; gap: 1rem;">
        <i class="fas fa-spinner fa-spin" style="font-size: 2rem;"></i>
        <p>Loading map...</p>
      </div>
    `;
  }
}

// Add event listeners for map controls
document.addEventListener('DOMContentLoaded', function() {
  // Current location button
  document.getElementById('getCurrentLocation').addEventListener('click', getCurrentUserLocation);
  
  // Get directions button
  document.getElementById('getDirections').addEventListener('click', getDirections);
  
  // Close modal when clicking outside
  document.getElementById('mapModal').addEventListener('click', function(e) {
    if (e.target === this) {
      closeMapModal();
    }
  });
  
  // Enable Enter key for user location input
  document.getElementById('userLocation').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      getDirections();
    }
  });
});

