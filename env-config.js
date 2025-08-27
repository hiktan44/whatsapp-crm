// Environment Configuration for Netlify Frontend
// This file exposes environment variables to the frontend in Netlify

// Check if we're in Netlify build context or frontend
const isNetlifyBuild = typeof process !== 'undefined' && process.env.NETLIFY;
const isNetlifyRuntime = typeof window !== 'undefined' && window.location.hostname.includes('netlify.app');

// Environment configuration
window.ENV_CONFIG = {
    // Supabase configuration with fallbacks
    SUPABASE_URL: isNetlifyRuntime 
        ? 'https://xvxiwcbiqiqzfqisrvib.supabase.co'
        : (typeof process !== 'undefined' ? process.env.SUPABASE_URL : null) 
          || 'https://xvxiwcbiqiqzfqisrvib.supabase.co',
    
    SUPABASE_ANON_KEY: isNetlifyRuntime 
        ? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2eGl3Y2JpcWlxemZxaXNydmliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxODgyMTUsImV4cCI6MjA3MTc2NDIxNX0.xXPa7e66odQd-ivYKa2ny4OSuXWya9FBQR8_wvRIJvg'
        : (typeof process !== 'undefined' ? process.env.SUPABASE_ANON_KEY : null)
          || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2eGl3Y2JpcWlxemZxaXNydmliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxODgyMTUsImV4cCI6MjA3MTc2NDIxNX0.xXPa7e66odQd-ivYKa2ny4OSuXWya9FBQR8_wvRIJvg',
    
    // API endpoint configuration
    API_ENDPOINT: isNetlifyRuntime 
        ? '/.netlify/functions'
        : 'http://localhost:3025',
    
    // WhatsApp Server endpoint configuration
    WHATSAPP_SERVER: isNetlifyRuntime 
        ? 'https://whatsappcrm-production.up.railway.app'  // Railway deployment URL
        : 'http://localhost:3025',
    
    // Environment indicator
    ENVIRONMENT: isNetlifyRuntime ? 'netlify' : 'local',
    
    // Debug information
    DEBUG: {
        isNetlifyBuild,
        isNetlifyRuntime,
        hostname: typeof window !== 'undefined' ? window.location.hostname : 'server',
        userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'server'
    }
};

// Global variables for backward compatibility
window.SUPABASE_URL = window.ENV_CONFIG.SUPABASE_URL;
window.SUPABASE_ANON_KEY = window.ENV_CONFIG.SUPABASE_ANON_KEY;

// Log configuration for debugging
console.log('🔧 Environment Configuration:', {
    environment: window.ENV_CONFIG.ENVIRONMENT,
    supabaseUrl: window.ENV_CONFIG.SUPABASE_URL ? '✅ Set' : '❌ Missing',
    supabaseKey: window.ENV_CONFIG.SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing',
    apiEndpoint: window.ENV_CONFIG.API_ENDPOINT,
    debug: window.ENV_CONFIG.DEBUG
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.ENV_CONFIG;
}
