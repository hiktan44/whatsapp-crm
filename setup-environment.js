// Environment Setup Script for WhatsApp CRM
// This script helps configure Supabase and Netlify environment variables

class EnvironmentSetup {
    constructor() {
        this.config = {
            supabase: {
                url: '',
                anonKey: '',
                serviceRoleKey: ''
            },
            netlify: {
                siteId: '',
                accessToken: ''
            }
        };
    }

    // Check if we're running in browser or Node.js
    isNode() {
        return typeof window === 'undefined';
    }

    // Load configuration from user input
    async promptForConfig() {
        if (this.isNode()) {
            // Node.js environment
            const readline = require('readline');
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

            console.log('🚀 WhatsApp CRM Environment Setup');
            console.log('=====================================\n');

            console.log('1️⃣ Supabase Configuration:');
            this.config.supabase.url = await question('Supabase URL (https://xxx.supabase.co): ');
            this.config.supabase.anonKey = await question('Supabase Anon Key: ');
            this.config.supabase.serviceRoleKey = await question('Supabase Service Role Key (optional): ');

            console.log('\n2️⃣ Netlify Configuration:');
            this.config.netlify.siteId = await question('Netlify Site ID: ');
            this.config.netlify.accessToken = await question('Netlify Access Token (optional): ');

            rl.close();
        } else {
            // Browser environment - show configuration form
            this.showConfigForm();
        }
    }

    // Show configuration form in browser
    showConfigForm() {
        const formHTML = `
            <div id="envSetupModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                    <h2 class="text-xl font-bold mb-4">🚀 Environment Setup</h2>
                    
                    <form id="envSetupForm">
                        <div class="mb-4">
                            <label class="block text-sm font-medium mb-2">Supabase URL</label>
                            <input type="url" id="supabaseUrl" class="w-full border rounded p-2" 
                                   placeholder="https://xxx.supabase.co" required>
                        </div>
                        
                        <div class="mb-4">
                            <label class="block text-sm font-medium mb-2">Supabase Anon Key</label>
                            <textarea id="supabaseAnonKey" class="w-full border rounded p-2 h-20" 
                                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." required></textarea>
                        </div>
                        
                        <div class="mb-4">
                            <label class="block text-sm font-medium mb-2">Supabase Service Role Key (optional)</label>
                            <textarea id="supabaseServiceKey" class="w-full border rounded p-2 h-20" 
                                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."></textarea>
                        </div>
                        
                        <div class="flex gap-2">
                            <button type="submit" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                                Save & Test Connection
                            </button>
                            <button type="button" onclick="this.closest('#envSetupModal').remove()" 
                                    class="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">
                                Cancel
                            </button>
                        </div>
                    </form>
                    
                    <div id="setupStatus" class="mt-4 text-sm"></div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', formHTML);
        
        document.getElementById('envSetupForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleFormSubmit();
        });
    }

    // Handle form submission
    async handleFormSubmit() {
        const statusDiv = document.getElementById('setupStatus');
        statusDiv.innerHTML = '<div class="text-blue-500">⏳ Testing connection...</div>';

        try {
            this.config.supabase.url = document.getElementById('supabaseUrl').value;
            this.config.supabase.anonKey = document.getElementById('supabaseAnonKey').value;
            this.config.supabase.serviceRoleKey = document.getElementById('supabaseServiceKey').value;

            // Set global variables for immediate use
            window.SUPABASE_URL = this.config.supabase.url;
            window.SUPABASE_ANON_KEY = this.config.supabase.anonKey;

            // Test connection
            const connectionTest = await this.testSupabaseConnection();
            
            if (connectionTest.success) {
                statusDiv.innerHTML = '<div class="text-green-500">✅ Connection successful!</div>';
                
                // Save to localStorage
                localStorage.setItem('supabase_config', JSON.stringify(this.config.supabase));
                
                // Reinitialize Supabase client
                if (window.supabaseClient) {
                    window.supabaseClient.destroy();
                }
                window.supabaseClient = new SupabaseClient();
                
                setTimeout(() => {
                    document.getElementById('envSetupModal').remove();
                    window.location.reload(); // Reload to apply new config
                }, 2000);
            } else {
                statusDiv.innerHTML = `<div class="text-red-500">❌ Connection failed: ${connectionTest.error}</div>`;
            }
        } catch (error) {
            statusDiv.innerHTML = `<div class="text-red-500">❌ Error: ${error.message}</div>`;
        }
    }

    // Test Supabase connection
    async testSupabaseConnection() {
        try {
            const { createClient } = await import('https://cdn.skypack.dev/@supabase/supabase-js');
            const testClient = createClient(this.config.supabase.url, this.config.supabase.anonKey);
            
            const { data, error } = await testClient
                .from('contacts')
                .select('count')
                .limit(1);
                
            if (error) {
                return { success: false, error: error.message };
            }
            
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Generate Netlify environment setup commands
    generateNetlifyCommands() {
        const commands = [
            `netlify env:set SUPABASE_URL "${this.config.supabase.url}"`,
            `netlify env:set SUPABASE_ANON_KEY "${this.config.supabase.anonKey}"`
        ];

        if (this.config.supabase.serviceRoleKey) {
            commands.push(`netlify env:set SUPABASE_SERVICE_ROLE_KEY "${this.config.supabase.serviceRoleKey}"`);
        }

        return commands;
    }

    // Load saved configuration
    loadSavedConfig() {
        try {
            const saved = localStorage.getItem('supabase_config');
            if (saved) {
                const config = JSON.parse(saved);
                window.SUPABASE_URL = config.url;
                window.SUPABASE_ANON_KEY = config.anonKey;
                return true;
            }
        } catch (error) {
            console.error('Error loading saved config:', error);
        }
        return false;
    }

    // Show setup instructions
    showInstructions() {
        const instructionsHTML = `
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h3 class="font-bold text-blue-800 mb-2">🔧 Setup Instructions</h3>
                <ol class="list-decimal list-inside text-sm text-blue-700 space-y-1">
                    <li>Create a Supabase project at <a href="https://supabase.com" target="_blank" class="underline">supabase.com</a></li>
                    <li>Copy your project URL and anon key from Settings > API</li>
                    <li>Run the database schema from <code>database-schema.sql</code></li>
                    <li>Configure environment variables in this form</li>
                    <li>Test the connection and start using real data!</li>
                </ol>
            </div>
        `;
        
        return instructionsHTML;
    }

    // Export configuration for deployment
    exportConfig() {
        const config = {
            netlifyCommands: this.generateNetlifyCommands(),
            supabaseConfig: this.config.supabase,
            instructions: [
                '1. Run these commands in your terminal:',
                ...this.generateNetlifyCommands(),
                '2. Deploy your site:',
                'netlify deploy --prod',
                '3. Your WhatsApp CRM is now running in real mode!'
            ]
        };

        console.log('📋 Configuration Export:', config);
        return config;
    }
}

// Auto-load saved configuration if available
if (typeof window !== 'undefined') {
    const envSetup = new EnvironmentSetup();
    if (!envSetup.loadSavedConfig()) {
        // Show setup button in header if no config found
        setTimeout(() => {
            const header = document.querySelector('.header-right');
            if (header && !window.SUPABASE_URL) {
                const setupBtn = document.createElement('button');
                setupBtn.className = 'btn-secondary';
                setupBtn.innerHTML = '<i class="fas fa-cog"></i> Setup Database';
                setupBtn.onclick = () => envSetup.showConfigForm();
                header.insertBefore(setupBtn, header.firstChild);
            }
        }, 1000);
    }
    
    window.EnvironmentSetup = EnvironmentSetup;
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnvironmentSetup;
}
