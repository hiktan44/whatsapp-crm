// Supabase Client for WhatsApp CRM
class SupabaseClient {
    constructor() {
        // Use environment config, then fallbacks
        this.supabaseUrl = (window.ENV_CONFIG && window.ENV_CONFIG.SUPABASE_URL) ||
                          window.SUPABASE_URL || 
                          localStorage.getItem('supabase_url') || 
                          'https://xvxiwcbiqiqzfqisrvib.supabase.co';
        this.supabaseKey = (window.ENV_CONFIG && window.ENV_CONFIG.SUPABASE_ANON_KEY) ||
                          window.SUPABASE_ANON_KEY || 
                          localStorage.getItem('supabase_anon_key') || 
                          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2eGl3Y2JpcWlxemZxaXNydmliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxODgyMTUsImV4cCI6MjA3MTc2NDIxNX0.xXPa7e66odQd-ivYKa2ny4OSuXWya9FBQR8_wvRIJvg';
        this.isRealMode = this.supabaseUrl !== 'demo' && this.supabaseKey !== 'demo' && this.supabaseUrl.includes('supabase.co');
        
        console.log('🗄️ Supabase Client Config:', {
            url: this.supabaseUrl ? '✅ Set' : '❌ Missing',
            key: this.supabaseKey ? '✅ Set' : '❌ Missing', 
            realMode: this.isRealMode,
            environment: window.ENV_CONFIG ? window.ENV_CONFIG.ENVIRONMENT : 'unknown'
        });
        
        if (this.isRealMode) {
            this.initSupabase();
        }
        
        console.log(`🗄️ Supabase Client: ${this.isRealMode ? 'REAL MODE' : 'DEMO MODE'}`);
    }

    async initSupabase() {
        try {
            // Import Supabase client dynamically
            const { createClient } = await import('https://cdn.skypack.dev/@supabase/supabase-js');
            
            this.supabase = createClient(this.supabaseUrl, this.supabaseKey, {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false
                },
                realtime: {
                    params: {
                        eventsPerSecond: 10
                    }
                }
            });

            console.log('✅ Supabase client initialized');
            
            // Test connection
            await this.testConnection();
            
            // Setup real-time subscriptions
            this.setupRealtimeSubscriptions();
            
        } catch (error) {
            console.error('❌ Supabase initialization failed:', error);
            this.isRealMode = false;
        }
    }

    async testConnection() {
        try {
            const { data, error } = await this.supabase
                .from('contacts')
                .select('count')
                .limit(1);
                
            if (error) throw error;
            
            console.log('✅ Database connection successful');
            return true;
        } catch (error) {
            console.error('❌ Database connection failed:', error);
            return false;
        }
    }

    // Contact operations
    async syncContact(contactData) {
        if (!this.isRealMode) {
            return { data: contactData, error: null };
        }

        try {
            const { data, error } = await this.supabase
                .from('contacts')
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
                .single();
                
            return { data, error };
        } catch (error) {
            console.error('Contact sync error:', error);
            return { data: null, error };
        }
    }

    async getContacts(limit = 50, offset = 0) {
        if (!this.isRealMode) {
            // Return demo contacts
            return {
                data: [
                    {
                        id: "demo1@c.us",
                        name: "Demo Contact 1",
                        number: "demo1",
                        isMyContact: true,
                        profilePicUrl: null
                    }
                ],
                error: null,
                totalCount: 1
            };
        }

        try {
            // Get total count
            const { count } = await this.supabase
                .from('contacts')
                .select('*', { count: 'exact', head: true });

            // Get contacts
            const { data, error } = await this.supabase
                .from('contacts')
                .select('*')
                .order('updated_at', { ascending: false })
                .range(offset, offset + limit - 1);
                
            return { 
                data: data?.map(this.formatContact) || [], 
                error,
                totalCount: count || 0
            };
        } catch (error) {
            console.error('Get contacts error:', error);
            return { data: [], error, totalCount: 0 };
        }
    }

    async updateSubscription(whatsappId, isSubscribed) {
        if (!this.isRealMode) {
            return { data: { isSubscribed }, error: null };
        }

        try {
            const { data, error } = await this.supabase
                .from('contacts')
                .update({ is_subscribed: isSubscribed })
                .eq('whatsapp_id', whatsappId)
                .select();
                
            return { data, error };
        } catch (error) {
            console.error('Update subscription error:', error);
            return { data: null, error };
        }
    }

    // Message operations
    async saveMessage(messageData) {
        if (!this.isRealMode) {
            return { data: messageData, error: null };
        }

        try {
            // First ensure contact exists
            await this.syncContact({
                id: messageData.from || messageData.to,
                name: messageData.contactName || 'Unknown',
                number: (messageData.from || messageData.to).replace('@c.us', ''),
                isMyContact: true
            });

            const { data: contact } = await this.supabase
                .from('contacts')
                .select('id')
                .eq('whatsapp_id', messageData.from || messageData.to)
                .single();

            const { data, error } = await this.supabase
                .from('messages')
                .insert({
                    whatsapp_message_id: messageData.messageId,
                    contact_id: contact?.id,
                    direction: messageData.direction,
                    content: messageData.content || messageData.body,
                    message_type: messageData.type || 'text',
                    status: messageData.status || 'sent',
                    timestamp: messageData.timestamp ? new Date(messageData.timestamp * 1000).toISOString() : new Date().toISOString()
                })
                .select()
                .single();
                
            return { data, error };
        } catch (error) {
            console.error('Save message error:', error);
            return { data: null, error };
        }
    }

    async getConversation(contactId, limit = 20) {
        if (!this.isRealMode) {
            return { data: [], error: null };
        }

        try {
            const { data, error } = await this.supabase
                .from('messages')
                .select('*')
                .eq('contact_id', contactId)
                .order('timestamp', { ascending: false })
                .limit(limit);
                
            return { data, error };
        } catch (error) {
            console.error('Get conversation error:', error);
            return { data: [], error };
        }
    }

    // Campaign operations
    async createCampaign(campaignData) {
        if (!this.isRealMode) {
            return { data: { id: 'demo-campaign-' + Date.now(), ...campaignData }, error: null };
        }

        try {
            const { data, error } = await this.supabase
                .from('campaigns')
                .insert(campaignData)
                .select()
                .single();
                
            return { data, error };
        } catch (error) {
            console.error('Create campaign error:', error);
            return { data: null, error };
        }
    }

    async updateCampaignStats(campaignId, stats) {
        if (!this.isRealMode) {
            return { data: stats, error: null };
        }

        try {
            const { data, error } = await this.supabase
                .from('campaigns')
                .update({
                    sent_count: stats.sentCount,
                    failed_count: stats.failedCount,
                    status: stats.status,
                    completed_at: stats.status === 'completed' ? new Date().toISOString() : null
                })
                .eq('id', campaignId)
                .select();
                
            return { data, error };
        } catch (error) {
            console.error('Update campaign stats error:', error);
            return { data: null, error };
        }
    }

    // AI Conversation operations
    async saveAIConversation(contactId, conversationData) {
        if (!this.isRealMode) {
            return { data: conversationData, error: null };
        }

        try {
            const { data, error } = await this.supabase
                .from('ai_conversations')
                .upsert({
                    contact_id: contactId,
                    conversation_data: conversationData,
                    last_ai_response_at: new Date().toISOString(),
                    total_messages: conversationData.messages?.length || 0,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'contact_id'
                })
                .select();
                
            return { data, error };
        } catch (error) {
            console.error('Save AI conversation error:', error);
            return { data: null, error };
        }
    }

    // Analytics operations
    async updateDailyStats(stats) {
        if (!this.isRealMode) {
            return { data: stats, error: null };
        }

        try {
            const today = new Date().toISOString().split('T')[0];
            
            const { data, error } = await this.supabase
                .from('analytics')
                .upsert({
                    date: today,
                    ...stats
                }, {
                    onConflict: 'date'
                })
                .select();
                
            return { data, error };
        } catch (error) {
            console.error('Update daily stats error:', error);
            return { data: null, error };
        }
    }

    async getDailyStats(days = 7) {
        if (!this.isRealMode) {
            // No demo data - return empty
            console.log('📝 Demo mode: No analytics data');
            return { data: [], error: null };
        }

        try {
            const { data, error } = await this.supabase
                .from('analytics')
                .select('*')
                .order('date', { ascending: false })
                .limit(days);
                
            return { data, error };
        } catch (error) {
            console.error('Get daily stats error:', error);
            return { data: [], error };
        }
    }

    // Real-time subscriptions
    setupRealtimeSubscriptions() {
        if (!this.isRealMode) return;

        try {
            // Subscribe to new messages
            this.messagesChannel = this.supabase
                .channel('messages-channel')
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages'
                }, (payload) => {
                    console.log('🔔 New message:', payload.new);
                    if (window.crm && window.crm.handleRealtimeMessage) {
                        window.crm.handleRealtimeMessage(payload.new);
                    }
                })
                .subscribe();

            // Subscribe to contact updates
            this.contactsChannel = this.supabase
                .channel('contacts-channel')
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'contacts'
                }, (payload) => {
                    console.log('🔔 Contact update:', payload);
                    if (window.crm && window.crm.handleRealtimeContactUpdate) {
                        window.crm.handleRealtimeContactUpdate(payload);
                    }
                })
                .subscribe();

            console.log('✅ Real-time subscriptions active');
        } catch (error) {
            console.error('❌ Real-time subscription error:', error);
        }
    }

    // Utility functions
    formatContact(contact) {
        return {
            id: contact.whatsapp_id,
            name: contact.name || 'Unnamed',
            number: contact.number,
            isMyContact: contact.is_my_contact,
            profilePicUrl: contact.profile_pic_url,
            isSubscribed: contact.is_subscribed,
            lastMessageAt: contact.last_message_at,
            tags: contact.tags || [],
            metadata: contact.metadata || {}
        };
    }

    // Get system status
    getStatus() {
        return {
            isRealMode: this.isRealMode,
            hasConnection: this.supabase ? true : false,
            url: this.supabaseUrl !== 'demo' ? this.supabaseUrl : null
        };
    }

    // Cleanup
    destroy() {
        if (this.messagesChannel) {
            this.messagesChannel.unsubscribe();
        }
        if (this.contactsChannel) {
            this.contactsChannel.unsubscribe();
        }
    }
}

// Initialize global Supabase client
window.supabaseClient = new SupabaseClient();
