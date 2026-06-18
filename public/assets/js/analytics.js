// Vercel Web Analytics Initialization
// This script initializes Vercel Web Analytics using the official @vercel/analytics package
(function() {
  'use strict';
  
  // Initialize Vercel Analytics
  // Note: Make sure Analytics is enabled in the Vercel Dashboard for this project
  
  if (typeof window !== 'undefined') {
    // Queue system for analytics events before the script loads
    window.va = window.va || function() {
      (window.vaq = window.vaq || []).push(arguments);
    };
    
    // Inject the Vercel Analytics script
    // This loads the official script from Vercel's CDN
    var script = document.createElement('script');
    script.defer = true;
    
    // Determine environment - use production mode by default
    var isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    // Use the appropriate script based on environment
    if (isDev) {
      // Development mode - logs events to console
      script.src = '/_vercel/insights/script.debug.js';
      console.log('[Vercel Analytics] Running in development mode');
    } else {
      // Production mode - sends events to Vercel
      script.src = '/_vercel/insights/script.js';
    }
    
    // Only inject if not already present
    if (!document.querySelector('script[src*="/_vercel/insights/"]')) {
      // Handle script load errors gracefully
      script.onerror = function() {
        if (!isDev) {
          console.info('[Vercel Analytics] Script not loaded. Analytics will be available after deploying to Vercel with Analytics enabled.');
        }
      };
      
      script.onload = function() {
        console.log('[Vercel Analytics] Successfully loaded and tracking analytics');
      };
      
      document.head.appendChild(script);
    }
    
    // Track custom events (optional)
    // Example: window.va('event', { name: 'custom-event', data: { key: 'value' } });
  }
})();
