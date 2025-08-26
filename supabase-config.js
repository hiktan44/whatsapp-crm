// Supabase Configuration for WhatsApp CRM
import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project-ref.supabase.co'
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key'

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true
    },
    realtime: {
        params: {
            eventsPerSecond: 10
        }
    }
})

// Database tables schema
export const TABLES = {
    CONTACTS: 'contacts',
    MESSAGES: 'messages', 
    CAMPAIGNS: 'campaigns',
    AI_CONVERSATIONS: 'ai_conversations',
    TEMPLATES: 'templates',
    ANALYTICS: 'analytics'
}

// Initialize database tables
export async function initDatabase() {
    try {
        console.log('🗄️ Initializing Supabase database tables...')
        
        // Check if tables exist and create if needed
        const { data: tables, error } = await supabase
            .rpc('get_table_list')
        
        if (error) {
            console.log('📝 Creating database schema...')
            await createDatabaseSchema()
        }
        
        console.log('✅ Database initialized successfully')
        return true
    } catch (error) {
        console.error('❌ Database initialization failed:', error)
        return false
    }
}

// Create database schema
async function createDatabaseSchema() {
    const schema = `
        -- Contacts table
        CREATE TABLE IF NOT EXISTS contacts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            whatsapp_id TEXT UNIQUE NOT NULL,
            name TEXT,
            number TEXT,
            is_my_contact BOOLEAN DEFAULT false,
            profile_pic_url TEXT,
            last_message_at TIMESTAMP WITH TIME ZONE,
            is_subscribed BOOLEAN DEFAULT true,
            tags TEXT[] DEFAULT '{}',
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Messages table  
        CREATE TABLE IF NOT EXISTS messages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            whatsapp_message_id TEXT UNIQUE,
            contact_id UUID REFERENCES contacts(id),
            direction TEXT CHECK (direction IN ('inbound', 'outbound')),
            content TEXT,
            message_type TEXT DEFAULT 'text',
            media_url TEXT,
            timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            status TEXT DEFAULT 'sent',
            campaign_id UUID,
            metadata JSONB DEFAULT '{}'
        );

        -- Campaigns table
        CREATE TABLE IF NOT EXISTS campaigns (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            message_template TEXT NOT NULL,
            target_type TEXT DEFAULT 'contacts',
            target_contacts UUID[],
            target_groups TEXT[],
            scheduled_at TIMESTAMP WITH TIME ZONE,
            status TEXT DEFAULT 'draft',
            total_recipients INTEGER DEFAULT 0,
            sent_count INTEGER DEFAULT 0,
            failed_count INTEGER DEFAULT 0,
            delay_between_messages INTEGER DEFAULT 5,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            metadata JSONB DEFAULT '{}'
        );

        -- AI Conversations table
        CREATE TABLE IF NOT EXISTS ai_conversations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            contact_id UUID REFERENCES contacts(id),
            conversation_data JSONB DEFAULT '{}',
            ai_enabled BOOLEAN DEFAULT true,
            last_ai_response_at TIMESTAMP WITH TIME ZONE,
            total_messages INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Templates table
        CREATE TABLE IF NOT EXISTS templates (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            content TEXT NOT NULL,
            variables TEXT[] DEFAULT '{}',
            usage_count INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Analytics table
        CREATE TABLE IF NOT EXISTS analytics (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            date DATE DEFAULT CURRENT_DATE,
            total_contacts INTEGER DEFAULT 0,
            messages_sent INTEGER DEFAULT 0,
            messages_received INTEGER DEFAULT 0,
            ai_responses INTEGER DEFAULT 0,
            campaigns_sent INTEGER DEFAULT 0,
            metadata JSONB DEFAULT '{}'
        );

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_contacts_whatsapp_id ON contacts(whatsapp_id);
        CREATE INDEX IF NOT EXISTS idx_messages_contact_id ON messages(contact_id);
        CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
        CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
        CREATE INDEX IF NOT EXISTS idx_ai_conversations_contact_id ON ai_conversations(contact_id);

        -- Enable Row Level Security
        ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
        ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
        ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
        ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
        ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
        ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;

        -- Create policies (allow all for now - customize as needed)
        CREATE POLICY "Allow all operations" ON contacts FOR ALL USING (true);
        CREATE POLICY "Allow all operations" ON messages FOR ALL USING (true);
        CREATE POLICY "Allow all operations" ON campaigns FOR ALL USING (true);
        CREATE POLICY "Allow all operations" ON ai_conversations FOR ALL USING (true);
        CREATE POLICY "Allow all operations" ON templates FOR ALL USING (true);
        CREATE POLICY "Allow all operations" ON analytics FOR ALL USING (true);

        -- Create function to get table list
        CREATE OR REPLACE FUNCTION get_table_list()
        RETURNS TABLE(table_name TEXT) AS $$
        BEGIN
            RETURN QUERY
            SELECT t.table_name::TEXT
            FROM information_schema.tables t
            WHERE t.table_schema = 'public'
            AND t.table_name IN ('contacts', 'messages', 'campaigns', 'ai_conversations', 'templates', 'analytics');
        END;
        $$ LANGUAGE plpgsql;
    `
    
    const { error } = await supabase.rpc('execute_sql', { sql: schema })
    if (error) throw error
}

// Contact operations
export const ContactService = {
    async syncContact(contactData) {
        const { data, error } = await supabase
            .from(TABLES.CONTACTS)
            .upsert({
                whatsapp_id: contactData.id,
                name: contactData.name,
                number: contactData.number,
                is_my_contact: contactData.isMyContact,
                profile_pic_url: contactData.profilePicUrl,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'whatsapp_id'
            })
            .select()
            .single()
            
        if (error) console.error('Contact sync error:', error)
        return { data, error }
    },

    async getContacts(limit = 50, offset = 0) {
        const { data, error } = await supabase
            .from(TABLES.CONTACTS)
            .select('*')
            .order('updated_at', { ascending: false })
            .range(offset, offset + limit - 1)
            
        return { data, error }
    },

    async updateSubscription(whatsappId, isSubscribed) {
        const { data, error } = await supabase
            .from(TABLES.CONTACTS)
            .update({ is_subscribed: isSubscribed })
            .eq('whatsapp_id', whatsappId)
            .select()
            
        return { data, error }
    }
}

// Message operations
export const MessageService = {
    async saveMessage(messageData) {
        const { data, error } = await supabase
            .from(TABLES.MESSAGES)
            .insert({
                whatsapp_message_id: messageData.messageId,
                contact_id: messageData.contactId,
                direction: messageData.direction,
                content: messageData.content,
                message_type: messageData.type || 'text',
                media_url: messageData.mediaUrl,
                status: messageData.status || 'sent',
                campaign_id: messageData.campaignId,
                metadata: messageData.metadata || {}
            })
            .select()
            .single()
            
        if (error) console.error('Message save error:', error)
        return { data, error }
    },

    async getConversation(contactId, limit = 20) {
        const { data, error } = await supabase
            .from(TABLES.MESSAGES)
            .select('*')
            .eq('contact_id', contactId)
            .order('timestamp', { ascending: false })
            .limit(limit)
            
        return { data, error }
    }
}

// Campaign operations
export const CampaignService = {
    async createCampaign(campaignData) {
        const { data, error } = await supabase
            .from(TABLES.CAMPAIGNS)
            .insert(campaignData)
            .select()
            .single()
            
        return { data, error }
    },

    async updateCampaignStats(campaignId, stats) {
        const { data, error } = await supabase
            .from(TABLES.CAMPAIGNS)
            .update({
                sent_count: stats.sentCount,
                failed_count: stats.failedCount,
                status: stats.status
            })
            .eq('id', campaignId)
            .select()
            
        return { data, error }
    }
}

// AI Conversation operations
export const AIService = {
    async saveConversation(contactId, conversationData) {
        const { data, error } = await supabase
            .from(TABLES.AI_CONVERSATIONS)
            .upsert({
                contact_id: contactId,
                conversation_data: conversationData,
                last_ai_response_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'contact_id'
            })
            .select()
            
        return { data, error }
    },

    async getConversationContext(contactId) {
        const { data, error } = await supabase
            .from(TABLES.AI_CONVERSATIONS)
            .select('*')
            .eq('contact_id', contactId)
            .single()
            
        return { data, error }
    }
}

// Analytics operations
export const AnalyticsService = {
    async updateDailyStats(stats) {
        const today = new Date().toISOString().split('T')[0]
        
        const { data, error } = await supabase
            .from(TABLES.ANALYTICS)
            .upsert({
                date: today,
                ...stats
            }, {
                onConflict: 'date'
            })
            .select()
            
        return { data, error }
    },

    async getDailyStats(days = 7) {
        const { data, error } = await supabase
            .from(TABLES.ANALYTICS)
            .select('*')
            .order('date', { ascending: false })
            .limit(days)
            
        return { data, error }
    }
}

// Real-time subscriptions
export const setupRealtimeSubscriptions = (callbacks) => {
    // Subscribe to new messages
    const messagesChannel = supabase
        .channel('messages-channel')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: TABLES.MESSAGES
        }, (payload) => {
            if (callbacks.onNewMessage) {
                callbacks.onNewMessage(payload.new)
            }
        })
        .subscribe()

    // Subscribe to contact updates
    const contactsChannel = supabase
        .channel('contacts-channel')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: TABLES.CONTACTS
        }, (payload) => {
            if (callbacks.onContactUpdate) {
                callbacks.onContactUpdate(payload)
            }
        })
        .subscribe()

    return {
        messagesChannel,
        contactsChannel,
        unsubscribe: () => {
            messagesChannel.unsubscribe()
            contactsChannel.unsubscribe()
        }
    }
}
