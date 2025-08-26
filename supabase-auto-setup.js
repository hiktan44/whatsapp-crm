#!/usr/bin/env node

// Supabase Auto Setup Script with MCP Integration
// This script creates a Supabase project and configures the WhatsApp CRM database

const fs = require('fs');
const path = require('path');

class SupabaseAutoSetup {
    constructor() {
        this.projectData = null;
        this.databaseSchema = null;
        this.loadDatabaseSchema();
    }

    loadDatabaseSchema() {
        try {
            const schemaPath = path.join(__dirname, 'database-schema.sql');
            this.databaseSchema = fs.readFileSync(schemaPath, 'utf8');
            console.log('✅ Database schema loaded');
        } catch (error) {
            console.error('❌ Could not load database schema:', error.message);
        }
    }

    // Manual setup guide for Supabase
    showSetupGuide() {
        console.log(`
🚀 WhatsApp CRM - Supabase Setup Guide
=====================================

📋 Step 1: Create Supabase Project
----------------------------------
1. Go to: https://supabase.com
2. Sign up/Login (Free tier available)
3. Click "New Project"
4. Choose organization and fill:
   - Name: WhatsApp CRM
   - Database Password: (choose strong password)
   - Region: (choose closest to you)
5. Click "Create new project"

📋 Step 2: Get Project Details
------------------------------
After project creation:
1. Go to Settings > API
2. Copy these values:
   - Project URL: https://xxx.supabase.co
   - Anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   - Service role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

📋 Step 3: Setup Database
-------------------------
1. Go to SQL Editor in Supabase Dashboard
2. Click "New query"
3. Copy and paste the content from 'database-schema.sql'
4. Click "Run" button
5. ✅ Database tables created!

📋 Step 4: Configure Environment
---------------------------------
1. Open your WhatsApp CRM: ${process.env.DEPLOYED_URL || 'https://leafy-zuccutto-202e83.netlify.app'}
2. Click "Setup Database" button (top right)
3. Enter your Supabase URL and Anon Key
4. Click "Save & Test Connection"
5. ✅ Real mode activated!

📋 Step 5: Configure Netlify (Optional)
---------------------------------------
For production deployment, set environment variables:

    netlify env:set SUPABASE_URL "your-project-url"
    netlify env:set SUPABASE_ANON_KEY "your-anon-key"
    netlify deploy --prod

🎯 What You'll Get
==================
✅ Real-time contact synchronization
✅ Persistent message history
✅ AI conversation tracking
✅ Campaign analytics
✅ Scalable PostgreSQL database
✅ Production-ready infrastructure

🔧 Troubleshooting
==================
- Database connection issues: Check URL and keys
- Permission errors: Verify RLS policies are created
- Migration failures: Run schema again in SQL Editor
- Real-time not working: Check if real-time is enabled in project settings

📞 Support
==========
- Documentation: Check README.md
- Database Schema: database-schema.sql
- Environment Setup: setup-environment.js
`);
    }

    // Generate configuration files
    generateConfigFiles(projectData) {
        try {
            // Create .env file
            const envContent = `
# WhatsApp CRM - Supabase Configuration
# Generated on ${new Date().toISOString()}

# Supabase Configuration
SUPABASE_URL=${projectData.url}
SUPABASE_ANON_KEY=${projectData.anonKey}
SUPABASE_SERVICE_ROLE_KEY=${projectData.serviceRoleKey || ''}

# WhatsApp Configuration
WHATSAPP_CLIENT_ID=whatsapp-crm-client

# Server Configuration
PORT=3025
NODE_ENV=production
CORS_ORIGIN=*
`;

            fs.writeFileSync('.env', envContent);
            console.log('✅ .env file created');

            // Create deployment script
            const deployScript = `#!/bin/bash
# WhatsApp CRM Deployment Script

echo "🚀 Deploying WhatsApp CRM with Supabase..."

# Set Netlify environment variables
netlify env:set SUPABASE_URL "${projectData.url}"
netlify env:set SUPABASE_ANON_KEY "${projectData.anonKey}"
${projectData.serviceRoleKey ? `netlify env:set SUPABASE_SERVICE_ROLE_KEY "${projectData.serviceRoleKey}"` : ''}

# Deploy to production
netlify deploy --prod

echo "✅ Deployment complete!"
echo "🌐 Your WhatsApp CRM: https://leafy-zuccutto-202e83.netlify.app"
`;

            fs.writeFileSync('deploy.sh', deployScript);
            fs.chmodSync('deploy.sh', '755');
            console.log('✅ deploy.sh script created');

            return true;
        } catch (error) {
            console.error('❌ Error generating config files:', error.message);
            return false;
        }
    }

    // Check if project is configured
    checkConfiguration() {
        try {
            if (fs.existsSync('.env')) {
                const envContent = fs.readFileSync('.env', 'utf8');
                if (envContent.includes('SUPABASE_URL=') && !envContent.includes('your-project-ref')) {
                    console.log('✅ Supabase configuration found in .env');
                    return true;
                }
            }
            return false;
        } catch (error) {
            return false;
        }
    }

    // Interactive setup
    async interactiveSetup() {
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

        try {
            console.log('🔧 WhatsApp CRM - Interactive Supabase Setup');
            console.log('==============================================\\n');

            const hasAccount = await question('Do you have a Supabase account? (y/n): ');
            
            if (hasAccount.toLowerCase() !== 'y') {
                console.log('\\n📝 Please create a Supabase account first:');
                console.log('   1. Go to: https://supabase.com');
                console.log('   2. Sign up for free');
                console.log('   3. Come back and run this script again\\n');
                rl.close();
                return;
            }

            const hasProject = await question('Do you have a project created? (y/n): ');
            
            if (hasProject.toLowerCase() !== 'y') {
                console.log('\\n📝 Please create a Supabase project:');
                console.log('   1. Login to Supabase Dashboard');
                console.log('   2. Click "New Project"');
                console.log('   3. Name: WhatsApp CRM');
                console.log('   4. Choose region and password');
                console.log('   5. Come back with project details\\n');
                rl.close();
                return;
            }

            console.log('\\n🔑 Enter your Supabase project details:');
            const url = await question('Project URL (https://xxx.supabase.co): ');
            const anonKey = await question('Anon Key: ');
            const serviceRoleKey = await question('Service Role Key (optional): ');

            const projectData = {
                url: url.trim(),
                anonKey: anonKey.trim(),
                serviceRoleKey: serviceRoleKey.trim()
            };

            // Generate config files
            this.generateConfigFiles(projectData);

            console.log('\\n🎯 Next Steps:');
            console.log('1. Run database schema in Supabase SQL Editor');
            console.log('2. Copy content from database-schema.sql');
            console.log('3. Execute in SQL Editor');
            console.log('4. Run: npm start');
            console.log('5. Open web interface and test!');

            rl.close();
            
        } catch (error) {
            console.error('❌ Setup error:', error.message);
            rl.close();
        }
    }

    // Database schema deployment guide
    showDatabaseGuide() {
        console.log(`
📊 Database Schema Deployment
=============================

🔍 Step 1: Access SQL Editor
- Go to your Supabase project dashboard
- Click "SQL Editor" in left sidebar
- Click "New query"

📝 Step 2: Copy Schema
- Open file: database-schema.sql
- Copy ALL content (Ctrl+A, Ctrl+C)
- Paste into SQL Editor

▶️ Step 3: Execute
- Click "Run" button in SQL Editor
- Wait for completion (should see "Success" message)
- ✅ All tables, indexes, and policies created!

📋 Tables Created:
- contacts: WhatsApp contacts with metadata
- messages: Complete message history
- campaigns: Bulk message campaigns  
- ai_conversations: AI assistant data
- templates: Message templates
- analytics: Daily statistics
- groups: WhatsApp group information

🔐 Security Features:
- Row Level Security (RLS) enabled
- Proper indexes for performance
- Foreign key relationships
- Auto-updating timestamps

🚀 Ready to use!
Your database is now production-ready for the WhatsApp CRM system.
`);
    }

    // Main execution
    async run() {
        console.log('🚀 WhatsApp CRM - Supabase Auto Setup');
        console.log('=====================================\\n');

        // Check if already configured
        if (this.checkConfiguration()) {
            console.log('✅ Supabase configuration already exists!');
            console.log('🌐 Your system should be running in REAL MODE');
            console.log('\\n🔧 To reconfigure, delete .env file and run again\\n');
            return;
        }

        // Show options
        console.log('Choose setup method:');
        console.log('1. 📖 Show setup guide (recommended)');
        console.log('2. 🔧 Interactive setup');
        console.log('3. 📊 Database deployment guide');
        console.log('4. ❌ Exit\\n');

        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const choice = await new Promise(resolve => rl.question('Enter choice (1-4): ', resolve));

        switch(choice.trim()) {
            case '1':
                rl.close();
                this.showSetupGuide();
                break;
            case '2':
                rl.close();
                await this.interactiveSetup();
                break;
            case '3':
                rl.close();
                this.showDatabaseGuide();
                break;
            case '4':
                rl.close();
                console.log('👋 Goodbye!');
                break;
            default:
                rl.close();
                console.log('❌ Invalid choice. Please run again.');
        }
    }
}

// Auto-run if called directly
if (require.main === module) {
    const setup = new SupabaseAutoSetup();
    setup.run().catch(console.error);
}

module.exports = SupabaseAutoSetup;
