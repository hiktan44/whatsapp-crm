-- WhatsApp CRM Database Schema for Supabase
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Contacts table
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    whatsapp_message_id TEXT UNIQUE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    completed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'
);

-- AI Conversations table
CREATE TABLE IF NOT EXISTS ai_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    conversation_data JSONB DEFAULT '{}',
    ai_enabled BOOLEAN DEFAULT true,
    last_ai_response_at TIMESTAMP WITH TIME ZONE,
    total_messages INTEGER DEFAULT 0,
    context_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Templates table
CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    content TEXT NOT NULL,
    variables TEXT[] DEFAULT '{}',
    usage_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics table
CREATE TABLE IF NOT EXISTS analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE DEFAULT CURRENT_DATE,
    total_contacts INTEGER DEFAULT 0,
    messages_sent INTEGER DEFAULT 0,
    messages_received INTEGER DEFAULT 0,
    ai_responses INTEGER DEFAULT 0,
    campaigns_sent INTEGER DEFAULT 0,
    active_conversations INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Groups table (for WhatsApp groups)
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    whatsapp_group_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    member_count INTEGER DEFAULT 0,
    is_admin BOOLEAN DEFAULT false,
    last_message_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_contacts_whatsapp_id ON contacts(whatsapp_id);
CREATE INDEX IF NOT EXISTS idx_contacts_updated_at ON contacts(updated_at);
CREATE INDEX IF NOT EXISTS idx_contacts_is_subscribed ON contacts(is_subscribed);

CREATE INDEX IF NOT EXISTS idx_messages_contact_id ON messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_messages_direction ON messages(direction);
CREATE INDEX IF NOT EXISTS idx_messages_whatsapp_id ON messages(whatsapp_message_id);

CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns(created_at);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_contact_id ON ai_conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_updated_at ON ai_conversations(updated_at);

CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_is_active ON templates(is_active);

CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics(date);

CREATE INDEX IF NOT EXISTS idx_groups_whatsapp_group_id ON groups(whatsapp_group_id);

-- Enable Row Level Security
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- Create policies (Allow all for authenticated users - customize as needed)
CREATE POLICY "Allow all operations for authenticated users" ON contacts FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'anon');
CREATE POLICY "Allow all operations for authenticated users" ON messages FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'anon');
CREATE POLICY "Allow all operations for authenticated users" ON campaigns FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'anon');
CREATE POLICY "Allow all operations for authenticated users" ON ai_conversations FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'anon');
CREATE POLICY "Allow all operations for authenticated users" ON templates FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'anon');
CREATE POLICY "Allow all operations for authenticated users" ON analytics FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'anon');
CREATE POLICY "Allow all operations for authenticated users" ON groups FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Insert default templates
INSERT INTO templates (name, category, content, variables) VALUES 
('Hoş Geldin Mesajı', 'welcome', 'Merhaba {name}! WhatsApp CRM sistemimize hoş geldiniz. Size nasıl yardımcı olabiliriz?', ARRAY['name']),
('Randevu Hatırlatması', 'appointment', 'Sayın {name}, {date} tarihinde saat {time} randevunuz bulunmaktadır. Lütfen zamanında gelmeyiniz.', ARRAY['name', 'date', 'time']),
('Promosyon Bildirimi', 'marketing', 'Özel fırsat! %{discount} indirim kuponu: {code}. Son kullanma tarihi: {expiry}', ARRAY['discount', 'code', 'expiry']),
('Destek Mesajı', 'support', 'Merhaba {name}, sorununuz ile ilgileniyoruz. En kısa sürede size dönüş yapacağız.', ARRAY['name']),
('Fatura Bildirimi', 'finance', 'Sayın {name}, {amount} TL tutarındaki faturanız {due_date} tarihinde vadesi dolacaktır.', ARRAY['name', 'amount', 'due_date'])
ON CONFLICT DO NOTHING;

-- Create function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_conversations_updated_at BEFORE UPDATE ON ai_conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to get table statistics
CREATE OR REPLACE FUNCTION get_crm_stats()
RETURNS TABLE(
    table_name TEXT,
    row_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 'contacts'::TEXT, COUNT(*)::BIGINT FROM contacts
    UNION ALL
    SELECT 'messages'::TEXT, COUNT(*)::BIGINT FROM messages
    UNION ALL
    SELECT 'campaigns'::TEXT, COUNT(*)::BIGINT FROM campaigns
    UNION ALL
    SELECT 'ai_conversations'::TEXT, COUNT(*)::BIGINT FROM ai_conversations
    UNION ALL
    SELECT 'templates'::TEXT, COUNT(*)::BIGINT FROM templates
    UNION ALL
    SELECT 'groups'::TEXT, COUNT(*)::BIGINT FROM groups;
END;
$$ LANGUAGE plpgsql;

-- Create function to clean old data
CREATE OR REPLACE FUNCTION cleanup_old_data(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- Delete old messages (keeping last 90 days)
    DELETE FROM messages 
    WHERE timestamp < NOW() - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Delete old analytics (keeping last 180 days)
    DELETE FROM analytics 
    WHERE date < CURRENT_DATE - INTERVAL '1 day' * (days_to_keep * 2);
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function for real-time message counting
CREATE OR REPLACE FUNCTION notify_message_count()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify('message_count_changed', 
        json_build_object(
            'contact_id', COALESCE(NEW.contact_id, OLD.contact_id),
            'action', TG_OP,
            'timestamp', NOW()
        )::text
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for real-time notifications
CREATE TRIGGER message_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON messages
    FOR EACH ROW EXECUTE FUNCTION notify_message_count();

COMMENT ON TABLE contacts IS 'WhatsApp kişiler tablosu';
COMMENT ON TABLE messages IS 'Tüm WhatsApp mesajları';
COMMENT ON TABLE campaigns IS 'Toplu mesaj kampanyaları';
COMMENT ON TABLE ai_conversations IS 'AI asistan konuşma verileri';
COMMENT ON TABLE templates IS 'Mesaj şablonları';
COMMENT ON TABLE analytics IS 'Günlük analitik veriler';
COMMENT ON TABLE groups IS 'WhatsApp grup bilgileri';
