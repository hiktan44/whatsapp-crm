// WhatsApp Web.js Server for CRM Integration
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const qrcode = require('qrcode');
const qrcodeTerminal = require('qrcode-terminal');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://xvxiwcbiqiqzfqisrvib.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2eGl3Y2JpcWlxemZxaXNydmliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxODgyMTUsImV4cCI6MjA3MTc2NDIxNX0.xXPa7e66odQd-ivYKa2ny4OSuXWya9FBQR8_wvRIJvg';
const supabase = createClient(supabaseUrl, supabaseKey);

// Express app setup
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = './uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { 
        fileSize: 250 * 1024 * 1024 // 250MB
    },
    fileFilter: (req, file, cb) => {
        // Fix Turkish character encoding
        file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
        cb(null, true);
    }
});

// Serve static files
app.use(express.static(__dirname));

// WhatsApp client setup
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: 'whatsapp-crm-client',
        dataPath: './whatsapp-auth'
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--disable-gpu',
            '--disable-extensions',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-blink-features=AutomationControlled',
            '--no-default-browser-check',
            '--disable-web-security',
            '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ],
        timeout: 60000
    },

    // Disable media compression to preserve quality
    mediaOptions: {
        sendMediaAsDocument: false,
        compressImages: false
    }
});

let isClientReady = false;
let currentQR = null;
let connectedSockets = new Set();

// WhatsApp client events
client.on('qr', (qr) => {
    console.log('🔥 QR KOD TERMİNAL\'DE GÖRÜNTÜLENMEKTE:');
    console.log('📱 Telefonunuzla aşağıdaki QR kodu tarayın:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Terminal'de QR kodu göster
    qrcodeTerminal.generate(qr, { small: true });
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 WhatsApp → ⋮ (Menü) → Bağlı Cihazlar → Cihaz Bağla → QR Kodu Tarayın');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    currentQR = qr;
    
    // Send QR to all connected clients
    connectedSockets.forEach(socket => {
        socket.emit('qr', qr);
    });
});

client.on('ready', async () => {
    console.log('WhatsApp Client is ready!');
    isClientReady = true;
    currentQR = null;
    
    // Notify all connected clients
    connectedSockets.forEach(socket => {
        socket.emit('ready');
    });
});

client.on('authenticated', () => {
    console.log('WhatsApp Client authenticated');
});

client.on('auth_failure', (msg) => {
    console.error('Authentication failed:', msg);
    
    connectedSockets.forEach(socket => {
        socket.emit('auth_failure', msg);
    });
});

client.on('disconnected', (reason) => {
    console.log('WhatsApp Client disconnected:', reason);
    isClientReady = false;
    
    connectedSockets.forEach(socket => {
        socket.emit('disconnected', reason);
    });
});

client.on('message', async (message) => {
    console.log('New message received:', message.body);
    
    // Check for unsubscribe message
    if (message.body && message.body.toUpperCase().includes('ABONELIK IPTAL')) {
        console.log('📧 Abonelik iptali mesajı alındı:', message.from);
        
        // Extract contact info
        const contactPhone = message.from.replace('@c.us', '');
        const contact = await message.getContact();
        const contactName = contact.pushname || contact.verifiedName || 'İsim belirtilmemiş';
        
        // Send unsubscribe notification to CRM
        connectedSockets.forEach(socket => {
            socket.emit('unsubscribe_notification', {
                phone: contactPhone,
                name: contactName,
                timestamp: new Date().toISOString()
            });
        });
        
        // Send confirmation reply to user
        try {
            const confirmationMessage = `✅ ${contactName}, abonelik iptal talebiniz alındı. Artık bu numaraya toplu mesaj gönderilmeyecektir.`;
            await message.reply(confirmationMessage);
            console.log('📧 Abonelik iptali onay mesajı gönderildi');
        } catch (error) {
            console.error('❌ Abonelik iptali onay mesajı gönderilemedi:', error);
        }
    }
    
    // Forward message to CRM and AI Assistant
    connectedSockets.forEach(socket => {
        socket.emit('message_received', {
            from: message.from,
            body: message.body,
            timestamp: message.timestamp,
            isGroup: message.isGroupMsg
        });
        
        // Forward to AI Assistant if enabled
        socket.emit('ai_message_received', {
            phoneNumber: message.from,
            message: {
                content: message.body,
                type: 'text',
                timestamp: message.timestamp,
                isGroup: message.isGroupMsg
            }
        });
    });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    connectedSockets.add(socket);

    // Send current status
    if (isClientReady) {
        socket.emit('ready');
    } else if (currentQR) {
        socket.emit('qr', currentQR);
    }

    // Handle QR request
    socket.on('request_qr', () => {
        console.log('QR request received from client:', socket.id);
        if (currentQR) {
            console.log('Sending current QR to client:', currentQR.substring(0, 50) + '...');
            socket.emit('qr', currentQR);
        } else if (!isClientReady) {
            console.log('No QR available, restarting WhatsApp client...');
            client.initialize();
        }
    });

    // Handle contact requests
    socket.on('get_contacts', async () => {
        try {
            if (!isClientReady) {
                socket.emit('error', 'WhatsApp client not ready');
                return;
            }

            console.log('Getting contacts...');
            const contacts = await client.getContacts();
            
            // Filter out groups and format contacts
            const formattedContacts = contacts
                .filter(contact => !contact.isGroup && contact.isMyContact)
                .map(contact => ({
                    id: contact.id,
                    name: contact.name || contact.pushname,
                    number: contact.number,
                    profilePicUrl: contact.profilePicUrl,
                    isMyContact: contact.isMyContact,
                    lastSeen: contact.lastSeen
                }));

            console.log(`Sending ${formattedContacts.length} contacts`);
            socket.emit('contacts', formattedContacts);

        } catch (error) {
            console.error('Error getting contacts:', error);
            socket.emit('error', 'Failed to get contacts: ' + error.message);
        }
    });

    // Handle group requests
    socket.on('get_groups', async () => {
        try {
            if (!isClientReady) {
                socket.emit('error', 'WhatsApp client not ready');
                return;
            }

            console.log('Getting groups...');
            const chats = await client.getChats();
            
            // Filter only groups
            const groups = chats
                .filter(chat => chat.isGroup)
                .map(group => ({
                    id: group.id,
                    name: group.name,
                    description: group.description,
                    participants: group.participants,
                    isGroup: true
                }));

            console.log(`Sending ${groups.length} groups`);
            socket.emit('groups', groups);

        } catch (error) {
            console.error('Error getting groups:', error);
            socket.emit('error', 'Failed to get groups: ' + error.message);
        }
    });

    // Handle message sending
    socket.on('send_message', async (data) => {
        try {
            if (!isClientReady) {
                socket.emit('message_sent', {
                    messageId: data.messageId,
                    success: false,
                    error: 'WhatsApp client not ready'
                });
                return;
            }

            console.log('Sending message to:', data.to);
            
            // Send message via WhatsApp without link preview
            const message = await client.sendMessage(data.to, data.message, {
                linkPreview: false
            });
            
            console.log('Message sent successfully:', message.id);
            
            socket.emit('message_sent', {
                messageId: data.messageId,
                success: true,
                whatsappMessageId: message.id,
                to: data.to
            });

        } catch (error) {
            console.error('Error sending message:', error);
            
            socket.emit('message_sent', {
                messageId: data.messageId,
                success: false,
                error: error.message,
                to: data.to
            });
        }
    });

    // Handle media message sending
    socket.on('send_media', async (data) => {
        try {
            if (!isClientReady) {
                socket.emit('message_sent', {
                    messageId: data.messageId,
                    success: false,
                    error: 'WhatsApp client not ready'
                });
                return;
            }

            console.log('Sending media message to:', data.to);
            
            // Create media object
            const media = MessageMedia.fromFilePath(data.mediaPath);
            
            // Send media message without link preview
            const message = await client.sendMessage(data.to, media, {
                caption: data.caption || '',
                linkPreview: false
            });
            
            console.log('Media message sent successfully:', message.id);
            
            socket.emit('message_sent', {
                messageId: data.messageId,
                success: true,
                whatsappMessageId: message.id,
                to: data.to
            });

        } catch (error) {
            console.error('Error sending media message:', error);
            
            socket.emit('message_sent', {
                messageId: data.messageId,
                success: false,
                error: error.message,
                to: data.to
            });
        }
    });

    // Handle client disconnect
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        connectedSockets.delete(socket);
    });
});

// Express routes
app.get('/', (req, res) => {
    res.json({
        status: isClientReady ? 'ready' : 'connecting',
        hasQR: !!currentQR,
        connectedClients: connectedSockets.size
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        whatsapp: isClientReady ? 'connected' : 'disconnected',
        uptime: process.uptime()
    });
});

// WhatsApp API endpoints
app.post('/whatsapp/send', async (req, res) => {
    try {
        if (!isClientReady) {
            return res.status(503).json({
                success: false,
                error: 'WhatsApp client not ready'
            });
        }

        const { to, message, type = 'text' } = req.body;
        
        if (!to || !message) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: to, message'
            });
        }

        console.log(`📤 HTTP API: Sending message to ${to}`);
        
        // Ensure proper WhatsApp ID format
        let whatsappId = to;
        if (!to.includes('@')) {
            // Default to contact format if no @ symbol
            whatsappId = `${to}@c.us`;
        }
        
        // Log message type (contact vs group)
        const messageType = whatsappId.includes('@g.us') ? 'group' : 'contact';
        console.log(`📤 Sending ${messageType} message to: ${whatsappId}`);
        
        // Send message without link preview (WhatsApp Web.js handles both contacts and groups)
        const sentMessage = await client.sendMessage(whatsappId, message, {
            linkPreview: false
        });
        
        console.log(`✅ HTTP API: Message sent successfully - ID: ${sentMessage.id._serialized}`);
        
        // Save message to Supabase
        try {
            // First, ensure contact exists
            const { data: existingContact } = await supabase
                .from('contacts')
                .select('id')
                .eq('whatsapp_id', whatsappId)
                .single();
            
            let contactId = existingContact?.id;
            
            if (!contactId) {
                // Create new contact
                const { data: newContact, error: contactError } = await supabase
                    .from('contacts')
                    .insert({
                        whatsapp_id: whatsappId,
                        number: whatsappId.replace('@c.us', '').replace('@g.us', ''),
                        name: whatsappId.replace('@c.us', '').replace('@g.us', ''),
                        last_message_at: new Date().toISOString()
                    })
                    .select()
                    .single();
                
                if (contactError) {
                    console.error('❌ Error creating contact in Supabase:', contactError);
                } else {
                    contactId = newContact.id;
                    console.log(`✅ Created new contact in Supabase: ${contactId}`);
                }
            }
            
            // Save message to Supabase
            if (contactId) {
                const { error: messageError } = await supabase
                    .from('messages')
                    .insert({
                        whatsapp_message_id: sentMessage.id._serialized,
                        contact_id: contactId,
                        direction: 'outbound',
                        content: message,
                        message_type: type,
                        status: 'sent',
                        timestamp: new Date().toISOString()
                    });
                
                if (messageError) {
                    console.error('❌ Error saving message to Supabase:', messageError);
                } else {
                    console.log('✅ Message saved to Supabase successfully');
                }
                
                // Update contact last message time
                await supabase
                    .from('contacts')
                    .update({ last_message_at: new Date().toISOString() })
                    .eq('id', contactId);
            }
        } catch (supabaseError) {
            console.error('❌ Supabase operation failed:', supabaseError);
        }
        
        res.json({
            success: true,
            messageId: sentMessage.id._serialized,
            to: whatsappId,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ HTTP API: Error sending message:', error);
        
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// WhatsApp media sending endpoint
app.post('/whatsapp/send-media', upload.array('media'), async (req, res) => {
    try {
        if (!isClientReady) {
            return res.status(503).json({
                success: false,
                error: 'WhatsApp client not ready'
            });
        }

        const { to, message } = req.body;
        const files = req.files;
        
        console.log('📥 Received media upload request:');
        console.log('- To:', to);
        console.log('- Message:', message);
        console.log('- Files count:', files ? files.length : 0);
        if (files) {
            files.forEach((file, index) => {
                console.log(`  File ${index + 1}: ${file.originalname} (${file.size} bytes, ${file.mimetype})`);
            });
        }
        
        if (!to) {
            return res.status(400).json({
                success: false,
                error: 'Missing required field: to'
            });
        }

        if (!files || files.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No media files provided'
            });
        }

        console.log(`📤 HTTP API: Sending media message to ${to}`);
        
        // Ensure proper WhatsApp ID format
        let whatsappId = to;
        if (!to.includes('@')) {
            whatsappId = `${to}@c.us`;
        }
        
        const results = [];
        
        // If multiple files, send as single message with all media
        if (files.length > 1) {
            console.log(`📎 Sending ${files.length} files as single message`);
            
            // Create media array
            const mediaArray = [];
            
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                try {
                    console.log(`📎 Preparing file ${i + 1}/${files.length}: ${file.originalname} (${file.size} bytes)`);
                    
                    // Create media object from file
                    const media = MessageMedia.fromFilePath(file.path);
                    media.filename = file.originalname;
                    
                    // For images, send as document to preserve quality if it's large
                    if (file.mimetype.startsWith('image/') && file.size > 5 * 1024 * 1024) { // 5MB
                        console.log(`📸 Large image will be sent as document: ${file.originalname}`);
                    }
                    
                    mediaArray.push(media);
                    
                } catch (error) {
                    console.error(`❌ Error preparing file ${file.originalname}:`, error);
                    results.push({
                        success: false,
                        filename: file.originalname,
                        error: error.message
                    });
                    
                    // Clean up uploaded file on error
                    if (fs.existsSync(file.path)) {
                        fs.unlinkSync(file.path);
                    }
                }
            }
            
            // Send all media sequentially with same caption approach
            if (mediaArray.length > 0) {
                try {
                    console.log(`📤 Sending ${mediaArray.length} files sequentially with shared caption`);
                    
                    for (let i = 0; i < mediaArray.length; i++) {
                        const media = mediaArray[i];
                        const file = files[i];
                        
                        try {
                            console.log(`📤 Sending file ${i + 1}/${mediaArray.length}: ${file.originalname}`);
                            
                            const sendOptions = {
                                caption: i === 0 ? (message || '') : '', // Only first file gets caption
                                sendMediaAsDocument: file.mimetype.startsWith('image/') ? false : true
                            };
                            
                            // For large images, send as document
                            if (file.mimetype.startsWith('image/') && file.size > 5 * 1024 * 1024) {
                                sendOptions.sendMediaAsDocument = true;
                                console.log(`📸 Large image sent as document: ${file.originalname}`);
                            }
                            
                            // Disable link preview for media messages
                            sendOptions.linkPreview = false;
                            const sentMessage = await client.sendMessage(whatsappId, media, sendOptions);
                            
                            console.log(`✅ File sent successfully: ${file.originalname} - ID: ${sentMessage.id._serialized}`);
                            
                            results.push({
                                success: true,
                                messageId: sentMessage.id._serialized,
                                filename: file.originalname
                            });
                            
                            // Clean up file
                            if (fs.existsSync(file.path)) {
                                fs.unlinkSync(file.path);
                            }
                            
                            // Delay between files
                            if (i < mediaArray.length - 1) {
                                console.log('⏳ Waiting 1 second before next file...');
                                await new Promise(resolve => setTimeout(resolve, 1000));
                            }
                            
                        } catch (fileError) {
                            console.error(`❌ Error sending file ${file.originalname}:`, fileError);
                            results.push({
                                success: false,
                                filename: file.originalname,
                                error: fileError.message
                            });
                            
                            // Clean up file on error
                            if (fs.existsSync(file.path)) {
                                fs.unlinkSync(file.path);
                            }
                        }
                    }
                    
                } catch (error) {
                    console.error('❌ Error in media group processing:', error);
                    
                    // Clean up any remaining files
                    files.forEach(file => {
                        if (fs.existsSync(file.path)) {
                            fs.unlinkSync(file.path);
                        }
                    });
                }
            }
        } else {
            // Single file
            const file = files[0];
            try {
                console.log(`📎 Sending single file: ${file.originalname} (${file.size} bytes)`);
                
                // Create media object from file
                const media = MessageMedia.fromFilePath(file.path);
                media.filename = file.originalname;
                
                // Preserve original quality - don't compress
                const sendOptions = {
                    sendMediaAsDocument: file.mimetype.startsWith('image/') ? false : true,
                    parseVCards: false,
                    caption: message || ''
                };
                
                // For images, send as document to preserve quality if it's large
                if (file.mimetype.startsWith('image/') && file.size > 5 * 1024 * 1024) { // 5MB
                    sendOptions.sendMediaAsDocument = true;
                    console.log(`📸 Sending large image as document to preserve quality: ${file.originalname}`);
                }
                
                // Disable link preview for media messages
                sendOptions.linkPreview = false;
                
                // Send media message with quality preservation options
                const sentMessage = await client.sendMessage(whatsappId, media, sendOptions);
                
                console.log(`✅ HTTP API: Media sent successfully - ID: ${sentMessage.id._serialized}`);
                
                results.push({
                    success: true,
                    messageId: sentMessage.id._serialized,
                    filename: file.originalname
                });
                
                // Clean up uploaded file
                fs.unlinkSync(file.path);
                
            } catch (error) {
                console.error(`❌ Error sending file ${file.originalname}:`, error);
                results.push({
                    success: false,
                    filename: file.originalname,
                    error: error.message
                });
                
                // Clean up uploaded file on error
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            }
        }
        
        res.json({
            success: true,
            to: whatsappId,
            timestamp: new Date().toISOString(),
            results: results
        });

    } catch (error) {
        console.error('❌ HTTP API: Error sending media:', error);
        
        // Clean up any uploaded files on error
        if (req.files) {
            req.files.forEach(file => {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });
        }
        
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/whatsapp/contacts', async (req, res) => {
    try {
        if (!isClientReady) {
            return res.status(503).json({
                success: false,
                error: 'WhatsApp client not ready'
            });
        }

        const contacts = await client.getContacts();
        const formattedContacts = contacts.map(contact => ({
            id: contact.id._serialized,
            name: contact.name || contact.pushname || '',
            number: contact.number || '',
            isMyContact: contact.isMyContact,
            profilePicUrl: contact.profilePicUrl || null
        }));

        res.json({
            success: true,
            contacts: formattedContacts,
            count: formattedContacts.length
        });

    } catch (error) {
        console.error('❌ HTTP API: Error getting contacts:', error);
        
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/whatsapp/status', (req, res) => {
    res.json({
        success: true,
        status: isClientReady ? 'ready' : 'connecting',
        hasQR: !!currentQR,
        connectedSockets: connectedSockets.size
    });
});

// Error handling
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

// Unsubscribe endpoint
app.get('/unsubscribe', async (req, res) => {
    const { phone, name } = req.query;
    
    if (!phone) {
        return res.status(400).send(`
            <html>
                <head><title>Hata</title><meta charset="UTF-8"></head>
                <body style="font-family: Arial; text-align: center; padding: 50px;">
                    <h1 style="color: #e74c3c;">❌ Hata</h1>
                    <p>Geçersiz abonelik iptali talebi.</p>
                </body>
            </html>
        `);
    }

    const cleanPhone = phone.replace(/[^\d]/g, '');
    const contactName = name ? decodeURIComponent(name) : 'İsim belirtilmemiş';
    
    console.log(`📧 Abonelik iptali - Telefon: ${cleanPhone}, İsim: ${contactName}`);
    
    // Emit unsubscribe event to connected clients
    io.emit('unsubscribe_notification', {
        phone: cleanPhone,
        name: contactName,
        timestamp: new Date().toISOString()
    });

    res.send(`
        <html>
            <head>
                <title>Abonelikten Çıkıldı</title>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        margin: 0;
                        padding: 0;
                        min-height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .container {
                        background: white;
                        padding: 40px;
                        border-radius: 12px;
                        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                        text-align: center;
                        max-width: 400px;
                        margin: 20px;
                    }
                    .success-icon {
                        font-size: 64px;
                        color: #27ae60;
                        margin-bottom: 20px;
                    }
                    h1 {
                        color: #2c3e50;
                        margin-bottom: 20px;
                        font-size: 28px;
                    }
                    p {
                        color: #7f8c8d;
                        line-height: 1.6;
                        margin-bottom: 15px;
                    }
                    .contact-info {
                        background: #f8f9fa;
                        padding: 15px;
                        border-radius: 8px;
                        margin: 20px 0;
                        border-left: 4px solid #3498db;
                    }
                    .phone {
                        font-weight: bold;
                        color: #2980b9;
                        font-family: monospace;
                        font-size: 16px;
                    }
                    .footer {
                        margin-top: 30px;
                        padding-top: 20px;
                        border-top: 1px solid #ecf0f1;
                        color: #95a5a6;
                        font-size: 14px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="success-icon">✅</div>
                    <h1>Abonelikten Çıkıldı</h1>
                    <p>Mesaj listemizden başarıyla çıkarıldınız.</p>
                    
                    <div class="contact-info">
                        <p><strong>İsim:</strong> ${contactName}</p>
                        <p><strong>Telefon:</strong> <span class="phone">${phone}</span></p>
                        <p><strong>Tarih:</strong> ${new Date().toLocaleString('tr-TR')}</p>
                    </div>
                    
                    <p>Artık bu numaraya mesaj gönderilmeyecektir.</p>
                    
                    <div class="footer">
                        <p>WhatsApp CRM Sistemi</p>
                    </div>
                </div>
            </body>
        </html>
    `);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    
    if (client) {
        await client.destroy();
    }
    
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

// Start server - Render uses PORT 10000, local development uses 3025
const PORT = process.env.PORT || 3025;
server.listen(PORT, () => {
    console.log(`🚀 WhatsApp CRM Server running on port ${PORT}`);
    console.log('📱 Mode: Real WhatsApp Web.js Integration');
    console.log('🌐 Server URL: http://localhost:' + PORT);
    console.log('🔗 Web Interface: http://localhost:8081/index.html');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⏳ WhatsApp client initializing...');
    
    // Initialize WhatsApp client after a short delay
    setTimeout(() => {
        console.log('🔄 Starting WhatsApp Web.js client...');
        client.initialize();
    }, 3000);
});

module.exports = { app, server, client };