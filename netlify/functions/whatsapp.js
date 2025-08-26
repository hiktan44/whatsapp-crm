// Netlify Function for WhatsApp API with Supabase integration
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project-ref.supabase.co'
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key'
const supabase = createClient(supabaseUrl, supabaseKey)

exports.handler = async (event, context) => {
    // Set CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight OPTIONS request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    try {
        const path = event.path.replace('/.netlify/functions/whatsapp', '') || '/';
        const method = event.httpMethod;
        
        console.log(`WhatsApp API Request: ${method} ${path}`);

        // Health check endpoint
        if (path === '/health' && method === 'GET') {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    status: 'healthy',
                    whatsapp: 'demo_mode',
                    uptime: Date.now(),
                    message: 'Netlify serverless function active'
                })
            };
        }

        // Status endpoint
        if (path === '/status' && method === 'GET') {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    status: 'ready',
                    hasQR: false,
                    connectedSockets: 1,
                    message: 'Demo mode - Connect external WhatsApp service for real functionality'
                })
            };
        }

        // Send message endpoint
        if (path === '/send' && method === 'POST') {
            const body = JSON.parse(event.body || '{}');
            const { to, message } = body;
            
            if (!to || !message) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        error: 'Missing required fields: to, message'
                    })
                };
            }

            try {
                // Get or create contact
                const { data: contact, error: contactError } = await supabase
                    .from('contacts')
                    .select('id')
                    .eq('whatsapp_id', to)
                    .single()

                let contactId = contact?.id

                if (!contact) {
                    // Create new contact
                    const { data: newContact, error: createError } = await supabase
                        .from('contacts')
                        .insert({
                            whatsapp_id: to,
                            number: to.replace('@c.us', ''),
                            name: 'Unknown Contact'
                        })
                        .select('id')
                        .single()

                    if (createError) throw createError
                    contactId = newContact.id
                }

                // Save message to database
                const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                
                const { error: messageError } = await supabase
                    .from('messages')
                    .insert({
                        whatsapp_message_id: messageId,
                        contact_id: contactId,
                        direction: 'outbound',
                        content: message,
                        message_type: 'text',
                        status: 'sent'
                    })

                if (messageError) throw messageError

                // Update contact last message time
                await supabase
                    .from('contacts')
                    .update({ 
                        last_message_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', contactId)

                console.log(`Message saved to Supabase: ${to} -> ${message}`)
                
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        messageId: messageId,
                        to: to,
                        timestamp: new Date().toISOString(),
                        source: 'Supabase Database',
                        note: 'Message saved to database - Connect WhatsApp service for real sending'
                    })
                };
            } catch (error) {
                console.error('Message save error:', error)
                
                // Fallback to demo response
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        messageId: `demo_${Date.now()}_${to}`,
                        to: to,
                        timestamp: new Date().toISOString(),
                        note: 'DEMO MODE: Database save failed',
                        error: error.message
                    })
                };
            }
        }

        // Contacts endpoint - Get from Supabase
        if (path === '/contacts' && method === 'GET') {
            try {
                const { data: contacts, error } = await supabase
                    .from('contacts')
                    .select('*')
                    .order('updated_at', { ascending: false })
                    .limit(100)

                if (error) throw error

                const formattedContacts = contacts.map(contact => ({
                    id: contact.whatsapp_id,
                    name: contact.name || 'Unnamed',
                    number: contact.number,
                    isMyContact: contact.is_my_contact,
                    profilePicUrl: contact.profile_pic_url,
                    isSubscribed: contact.is_subscribed,
                    lastMessageAt: contact.last_message_at
                }))

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        contacts: formattedContacts,
                        total: contacts.length,
                        source: 'Supabase Database'
                    })
                };
            } catch (error) {
                console.error('Contacts fetch error:', error)
                
                // Fallback to demo data
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        contacts: [
                            {
                                id: "demo1@c.us",
                                name: "Demo Contact 1", 
                                number: "demo1",
                                isMyContact: true,
                                profilePicUrl: null
                            }
                        ],
                        message: 'Demo data - Supabase connection failed',
                        error: error.message
                    })
                };
            }
        }

        // Groups endpoint
        if (path === '/groups' && method === 'GET') {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    groups: [
                        {
                            id: "demo_group@g.us",
                            name: "Demo Group",
                            description: "Demo WhatsApp Group",
                            members: 5
                        }
                    ],
                    message: 'DEMO MODE: Connect external WhatsApp service for real groups'
                })
            };
        }

        // Default 404 response
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({
                success: false,
                error: `Endpoint not found: ${method} ${path}`,
                availableEndpoints: [
                    'GET /health',
                    'GET /status', 
                    'POST /send',
                    'GET /contacts',
                    'GET /groups'
                ]
            })
        };

    } catch (error) {
        console.error('Netlify function error:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: 'Internal server error',
                message: error.message
            })
        };
    }
};
