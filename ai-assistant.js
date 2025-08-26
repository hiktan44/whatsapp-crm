// AI Assistant Module for WhatsApp CRM
if (typeof window !== 'undefined' && window.AIAssistant) {
    console.log('🔄 AI Assistant already loaded, reusing...');
} else {
class AIAssistant {
    constructor() {
        this.conversations = new Map();
        this.messageBuffer = new Map();
        this.bufferTimeout = new Map();
        this.ragDatabase = [];
        this.isActive = false;
        this.settings = {
            bufferDelay: 25000, // 25 seconds
            maxBufferSize: 10,
            timezone: 'Europe/Istanbul',
            workingHours: { start: 9, end: 18 },
            appointmentDuration: 30
        };
        
        this.init();
    }

    init() {
        this.loadRAGDatabase();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // AI Assistant toggle
        const aiToggle = document.getElementById('aiAssistantToggle');
        if (aiToggle) {
            aiToggle.addEventListener('change', (e) => {
                this.isActive = e.target.checked;
                this.showNotification(
                    this.isActive ? 'AI Asistan aktifleştirildi' : 'AI Asistan devre dışı bırakıldı',
                    'info'
                );
                
                // Update UI status
                if (window.crm && window.crm.updateAIStatus) {
                    window.crm.updateAIStatus();
                }
            });
        }

        // Settings
        document.getElementById('saveAISettings')?.addEventListener('click', () => {
            this.saveSettings();
        });

        // RAG Database management
        document.getElementById('addKnowledgeBase')?.addEventListener('click', () => {
            this.showKnowledgeBaseModal();
        });
    }

    // Message Buffer System (like you explained)
    addToBuffer(phoneNumber, message) {
        if (!this.messageBuffer.has(phoneNumber)) {
            this.messageBuffer.set(phoneNumber, []);
        }

        const buffer = this.messageBuffer.get(phoneNumber);
        buffer.push({
            content: message.content,
            type: message.type,
            timestamp: Date.now()
        });

        // Clear existing timeout
        if (this.bufferTimeout.has(phoneNumber)) {
            clearTimeout(this.bufferTimeout.get(phoneNumber));
        }

        // Set new timeout
        const timeout = setTimeout(() => {
            this.processBufferedMessages(phoneNumber);
        }, this.settings.bufferDelay);

        this.bufferTimeout.set(phoneNumber, timeout);
    }

    async processBufferedMessages(phoneNumber) {
        const buffer = this.messageBuffer.get(phoneNumber);
        if (!buffer || buffer.length === 0) return;

        // Sort messages by timestamp
        buffer.sort((a, b) => a.timestamp - b.timestamp);

        // Combine all messages into one
        const combinedMessage = buffer.map(msg => msg.content).join(' ');

        // Clear buffer
        this.messageBuffer.delete(phoneNumber);
        this.bufferTimeout.delete(phoneNumber);

        // Process with AI
        await this.processWithAI(phoneNumber, combinedMessage);
    }

    async processWithAI(phoneNumber, message) {
        if (!this.isActive) return;

        try {
            // Get conversation context
            const conversation = this.getConversation(phoneNumber);
            
            // Prepare AI prompt
            const systemPrompt = this.buildSystemPrompt();
            const userPrompt = this.buildUserPrompt(message, conversation);

            // Call AI service (simulated)
            const aiResponse = await this.callAIService(systemPrompt, userPrompt);

            // Handle AI tools (calendar, knowledge base)
            const processedResponse = await this.processAITools(aiResponse, phoneNumber);

            // Send response to customer
            await this.sendResponse(phoneNumber, processedResponse);

            // Update conversation
            this.updateConversation(phoneNumber, message, processedResponse);

        } catch (error) {
            console.error('AI processing error:', error);
            this.sendFallbackResponse(phoneNumber);
        }
    }

    buildSystemPrompt() {
        const currentTime = new Date().toLocaleString('tr-TR', { 
            timeZone: this.settings.timezone 
        });

        return `Sen bir WhatsApp CRM asistanısın. Görevin:

1. Müşteri temsilcisi gibi davran
2. Randevu ayarla (${this.settings.workingHours.start}-${this.settings.workingHours.end} arası)
3. Her randevu ${this.settings.appointmentDuration} dakika
4. Şu anki tarih/saat: ${currentTime}
5. Saat 18'i geçtiyse yarın için randevu öner

KURALLAR:
- Fiyat asla verme
- Kısa ve öz yanıtlar ver
- RAG veri tabanına bak
- Emin değilsen "Detayları görüşmede verebiliriz" de
- Randevu ayarlandıysa calendar tool kullan

TOOLS kullanabilirsin:
- check_calendar: Müsaitlik kontrol et
- create_appointment: Randevu oluştur
- search_knowledge: RAG veri tabanından bilgi al

Örnek konuşma:
Müşteri: "Hizmetleriniz hakkında bilgi istiyorum"
Sen: "Merhaba! Size nasıl yardımcı olabiliriz? Detaylı bilgi için kısa bir telefon görüşmesi ayarlayalım. Bugün 14:00-17:00 arası müsait misiniz?"`;
    }

    buildUserPrompt(message, conversation) {
        let context = '';
        if (conversation.length > 0) {
            context = 'Önceki konuşma:\n' + 
                conversation.slice(-5).map(msg => 
                    `${msg.role}: ${msg.content}`
                ).join('\n') + '\n\n';
        }

        return `${context}Müşteri mesajı: ${message}`;
    }

    async callAIService(systemPrompt, userPrompt) {
        // Simulated AI API call
        // In real implementation, you would call OpenAI, Claude, or other AI service
        
        return new Promise((resolve) => {
            setTimeout(() => {
                // Simulated AI responses based on message content
                const responses = this.getSimulatedResponses(userPrompt);
                const randomResponse = responses[Math.floor(Math.random() * responses.length)];
                resolve(randomResponse);
            }, 1000);
        });
    }

    getSimulatedResponses(userPrompt) {
        const message = userPrompt.toLowerCase();
        
        if (message.includes('merhaba') || message.includes('selam')) {
            return [
                'Merhaba! Size nasıl yardımcı olabiliriz? Hizmetlerimiz hakkında kısa bir görüşme ayarlayalım mı?',
                'İyi günler! Size en iyi şekilde yardımcı olabilmek için telefon görüşmesi önerebilirim. Müsait olduğunuz bir saat var mı?'
            ];
        }
        
        if (message.includes('fiyat') || message.includes('ücret')) {
            return [
                'Fiyatlarımız projenizin detaylarına göre değişkenlik gösteriyor. Detaylı bilgi için görüşelim. Bugün müsait misiniz?',
                'Size en uygun paketi belirlemek için kısa bir görüşme yapalım. Hangi saatler sizin için uygun?'
            ];
        }
        
        if (message.includes('randevu') || message.includes('görüşme')) {
            return [
                'Tabii ki! Hangi gün ve saat sizin için uygun? [TOOL:check_calendar]',
                'Elbette! Size uygun olan bir zamanı söyleyebilir misiniz? [TOOL:check_calendar]'
            ];
        }
        
        if (message.match(/\d{1,2}[:.]\d{2}/) || message.match(/\d{1,2}/)) {
            return [
                'Mükemmel! Randevunuzu ayarlıyorum. [TOOL:create_appointment]',
                'Tamamdır! O saatte müsait misiniz kontrol ediyorum. [TOOL:check_calendar]'
            ];
        }
        
        return [
            'Anlıyorum. Bu konuda size daha detaylı bilgi verebilmek için kısa bir görüşme önerebilirim.',
            'Bu konu hakkında size telefon üzerinden daha iyi yardımcı olabilirim. Müsait olduğunuz bir saat var mı?'
        ];
    }

    async processAITools(response, phoneNumber) {
        if (response.includes('[TOOL:check_calendar]')) {
            const availability = await this.checkCalendarAvailability();
            response = response.replace('[TOOL:check_calendar]', 
                availability ? 'O saatte müsaitim! Randevunuzu onaylıyor musunuz?' : 
                'O saatte başka randevum var. 1 saat sonrasını önerebilir miyim?'
            );
        }
        
        if (response.includes('[TOOL:create_appointment]')) {
            await this.createAppointment(phoneNumber);
            response = response.replace('[TOOL:create_appointment]', 
                'Randevunuz ayarlandı! Size WhatsApp üzerinden bilgilendirme göndereceğiz.'
            );
        }
        
        if (response.includes('[TOOL:search_knowledge]')) {
            const knowledge = await this.searchKnowledgeBase(response);
            response = response.replace('[TOOL:search_knowledge]', knowledge);
        }
        
        return response;
    }

    async checkCalendarAvailability(datetime = null) {
        // Simulated calendar check
        return Math.random() > 0.3; // 70% chance of being available
    }

    async createAppointment(phoneNumber) {
        // Simulated appointment creation
        const appointment = {
            id: Date.now(),
            phoneNumber,
            datetime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
            duration: this.settings.appointmentDuration,
            status: 'scheduled'
        };
        
        // In real implementation, this would create a Google Calendar event
        console.log('Appointment created:', appointment);
        
        // Notify admin
        this.notifyAdmin(`Yeni randevu: ${phoneNumber} - ${appointment.datetime.toLocaleString('tr-TR')}`);
        
        return appointment;
    }

    async searchKnowledgeBase(query) {
        // Simple keyword matching in RAG database
        const results = this.ragDatabase.filter(item => 
            item.content.toLowerCase().includes(query.toLowerCase())
        );
        
        return results.length > 0 ? results[0].content : 
            'Bu konu hakkında detaylı bilgiyi görüşmemizde paylaşabilirim.';
    }

    async sendResponse(phoneNumber, message) {
        console.log(`🤖 AI Asistan yanıtı: ${phoneNumber} -> ${message}`);
        
        // Send via WhatsApp API
        try {
            const response = await fetch('/whatsapp/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    to: phoneNumber,
                    message: message
                })
            });
            
            const result = await response.json();
            if (result.success) {
                console.log('✅ AI mesajı başarıyla gönderildi:', result.messageId);
                this.displayMessage(phoneNumber, message, 'sent');
            } else {
                console.error('❌ AI mesajı gönderilemedi:', result.error);
            }
        } catch (error) {
            console.error('❌ AI mesaj gönderim hatası:', error);
            // Fallback to UI display only
            this.displayMessage(phoneNumber, message, 'sent');
        }
    }

    sendFallbackResponse(phoneNumber) {
        const fallbackMessage = 'Anlayamadım, size telefon üzerinden yardımcı olmak isterim. Müsait olduğunuz bir saat var mı?';
        this.sendResponse(phoneNumber, fallbackMessage);
    }

    getConversation(phoneNumber) {
        if (!this.conversations.has(phoneNumber)) {
            this.conversations.set(phoneNumber, []);
        }
        return this.conversations.get(phoneNumber);
    }

    updateConversation(phoneNumber, userMessage, aiResponse) {
        const conversation = this.getConversation(phoneNumber);
        conversation.push(
            { role: 'user', content: userMessage, timestamp: Date.now() },
            { role: 'assistant', content: aiResponse, timestamp: Date.now() }
        );
        
        // Keep only last 20 messages
        if (conversation.length > 20) {
            conversation.splice(0, conversation.length - 20);
        }
    }

    loadRAGDatabase() {
        // Sample knowledge base
        this.ragDatabase = [
            {
                id: 1,
                category: 'services',
                content: 'WhatsApp CRM hizmeti sunuyoruz. Müşteri yönetimi, toplu mesaj gönderimi ve AI asistan özelliklerimiz var.'
            },
            {
                id: 2,
                category: 'pricing',
                content: 'Fiyatlarımız paket içeriğine göre değişir. Detaylı bilgi için görüşelim.'
            },
            {
                id: 3,
                category: 'features',
                content: 'Bulk sender, contact management, template sistemi, analytics ve AI assistant özelliklerimiz bulunuyor.'
            },
            {
                id: 4,
                category: 'support',
                content: '7/24 destek hizmeti veriyoruz. WhatsApp, telefon ve email üzerinden ulaşabilirsiniz.'
            }
        ];
    }

    displayMessage(phoneNumber, message, type) {
        // Create conversation UI if doesn't exist
        let conversationPanel = document.getElementById('aiConversations');
        if (!conversationPanel) {
            conversationPanel = this.createConversationPanel();
        }

        // Find or create conversation thread
        let thread = document.getElementById(`thread-${phoneNumber}`);
        if (!thread) {
            thread = this.createConversationThread(phoneNumber);
            conversationPanel.appendChild(thread);
        }

        // Add message to thread
        const messageElement = document.createElement('div');
        messageElement.className = `ai-message ${type}`;
        messageElement.innerHTML = `
            <div class="message-content">${message}</div>
            <div class="message-time">${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
        `;
        
        thread.querySelector('.messages').appendChild(messageElement);
        thread.querySelector('.messages').scrollTop = thread.querySelector('.messages').scrollHeight;
    }

    createConversationPanel() {
        const panel = document.createElement('div');
        panel.id = 'aiConversations';
        panel.className = 'ai-conversations-panel';
        panel.innerHTML = `
            <div class="panel-header">
                <h3><i class="fas fa-robot"></i> AI Asistan Konuşmaları</h3>
                <button class="btn-secondary" onclick="aiAssistant.togglePanel()">
                    <i class="fas fa-minimize"></i>
                </button>
            </div>
            <div class="conversations-list"></div>
        `;
        
        document.body.appendChild(panel);
        return panel;
    }

    createConversationThread(phoneNumber) {
        const thread = document.createElement('div');
        thread.id = `thread-${phoneNumber}`;
        thread.className = 'conversation-thread';
        thread.innerHTML = `
            <div class="thread-header">
                <div class="contact-info">
                    <div class="contact-avatar">${phoneNumber.slice(-4)}</div>
                    <div>
                        <strong>${phoneNumber}</strong>
                        <span class="status online">AI Aktif</span>
                    </div>
                </div>
                <div class="thread-actions">
                    <button class="btn-sm" onclick="aiAssistant.takeOver('${phoneNumber}')">
                        <i class="fas fa-user"></i> Devral
                    </button>
                </div>
            </div>
            <div class="messages"></div>
            <div class="message-input">
                <input type="text" placeholder="Manuel mesaj gönder..." onkeypress="aiAssistant.handleManualMessage(event, '${phoneNumber}')">
                <button onclick="aiAssistant.sendManualMessage('${phoneNumber}')">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </div>
        `;
        
        return thread;
    }

    takeOver(phoneNumber) {
        // Disable AI for this conversation
        const conversation = this.getConversation(phoneNumber);
        conversation.aiDisabled = true;
        
        // Update UI
        const thread = document.getElementById(`thread-${phoneNumber}`);
        const status = thread.querySelector('.status');
        status.textContent = 'Manuel Kontrol';
        status.className = 'status manual';
        
        this.showNotification(`${phoneNumber} numarası için AI devre dışı bırakıldı`, 'info');
    }

    handleManualMessage(event, phoneNumber) {
        if (event.key === 'Enter') {
            this.sendManualMessage(phoneNumber);
        }
    }

    sendManualMessage(phoneNumber) {
        const thread = document.getElementById(`thread-${phoneNumber}`);
        const input = thread.querySelector('.message-input input');
        const message = input.value.trim();
        
        if (!message) return;
        
        this.sendResponse(phoneNumber, message);
        input.value = '';
    }

    notifyAdmin(message) {
        // Show desktop notification if permission granted
        if (Notification.permission === 'granted') {
            new Notification('WhatsApp CRM', {
                body: message,
                icon: '/icons/logo_48.png'
            });
        }
        
        // Show in-app notification
        this.showNotification(message, 'info');
    }

    showNotification(message, type = 'info', duration = 5000) {
        // Reuse the notification system from main CRM
        if (window.crm && window.crm.showNotification) {
            window.crm.showNotification(message, type, duration);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    saveSettings() {
        const settings = {
            bufferDelay: parseInt(document.getElementById('bufferDelay')?.value) * 1000 || this.settings.bufferDelay,
            workingHours: {
                start: parseInt(document.getElementById('workingStart')?.value) || this.settings.workingHours.start,
                end: parseInt(document.getElementById('workingEnd')?.value) || this.settings.workingHours.end
            },
            appointmentDuration: parseInt(document.getElementById('appointmentDuration')?.value) || this.settings.appointmentDuration
        };
        
        this.settings = { ...this.settings, ...settings };
        this.showNotification('AI Asistan ayarları kaydedildi', 'success');
    }

    // Public API for integration
    enable() {
        this.isActive = true;
    }

    disable() {
        this.isActive = false;
    }

    addKnowledgeItem(category, content) {
        this.ragDatabase.push({
            id: Date.now(),
            category,
            content,
            createdAt: new Date()
        });
    }

    // Simulate incoming message (for testing)
    simulateIncomingMessage(phoneNumber, message) {
        console.log(`Simulated message from ${phoneNumber}: ${message}`);
        
        // Display incoming message
        this.displayMessage(phoneNumber, message, 'received');
        
        // Add to buffer
        this.addToBuffer(phoneNumber, {
            content: message,
            type: 'text',
            fromMe: false
        });
    }
}

// Initialize AI Assistant
document.addEventListener('DOMContentLoaded', () => {
    window.aiAssistant = new AIAssistant();
    
    // Setup notification permission request on user interaction
    const setupNotificationPermission = () => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    };
    
    // Add click listener to any button for notification permission
    document.addEventListener('click', setupNotificationPermission, { once: true });
});

// CSS Styles for AI Assistant
const aiStyles = `
<style>
.ai-conversations-panel {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 400px;
    height: 500px;
    background: white;
    border-radius: 12px;
    box-shadow: var(--shadow-lg);
    z-index: 1000;
    display: flex;
    flex-direction: column;
}

.ai-conversations-panel .panel-header {
    padding: 1rem;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-radius: 12px 12px 0 0;
    background: var(--whatsapp-green);
    color: white;
}

.conversations-list {
    flex: 1;
    overflow-y: auto;
}

.conversation-thread {
    display: flex;
    flex-direction: column;
    height: 100%;
}

.thread-header {
    padding: 1rem;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.contact-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.contact-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--whatsapp-green);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
}

.status {
    font-size: 0.8rem;
    padding: 0.25rem 0.5rem;
    border-radius: 12px;
    margin-top: 0.25rem;
    display: inline-block;
}

.status.online {
    background: #E8F5E8;
    color: var(--success-color);
}

.status.manual {
    background: #FFF2E8;
    color: var(--warning-color);
}

.thread-actions .btn-sm {
    padding: 0.5rem 0.75rem;
    font-size: 0.8rem;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    background: white;
    cursor: pointer;
}

.messages {
    flex: 1;
    padding: 1rem;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.ai-message {
    max-width: 80%;
    padding: 0.75rem;
    border-radius: 12px;
    word-wrap: break-word;
}

.ai-message.received {
    align-self: flex-start;
    background: var(--whatsapp-gray);
    border-bottom-left-radius: 4px;
}

.ai-message.sent {
    align-self: flex-end;
    background: var(--whatsapp-light-green);
    border-bottom-right-radius: 4px;
}

.message-time {
    font-size: 0.7rem;
    color: var(--text-secondary);
    text-align: right;
    margin-top: 0.25rem;
}

.message-input {
    padding: 1rem;
    border-top: 1px solid var(--border-color);
    display: flex;
    gap: 0.5rem;
}

.message-input input {
    flex: 1;
    padding: 0.5rem;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    font-size: 0.9rem;
}

.message-input button {
    padding: 0.5rem 0.75rem;
    background: var(--whatsapp-green);
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
}
</style>
`;

// Inject styles
document.head.insertAdjacentHTML('beforeend', aiStyles);

// Close the conditional block
}

// Initialize only if not already done
if (typeof window !== 'undefined' && !window.aiAssistant) {
    window.aiAssistant = new AIAssistant();
    console.log('✅ AI Assistant initialized');
}