// WhatsApp CRM Application v2.0
if (typeof WhatsAppCRM !== 'undefined') {
    console.warn('WhatsAppCRM already defined, skipping redefinition');
}

if (typeof WhatsAppCRM === 'undefined') {
window.WhatsAppCRM = class WhatsAppCRM {
    constructor() {
        this.contacts = []; // Gerçek WhatsApp kişileri yüklenecek
        this.templates = [];
        this.selectedContacts = [];
        this.isConnected = false;
        this.currentSection = 'dashboard';
        this.whatsappClient = null;
        this.socket = null;
        this.qrCode = null;
        this.connectionStatus = 'disconnected';
        // WhatsApp server URL from environment config
        this.serverUrl = window.ENV_CONFIG?.WHATSAPP_SERVER || 'http://localhost:3025';
        this.selectedFiles = []; // Array to store selected files
        this.messageTemplates = this.initMessageTemplates();
        this.broadcastLists = this.initBroadcastLists();
        
        this.init();
        this.initializeWhatsAppConnection();
    }

    async init() {
        this.setupEventListeners();
        this.setupNavigation();
        this.setupModals();
        this.renderDashboard();
        this.loadSettings();
        await this.initializeAutomationSystem();
        await this.initializeAnalyticsSystem();
        this.initializeSettingsSystem();
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const section = e.currentTarget.dataset.section;
                this.navigateToSection(section);
            });
        });

        // Header actions
        document.getElementById('connectWhatsApp')?.addEventListener('click', () => {
            this.showQRModal();
        });

        // Bulk sender actions
        document.getElementById('previewMessage')?.addEventListener('click', () => {
            this.previewMessage();
        });

        document.getElementById('sendBulkMessage')?.addEventListener('click', () => {
            this.sendBulkMessage();
        });

        // Contact management
        document.getElementById('addContact')?.addEventListener('click', () => {
            this.showContactModal();
        });

        document.getElementById('saveContact')?.addEventListener('click', () => {
            this.saveContact();
        });

        document.getElementById('cancelContact')?.addEventListener('click', () => {
            this.hideContactModal();
        });

        // Template management
        document.getElementById('createTemplate')?.addEventListener('click', () => {
            this.showTemplateModal();
        });

        // Recipient type changes
        document.querySelectorAll('input[name="recipientType"]').forEach(radio => {
            radio.addEventListener('change', () => {
                this.updateRecipientSelection();
                this.updateSelectedCount(); // Update count when recipient type changes
            });
        });

        // Manual contact entry
        document.getElementById('addManualContact')?.addEventListener('click', () => {
            this.addManualContact();
        });

        // Settings tab navigation
        document.querySelectorAll('.settings-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchSettingsTab(e.target.dataset.tab);
            });
        });

        // Save settings
        document.getElementById('saveGeneralSettings')?.addEventListener('click', () => {
            this.saveSettings('general');
        });

        document.getElementById('saveAPISettings')?.addEventListener('click', () => {
            this.saveSettings('api');
        });

        document.getElementById('saveMessageSettings')?.addEventListener('click', () => {
            this.saveSettings('messaging');
        });

        // WhatsApp sync
        document.getElementById('syncWhatsAppContacts')?.addEventListener('click', () => {
            this.syncWhatsAppContacts();
        });

        // File import
        document.getElementById('importContacts')?.addEventListener('click', () => {
            this.showImportModal();
        });

        // Message content changes
        const messageContent = document.getElementById('messageContent');
        if (messageContent) {
            messageContent.addEventListener('input', () => {
                this.updateCharCount();
            });
        }

        // Template selection
        const templateSelect = document.getElementById('templateSelect');
        if (templateSelect) {
            templateSelect.addEventListener('change', () => {
                this.loadTemplate();
            });
        }

        // Schedule toggle
        const scheduleCheckbox = document.getElementById('scheduleMessage');
        if (scheduleCheckbox) {
            scheduleCheckbox.addEventListener('change', () => {
                this.toggleScheduleInputs();
            });
        }

        // Media upload
        const mediaFile = document.getElementById('mediaFile');
        if (mediaFile) {
            mediaFile.addEventListener('change', () => {
                this.handleMediaUpload();
            });
        }

        // Template management
        document.getElementById('createTemplate')?.addEventListener('click', () => {
            this.createNewTemplate();
        });

        document.getElementById('saveTemplate')?.addEventListener('click', () => {
            this.saveTemplate();
        });

        // Broadcast management
        document.getElementById('createBroadcast')?.addEventListener('click', () => {
            this.createNewBroadcastList();
        });

        document.getElementById('saveBroadcastList')?.addEventListener('click', () => {
            this.saveBroadcastList();
        });

        document.getElementById('selectBroadcastContacts')?.addEventListener('click', () => {
            this.showContactSelectionModal();
        });

        // Contact search
        const contactSearch = document.getElementById('contactSearch');
        if (contactSearch) {
            contactSearch.addEventListener('input', () => {
                this.filterContacts();
            });
        }

        // Main contact search
        const contactSearchMain = document.getElementById('contactSearchMain');
        if (contactSearchMain) {
            contactSearchMain.addEventListener('input', () => {
                this.filterMainContacts();
            });
        }

        // Select all contacts
        const selectAllContacts = document.getElementById('selectAllContacts');
        if (selectAllContacts) {
            selectAllContacts.addEventListener('change', () => {
                this.toggleAllContacts();
            });
        }

        // Manual phone input
        const manualPhones = document.getElementById('manualPhones');
        if (manualPhones) {
            manualPhones.addEventListener('input', () => {
                this.updateSelectedCount();
            });
        }

        // Contact filters
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.filterContactsByType(e.target.dataset.filter);
            });
        });

        // Bulk delete actions
        document.getElementById('bulkDeleteManual')?.addEventListener('click', () => {
            this.bulkDeleteManualContacts();
        });

        document.getElementById('bulkDeleteImported')?.addEventListener('click', () => {
            this.bulkDeleteImportedContacts();
        });

        // Theme selector for message preview
        this.initThemeSelector();
    }

    initThemeSelector() {
        const themeItems = document.querySelectorAll('.theme-item');
        const themeOptions = document.querySelectorAll('.theme-option');
        const messageBubble = document.getElementById('messageBubble');

        // Handle click on both theme-item and theme-option
        themeItems.forEach(item => {
            item.addEventListener('click', () => {
                const option = item.querySelector('.theme-option');
                this.selectTheme(option, themeOptions, messageBubble);
            });
        });

        themeOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent double triggering
                this.selectTheme(option, themeOptions, messageBubble);
            });
        });

        // Load saved theme
        const savedTheme = localStorage.getItem('selectedMessageTheme') || 'default';
        const savedOption = document.querySelector(`.theme-option[data-theme="${savedTheme}"]`);
        if (savedOption) {
            this.selectTheme(savedOption, themeOptions, messageBubble);
        }
    }

    selectTheme(option, allOptions, messageBubble) {
        // Remove active class from all options
        allOptions.forEach(opt => opt.classList.remove('active'));
        
        // Add active class to clicked option
        option.classList.add('active');
        
        // Remove all theme classes from bubble
        messageBubble.className = 'message-bubble sent';
        
        // Add new theme class
        const theme = option.dataset.theme;
        if (theme !== 'default') {
            messageBubble.classList.add(`theme-${theme}`);
        }
        
        // Store selected theme for future use
        localStorage.setItem('selectedMessageTheme', theme);
        
        // Update preview with theme-specific styling
        this.updatePreviewWithTheme(theme);
    }

    // Theme configurations with emojis and formatting
    getThemeConfig(theme) {
        const themes = {
            'default': {
                emoji: '🟢',
                name: 'WhatsApp Standart',
                headerStyle: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
                prefix: '',
                suffix: ''
            },
            'blue': {
                emoji: '🔵',
                name: 'Kurumsal Mavi',
                headerStyle: '🔵 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 🔵',
                prefix: '💼 ',
                suffix: '\n\n🔵 Kurumsal İletişim'
            },
            'purple': {
                emoji: '🟣',
                name: 'Yaratıcı Mor',
                headerStyle: '🟣 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 🟣',
                prefix: '✨ ',
                suffix: '\n\n🟣 Yaratıcı Çözümler'
            },
            'orange': {
                emoji: '🟠',
                name: 'Enerji Turuncu',
                headerStyle: '🟠 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 🟠',
                prefix: '⚡ ',
                suffix: '\n\n🟠 Dinamik Hizmet'
            },
            'pink': {
                emoji: '🩷',
                name: 'Samimi Pembe',
                headerStyle: '🩷 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 🩷',
                prefix: '💕 ',
                suffix: '\n\n🩷 Samimi İletişim'
            },
            'cyan': {
                emoji: '🔷',
                name: 'Modern Cyan',
                headerStyle: '🔷 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 🔷',
                prefix: '🚀 ',
                suffix: '\n\n🔷 İnovatif Yaklaşım'
            },
            'dark': {
                emoji: '⚫',
                name: 'Prestij Siyah',
                headerStyle: '⚫ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ⚫',
                prefix: '👑 ',
                suffix: '\n\n⚫ Premium Hizmet'
            },
            'gold': {
                emoji: '🟡',
                name: 'Lüks Altın',
                headerStyle: '🟡 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 🟡',
                prefix: '💎 ',
                suffix: '\n\n🟡 VIP İletişim'
            },
            'red': {
                emoji: '🔴',
                name: 'Acil Kırmızı',
                headerStyle: '🔴 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 🔴',
                prefix: '⚠️ ',
                suffix: '\n\n🔴 Acil Bilgilendirme'
            }
        };
        
        return themes[theme] || themes['default'];
    }

    updatePreviewWithTheme(theme) {
        // This method will be used to show how the message will look with theme styling
        const messageContent = document.getElementById('messageContent')?.value || 'Örnek mesaj içeriği...';
        const messageBubble = document.getElementById('messageBubble');
        const previewContent = document.getElementById('previewContent');
        
        if (messageContent.trim()) {
            // Process with variables for preview
            const processedMessage = this.processMessageVariables(messageContent);
            const styledMessage = this.applyMessageTheme(processedMessage, theme);
            
            // Update message bubble (don't set innerHTML, it contains previewContent)
            if (messageBubble) {
                // Just apply theme classes, content is handled by previewContent
            }
            
            // Also update preview content if modal is open
            if (previewContent) {
                previewContent.innerHTML = styledMessage.replace(/\n/g, '<br>');
            }
        }
    }

    // Apply theme styling to actual message
    applyMessageTheme(message, theme) {
        const config = this.getThemeConfig(theme);
        
        if (theme === 'default') {
            return message;
        }
        
        // Add theme-specific styling
        let styledMessage = config.headerStyle + '\n\n';
        styledMessage += config.prefix + message + config.suffix;
        
        return styledMessage;
    }

    setupNavigation() {
        // Set initial active section
        this.navigateToSection('dashboard');
    }

    setupModals() {
        // Close modals when clicking outside
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });

        // Close button handlers
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.modal').classList.remove('active');
            });
        });
    }

    navigateToSection(section) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-section="${section}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(section).classList.add('active');

        this.currentSection = section;

        // Load section-specific data
        switch(section) {
            case 'contacts':
                this.renderContacts();
                break;
            case 'bulk-sender':
                this.renderBulkSender();
                break;
            case 'templates':
                this.renderTemplates();
                break;
            case 'broadcast':
                this.renderBroadcast();
                break;
        }
    }

    // Real WhatsApp Web Integration
    initializeWhatsAppConnection() {
        // Initialize Socket.IO connection to WhatsApp server
        try {
            this.socket = io(this.serverUrl, {
                transports: ['websocket', 'polling'],
                timeout: 10000
            });

            this.socket.on('connect', () => {
                console.log('Connected to WhatsApp server');
            });

            // Gelen QR kodunu dinle
            this.socket.on('qr', (qr) => {
                console.log('✅ QR KODU ALINDI (socket)');
                this.handleQRCode(qr);
            });

            // Ready event from WhatsApp server
            this.socket.on('ready', () => {
                console.log('✅ WhatsApp bağlantısı başarılı!');
                this.handleWhatsAppReady();
            });

            // AI Assistant message handler
            this.socket.on('ai_message_received', (data) => {
                if (window.aiAssistant && !data.message.isGroup) {
                    console.log('🤖 AI Asistan\'a mesaj yönlendiriliyor:', data.phoneNumber);
                    window.aiAssistant.addToBuffer(data.phoneNumber, data.message);
                }
            });

            // Evolution API entegrasyonu için güncellenmiş event handler'lar
            this.socket.on('status', (data) => {
                console.log('📱 WhatsApp durumu:', data.status);
                if (data.status === 'ready') {
                    this.handleWhatsAppReady();
                } else if (data.status === 'disconnected') {
                    this.handleWhatsAppDisconnected();
                }
            });

            this.socket.on('whatsapp-ready', () => {
                console.log('✅ WhatsApp hazır! Evolution API bağlantısı aktif.');
                this.handleWhatsAppReady();
            });

            this.socket.on('message', (msg) => {
                console.log('💬 Server mesajı:', msg);
                this.showNotification(msg, 'info');
            });

            this.socket.on('auth_failure', (msg) => {
                console.error('❌ Kimlik doğrulama başarısız:', msg);
                this.showNotification('WhatsApp kimlik doğrulama başarısız: ' + msg, 'error');
                this.updateQRStatus('Kimlik doğrulama başarısız - QR kodu yeniden tarayın', 'error');
            });

            this.socket.on('disconnected', () => {
                this.handleWhatsAppDisconnected();
            });

            this.socket.on('unsubscribe_notification', (data) => {
                console.log('📧 Abonelik iptali bildirimi:', data);
                this.handleUnsubscribeNotification(data);
            });

            this.socket.on('contacts', (contacts) => {
                this.handleContactsReceived(contacts);
            });

            this.socket.on('groups', (groups) => {
                this.handleGroupsReceived(groups);
            });

            this.socket.on('message_sent', (result) => {
                this.handleMessageSent(result);
            });

            this.socket.on('connect_error', (error) => {
                console.error('Connection error:', error);
                this.showNotification('WhatsApp sunucusuna bağlanılamadı.', 'error');
            });

        } catch (error) {
            console.error('WhatsApp initialization error:', error);
            this.showNotification('WhatsApp bağlantısı başlatılamadı. Lütfen sunucunun çalıştığından emin olun.', 'error');
        }
    }

    showQRModal() {
        const modal = document.getElementById('qrModal');
        if (modal) {
            modal.classList.add('active');
        }

        try {
            // Evolution API entegrasyonu için WhatsApp durumu kontrol et
            if (this.socket && this.socket.connected) {
                console.log('📡 Socket bağlı, QR kodu isteniyor...');
                this.socket.emit('request_qr');
                this.updateQRStatus('QR kodu bekleniyor...', 'loading');
            } else {
                console.log('❌ Socket bağlı değil!');
                this.showNotification('WhatsApp sunucusuna bağlanılamadı. Sunucuyu yeniden başlatın.', 'error');
                this.updateQRStatus('Sunucuya bağlanılamadı.', 'error');
            }
        } catch (error) {
            console.error('❌ WhatsApp bağlantısı kontrol edilirken hata:', error);
            this.showNotification('WhatsApp bağlantısı kontrol edilemedi: ' + error.message, 'error');
        }
    }

    hideQRModal() {
        const modal = document.getElementById('qrModal');
        modal.style.display = 'none';
    }

    // Gelen QR kod verisini işler ve modal içinde gösterir
    handleQRCode(qr) {
        // Gelen verinin geçerli bir string olup olmadığını kontrol et
        if (typeof qr !== 'string' || qr.length < 10) {
            console.error('❌ Geçersiz veya boş QR kod verisi alındı, işlem atlanıyor.', qr);
            this.showNotification('Geçersiz QR kod verisi alındı.', 'error');
            return;
        }

        console.log(`🔄 Geçerli QR kodu alindi, görüntü oluşturuluyor...`);
        const qrContainer = document.getElementById('qrcode');
        const qrInstructions = document.getElementById('qrStatus');
        const qrModal = document.getElementById('qrModal');

        // Önceki QR kodunu temizle
        qrContainer.innerHTML = '';

        try {
            // Demo modda QR data URL'i doğrudan göster
            if (qr.startsWith('data:image/png;base64')) {
                qrContainer.innerHTML = `<img src="${qr}" alt="QR Code" style="width: 256px; height: 256px;">`;
            } else {
                // Gerçek QR string'i için qrcode.js kullan
                new QRCode(qrContainer, {
                    text: qr,
                    width: 256,
                    height: 256,
                    colorDark: "#000000",
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.H
                });
            }

            qrContainer.style.display = 'block';
            qrInstructions.innerHTML = '<i class="fas fa-qrcode"></i><span>Lütfen QR kodu telefonunuzla tarayın.</span>';
        } catch (e) {
            console.error('QR kod oluşturulurken hata oluştu:', e);
            this.showNotification('QR kod oluşturulamadı.', 'error');
        }

        qrModal.style.display = 'flex';
    }

    showTextQR(qr, qrDisplay) {
        console.log('🌐 Online QR servisini kullanıyor...');
        
        // Direkt QR kod image'ını göster
        qrDisplay.innerHTML = `
            <div class="qr-container" style="text-align: center;">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(qr)}" 
                     alt="WhatsApp QR Code" 
                     style="border: 2px solid #ddd; border-radius: 8px; margin-bottom: 15px;" />
                <div style="color: #666;">
                    <p><strong>QR Kodu Telefonunuzla Tarayın:</strong></p>
                    <p>1. WhatsApp uygulamasını açın</p>
                    <p>2. ⋮ (Menü) → <strong>Bağlı Cihazlar</strong></p>
                    <p>3. <strong>Cihaz Bağla</strong> → QR kodu tarayın</p>
                </div>
            </div>
        `;
        this.updateQRStatus('QR kodu görüntülendi', 'waiting');
    }

    refreshQRCode() {
        if (this.socket && this.socket.connected) {
            this.socket.emit('request_qr');
            this.updateQRStatus('QR kod yenileniyor...', 'loading');
        }
    }

    updateQRStatus(message, status) {
        const statusElement = document.getElementById('qrStatus');
        const qrDisplay = document.getElementById('qrCodeDisplay');
        
        if (statusElement) {
            statusElement.innerHTML = `<i class="fas fa-qrcode"></i><span>${message}</span>`;
            statusElement.className = `qr-status ${status}`;
        }
        
        if (qrDisplay) {
            qrDisplay.className = `qr-code ${status}`;
        }
    }

    handleWhatsAppReady() {
        this.isConnected = true;
        this.connectionStatus = 'connected';
        
        // Update UI
        const btn = document.getElementById('connectWhatsApp');
        const statusSpan = document.getElementById('connectionStatus');
        
        if (btn) {
            btn.classList.add('connected');
            btn.classList.remove('connecting', 'disconnected');
        }
        
        if (statusSpan) {
            statusSpan.textContent = 'Bağlandı';
        }

        // Hide QR modal
        this.hideQRModal();
        
        // Show success toast
        this.showConnectionToast('WhatsApp Web\'e başarıyla bağlandı!', 'success');
        
        // Request contacts and groups
        this.requestWhatsAppData();
    }

    handleWhatsAppDisconnected() {
        this.isConnected = false;
        this.connectionStatus = 'disconnected';
        
        // Update UI
        const btn = document.getElementById('connectWhatsApp');
        const statusSpan = document.getElementById('connectionStatus');
        
        if (btn) {
            btn.classList.add('disconnected');
            btn.classList.remove('connected', 'connecting');
        }
        
        if (statusSpan) {
            statusSpan.textContent = 'WhatsApp\'a Bağlan';
        }

        this.showNotification('WhatsApp bağlantısı kesildi.', 'warning');
    }

    showConnectionToast(message, type) {
        const toast = document.getElementById('connectionToast');
        const content = toast.querySelector('.toast-content span');
        
        if (content) content.textContent = message;
        
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 4000);
    }

    async requestWhatsAppData() {
        if (this.isConnected) {
            try {
                console.log('✅ WhatsApp bağlantısı hazır - Manuel kişi yönetimi aktif');
                
                // Evolution API endpoint'leri henüz çalışmadığı için manuel sistem kullan
                this.showNotification('WhatsApp bağlandı! Şimdi kişi ekleyebilir ve mesaj gönderebilirsiniz.', 'success');
                
                // Grupları boş array olarak ayarla (şimdilik)
                this.whatsappGroups = [];
                
                // UI'ı güncelle
                this.renderContacts();
                this.updateStats();
                
            } catch (error) {
                console.error('❌ WhatsApp verileri çekilirken hata:', error);
                this.showNotification('WhatsApp bağlandı ancak veri çekimde sorun var. Manuel kişi yönetimi kullanın.', 'warning');
            }
        }
    }

    handleContactsReceived(contacts) {
        console.log('Received contacts:', contacts.length);
        
        // Clear existing WhatsApp contacts
        this.contacts = this.contacts.filter(c => !c.whatsappData);
        
        // Create a map to group contacts by name for deduplication
        const contactMap = new Map();
        
        // Helper function to check if a number is a real Turkish phone number
        const isRealPhoneNumber = (number) => {
            if (!number) return false;
            // Remove common WhatsApp formatting
            const cleanNumber = number.replace(/@c\.us$/, '').replace(/\+/g, '').replace(/\s/g, '');
            // Only accept numbers that start with 90 (Turkey country code) and are 12-13 digits long
            return /^90[0-9]{10,11}$/.test(cleanNumber);
        };

        // Process contacts and group by name
        contacts.forEach(contact => {
            if (contact.name && contact.id._serialized) {
                const contactName = contact.name || contact.pushname || contact.number;
                
                // Only process if we have a real phone number
                const realPhoneNumber = isRealPhoneNumber(contact.number) ? contact.number.replace(/@c\.us$/, '') : null;
                
                if (realPhoneNumber) {
                    const contactData = {
                        id: contact.id._serialized,
                        name: contactName,
                        phone: realPhoneNumber,
                        email: '',
                        group: 'whatsapp-sync',
                        tags: ['WhatsApp'],
                        whatsappData: {
                            avatar: contact.profilePicUrl || '',
                            lastSeen: contact.lastSeen || 'Bilinmiyor',
                            synced: true,
                            isGroup: false,
                            phones: [realPhoneNumber] // Store multiple phone numbers
                        }
                    };
                    
                    // Check if contact with same name already exists
                    if (contactMap.has(contactName)) {
                        const existingContact = contactMap.get(contactName);
                        // Add phone number if it's different and not already in the array
                        if (realPhoneNumber && !existingContact.whatsappData.phones.includes(realPhoneNumber)) {
                            existingContact.whatsappData.phones.push(realPhoneNumber);
                        }
                        // Use the contact with better data (prefer one with profile pic or newer lastSeen)
                        if (contact.profilePicUrl && !existingContact.whatsappData.avatar) {
                            existingContact.whatsappData.avatar = contact.profilePicUrl;
                        }
                    } else {
                        contactMap.set(contactName, contactData);
                    }
                }
            }
        });
        
        // Add deduplicated contacts to the main contacts array
        contactMap.forEach(contact => {
            this.contacts.push(contact);
        });

        console.log(`Processed ${contacts.length} contacts, deduplicated to ${contactMap.size} unique contacts`);
        
        // Update UI
        this.renderContactsTable();
        this.updateContactsCount();
        
        this.showNotification(`${contacts.length} WhatsApp kişisi senkronize edildi.`, 'success');
    }

    handleGroupsReceived(groups) {
        console.log('Received groups:', groups.length);
        
        // Store WhatsApp groups
        this.whatsappGroups = groups.map(group => ({
            id: group.id._serialized || group.id,
            name: group.name || 'Adsız Grup',
            description: group.description || 'WhatsApp grubu',
            members: group.participants ? group.participants.length : 0,
            avatar: (group.name || 'AG').substring(0, 2).toUpperCase(),
            lastMessage: 'Az önce',
            canSendMessages: true, // Gerçek durumda admin kontrolü yapılacak
            whatsappData: {
                serialized: group.id._serialized || group.id,
                participants: group.participants || []
            }
        }));

        this.selectedWhatsAppGroups = [];
        
        // Update UI if groups page is active
        this.renderWhatsAppGroups();
        
        this.showNotification(`${groups.length} WhatsApp grubu yüklendi.`, 'success');
    }

    handleMessageSent(result) {
        if (result.success) {
            console.log('Message sent successfully to:', result.to);
        } else {
            console.error('Failed to send message to:', result.to, result.error);
        }
    }

    // Override sync functions to use real data
    async syncWhatsAppContacts() {
        if (!this.isConnected) {
            this.showNotification('Önce WhatsApp Web\'e bağlanın.', 'warning');
            return;
        }

        const button = document.getElementById('syncWhatsAppContacts');
        const originalText = button.innerHTML;
        
        // Show loading state
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Senkronize ediliyor...';
        button.disabled = true;

        try {
            // Request real contacts from WhatsApp
            this.socket.emit('get_contacts');
            
            // Wait for response (will be handled by handleContactsReceived)
            await this.sleep(2000);

        } catch (error) {
            console.error('WhatsApp sync error:', error);
            this.showNotification('WhatsApp senkronizasyonu başarısız.', 'error');
        } finally {
            // Restore button
            button.innerHTML = originalText;
            button.disabled = false;
        }
    }

    async loadWhatsAppGroups() {
        const groupsList = document.getElementById('whatsappGroupsList');
        if (!groupsList) return;

        // Show loading
        groupsList.innerHTML = `
            <div class="loading-message">
                <i class="fas fa-spinner loading-icon"></i>
                WhatsApp grupları yükleniyor...
            </div>
        `;

        try {
            if (!this.isConnected) {
                groupsList.innerHTML = `
                    <div class="loading-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        WhatsApp'a bağlı değilsiniz.
                    </div>
                `;
                return;
            }

            // Request real groups from WhatsApp
            this.socket.emit('get_groups');
            
            // Wait a bit for response
            await this.sleep(1500);

            if (!this.whatsappGroups || this.whatsappGroups.length === 0) {
                groupsList.innerHTML = `
                    <div class="loading-message">
                        <i class="fas fa-info-circle"></i>
                        Hiç WhatsApp grubu bulunamadı.
                    </div>
                `;
                return;
            }

            this.renderWhatsAppGroups();

        } catch (error) {
            console.error('Groups loading error:', error);
            groupsList.innerHTML = `
                <div class="loading-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    Gruplar yüklenirken hata oluştu.
                </div>
            `;
        }
    }

    // REST API ile direkt mesaj gönderimi
    async sendSingleMessage(recipient, message) {
        try {
            // Check if sending is paused or stopped
            if (this.sendingPaused || this.sendingStopped) {
                throw new Error('Gönderim durduruldu');
            }

            let targetNumber;
            if (recipient.type === 'group') {
                // Use group ID directly for WhatsApp groups
                targetNumber = recipient.id;
                // Ensure proper group format
                if (!targetNumber.includes('@g.us')) {
                    targetNumber = targetNumber + '@g.us';
                }
            } else {
                // Clean phone number for individual contacts
                targetNumber = recipient.phone.replace(/[^\d]/g, '');
                if (!targetNumber.startsWith('90')) {
                    targetNumber = '90' + targetNumber;
                }
                // Ensure proper WhatsApp format for contacts
                if (!targetNumber.includes('@c.us')) {
                    targetNumber = targetNumber + '@c.us';
                }
            }

            console.log('📤 Mesaj gönderiliyor:', targetNumber);

            // Check if media files are selected
            const hasMedia = this.selectedFiles.length > 0;
            
            console.log('🔍 Media file check:', {
                selectedFiles: this.selectedFiles.length,
                hasMedia: hasMedia
            });

            if (hasMedia) {
                // Send media message
                return await this.sendMediaMessage(targetNumber, message, this.selectedFiles);
            } else {
                // Apply theme styling to message
                const selectedTheme = localStorage.getItem('selectedMessageTheme') || 'default';
                const styledMessage = this.applyMessageTheme(message, selectedTheme);
                
                // Send text message only
                console.log('🚀 Mesaj gönderiliyor:', {
                    url: `${this.serverUrl}/whatsapp/send`,
                    to: targetNumber,
                    message: styledMessage
                });
                
                const response = await fetch(`${this.serverUrl}/whatsapp/send`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        to: targetNumber,
                        message: styledMessage
                    })
                });
                
                console.log('📡 Response status:', response.status);
                console.log('📡 Response ok:', response.ok);

                const result = await response.json();
                console.log('📱 Gönderim sonucu:', result);
                
                if (response.ok && result.success !== false) {
                    return { success: true, data: result };
                } else {
                    throw new Error(result.error || 'Mesaj gönderilemedi');
                }
            }

        } catch (error) {
            console.error('❌ Mesaj gönderim hatası:', error);
            throw error;
        }
    }

    async sendMediaMessage(targetNumber, message, files) {
        try {
            console.log('📎 Medya mesajı gönderiliyor:', files.length, 'dosya');

            const formData = new FormData();
            formData.append('to', targetNumber);
            if (message && message.trim()) {
                // Apply theme styling to media message
                const selectedTheme = localStorage.getItem('selectedMessageTheme') || 'default';
                const styledMessage = this.applyMessageTheme(message, selectedTheme);
                formData.append('message', styledMessage);
            }

            // Add all selected files with detailed logging
            Array.from(files).forEach((file, index) => {
                console.log(`📁 Dosya ${index + 1}: ${file.name} (${this.formatFileSize(file.size)}, ${file.type})`);
                formData.append('media', file);
            });

            console.log('🚀 FormData gönderiliyor...');
            
            try {
                const response = await fetch(`${this.serverUrl}/whatsapp/send-media`, {
                    method: 'POST',
                    body: formData
                });

                console.log('📡 Media Response status:', response.status);
                console.log('📡 Media Response ok:', response.ok);

                const result = await response.json();
                console.log('📱 Medya gönderim sonucu:', result);
            } catch (error) {
                console.error('❌ Media send fetch error:', error);
                throw error;
            }
            
            if (response.ok && result.success !== false) {
                // Check individual file results
                if (result.results) {
                    result.results.forEach((fileResult, index) => {
                        if (fileResult.success) {
                            console.log(`✅ Dosya ${index + 1} başarılı: ${fileResult.filename}`);
                        } else {
                            console.error(`❌ Dosya ${index + 1} hatalı: ${fileResult.filename} - ${fileResult.error}`);
                            this.showNotification(`Dosya gönderilemedi: ${fileResult.filename} - ${fileResult.error}`, 'error');
                        }
                    });
                }
                
                // Clear media files after successful sending
                this.clearMediaFiles();
                return { success: true, data: result };
            } else {
                throw new Error(result.error || 'Medya gönderilemedi');
            }

        } catch (error) {
            console.error('❌ Medya gönderim hatası:', error);
            throw error;
        }
    }


    renderDashboard() {
        // Update stats with real data
        const stats = {
            totalContacts: this.contacts.length,
            totalTemplates: this.templates.length,
            whatsappGroups: this.whatsappGroups ? this.whatsappGroups.length : 0,
            connectionStatus: this.isConnected ? 'Bağlı' : 'Bağlantı Yok'
        };

        // Update dashboard stats in UI
        const totalContactsEl = document.querySelector('[data-stat="total-contacts"]');
        const totalTemplatesEl = document.querySelector('[data-stat="total-templates"]');
        const whatsappGroupsEl = document.querySelector('[data-stat="whatsapp-groups"]');
        const connectionStatusEl = document.querySelector('[data-stat="connection-status"]');

        if (totalContactsEl) totalContactsEl.textContent = stats.totalContacts;
        if (totalTemplatesEl) totalTemplatesEl.textContent = stats.totalTemplates;
        if (whatsappGroupsEl) whatsappGroupsEl.textContent = stats.whatsappGroups;
        if (connectionStatusEl) {
            connectionStatusEl.textContent = stats.connectionStatus;
            connectionStatusEl.className = this.isConnected ? 'status-connected' : 'status-disconnected';
        }
    }

    renderContacts() {
        const tbody = document.getElementById('contactsTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (this.contacts.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                        <div style="display: flex; flex-direction: column; align-items: center; gap: 1rem;">
                            <i class="fas fa-users" style="font-size: 3rem; opacity: 0.3;"></i>
                            <div>
                                <h3 style="margin: 0; color: var(--text-primary);">Henüz kişi yok</h3>
                                <p style="margin: 0.5rem 0 0 0;">WhatsApp'a bağlanarak kişilerinizi senkronize edin veya manuel olarak kişi ekleyin</p>
                            </div>
                            <div style="display: flex; gap: 0.5rem;">
                                <button class="btn btn-primary" onclick="crm.showQRModal()">
                                    <i class="fab fa-whatsapp"></i> WhatsApp'a Bağlan
                                </button>
                                <button class="btn btn-secondary" onclick="crm.showAddContactModal()">
                                    <i class="fas fa-plus"></i> Kişi Ekle
                                </button>
                            </div>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        this.contacts.forEach(contact => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <input type="checkbox" data-contact-id="${contact.id}" ${this.selectedContacts.some(c => c.id == contact.id) ? 'checked' : ''}>
                </td>
                <td>
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <div class="contact-avatar">${contact.name.charAt(0)}</div>
                        <div>
                            <strong>${contact.name}</strong>
                            ${contact.notes ? `<div style="font-size: 0.8rem; color: var(--text-secondary);">${contact.notes}</div>` : ''}
                        </div>
                    </div>
                </td>
                <td>${contact.phone}</td>
                <td>
                    <span class="group-badge">${this.getGroupName(contact.group)}</span>
                </td>
                <td>${contact.lastMessage}</td>
                <td>
                    <span class="status-badge ${contact.status}">${contact.status === 'active' ? 'Aktif' : 'Pasif'}</span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn edit" onclick="crm.editContact(${contact.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="crm.deleteContact(${contact.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });

        // Add event listeners for checkboxes
        tbody.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const contactId = e.target.dataset.contactId;
                this.toggleContactSelection(contactId);
            });
        });
        
        // Update contact counts
        this.updateContactCount();
        this.updateSelectedCount();
    }

    renderBulkSender() {
        // Update contact counts
        this.updateContactsCount();
        
        // Initialize recipient selection based on current radio button
        this.updateRecipientSelection();
        
        // Load WhatsApp groups if connected
        if (this.isConnected && this.socket) {
            this.loadWhatsAppGroups();
        }
        
        // Render contact selector with current contacts
        this.renderContactSelector();
    }

    renderContactSelector() {
        const contactList = document.getElementById('contactList');
        if (!contactList) return;

        // Add search box first
        contactList.innerHTML = `
            <div class="contact-search-box">
                <input type="text" id="customContactSearch" placeholder="Kişi ara..." class="search-input">
                <i class="fas fa-search search-icon"></i>
            </div>
            <div class="contact-results" id="customContactResults"></div>
        `;

        // Render all contacts initially
        this.renderCustomContactResults(this.contacts);

        // Add search event listener
        const searchInput = document.getElementById('customContactSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterCustomContacts(e.target.value);
            });
        }
    }

    renderCustomContactResults(contacts) {
        const resultsContainer = document.getElementById('customContactResults');
        if (!resultsContainer) return;

        resultsContainer.innerHTML = '';

        contacts.forEach(contact => {
            const contactItem = document.createElement('div');
            contactItem.className = 'contact-item';
            contactItem.innerHTML = `
                <input type="checkbox" data-contact-id="${contact.id}" ${this.selectedContacts.some(c => c.id == contact.id) ? 'checked' : ''}>
                <div class="contact-avatar">${contact.name.charAt(0)}</div>
                <div class="contact-info">
                    <h4>${contact.name}</h4>
                    <p>${contact.phone} • ${this.getGroupName(contact.group)}</p>
                </div>
            `;

            resultsContainer.appendChild(contactItem);
        });

        // Add event listeners
        resultsContainer.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const contactId = e.target.dataset.contactId;
                this.toggleContactSelection(contactId);
            });
        });
    }

    filterCustomContacts(searchTerm) {
        if (!searchTerm.trim()) {
            this.renderCustomContactResults(this.contacts);
            return;
        }

        const filteredContacts = this.contacts.filter(contact =>
            contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            contact.phone.includes(searchTerm) ||
            this.getGroupName(contact.group).toLowerCase().includes(searchTerm.toLowerCase())
        );

        this.renderCustomContactResults(filteredContacts);
    }

    renderTemplates() {
        const templatesGrid = document.getElementById('templatesGrid');
        if (!templatesGrid) return;

        templatesGrid.innerHTML = '';

        // Load saved custom templates from localStorage
        const savedTemplates = JSON.parse(localStorage.getItem('customTemplates') || '[]');
        const allTemplates = [...this.messageTemplates, ...savedTemplates];

        if (allTemplates.length === 0) {
            templatesGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-secondary);">
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 1rem;">
                        <i class="fas fa-file-alt" style="font-size: 4rem; opacity: 0.3;"></i>
                        <div>
                            <h3 style="margin: 0; color: var(--text-primary);">Henüz şablon yok</h3>
                            <p style="margin: 0.5rem 0 0 0;">Mesajlarınız için şablon oluşturun ve zamandan tasarruf edin</p>
                        </div>
                        <button class="btn btn-primary" onclick="crm.showAddTemplateModal()">
                            <i class="fas fa-plus"></i> İlk Şablonunuzu Oluşturun
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        allTemplates.forEach((template, index) => {
            const templateCard = document.createElement('div');
            templateCard.className = 'template-card';
            
            // Check if this is a built-in template (from messageTemplates) or custom
            const isBuiltIn = this.messageTemplates.some(t => t.id === template.id);
            const categoryName = this.getCategoryDisplayName(template.category);
            
            templateCard.innerHTML = `
                <div class="template-card-header">
                    <h3 class="template-card-title">${template.name}</h3>
                    <span class="template-category">${categoryName}</span>
                </div>
                <div class="template-card-content">
                    <div class="template-preview">${template.content}</div>
                    <div class="template-card-actions">
                        <button class="template-action-btn use" onclick="crm.useTemplate('${template.id}')">
                            <i class="fas fa-paper-plane"></i>
                            Kullan
                        </button>
                        <button class="template-action-btn edit" onclick="crm.editTemplate('${template.id}', ${isBuiltIn})">
                            <i class="fas fa-edit"></i>
                            ${isBuiltIn ? 'Kopyala' : 'Düzenle'}
                        </button>
                        ${!isBuiltIn ? `<button class="template-action-btn delete" onclick="crm.deleteTemplate('${template.id}')">
                            <i class="fas fa-trash"></i>
                            Sil
                        </button>` : ''}
                    </div>
                </div>
            `;
            templatesGrid.appendChild(templateCard);
        });
    }

    toggleContactSelection(contactId) {
        const contact = this.contacts.find(c => c.id == contactId); // Use loose comparison for mixed types
        if (!contact) {
            console.log('Contact not found for ID:', contactId);
            return;
        }

        const index = this.selectedContacts.findIndex(c => c.id == contactId);
        if (index > -1) {
            this.selectedContacts.splice(index, 1);
            console.log('Contact removed:', contact.name);
        } else {
            this.selectedContacts.push(contact);
            console.log('Contact added:', contact.name);
        }

        this.updateSelectedCount();
    }

    toggleAllContacts() {
        const selectAll = document.getElementById('selectAllContacts');
        const checkboxes = document.querySelectorAll('#contactsTableBody input[type="checkbox"]');

        if (selectAll.checked) {
            this.selectedContacts = [...this.contacts];
            checkboxes.forEach(cb => cb.checked = true);
        } else {
            this.selectedContacts = [];
            checkboxes.forEach(cb => cb.checked = false);
        }

        this.updateSelectedCount();
    }

    updateSelectedCount() {
        const countElement = document.getElementById('selectedCount');
        if (countElement) {
            countElement.textContent = this.selectedContacts.length;
        }
    }

    updateRecipientSelection() {
        const recipientType = document.querySelector('input[name="recipientType"]:checked')?.value;
        const contactSelector = document.getElementById('contactSelector');
        const manualEntry = document.getElementById('manualEntry');
        const whatsappGroupsSelector = document.getElementById('whatsappGroupsSelector');

        // Hide all sections first
        if (contactSelector) contactSelector.style.display = 'none';
        if (manualEntry) manualEntry.style.display = 'none';
        if (whatsappGroupsSelector) whatsappGroupsSelector.style.display = 'none';

        switch(recipientType) {
            case 'all':
                this.selectedContacts = [...this.contacts];
                break;
            case 'groups':
                if (contactSelector) contactSelector.style.display = 'block';
                this.showGroupSelector();
                break;
            case 'whatsapp-groups':
                if (whatsappGroupsSelector) whatsappGroupsSelector.style.display = 'block';
                this.loadWhatsAppGroups();
                break;
            case 'custom':
                if (contactSelector) contactSelector.style.display = 'block';
                this.selectedContacts = []; // Always start with empty selection
                this.renderContactSelector();
                break;
            case 'manual':
                if (manualEntry) manualEntry.style.display = 'block';
                this.selectedContacts = [];
                break;
        }

        this.updateSelectedCount();
    }

    showGroupSelector() {
        const contactList = document.getElementById('contactList');
        if (!contactList) return;

        const groups = [...new Set(this.contacts.map(c => c.group))];
        
        // Add search box first
        contactList.innerHTML = `
            <div class="contact-search-box">
                <input type="text" id="groupContactSearch" placeholder="Grup ara..." class="search-input">
                <i class="fas fa-search search-icon"></i>
            </div>
            <div class="contact-results" id="groupContactResults"></div>
        `;

        // Render all groups initially
        this.renderGroupResults(groups);

        // Add search event listener
        const searchInput = document.getElementById('groupContactSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterGroups(e.target.value);
            });
        }
    }

    renderGroupResults(groups) {
        const resultsContainer = document.getElementById('groupContactResults');
        if (!resultsContainer) return;

        resultsContainer.innerHTML = '';

        groups.forEach(group => {
            const groupItem = document.createElement('div');
            groupItem.className = 'contact-item';
            groupItem.innerHTML = `
                <input type="checkbox" data-group="${group}" checked>
                <div class="contact-avatar">
                    <i class="fas fa-users"></i>
                </div>
                <div class="contact-info">
                    <h4>${this.getGroupName(group)}</h4>
                    <p>${this.contacts.filter(c => c.group === group).length} kişi</p>
                </div>
            `;
            resultsContainer.appendChild(groupItem);
        });

        // Add event listeners for group selection
        resultsContainer.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateGroupSelection();
            });
        });
    }

    filterGroups(searchTerm) {
        const allGroups = [...new Set(this.contacts.map(c => c.group))];
        
        if (!searchTerm.trim()) {
            this.renderGroupResults(allGroups);
            return;
        }

        const filteredGroups = allGroups.filter(group =>
            this.getGroupName(group).toLowerCase().includes(searchTerm.toLowerCase())
        );

        this.renderGroupResults(filteredGroups);
    }

    updateGroupSelection() {
        const selectedGroups = Array.from(document.querySelectorAll('#contactList input[type="checkbox"]:checked'))
            .map(cb => cb.dataset.group);

        this.selectedContacts = this.contacts.filter(contact => 
            selectedGroups.includes(contact.group)
        );

        this.updateSelectedCount();
    }

    filterContacts() {
        const searchTerm = document.getElementById('contactSearch').value.toLowerCase();
        const filteredContacts = this.contacts.filter(contact =>
            contact.name.toLowerCase().includes(searchTerm) ||
            contact.phone.includes(searchTerm)
        );

        this.renderFilteredContacts(filteredContacts);
    }

    filterMainContacts() {
        const searchTerm = document.getElementById('contactSearchMain')?.value.toLowerCase() || '';
        const contactRows = document.querySelectorAll('#contactsTableBody tr');
        
        contactRows.forEach(row => {
            const nameCell = row.querySelector('td:first-child')?.textContent.toLowerCase() || '';
            const phoneCell = row.querySelector('td:nth-child(2)')?.textContent.toLowerCase() || '';
            
            if (nameCell.includes(searchTerm) || phoneCell.includes(searchTerm)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    filterContactsByType(type) {
        // Update filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-filter="${type}"]`).classList.add('active');

        let filteredContacts = [...this.contacts];

        switch(type) {
            case 'recent':
                // Filter contacts added in last 7 days (simulated)
                filteredContacts = this.contacts.slice(0, 2);
                break;
            case 'active':
                filteredContacts = this.contacts.filter(c => c.status === 'active');
                break;
            case 'all':
            default:
                filteredContacts = [...this.contacts];
        }

        this.renderFilteredContacts(filteredContacts);
    }

    renderFilteredContacts(contacts) {
        const tbody = document.getElementById('contactsTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        contacts.forEach(contact => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <input type="checkbox" data-contact-id="${contact.id}" ${this.selectedContacts.some(c => c.id == contact.id) ? 'checked' : ''}>
                </td>
                <td>
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <div class="contact-avatar">${contact.name.charAt(0)}</div>
                        <div>
                            <strong>${contact.name}</strong>
                        </div>
                    </div>
                </td>
                <td>${contact.phone}</td>
                <td>
                    <span class="group-badge">${this.getGroupName(contact.group)}</span>
                </td>
                <td>${contact.lastMessage}</td>
                <td>
                    <span class="status-badge ${contact.status}">${contact.status === 'active' ? 'Aktif' : 'Pasif'}</span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    updateCharCount() {
        const messageContent = document.getElementById('messageContent');
        const charCount = document.getElementById('charCount');
        
        if (messageContent && charCount) {
            const count = messageContent.value.length;
            charCount.textContent = count;
            
            if (count > 4000) {
                charCount.style.color = 'var(--error-color)';
            } else if (count > 3500) {
                charCount.style.color = 'var(--warning-color)';
            } else {
                charCount.style.color = 'var(--text-secondary)';
            }
        }
    }

    loadTemplate() {
        const templateSelect = document.getElementById('templateSelect');
        const messageContent = document.getElementById('messageContent');
        
        if (!templateSelect || !messageContent) return;

        const templateId = parseInt(templateSelect.value);
        if (!templateId) {
            messageContent.value = '';
            this.updateCharCount();
            return;
        }

        const template = this.templates.find(t => t.id === templateId);
        if (template) {
            messageContent.value = template.content;
            this.updateCharCount();
        }
    }

    toggleScheduleInputs() {
        const scheduleCheckbox = document.getElementById('scheduleMessage');
        const scheduleInputs = document.getElementById('scheduleInputs');
        
        if (scheduleInputs) {
            scheduleInputs.style.display = scheduleCheckbox.checked ? 'block' : 'none';
        }
    }

    addMediaFile() {
        const mediaFile = document.getElementById('mediaFile');
        mediaFile.click();
    }

    handleMediaUpload() {
        const mediaFile = document.getElementById('mediaFile');
        
        if (!mediaFile.files.length) {
            console.log('❌ No files selected');
            return;
        }

        // Add the new file to our array
        const newFile = mediaFile.files[0];
        console.log('📁 Adding file:', newFile.name, this.formatFileSize(newFile.size));
        
        const maxSize = 250 * 1024 * 1024; // 250MB
        if (newFile.size > maxSize) {
            this.showNotification(`Dosya ${newFile.name} boyutu 250MB'dan büyük olamaz.`, 'error');
            return;
        }

        // Check if file already exists
        const exists = this.selectedFiles.some(file => 
            file.name === newFile.name && file.size === newFile.size
        );
        
        if (exists) {
            this.showNotification(`Dosya ${newFile.name} zaten eklenmiş.`, 'warning');
            return;
        }

        // Add to array
        this.selectedFiles.push(newFile);
        console.log(`📋 Total files now: ${this.selectedFiles.length}`);
        
        // Update preview
        this.updateMediaPreview();
        
        // Clear input for next selection
        mediaFile.value = '';
    }

    updateMediaPreview() {
        const mediaPreview = document.getElementById('mediaPreview');
        if (!mediaPreview) return;

        mediaPreview.innerHTML = '';
        
        this.selectedFiles.forEach((file, index) => {
            this.createFilePreview(file, index);
        });
        
        console.log(`🖼️ Preview updated with ${this.selectedFiles.length} files`);
    }

    createFilePreview(file, index) {
        const mediaPreview = document.getElementById('mediaPreview');
        if (!mediaPreview) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const previewItem = document.createElement('div');
            previewItem.className = 'media-preview-item';
            previewItem.dataset.fileIndex = index;
            
            let mediaElement = '';
            if (file.type.startsWith('image/')) {
                mediaElement = `<img src="${e.target.result}" alt="Preview">`;
            } else if (file.type.startsWith('video/')) {
                mediaElement = `
                    <div class="video-preview">
                        <video src="${e.target.result}" style="max-width: 100px;">
                            <source src="${e.target.result}" type="${file.type}">
                        </video>
                        <div class="video-overlay" onclick="crm.playVideo(this)">
                            <i class="fas fa-play"></i>
                        </div>
                    </div>
                `;
            } else {
                const iconClass = this.getFileIcon(file.type);
                mediaElement = `<div class="file-icon"><i class="fas ${iconClass}"></i></div>`;
            }

            previewItem.innerHTML = `
                ${mediaElement}
                <div class="media-info">
                    <h4>${file.name}</h4>
                    <p>${this.formatFileSize(file.size)}</p>
                </div>
                <button class="remove-media" onclick="crm.removeMediaFile(${index})">
                    <i class="fas fa-times"></i>
                </button>
            `;

            mediaPreview.appendChild(previewItem);
        };

        reader.readAsDataURL(file);
    }

    getFileIcon(fileType) {
        if (fileType.includes('pdf')) return 'fa-file-pdf';
        if (fileType.includes('word') || fileType.includes('doc')) return 'fa-file-word';
        if (fileType.includes('excel') || fileType.includes('sheet')) return 'fa-file-excel';
        if (fileType.includes('powerpoint') || fileType.includes('presentation')) return 'fa-file-powerpoint';
        if (fileType.includes('audio')) return 'fa-file-audio';
        if (fileType.includes('video')) return 'fa-file-video';
        if (fileType.includes('image')) return 'fa-file-image';
        if (fileType.includes('text')) return 'fa-file-alt';
        if (fileType.includes('zip') || fileType.includes('rar')) return 'fa-file-archive';
        return 'fa-file';
    }

    removeMediaFile(fileIndex) {
        console.log(`🗑️ Removing file at index: ${fileIndex}`);
        
        if (fileIndex >= 0 && fileIndex < this.selectedFiles.length) {
            const removedFile = this.selectedFiles.splice(fileIndex, 1)[0];
            console.log(`📤 Removed: ${removedFile.name}`);
            
            // Update preview
            this.updateMediaPreview();
            
            this.showNotification(`Dosya ${removedFile.name} kaldırıldı.`, 'info');
        }
    }

    clearAllMedia() {
        console.log('🧹 Clearing all media files');
        this.selectedFiles = [];
        this.updateMediaPreview();
        
        const mediaFile = document.getElementById('mediaFile');
        if (mediaFile) mediaFile.value = '';
        
        this.showNotification('Tüm dosyalar temizlendi.', 'info');
    }

    selectAllCustomContacts() {
        console.log('✅ Selecting all custom contacts');
        this.selectedContacts = [...this.contacts];
        this.renderCustomContactResults(this.contacts);
        this.updateSelectedCount();
        this.showNotification(`${this.contacts.length} kişi seçildi.`, 'success');
    }

    deselectAllCustomContacts() {
        console.log('❌ Deselecting all custom contacts');
        this.selectedContacts = [];
        this.renderCustomContactResults(this.contacts);
        this.updateSelectedCount();
        this.showNotification('Tüm seçimler temizlendi.', 'info');
    }

    playVideo(overlayElement) {
        const videoContainer = overlayElement.parentElement;
        const video = videoContainer.querySelector('video');
        const overlay = overlayElement;
        
        if (video.paused) {
            video.controls = true;
            video.play();
            overlay.style.display = 'none';
            
            video.addEventListener('pause', () => {
                overlay.style.display = 'flex';
                video.controls = false;
            }, { once: true });
        }
    }

    // Initialize message templates
    initMessageTemplates() {
        return [
            {
                id: 'business_proposal',
                name: '🏢 İş Teklifi',
                category: 'business',
                content: `Sayın {isim},

🤝 İş teklifimizi değerlendirmeniz için ekte detaylı bilgiler sunuyoruz.

✨ Teklifimizin öne çıkan özellikleri:
• Rekabetçi fiyatlandırma
• Hızlı teslimat süresi  
• 7/24 müşteri desteği
• Kalite garantisi

📅 Teklif geçerlilik süresi: 15 gün
💼 Proje başlama tarihi: {tarih}

Herhangi bir sorunuz için bizimle iletişime geçebilirsiniz.

Saygılarımızla,
{şirket_adı}`
            },
            {
                id: 'invoice_payment',
                name: '💳 Ödeme Hatırlatma',
                category: 'finance',
                content: `Sayın {isim},

💰 Ödeme hatırlatması yapıyoruz.

📄 Fatura Bilgileri:
• Fatura No: #2024-{tarih}
• Tutarı: {tutar}
• Vade Tarihi: {vade_tarihi}
• Ödeme Yöntemi: Havale/EFT

📎 Ekte fatura detaylarını bulabilirsiniz.

⚠️ Vade tarihine kadar ödemenizi bekliyoruz.

Teşekkürler,
Mali İşler Departmanı`
            },
            {
                id: 'product_launch',
                name: '🚀 Ürün Lansmanı',
                category: 'marketing',
                content: `Merhaba {isim}! 🎉

🚀 YENİ ÜRÜNÜMÜZÜ TANITMAKTAN MUTLULUK DUYUYORUZ!

✨ Öne Çıkan Özellikler:
🔹 İnovatif tasarım
🔹 Kullanıcı dostu arayüz
🔹 Üstün performans
🔹 Uygun fiyat

🎁 ÖZEL KAMPANYA:
İlk 100 müşterimize %25 indirim!

📱 Sipariş için: {telefon}
🌐 Web sitemizi ziyaret edin

Kaçırılmayacak fırsat!

{şirket_adı} Ekibi`
            },
            {
                id: 'meeting_reminder',
                name: '📅 Toplantı Hatırlatma',
                category: 'meeting',
                content: `Sayın {isim},

📅 Toplantı hatırlatması yapıyoruz.

🕐 Toplantı Bilgileri:
• Tarih: {tarih}
• Saat: {saat}
• Süre: {süre} dakika
• Platform: {platform}
• Katılım linki: {link}

📋 Gündem Maddeleri:
1. Proje durumu değerlendirmesi
2. Yeni hedefler
3. Kaynak planlaması
4. Sorular ve cevaplar

💼 Lütfen hazırlıklarınızı tamamlayınız.

Görüşmek üzere,
{organizatör}`
            },
            {
                id: 'customer_support',
                name: '🔧 Müşteri Desteği',
                category: 'support',
                content: `Merhaba {isim},

🔧 Destek talebinizi aldık ve inceliyoruz.

📋 Talep Detayları:
• Konu: {konu}
• Öncelik: {öncelik}
• Tahmini çözüm süresi: {süre}

👨‍💻 Uzman ekibimiz sorununuzla ilgileniyor.

📞 Acil durumlar için: {telefon}
✉️ E-posta: {email}

🕐 Çalışma saatlerimiz:
Pazartesi-Cuma: 09:00-18:00
Cumartesi: 09:00-13:00

Teşekkürler,
Müşteri Hizmetleri`
            },
            {
                id: 'welcome_message',
                name: '🌟 Hoş Geldin Mesajı',
                category: 'welcome',
                content: `Hoş Geldin {isim}! 🎉

🌟 Ailemize katıldığın için çok mutluyuz!

🎁 Sana özel avantajlar:
• İlk alışverişte %20 indirim
• Ücretsiz kargo
• VIP müşteri desteği
• Özel kampanyalardan haberdar olma

📱 Uygulamayı indirmeyi unutma!
🔔 Bildirimlerimizi aç
💌 E-bültene üye ol

Herhangi bir sorun için bizimle iletişime geç.

Hoş geldin!
{şirket_adı} Ekibi`
            },
            {
                id: 'order_confirmation',
                name: '📦 Sipariş Onayı',
                category: 'order',
                content: `Merhaba {isim}! 

✅ Siparişin başarıyla alındı!

📦 Sipariş Detayları:
• Sipariş No: #{sipariş_no}
• Tarih: {tarih}
• Tutar: {tutar}
• Teslimat Adresi: {adres}

🚚 Kargo Bilgileri:
• Tahmini teslimat: {teslimat_tarihi}
• Kargo firması: {kargo_firması}
• Takip kodu: {takip_kodu}

📱 Siparişini takip etmek için uygulamamızı kullan!

Teşekkürler!
Satış Ekibi`
            },
            {
                id: 'holiday_wishes',
                name: '🎄 Bayram/Tatil Mesajı',
                category: 'holiday',
                content: `Sevgili {isim},

🎊 Bayramınız kutlu olsun! 

🌟 Bu özel günde:
• Sevdiklerinizle güzel anılar biriktirin
• Sağlık ve mutluluk dolu günler geçirin
• Hayalleriniz gerçek olsun

🎁 Bayram hediyesi olarak %30 indirim!
📅 Geçerlilik: {başlangıç} - {bitiş}
🛍️ Kod: BAYRAM2024

🕌 Bu mübarek günlerde ailenizle birlikte olmanız dileğiyle...

İyi bayramlar!
{şirket_adı} Ailesi`
            },
            {
                id: 'feedback_request',
                name: '⭐ Geri Bildirim Talebi',
                category: 'feedback',
                content: `Merhaba {isim},

💭 Görüşün bizim için çok değerli!

🌟 Hizmetimizi değerlendir:
• Ürün kalitesi nasıldı?
• Teslimat hızından memnun musun?
• Müşteri hizmetlerimiz yeterli miydi?

⭐ 5 üzerinden puanla:
⭐⭐⭐⭐⭐

📝 Yorumlarını paylaş:
{feedback_link}

🎁 Geri bildirim için hediye çeki!

Görüşlerini bekliyoruz.

Teşekkürler,
Kalite Ekibi`
            },
            {
                id: 'event_invitation',
                name: '🎪 Etkinlik Daveti',
                category: 'event',
                content: `Sevgili {isim},

🎪 Özel etkinliğimize davetlisiniz!

🎯 Etkinlik Detayları:
• Konu: {etkinlik_adı}
• Tarih: {tarih}
• Saat: {saat}
• Yer: {mekan}
• Konuşmacı: {konuşmacı}

🎁 Katılımcılara özel:
• Welcome paketi
• Networking fırsatları
• Sürpriz hediyeler
• İkramlar

📝 Katılım için RSVP gerekli
📞 Rezervasyon: {telefon}

Sizi aramızda görmekten mutluluk duyarız!

Etkinlik Organizasyon Ekibi`
            }
        ];
    }

    // Show template selector
    showTemplateSelector() {
        const modal = document.getElementById('templateModal');
        if (!modal) return;
        
        this.loadTemplatesIntoModal();
        modal.classList.add('show');
        this.selectedTemplateId = null;
        this.updateApplyButton();
    }
    
    // Close template selector
    closeTemplateSelector() {
        const modal = document.getElementById('templateModal');
        if (modal) {
            modal.classList.remove('show');
        }
        this.selectedTemplateId = null;
    }

    renderTemplateGrid() {
        return this.messageTemplates.map(template => `
            <div class="template-card" data-template-id="${template.id}" onclick="crm.selectTemplate('${template.id}')">
                <div class="template-card-header">
                    <span class="template-name">${template.name}</span>
                </div>
                <div class="template-preview">
                    ${template.content.substring(0, 120)}...
                </div>
            </div>
        `).join('');
    }

    filterTemplates(category) {
        const grid = document.getElementById('templateGrid');
        if (!grid) return;
        
        const filteredTemplates = category === 'all' 
            ? this.messageTemplates 
            : this.messageTemplates.filter(t => t.category === category);
            
        grid.innerHTML = filteredTemplates.map(template => `
            <div class="template-card" data-template-id="${template.id}" onclick="crm.selectTemplate('${template.id}')">
                <div class="template-card-header">
                    <span class="template-name">${template.name}</span>
                </div>
                <div class="template-preview">
                    ${template.content.substring(0, 120)}...
                </div>
            </div>
        `).join('');
    }

    selectTemplate(templateId) {
        const template = this.messageTemplates.find(t => t.id === templateId);
        if (!template) return;
        
        const messageContent = document.getElementById('messageContent');
        if (messageContent) {
            let content = template.content;
            
            // Add file information if files are selected
            if (this.selectedFiles.length > 0) {
                const fileInfo = `\n📎 Ekte ${this.selectedFiles.length} adet dosya bulunmaktadır:\n${this.selectedFiles.map((file, index) => `   ${index + 1}. ${file.name} (${this.formatFileSize(file.size)})`).join('\n')}\n`;
                content = content.replace('{isim}', '{isim}') + fileInfo;
            }
            
            messageContent.value = content;
            this.showNotification(`${template.name} şablonu uygulandı.`, 'success');
        }
        
        // Close modal
        document.querySelector('.template-selector-modal')?.remove();
    }

    applyCustomTemplate() {
        const messageContent = document.getElementById('messageContent');
        if (messageContent) {
            messageContent.value = '';
            messageContent.placeholder = 'Mesajınızı buraya yazın veya yapıştırın...';
            messageContent.focus();
        }
        
        // Close modal
        document.querySelector('.template-selector-modal')?.remove();
    }

    removeMedia() {
        const mediaFile = document.getElementById('mediaFile');
        const mediaPreview = document.getElementById('mediaPreview');
        
        if (mediaFile) mediaFile.value = '';
        if (mediaPreview) mediaPreview.innerHTML = '';
    }

    clearMediaFiles() {
        console.log('📎 Medya dosyaları temizlendi');
        this.selectedFiles = [];
        this.updateMediaPreview();
        
        const mediaFile = document.getElementById('mediaFile');
        if (mediaFile) {
            mediaFile.value = '';
        }
    }

    previewMessage() {
        const messageContent = document.getElementById('messageContent').value;
        if (!messageContent.trim()) {
            this.showNotification('Lütfen mesaj içeriği girin.', 'warning');
            return;
        }

        // Process message with variables
        const processedMessage = this.processMessageVariables(messageContent);
        
        // Apply theme styling
        const selectedTheme = localStorage.getItem('selectedMessageTheme') || 'default';
        const styledMessage = this.applyMessageTheme(processedMessage, selectedTheme);
        
        const previewContent = document.getElementById('previewContent');
        const messageBubble = document.getElementById('messageBubble');
        const previewMedia = document.getElementById('previewMedia');
        const previewModal = document.getElementById('previewModal');

        // Update message bubble with theme styling
        if (messageBubble) {
            messageBubble.className = 'message-bubble sent';
            if (selectedTheme !== 'default') {
                messageBubble.classList.add(`theme-${selectedTheme}`);
            }
        }

        // Update preview content inside the bubble
        if (previewContent) {
            previewContent.innerHTML = styledMessage.replace(/\n/g, '<br>');
        }

        // Show media if uploaded
        const mediaFile = document.getElementById('mediaFile');
        if (mediaFile && mediaFile.files.length > 0) {
            const file = mediaFile.files[0];
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    previewMedia.innerHTML = `<img src="${e.target.result}" style="max-width: 100%; border-radius: 8px; margin-bottom: 0.5rem;">`;
                };
                reader.readAsDataURL(file);
            } else {
                previewMedia.innerHTML = `
                    <div style="padding: 0.5rem; background: var(--whatsapp-gray); border-radius: 8px; margin-bottom: 0.5rem;">
                        <i class="fas fa-file"></i> ${file.name}
                    </div>
                `;
            }
        } else {
            previewMedia.innerHTML = '';
        }

        previewModal.classList.add('active');
        
        // Initialize theme selector for this session
        setTimeout(() => {
            this.initThemeSelector();
            // Apply the current theme immediately
            const savedTheme = localStorage.getItem('selectedMessageTheme') || 'default';
            this.updatePreviewWithTheme(savedTheme);
        }, 100);
    }

    // This function is replaced by the enhanced version below

    processMessageVariables(message, contact = null) {
        let processed = message;
        
        if (contact) {
            processed = processed.replace(/\{isim\}/g, contact.name);
            processed = processed.replace(/\{telefon\}/g, contact.phone);
        } else {
            // For preview, use sample data
            processed = processed.replace(/\{isim\}/g, 'Örnek İsim');
            processed = processed.replace(/\{telefon\}/g, '+90 555 000 0000');
        }
        
        processed = processed.replace(/\{tarih\}/g, new Date().toLocaleDateString('tr-TR'));
        
        return processed;
    }

    async simulateSendMessage(contact, message) {
        // Simulate API call delay
        await this.sleep(100 + Math.random() * 200);
        
        // Simulate 95% success rate
        if (Math.random() < 0.05) {
            throw new Error('Sending failed');
        }
        
        console.log(`Message sent to ${contact.name}: ${message}`);
    }

    showSendingProgress() {
        // Create progress modal
        const progressModal = document.createElement('div');
        progressModal.id = 'sendingProgressModal';
        progressModal.className = 'modal active';
        progressModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Mesajlar Gönderiliyor</h3>
                </div>
                <div class="modal-body">
                    <div class="progress-bar">
                        <div class="progress-fill" id="progressFill"></div>
                    </div>
                    <div style="text-align: center; margin-top: 1rem;">
                        <p id="progressText">0 / ${this.selectedContacts.length} mesaj gönderildi</p>
                        <div style="margin-top: 1rem; display: flex; justify-content: space-between;">
                            <span>✅ Başarılı: <span id="successCount">0</span></span>
                            <span>❌ Başarısız: <span id="failCount">0</span></span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(progressModal);
    }

    updateSendingProgress(progress, successCount, failCount) {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        const successCountEl = document.getElementById('successCount');
        const failCountEl = document.getElementById('failCount');

        if (progressFill) progressFill.style.width = `${progress}%`;
        if (progressText) progressText.textContent = `${successCount + failCount} / ${this.selectedContacts.length} mesaj gönderildi`;
        if (successCountEl) successCountEl.textContent = successCount;
        if (failCountEl) failCountEl.textContent = failCount;
    }

    hideSendingProgress() {
        const progressModal = document.getElementById('sendingProgressModal');
        if (progressModal) {
            progressModal.remove();
        }
    }

    showSendingResults(successCount, failCount) {
        const total = successCount + failCount;
        const message = failCount === 0 
            ? `🎉 Tüm mesajlar başarıyla gönderildi! (${total} mesaj)`
            : `⚠️ ${successCount} mesaj başarıyla gönderildi, ${failCount} mesaj gönderilemedi.`;
        
        const type = failCount === 0 ? 'success' : 'warning';
        this.showNotification(message, type, 5000);
    }

    resetMessageForm() {
        document.getElementById('messageContent').value = '';
        const templateSelect = document.getElementById('templateSelect');
        if (templateSelect) templateSelect.value = '';
        const scheduleMessage = document.getElementById('scheduleMessage');
        if (scheduleMessage) scheduleMessage.checked = false;
        const scheduleInputs = document.getElementById('scheduleInputs');
        if (scheduleInputs) scheduleInputs.style.display = 'none';
        this.removeMedia();
        this.updateCharCount();
    }

    // Load templates into modal
    loadTemplatesIntoModal() {
        const grid = document.getElementById('templateGrid');
        if (!grid) return;
        
        const templates = this.initMessageTemplates();
        grid.innerHTML = templates.map(template => `
            <div class="template-card" onclick="crm.selectTemplate('${template.id}')">
                <div class="template-card-header">
                    <h4 class="template-card-name">${template.name}</h4>
                    <span class="template-card-category">${template.category}</span>
                </div>
                <div class="template-card-preview">${template.content.substring(0, 150)}...</div>
            </div>
        `).join('');
    }
    
    // Select template
    selectTemplate(templateId) {
        // Remove previous selection
        document.querySelectorAll('.template-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        // Remove manual write selection
        document.querySelector('.manual-write-option')?.classList.remove('selected');
        
        // Select new template
        event.target.closest('.template-card').classList.add('selected');
        this.selectedTemplateId = templateId;
        this.updateApplyButton();
    }
    
    // Select manual write
    selectManualWrite() {
        // Remove all template selections
        document.querySelectorAll('.template-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        // Select manual write
        document.querySelector('.manual-write-option').classList.add('selected');
        this.selectedTemplateId = 'manual';
        this.updateApplyButton();
    }
    
    // Update apply button state
    updateApplyButton() {
        const btn = document.getElementById('applyTemplateBtn');
        if (btn) {
            btn.disabled = !this.selectedTemplateId;
            btn.textContent = this.selectedTemplateId === 'manual' ? 'Manuel Yaz' : 'Şablonu Uygula';
        }
    }
    
    // Apply selected template
    applySelectedTemplate() {
        if (!this.selectedTemplateId) return;
        
        if (this.selectedTemplateId === 'manual') {
            this.closeTemplateSelector();
            document.getElementById('messageContent').focus();
            return;
        }
        
        const templates = this.initMessageTemplates();
        const template = templates.find(t => t.id === this.selectedTemplateId);
        
        if (template) {
            const textarea = document.getElementById('messageContent');
            let content = template.content;
            
            // Add file information if files are selected
            if (this.selectedFiles && this.selectedFiles.length > 0) {
                const fileInfo = `\n\n📎 Ek dosyalar: ${this.selectedFiles.map(f => f.name).join(', ')}`;
                content += fileInfo;
            }
            
            textarea.value = content;
            textarea.focus();
            
            // Update character count if exists
            if (document.getElementById('charCount')) {
                document.getElementById('charCount').textContent = content.length;
            }
        }
        
        this.closeTemplateSelector();
    }
    
    // Filter templates by category
    filterTemplates(category) {
        // Update active category button
        document.querySelectorAll('.template-category-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
        
        // Filter template cards
        const cards = document.querySelectorAll('.template-card');
        const templates = this.initMessageTemplates();
        
        cards.forEach((card, index) => {
            const template = templates[index];
            if (category === 'all' || template.category === category) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }
    
    // Insert text at cursor position
    insertAtCursor(text) {
        const textarea = document.getElementById('messageContent');
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const currentText = textarea.value;
        
        // Escape sequence replacement
        const insertText = text.replace(/\\n/g, '\n');
        
        // Insert text at cursor position
        const newText = currentText.substring(0, start) + insertText + currentText.substring(end);
        textarea.value = newText;
        
        // Set cursor position after inserted text
        const newCursorPosition = start + insertText.length;
        textarea.setSelectionRange(newCursorPosition, newCursorPosition);
        textarea.focus();
        
        // Update character count if exists
        if (document.getElementById('charCount')) {
            document.getElementById('charCount').textContent = newText.length;
        }
    }

    // Insert greeting with name
    insertGreeting(greeting) {
        if (!greeting) return;
        
        const greetingText = `${greeting} {isim},\n\n`;
        this.insertAtCursor(greetingText);
        
        // Reset dropdown
        document.getElementById('greetingSelect').value = '';
    }

    // Text formatting functions
    formatSelection(type) {
        const textarea = document.getElementById('messageContent');
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textarea.value.substring(start, end);
        
        if (selectedText.length === 0) {
            this.showNotification('Lütfen formatlamak istediğiniz metni seçin', 'warning', 2000);
            return;
        }
        
        let formattedText = '';
        
        switch(type) {
            case 'bold':
                formattedText = `*${selectedText}*`;
                break;
            case 'italic':
                formattedText = `_${selectedText}_`;
                break;
            case 'strikethrough':
                formattedText = `~${selectedText}~`;
                break;
            case 'monospace':
                formattedText = `\`\`\`${selectedText}\`\`\``;
                break;
        }
        
        // Replace selected text with formatted version
        const newText = textarea.value.substring(0, start) + formattedText + textarea.value.substring(end);
        textarea.value = newText;
        
        // Update cursor position
        const newCursorPos = start + formattedText.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.focus();
    }

    // Insert decorative line
    insertLine() {
        const line = '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
        this.insertAtCursor(line);
    }

    // Insert bullet point
    insertBulletPoint() {
        const bullet = '\n• ';
        this.insertAtCursor(bullet);
    }

    // Check if contact is unsubscribed
    isContactUnsubscribed(phoneNumber) {
        const unsubscribedList = JSON.parse(localStorage.getItem('unsubscribedContacts') || '[]');
        return unsubscribedList.includes(phoneNumber);
    }

    // Add contact to unsubscribed list
    unsubscribeContact(phoneNumber) {
        const unsubscribedList = JSON.parse(localStorage.getItem('unsubscribedContacts') || '[]');
        if (!unsubscribedList.includes(phoneNumber)) {
            unsubscribedList.push(phoneNumber);
            localStorage.setItem('unsubscribedContacts', JSON.stringify(unsubscribedList));
        }
        
        // Update contact display
        this.markContactAsUnsubscribed(phoneNumber);
        
        this.showNotification(`${phoneNumber} abonelikten çıkarıldı`, 'warning', 3000);
    }

    // Mark contact as unsubscribed in UI
    markContactAsUnsubscribed(phoneNumber) {
        const contactItems = document.querySelectorAll('.contact-item');
        contactItems.forEach(item => {
            const phone = item.querySelector('.contact-info p')?.textContent;
            if (phone && phone.includes(phoneNumber.replace('+', '').replace('@c.us', ''))) {
                item.classList.add('contact-unsubscribed');
            }
        });
    }

    // Check for unsubscribed contacts before sending
    checkUnsubscribedBeforeSend(recipients) {
        const unsubscribed = recipients.filter(recipient => {
            const phone = recipient.id || recipient.phone || recipient;
            return this.isContactUnsubscribed(phone);
        });

        if (unsubscribed.length > 0) {
            const names = unsubscribed.map(contact => contact.name || contact.phone || contact).join(', ');
            const confirmMessage = `⚠️ Aşağıdaki kişiler abonelikten çıkmış:\n${names}\n\nYine de mesaj göndermek istiyor musunuz?`;
            
            return confirm(confirmMessage);
        }
        
        return true;
    }

    // Add unsubscribe link to message if checkbox is checked
    addUnsubscribeLinkIfNeeded(message) {
        const addUnsubscribe = document.getElementById('addUnsubscribe');
        if (addUnsubscribe && addUnsubscribe.checked) {
            const unsubscribeText = '\n\n' + 
                '━━━━━━━━━━━━━━━━━━━━\n' +
                '📧 Bu mesajları almak istemiyorsanız "ABONELIK IPTAL" yazarak yanıtlayın.';
            return message + unsubscribeText;
        }
        return message;
    }

    showContactModal(contactId = null) {
        const modal = document.getElementById('contactModal');
        const form = document.getElementById('contactForm');
        
        if (contactId) {
            // Edit mode
            const contact = this.contacts.find(c => c.id === contactId);
            if (contact) {
                document.getElementById('contactName').value = contact.name;
                document.getElementById('contactPhone').value = contact.phone;
                document.getElementById('contactGroup').value = contact.group;
                document.getElementById('contactNotes').value = contact.notes || '';
                form.dataset.contactId = contactId;
            }
        } else {
            // Add mode
            form.reset();
            delete form.dataset.contactId;
        }
        
        modal.classList.add('active');
    }

    hideContactModal() {
        document.getElementById('contactModal').classList.remove('active');
    }

    saveContact() {
        const form = document.getElementById('contactForm');
        const formData = new FormData(form);
        
        const contactData = {
            name: document.getElementById('contactName').value,
            phone: document.getElementById('contactPhone').value,
            group: document.getElementById('contactGroup').value,
            notes: document.getElementById('contactNotes').value,
            status: 'active',
            lastMessage: 'Henüz mesaj yok'
        };

        // Validation
        if (!contactData.name || !contactData.phone) {
            this.showNotification('Lütfen ad ve telefon alanlarını doldurun.', 'warning');
            return;
        }

        if (form.dataset.contactId) {
            // Update existing contact
            const contactId = parseInt(form.dataset.contactId);
            const index = this.contacts.findIndex(c => c.id === contactId);
            if (index > -1) {
                this.contacts[index] = { ...this.contacts[index], ...contactData };
                this.showNotification('Kişi başarıyla güncellendi.', 'success');
            }
        } else {
            // Add new contact
            const newContact = {
                id: Date.now(),
                ...contactData
            };
            this.contacts.push(newContact);
            this.showNotification('Kişi başarıyla eklendi.', 'success');
        }

        this.hideContactModal();
        if (this.currentSection === 'contacts') {
            this.renderContacts();
        }
        this.updateContactCount();
    }

    editContact(contactId) {
        this.showContactModal(contactId);
    }

    deleteContact(contactId) {
        if (confirm('Bu kişiyi silmek istediğinizden emin misiniz?')) {
            const index = this.contacts.findIndex(c => c.id === contactId);
            if (index > -1) {
                this.contacts.splice(index, 1);
                this.showNotification('Kişi başarıyla silindi.', 'success');
                this.renderContacts();
                this.updateContactCount();
            }
        }
    }

    updateContactCount() {
        const countElement = document.querySelector('.nav-item[data-section="contacts"] .count');
        if (countElement) {
            countElement.textContent = this.contacts.length;
        }
        
        // Update total contacts count in bulk sender section
        const totalContactsElement = document.getElementById('totalContactsCount');
        if (totalContactsElement) {
            totalContactsElement.textContent = this.contacts.length;
        }

        // Update dashboard total contacts
        const dashboardTotalElement = document.getElementById('totalContacts');
        if (dashboardTotalElement) {
            dashboardTotalElement.textContent = this.contacts.length.toLocaleString('tr-TR');
        }
    }

    showNotification(message, type = 'info', duration = 3000) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Add styles if not exists
        if (!document.getElementById('notificationStyles')) {
            const style = document.createElement('style');
            style.id = 'notificationStyles';
            style.textContent = `
                .notification {
                    position: fixed;
                    top: 100px;
                    right: 20px;
                    background: white;
                    border-radius: 8px;
                    box-shadow: var(--shadow-lg);
                    padding: 1rem;
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    z-index: 1001;
                    max-width: 400px;
                    animation: slideInRight 0.3s ease-out;
                    border-left: 4px solid var(--whatsapp-green);
                }
                .notification-success { border-left-color: var(--success-color); }
                .notification-error { border-left-color: var(--error-color); }
                .notification-warning { border-left-color: var(--warning-color); }
                .notification-content { display: flex; align-items: center; gap: 0.75rem; flex: 1; }
                .notification-close { background: none; border: none; cursor: pointer; color: var(--text-secondary); }
                @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);

        // Auto remove after duration
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'slideInRight 0.3s ease-out reverse';
                setTimeout(() => notification.remove(), 300);
            }
        }, duration);
    }

    getNotificationIcon(type) {
        switch(type) {
            case 'success': return 'check-circle';
            case 'error': return 'exclamation-circle';
            case 'warning': return 'exclamation-triangle';
            default: return 'info-circle';
        }
    }

    getGroupName(group) {
        const groups = {
            customers: 'Müşteriler',
            leads: 'Potansiyel Müşteriler',
            partners: 'Partnerler'
        };
        return groups[group] || group;
    }

    getCategoryName(category) {
        const categories = {
            welcome: 'Karşılama',
            promotion: 'Promosyon',
            reminder: 'Hatırlatma'
        };
        return categories[category] || category;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Manual Contact Entry Functions
    addManualContact() {
        const nameInput = document.getElementById('manualName');
        const phoneInput = document.getElementById('manualPhone');
        
        const name = nameInput?.value.trim();
        const phone = phoneInput?.value.trim();
        
        if (!name || !phone) {
            this.showNotification('Lütfen isim ve telefon numarasını girin.', 'warning');
            return;
        }
        
        // Create temporary contact for manual entry
        const manualContact = {
            id: Date.now(),
            name: name,
            phone: phone,
            group: 'manual',
            isManual: true
        };
        
        // Add to selected contacts
        this.selectedContacts = [manualContact];
        
        // Clear inputs
        if (nameInput) nameInput.value = '';
        if (phoneInput) phoneInput.value = '';
        
        // Update UI
        this.updateSelectedCount();
        this.showNotification(`${name} manuel olarak eklendi.`, 'success');
    }

    // Bulk Delete Functions
    bulkDeleteManualContacts() {
        const manualContacts = this.contacts.filter(contact => contact.isManual || contact.group === 'manual');
        
        if (manualContacts.length === 0) {
            this.showNotification('Silinecek manuel kişi bulunamadı.', 'warning');
            return;
        }

        // Show confirmation dialog
        const confirmed = confirm(
            `${manualContacts.length} adet manuel kişi silinecek. Bu işlem geri alınamaz. Devam etmek istiyor musunuz?`
        );

        if (!confirmed) {
            return;
        }

        // Remove manual contacts from contacts array
        this.contacts = this.contacts.filter(contact => !contact.isManual && contact.group !== 'manual');
        
        // Remove from selected contacts if any
        this.selectedContacts = this.selectedContacts.filter(contact => !contact.isManual && contact.group !== 'manual');

        // Update UI
        this.renderContacts();
        this.updateContactCount();
        this.updateSelectedCount();
        
        this.showNotification(`${manualContacts.length} manuel kişi başarıyla silindi.`, 'success');
        
        console.log(`Deleted ${manualContacts.length} manual contacts`);
    }

    bulkDeleteImportedContacts() {
        const importedContacts = this.contacts.filter(contact => contact.group === 'imported');
        
        if (importedContacts.length === 0) {
            this.showNotification('Silinecek içe aktarılmış kişi bulunamadı.', 'warning');
            return;
        }

        // Show confirmation dialog
        const confirmed = confirm(
            `${importedContacts.length} adet içe aktarılmış kişi (CSV/Excel) silinecek. Bu işlem geri alınamaz. Devam etmek istiyor musunuz?`
        );

        if (!confirmed) {
            return;
        }

        // Remove imported contacts from contacts array
        this.contacts = this.contacts.filter(contact => contact.group !== 'imported');
        
        // Remove from selected contacts if any
        this.selectedContacts = this.selectedContacts.filter(contact => contact.group !== 'imported');

        // Update UI
        this.renderContacts();
        this.updateContactCount();
        this.updateSelectedCount();
        
        this.showNotification(`${importedContacts.length} içe aktarılmış kişi başarıyla silindi.`, 'success');
        
        console.log(`Deleted ${importedContacts.length} imported contacts`);
    }

    // Settings Functions
    switchSettingsTab(tabName) {
        // Update tabs
        document.querySelectorAll('.settings-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');
        
        // Update sections
        document.querySelectorAll('.settings-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(`${tabName}Settings`)?.classList.add('active');
    }

    saveSettings(type) {
        let message = '';
        
        switch(type) {
            case 'general':
                // Save general settings
                const appName = document.getElementById('appName')?.value;
                const timezone = document.getElementById('timezone')?.value;
                const language = document.getElementById('language')?.value;
                
                // Store in localStorage (in real app, send to server)
                localStorage.setItem('settings_general', JSON.stringify({
                    appName, timezone, language
                }));
                
                message = 'Genel ayarlar kaydedildi.';
                break;
                
            case 'api':
                // Save API settings
                const apiEndpoint = document.getElementById('apiEndpoint')?.value;
                const apiKey = document.getElementById('apiKey')?.value;
                const instanceId = document.getElementById('instanceId')?.value;
                
                localStorage.setItem('settings_api', JSON.stringify({
                    apiEndpoint, apiKey, instanceId
                }));
                
                message = 'API ayarları kaydedildi.';
                break;
                
            case 'messaging':
                // Save messaging settings
                const sendingSpeed = document.getElementById('sendingSpeed')?.value;
                const randomDelay = document.getElementById('randomDelay')?.checked;
                const maxRetries = document.getElementById('maxRetries')?.value;
                
                localStorage.setItem('settings_messaging', JSON.stringify({
                    sendingSpeed, randomDelay, maxRetries
                }));
                
                message = 'Mesajlaşma ayarları kaydedildi.';
                break;
        }
        
        this.showNotification(message, 'success');
    }

    // Load saved settings on page load
    loadSettings() {
        // Load general settings
        const generalSettings = JSON.parse(localStorage.getItem('settings_general') || '{}');
        if (generalSettings.appName) {
            const appNameInput = document.getElementById('appName');
            if (appNameInput) appNameInput.value = generalSettings.appName;
        }
        if (generalSettings.timezone) {
            const timezoneSelect = document.getElementById('timezone');
            if (timezoneSelect) timezoneSelect.value = generalSettings.timezone;
        }
        if (generalSettings.language) {
            const languageSelect = document.getElementById('language');
            if (languageSelect) languageSelect.value = generalSettings.language;
        }
        
        // Load API settings
        const apiSettings = JSON.parse(localStorage.getItem('settings_api') || '{}');
        if (apiSettings.apiEndpoint) {
            const apiEndpointInput = document.getElementById('apiEndpoint');
            if (apiEndpointInput) apiEndpointInput.value = apiSettings.apiEndpoint;
        }
        if (apiSettings.instanceId) {
            const instanceIdInput = document.getElementById('instanceId');
            if (instanceIdInput) instanceIdInput.value = apiSettings.instanceId;
        }
        
        // Load messaging settings
        const messagingSettings = JSON.parse(localStorage.getItem('settings_messaging') || '{}');
        if (messagingSettings.sendingSpeed) {
            const sendingSpeedSelect = document.getElementById('sendingSpeed');
            if (sendingSpeedSelect) sendingSpeedSelect.value = messagingSettings.sendingSpeed;
        }
        if (messagingSettings.randomDelay !== undefined) {
            const randomDelayCheckbox = document.getElementById('randomDelay');
            if (randomDelayCheckbox) randomDelayCheckbox.checked = messagingSettings.randomDelay;
        }
        if (messagingSettings.maxRetries) {
            const maxRetriesInput = document.getElementById('maxRetries');
            if (maxRetriesInput) maxRetriesInput.value = messagingSettings.maxRetries;
        }
    }

    // Update the sendBulkMessage function to handle manual contacts
    updateSelectedCount() {
        const countElement = document.getElementById('selectedCount');
        if (countElement) {
            const recipientType = document.querySelector('input[name="recipientType"]:checked')?.value;
            
            if (recipientType === 'manual') {
                const manualPhones = document.getElementById('manualPhones')?.value.trim();
                const phoneCount = manualPhones ? manualPhones.split('\n').filter(phone => phone.trim()).length : 0;
                countElement.textContent = phoneCount;
            } else if (recipientType === 'whatsapp-groups') {
                const selectedGroups = this.selectedWhatsAppGroups || [];
                countElement.textContent = selectedGroups.length;
            } else if (recipientType === 'all') {
                // Show total contact count for "all" option
                countElement.textContent = this.contacts.length;
            } else {
                countElement.textContent = this.selectedContacts.length;
            }
        }
    }

    // WhatsApp Integration Functions
    async syncWhatsAppContacts() {
        if (!this.isConnected) {
            this.showNotification('Önce WhatsApp Web\'e bağlanın.', 'warning');
            return;
        }

        const button = document.getElementById('syncWhatsAppContacts');
        const originalText = button.innerHTML;
        
        // Show loading state
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Senkronize ediliyor...';
        button.disabled = true;

        try {
            // Real WhatsApp API call via Socket.IO
            this.socket.emit('get_contacts');
            
            this.showNotification('WhatsApp kişileri senkronize ediliyor...', 'info');

        } catch (error) {
            console.error('WhatsApp sync error:', error);
            this.showNotification('WhatsApp senkronizasyonu başarısız.', 'error');
        } finally {
            // Restore button
            button.innerHTML = originalText;
            button.disabled = false;
        }
    }

    async syncWhatsAppGroupsData() {
        if (!this.isConnected) {
            this.showNotification('WhatsApp bağlantısı gerekli.', 'warning');
            return;
        }

        try {
            // Real WhatsApp API call via Socket.IO
            this.socket.emit('get_groups');
            this.selectedWhatsAppGroups = [];
        } catch (error) {
            console.error('WhatsApp groups sync error:', error);
            this.showNotification('WhatsApp grupları senkronize edilemedi.', 'error');
        }
    }

    async loadWhatsAppGroups() {
        const groupsList = document.getElementById('whatsappGroupsList');
        if (!groupsList) return;

        // Show loading
        groupsList.innerHTML = `
            <div class="loading-message">
                <i class="fas fa-spinner loading-icon"></i>
                WhatsApp grupları yükleniyor...
            </div>
        `;

        try {
            if (!this.whatsappGroups || this.whatsappGroups.length === 0) {
                await this.syncWhatsAppGroupsData();
            }

            this.renderWhatsAppGroups();

        } catch (error) {
            console.error('Groups loading error:', error);
            groupsList.innerHTML = `
                <div class="loading-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    Gruplar yüklenirken hata oluştu.
                </div>
            `;
        }
    }

    renderWhatsAppGroups() {
        const groupsList = document.getElementById('whatsappGroupsList');
        if (!groupsList || !this.whatsappGroups) return;

        // Add search box first
        groupsList.innerHTML = `
            <div class="contact-search-box">
                <input type="text" id="whatsappGroupSearch" placeholder="WhatsApp grubu ara..." class="search-input">
                <i class="fas fa-search search-icon"></i>
            </div>
            <div class="whatsapp-group-results" id="whatsappGroupResults"></div>
        `;

        // Render all groups initially
        this.renderWhatsAppGroupResults(this.whatsappGroups);

        // Add search event listener
        const searchInput = document.getElementById('whatsappGroupSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterWhatsAppGroups(e.target.value);
            });
        }
    }

    renderWhatsAppGroupResults(groups) {
        const resultsContainer = document.getElementById('whatsappGroupResults');
        if (!resultsContainer) return;

        resultsContainer.innerHTML = groups.map(group => `
            <div class="group-item" onclick="crm.toggleGroupSelection('${group.id}')">
                <input type="checkbox" id="group_${group.id}" ${this.selectedWhatsAppGroups?.includes(group.id) ? 'checked' : ''}>
                <div class="group-avatar">${group.avatar}</div>
                <div class="group-info">
                    <h4>${group.name}</h4>
                    <p>${group.description}</p>
                    <span class="group-members">${group.members} üye</span>
                    ${!group.canSendMessages ? '<span class="group-members" style="background: #ffebee; color: #c62828;">Admin değil</span>' : ''}
                </div>
            </div>
        `).join('');

        this.updateSelectedGroupsCount();
    }

    filterWhatsAppGroups(searchTerm) {
        if (!this.whatsappGroups) return;

        if (!searchTerm.trim()) {
            this.renderWhatsAppGroupResults(this.whatsappGroups);
            return;
        }

        const filteredGroups = this.whatsappGroups.filter(group =>
            group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            group.description.toLowerCase().includes(searchTerm.toLowerCase())
        );

        this.renderWhatsAppGroupResults(filteredGroups);
    }

    toggleGroupSelection(groupId) {
        if (!this.selectedWhatsAppGroups) {
            this.selectedWhatsAppGroups = [];
        }

        const checkbox = document.getElementById(`group_${groupId}`);
        const group = this.whatsappGroups.find(g => g.id === groupId);

        if (!group.canSendMessages) {
            this.showNotification('Bu gruba mesaj gönderme yetkiniz yok.', 'warning');
            checkbox.checked = false;
            return;
        }

        if (checkbox.checked) {
            if (!this.selectedWhatsAppGroups.includes(groupId)) {
                this.selectedWhatsAppGroups.push(groupId);
            }
        } else {
            this.selectedWhatsAppGroups = this.selectedWhatsAppGroups.filter(id => id !== groupId);
        }

        this.updateSelectedGroupsCount();
        this.updateSelectedCount();
    }

    updateSelectedGroupsCount() {
        const countElement = document.getElementById('selectedGroupsCount');
        if (countElement && this.selectedWhatsAppGroups) {
            const count = this.selectedWhatsAppGroups.length;
            countElement.innerHTML = `<i class="fas fa-users"></i> ${count} grup seçildi`;
        }
    }

    // Enhanced Bulk Message Sending with Smart Delays
    async sendBulkMessage() {
        if (!this.isConnected) {
            this.showNotification('Önce WhatsApp Web\'e bağlanın.', 'error');
            return;
        }

        let messageContent = document.getElementById('messageContent').value.trim();
        if (!messageContent) {
            this.showNotification('Lütfen mesaj içeriği girin.', 'warning');
            return;
        }

        // Reset sending flags
        this.sendingStopped = false;
        this.sendingPaused = false;

        // Add unsubscribe link if checkbox is checked
        messageContent = this.addUnsubscribeLinkIfNeeded(messageContent);

        const recipientType = document.querySelector('input[name="recipientType"]:checked')?.value;
        let recipients = [];

        // Determine recipients based on type
        switch(recipientType) {
            case 'whatsapp-groups':
                if (!this.selectedWhatsAppGroups || this.selectedWhatsAppGroups.length === 0) {
                    this.showNotification('Lütfen en az bir grup seçin.', 'warning');
                    return;
                }
                recipients = this.selectedWhatsAppGroups.map(groupId => {
                    const group = this.whatsappGroups.find(g => g.id === groupId);
                    return { type: 'group', id: groupId, name: group.name, members: group.members };
                });
                break;
            case 'manual':
                // Manuel girilen telefon numaraları
                const manualPhones = document.getElementById('manualPhones')?.value.trim();
                if (!manualPhones) {
                    this.showNotification('Lütfen en az bir telefon numarası girin.', 'warning');
                    return;
                }
                // Telefon numaralarını satır satır ayır
                const phoneNumbers = manualPhones.split('\n').filter(phone => phone.trim());
                if (phoneNumbers.length === 0) {
                    this.showNotification('Lütfen geçerli telefon numaraları girin.', 'warning');
                    return;
                }
                recipients = phoneNumbers.map(phone => ({
                    type: 'contact',
                    id: 'manual_' + Date.now() + '_' + Math.random(),
                    name: phone.trim(),
                    phone: phone.trim()
                }));
                break;
            case 'all':
            case 'groups':
            case 'custom':
                if (this.selectedContacts.length === 0) {
                    this.showNotification('Lütfen en az bir kişi seçin.', 'warning');
                    return;
                }
                recipients = this.selectedContacts.map(contact => ({
                    type: 'contact',
                    id: contact.id,
                    name: contact.name,
                    phone: contact.phone
                }));
                break;
        }

        // Check for unsubscribed contacts before sending
        if (!this.checkUnsubscribedBeforeSend(recipients)) {
            return; // User cancelled due to unsubscribed contacts
        }

        // Get smart delay settings
        const smartDelayEnabled = document.getElementById('enableSmartDelay')?.checked;
        const delaySettings = {
            after10: parseInt(document.getElementById('delay10')?.value) * 1000 || 30000,
            after100: parseInt(document.getElementById('delay100')?.value) * 1000 || 300000,
            after300: parseInt(document.getElementById('delay300')?.value) * 1000 || 600000,
            after500: parseInt(document.getElementById('delay500')?.value) * 1000 || 1800000
        };

        // Start sending process
        await this.processBulkSending(recipients, messageContent, delaySettings, smartDelayEnabled);
    }

    async processBulkSending(recipients, messageContent, delaySettings, smartDelayEnabled) {
        const totalMessages = recipients.reduce((total, recipient) => {
            return total + (recipient.type === 'group' ? recipient.members : 1);
        }, 0);

        // Create progress modal
        this.showSendingProgress(totalMessages);

        let sentCount = 0;
        let failedCount = 0;

        try {
            for (let i = 0; i < recipients.length; i++) {
                const recipient = recipients[i];
                
                try {
                    // Process message with variables
                    const personalizedMessage = this.processMessageVariables(messageContent, recipient);
                    
                    // Send message
                    await this.sendSingleMessage(recipient, personalizedMessage);
                    
                    if (recipient.type === 'group') {
                        sentCount += recipient.members;
                    } else {
                        sentCount++;
                    }

                    // Update progress
                    this.updateSendingProgress(sentCount, totalMessages, failedCount);

                    // Smart delay logic
                    if (smartDelayEnabled) {
                        await this.applySmartDelay(sentCount, delaySettings);
                    }

                    // Regular delay between messages
                    await this.sleep(1000);

                } catch (error) {
                    console.error(`Failed to send to ${recipient.name}:`, error);
                    failedCount++;
                    this.updateSendingProgress(sentCount, totalMessages, failedCount);
                }
            }

            this.completeSendingProcess(sentCount, failedCount);

        } catch (error) {
            console.error('Bulk sending error:', error);
            this.showNotification('Toplu gönderim sırasında hata oluştu.', 'error');
            this.hideSendingProgress();
        }
    }

    async applySmartDelay(sentCount, delaySettings) {
        let delayTime = 0;
        let delayReason = '';

        if (sentCount % 10 === 0) {
            delayTime = delaySettings.after10;
            delayReason = 'Her 10 mesajda bir bekleme';
        }

        if (sentCount === 100) {
            delayTime = Math.max(delayTime, delaySettings.after100);
            delayReason = '100 mesaj sonrası güvenlik beklemesi';
        } else if (sentCount === 300) {
            delayTime = Math.max(delayTime, delaySettings.after300);
            delayReason = '300 mesaj sonrası uzun bekleme';
        } else if (sentCount === 500) {
            delayTime = Math.max(delayTime, delaySettings.after500);
            delayReason = '500 mesaj sonrası maksimum bekleme';
        }

        if (delayTime > 0) {
            await this.showDelayCountdown(delayTime, delayReason);
        }
    }

    async showDelayCountdown(delayTime, reason) {
        const progressModal = document.querySelector('.sending-progress-modal');
        if (!progressModal) return;

        const delayElement = progressModal.querySelector('.delay-countdown');
        if (delayElement) {
            delayElement.style.display = 'block';
            delayElement.querySelector('.delay-reason').textContent = reason;
            
            let remainingTime = Math.floor(delayTime / 1000);
            const countdownElement = delayElement.querySelector('.countdown-timer');
            
            const updateCountdown = () => {
                const minutes = Math.floor(remainingTime / 60);
                const seconds = remainingTime % 60;
                countdownElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                
                if (remainingTime > 0) {
                    remainingTime--;
                    setTimeout(updateCountdown, 1000);
                } else {
                    delayElement.style.display = 'none';
                }
            };
            
            updateCountdown();
            await this.sleep(delayTime);
        }
    }

    showImportModal() {
        // Create import modal
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Kişi İçe Aktarma</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="import-options">
                        <div class="import-option">
                            <h4><i class="fas fa-file-csv"></i> CSV/Excel Dosyası</h4>
                            <p>CSV veya Excel formatındaki kişi listesini içe aktarın.</p>
                            <input type="file" id="importFile" accept=".csv,.xlsx,.xls" style="display: none;">
                            <button class="btn-primary" onclick="document.getElementById('importFile').click()">
                                <i class="fas fa-upload"></i> Dosya Seç
                            </button>
                        </div>
                        <div class="import-option">
                            <h4><i class="fas fa-paste"></i> Metin Olarak Yapıştır</h4>
                            <p>Kişi bilgilerini metin olarak yapıştırın (her satırda: İsim, Telefon).</p>
                            <textarea id="pasteContacts" placeholder="Ali Veli, +90 555 123 4567
Ayşe Yılmaz, +90 555 234 5678" rows="5"></textarea>
                            <button class="btn-primary" onclick="crm.importFromText()">
                                <i class="fas fa-paste"></i> İçe Aktar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Handle file selection
        const fileInput = modal.querySelector('#importFile');
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.importFromFile(e.target.files[0]);
            }
        });
    }

    importFromText() {
        const textarea = document.getElementById('pasteContacts');
        const text = textarea.value.trim();
        
        if (!text) {
            this.showNotification('Lütfen kişi bilgilerini girin.', 'warning');
            return;
        }

        const lines = text.split('\n');
        let imported = 0;
        let failed = 0;

        lines.forEach(line => {
            const parts = line.split(',').map(part => part.trim());
            if (parts.length >= 2) {
                const [name, phone] = parts;
                if (name && phone) {
                    this.contacts.push({
                        id: Date.now() + Math.random(),
                        name,
                        phone,
                        email: '',
                        group: 'imported',
                        tags: ['İçe Aktarılan']
                    });
                    imported++;
                } else {
                    failed++;
                }
            } else {
                failed++;
            }
        });

        this.renderContactsTable();
        this.updateContactsCount();
        
        let message = `${imported} kişi başarıyla içe aktarıldı.`;
        if (failed > 0) {
            message += ` ${failed} satır hatalı olduğu için atlandı.`;
        }
        
        this.showNotification(message, imported > 0 ? 'success' : 'warning');
        
        // Close modal
        document.querySelector('.modal').remove();
    }

    async importFromFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            const lines = text.split('\n');
            let imported = 0;
            let failed = 0;

            lines.forEach((line, index) => {
                if (index === 0) return; // Skip header
                
                const parts = line.split(',').map(part => part.trim());
                if (parts.length >= 2) {
                    const [name, phone] = parts;
                    if (name && phone) {
                        this.contacts.push({
                            id: Date.now() + Math.random(),
                            name,
                            phone,
                            email: parts[2] || '',
                            group: 'imported',
                            tags: ['Dosya İçe Aktarma']
                        });
                        imported++;
                    } else {
                        failed++;
                    }
                } else {
                    failed++;
                }
            });

            this.renderContactsTable();
            this.updateContactsCount();
            
            let message = `${imported} kişi başarıyla içe aktarıldı.`;
            if (failed > 0) {
                message += ` ${failed} satır hatalı olduğu için atlandı.`;
            }
            
            this.showNotification(message, imported > 0 ? 'success' : 'warning');
            
            // Close modal
            document.querySelector('.modal').remove();
        };
        
        reader.readAsText(file);
    }

    // Progress Modal for Bulk Sending
    showSendingProgress(totalMessages) {
        const modal = document.createElement('div');
        modal.className = 'modal active sending-progress-modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3><i class="fas fa-paper-plane"></i> Toplu Gönderim</h3>
                </div>
                <div class="modal-body">
                    <div class="progress-info">
                        <div class="progress-stats">
                            <div class="stat">
                                <span class="stat-label">Gönderilen:</span>
                                <span class="stat-value" id="sentCount">0</span>
                            </div>
                            <div class="stat">
                                <span class="stat-label">Toplam:</span>
                                <span class="stat-value">${totalMessages}</span>
                            </div>
                            <div class="stat">
                                <span class="stat-label">Başarısız:</span>
                                <span class="stat-value" id="failedCount">0</span>
                            </div>
                        </div>
                        
                        <div class="progress-bar">
                            <div class="progress-fill" id="progressFill"></div>
                        </div>
                        
                        <div class="progress-text" id="progressText">Gönderim başlatılıyor...</div>
                    </div>
                    
                    <div class="delay-countdown" id="delayCountdown" style="display: none;">
                        <div class="delay-info">
                            <i class="fas fa-clock"></i>
                            <span class="delay-reason"></span>
                        </div>
                        <div class="countdown-timer">00:00</div>
                    </div>
                    
                    <div class="sending-actions">
                        <button class="btn-secondary" id="pauseSending" onclick="crm.pauseSending()">
                            <i class="fas fa-pause"></i> Duraklat
                        </button>
                        <button class="btn-danger" id="stopSending" onclick="crm.stopSending()">
                            <i class="fas fa-stop"></i> Durdur
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    updateSendingProgress(sent, total, failed) {
        const sentElement = document.getElementById('sentCount');
        const failedElement = document.getElementById('failedCount');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');

        if (sentElement) sentElement.textContent = sent;
        if (failedElement) failedElement.textContent = failed;
        
        if (progressFill) {
            const percentage = (sent / total) * 100;
            progressFill.style.width = `${percentage}%`;
        }
        
        if (progressText) {
            progressText.textContent = `${sent}/${total} mesaj gönderildi`;
        }
    }

    completeSendingProcess(sent, failed) {
        const modal = document.querySelector('.sending-progress-modal');
        if (modal) {
            const progressText = modal.querySelector('#progressText');
            const actions = modal.querySelector('.sending-actions');
            
            if (progressText) {
                const total = sent + failed;
                let message, icon, color;
                
                if (failed === 0) {
                    message = 'Gönderim başarıyla tamamlandı!';
                    icon = 'fas fa-check-circle';
                    color = 'var(--success-color)';
                } else if (sent === 0) {
                    message = 'Gönderim başarısız oldu!';
                    icon = 'fas fa-times-circle';
                    color = 'var(--error-color)';
                } else {
                    message = `Gönderim tamamlandı. ${sent} başarılı, ${failed} başarısız.`;
                    icon = 'fas fa-exclamation-triangle';
                    color = 'var(--warning-color)';
                }
                
                progressText.innerHTML = `
                    <div class="completion-message">
                        <i class="${icon}" style="color: ${color};"></i>
                        ${message}
                    </div>
                `;
            }
            
            if (actions) {
                actions.innerHTML = `
                    <button class="btn-primary" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i> Kapat
                    </button>
                `;
            }
        }

        // Show appropriate notification
        if (failed === 0 && sent > 0) {
            this.showNotification(`${sent} mesaj başarıyla gönderildi.`, 'success');
        } else if (sent === 0 && failed > 0) {
            this.showNotification(`${failed} mesaj gönderilemedi.`, 'error');
        } else if (sent > 0 && failed > 0) {
            this.showNotification(`${sent} mesaj gönderildi, ${failed} mesaj başarısız.`, 'warning');
        }
    }

    hideSendingProgress() {
        const modal = document.querySelector('.sending-progress-modal');
        if (modal) {
            modal.remove();
        }
    }

    pauseSending() {
        this.sendingPaused = !this.sendingPaused;
        const button = document.getElementById('pauseSending');
        if (button) {
            if (this.sendingPaused) {
                button.innerHTML = '<i class="fas fa-play"></i> Devam Et';
                this.showNotification('Gönderim duraklatıldı.', 'info');
            } else {
                button.innerHTML = '<i class="fas fa-pause"></i> Duraklat';
                this.showNotification('Gönderim devam ediyor.', 'info');
            }
        }
    }

    stopSending() {
        this.sendingStopped = true;
        this.hideSendingProgress();
        this.showNotification('Gönderim durduruldu.', 'warning');
    }


    processMessageVariables(message, recipient) {
        if (!recipient) {
            // For preview, use sample data
            const previewMessage = message
                .replace(/\{isim\}/g, 'Ahmet')
                .replace(/\{soyisim\}/g, 'Yılmaz')
                .replace(/\{isim\} \{soyisim\}/g, 'Ahmet Yılmaz')
                .replace(/\{tarih\}/g, new Date().toLocaleDateString('tr-TR'));
            
            // Add unsubscribe link with preview data
            return this.addUnsubscribeLink(previewMessage, '+90 555 000 0000', 'Ahmet Yılmaz');
        }
        
        // Split full name into first and last name
        const fullName = recipient.name || 'İsim Yok';
        const nameParts = fullName.trim().split(' ');
        const firstName = nameParts[0] || 'İsim';
        const lastName = nameParts.slice(1).join(' ') || 'Soyisim';
        
        let processedMessage = message
            .replace(/\{isim\}/g, firstName)
            .replace(/\{soyisim\}/g, lastName)
            .replace(/\{tarih\}/g, new Date().toLocaleDateString('tr-TR'));
        
        // Add unsubscribe link
        const phone = recipient.id ? recipient.id.replace('@c.us', '') : recipient.number;
        return this.addUnsubscribeLink(processedMessage, phone, fullName);
    }
    
    addUnsubscribeLink(message, phone, name) {
        // Check if unsubscribe is enabled
        const unsubscribeEnabled = document.getElementById('enableUnsubscribe')?.checked;
        
        if (!unsubscribeEnabled) {
            return message;
        }
        
        // Create WhatsApp message link for unsubscribe
        // This will open WhatsApp with pre-filled message to the same number
        const unsubscribeMessage = `ABONELIK IPTAL - ${name}`;
        const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(unsubscribeMessage)}`;
        const unsubscribeText = `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📧 Bu mesajları almak istemiyorsanız buraya tıklayın: ${whatsappUrl}`;
        
        return message + unsubscribeText;
    }
    
    handleUnsubscribeNotification(data) {
        const { phone, name, timestamp } = data;
        const cleanPhone = phone.replace(/[^\d]/g, '');
        
        // Show notification
        this.showNotification(
            `📧 ${name} (${cleanPhone}) abonelikten çıktı`, 
            'warning', 
            8000
        );
        
        // Update contact in the list with unsubscribe status
        const contactIndex = this.contacts.findIndex(contact => {
            const contactPhone = contact.id ? contact.id.replace('@c.us', '').replace(/[^\d]/g, '') : 
                                   contact.number ? contact.number.replace(/[^\d]/g, '') : '';
            return contactPhone === cleanPhone;
        });
        
        if (contactIndex !== -1) {
            this.contacts[contactIndex].unsubscribed = true;
            this.contacts[contactIndex].unsubscribedAt = timestamp;
            
            // Refresh contacts table to show unsubscribe status
            this.renderContactsTable();
            this.updateContactCount();
        }
        
        // Add to unsubscribed list in localStorage
        const unsubscribedList = JSON.parse(localStorage.getItem('unsubscribedContacts') || '[]');
        if (!unsubscribedList.includes(cleanPhone)) {
            unsubscribedList.push(cleanPhone);
            localStorage.setItem('unsubscribedContacts', JSON.stringify(unsubscribedList));
        }
        
        console.log(`📧 ${name} (${cleanPhone}) abonelikten çıkarıldı ve liste güncellendi`);
    }

    // Render contacts table
    renderContactsTable(page = 1, pageSize = 50) {
        const contactsList = document.getElementById('contactsTableBody');
        if (!contactsList) {
            console.error('contactsTableBody element not found');
            return;
        }

        if (this.contacts.length === 0) {
            contactsList.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state-cell">
                        <div class="empty-state">
                            <i class="fas fa-users"></i>
                            <h3>Henüz kişi yok</h3>
                            <p>WhatsApp'tan kişi çekin veya manuel olarak ekleyin</p>
                            <button onclick="window.crm.syncContacts()" class="btn-primary">
                                <i class="fas fa-sync"></i> WhatsApp'tan Çek
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        // Sayfalama - sadece ilk 50 kişiyi göster
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedContacts = this.contacts.slice(startIndex, endIndex);
        
        console.log(`Rendering ${paginatedContacts.length} contacts (${startIndex}-${endIndex} of ${this.contacts.length})`);

        const contactsHTML = paginatedContacts.map((contact, index) => `
            <tr class="contact-row" data-id="${contact.id}">
                <td>
                    <input type="checkbox" class="contact-checkbox" value="${contact.id}">
                </td>
                <td>
                    <div class="contact-info">
                        <div class="contact-avatar">
                            <i class="fas fa-user"></i>
                        </div>
                        <div>
                            <div class="contact-name">${contact.name || 'İsimsiz'}</div>
                            <div class="contact-phone">
                                ${(() => {
                                    if (contact.whatsappData && contact.whatsappData.phones && contact.whatsappData.phones.length > 0) {
                                        // Filter out invalid phone numbers - only Turkish numbers starting with 90
                                        const validPhones = contact.whatsappData.phones.filter(phone => {
                                            if (!phone) return false;
                                            const cleanPhone = phone.replace(/@c\.us$/, '').replace(/\+/g, '').replace(/\s/g, '');
                                            return /^90[0-9]{10,11}$/.test(cleanPhone);
                                        });
                                        return validPhones.length > 0 ? validPhones.join(', ') : (contact.phone || 'Numara yok');
                                    } else {
                                        return contact.phone || 'Numara yok';
                                    }
                                })()}
                            </div>
                        </div>
                    </div>
                </td>
                <td>${contact.group || 'WhatsApp'}</td>
                <td>
                    <span class="status-badge ${contact.whatsappData ? 'success' : 'default'}">
                        ${contact.whatsappData ? 'WhatsApp' : 'Manuel'}
                    </span>
                </td>
                <td>
                    <div class="contact-actions">
                        <button onclick="window.crm.editContact('${contact.id}')" class="btn-small" title="Düzenle">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="window.crm.deleteContact('${contact.id}')" class="btn-small btn-danger" title="Sil">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        contactsList.innerHTML = contactsHTML;
        
        // Pagination bilgisi göster
        this.updatePaginationInfo(page, pageSize, this.contacts.length);
    }
    
    updatePaginationInfo(page, pageSize, totalContacts) {
        const startIndex = (page - 1) * pageSize + 1;
        const endIndex = Math.min(page * pageSize, totalContacts);
        
        // Contacts section header'ına bilgi ekle
        const header = document.querySelector('#contacts .section-header h2');
        if (header) {
            header.innerHTML = `Kişiler <small>(${startIndex}-${endIndex} / ${totalContacts} gösteriliyor)</small>`;
        }
    }

    // Update contacts count
    updateContactsCount() {
        const countElement = document.getElementById('contactsCount');
        if (countElement) {
            countElement.textContent = this.contacts.length;
        }

        // Update dashboard contact count
        const dashboardCount = document.querySelector('.metric-card .metric-value');
        if (dashboardCount) {
            dashboardCount.textContent = this.contacts.length;
        }

        // Update bulk sender contact counts
        const bulkContactsCount = document.querySelector('.contact-counter');
        if (bulkContactsCount) {
            bulkContactsCount.textContent = `${this.contacts.length} kişi`;
        }

        // Update all elements with contact count
        const allContactCountElements = document.querySelectorAll('[data-contact-count]');
        allContactCountElements.forEach(element => {
            element.textContent = this.contacts.length;
        });
    }

    // Kişi ekleme modal'ını göster
    showAddContactModal() {
        // Modal HTML'i dinamik oluştur
        const modalHTML = `
            <div class="modal" id="addContactModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Yeni Kişi Ekle</h3>
                        <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="addContactForm">
                            <div class="form-group">
                                <label for="contactName">Ad Soyad *</label>
                                <input type="text" id="contactName" required>
                            </div>
                            <div class="form-group">
                                <label for="contactPhone">Telefon *</label>
                                <input type="tel" id="contactPhone" placeholder="+90 555 123 4567" required>
                            </div>
                            <div class="form-group">
                                <label for="contactEmail">E-posta</label>
                                <input type="email" id="contactEmail">
                            </div>
                            <div class="form-group">
                                <label for="contactGroup">Grup</label>
                                <select id="contactGroup">
                                    <option value="">Grup Seçin</option>
                                    <option value="Müşteri">Müşteri</option>
                                    <option value="Potansiyel">Potansiyel</option>
                                    <option value="Partner">Partner</option>
                                    <option value="Diğer">Diğer</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="contactNotes">Notlar</label>
                                <textarea id="contactNotes" rows="3"></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">İptal</button>
                        <button type="button" class="btn btn-primary" onclick="crm.addNewContact()">Kişi Ekle</button>
                    </div>
                </div>
            </div>
        `;
        
        // Modal'ı DOM'a ekle
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Modal'ı göster
        document.getElementById('addContactModal').classList.add('active');
    }

    // Yeni kişi ekle
    addNewContact() {
        const name = document.getElementById('contactName').value.trim();
        const phone = document.getElementById('contactPhone').value.trim();
        const email = document.getElementById('contactEmail').value.trim();
        const group = document.getElementById('contactGroup').value;
        const notes = document.getElementById('contactNotes').value.trim();

        // Validation
        if (!name || !phone) {
            this.showNotification('Ad Soyad ve Telefon alanları zorunludur.', 'error');
            return;
        }

        // Telefon numarası formatını kontrol et
        const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
        if (!phoneRegex.test(phone)) {
            this.showNotification('Geçerli bir telefon numarası girin.', 'error');
            return;
        }

        // Kişi zaten var mı kontrol et
        const existingContact = this.contacts.find(c => c.phone === phone);
        if (existingContact) {
            this.showNotification('Bu telefon numarası zaten kayıtlı.', 'error');
            return;
        }

        // Yeni kişi objesi oluştur
        const newContact = {
            id: Date.now().toString(),
            name: name,
            phone: phone,
            email: email || '',
            group: group || 'Diğer',
            notes: notes || '',
            status: 'active',
            createdAt: new Date().toISOString(),
            whatsappData: false
        };

        // Kişi listesine ekle
        this.contacts.push(newContact);
        
        // UI'ı güncelle
        this.renderContacts();
        this.updateStats();
        
        // Modal'ı kapat
        document.getElementById('addContactModal').remove();
        
        // Başarı mesajı
        this.showNotification(`${name} başarıyla eklendi.`, 'success');
        
        console.log('✅ Yeni kişi eklendi:', newContact);
    }

    // Şablon ekleme modal'ını göster
    showTemplateModal() {
        this.showAddTemplateModal();
    }

    // Şablon ekleme modal'ını göster
    showAddTemplateModal() {
        // Modal HTML'i dinamik oluştur
        const modalHTML = `
            <div class="modal active" id="addTemplateModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Yeni Şablon Oluştur</h3>
                        <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="addTemplateForm">
                            <div class="form-group">
                                <label for="templateName">Şablon Adı *</label>
                                <input type="text" id="templateName" placeholder="Örn: Hoş Geldin Mesajı" required>
                            </div>
                            <div class="form-group">
                                <label for="templateCategory">Kategori</label>
                                <select id="templateCategory">
                                    <option value="Genel">Genel</option>
                                    <option value="Satış">Satış</option>
                                    <option value="Destek">Müşteri Desteği</option>
                                    <option value="Pazarlama">Pazarlama</option>
                                    <option value="Bilgilendirme">Bilgilendirme</option>
                                    <option value="Teşekkür">Teşekkür</option>
                                    <option value="Diğer">Diğer</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="templateContent">Mesaj İçeriği *</label>
                                <textarea id="templateContent" rows="6" placeholder="Mesaj içeriğinizi buraya yazın...

Değişkenler:
{isim} - Kişi adı
{tarih} - Bugünün tarihi
{saat} - Şu anki saat" required></textarea>
                                <small style="color: #666; font-size: 0.85rem;">
                                    <strong>Kullanılabilir değişkenler:</strong><br>
                                    • <code>{isim}</code> - Kişi adı<br>
                                    • <code>{tarih}</code> - Bugünün tarihi<br>
                                    • <code>{saat}</code> - Şu anki saat
                                </small>
                            </div>
                            <div class="form-group">
                                <label for="templateKeywords">Anahtar Kelimeler</label>
                                <input type="text" id="templateKeywords" placeholder="hoşgeldin, tanışma, ilk mesaj" 
                                       title="Virgül ile ayırarak anahtar kelimeler ekleyin">
                                <small style="color: #666; font-size: 0.85rem;">Şablonu bulmak için anahtar kelimeler (virgül ile ayırın)</small>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">İptal</button>
                        <button type="button" class="btn btn-primary" onclick="crm.addNewTemplate()">Şablon Oluştur</button>
                    </div>
                </div>
            </div>
        `;
        
        // Modal'ı DOM'a ekle
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    // Yeni şablon ekle
    addNewTemplate() {
        const name = document.getElementById('templateName').value.trim();
        const category = document.getElementById('templateCategory').value;
        const content = document.getElementById('templateContent').value.trim();
        const keywords = document.getElementById('templateKeywords').value.trim();

        // Validation
        if (!name || !content) {
            this.showNotification('Şablon adı ve içeriği zorunludur.', 'error');
            return;
        }

        if (content.length < 10) {
            this.showNotification('Mesaj içeriği en az 10 karakter olmalıdır.', 'error');
            return;
        }

        // Şablon zaten var mı kontrol et
        const existingTemplate = this.templates.find(t => t.name.toLowerCase() === name.toLowerCase());
        if (existingTemplate) {
            this.showNotification('Bu isimde bir şablon zaten mevcut.', 'error');
            return;
        }

        // Yeni şablon objesi oluştur
        const newTemplate = {
            id: Date.now().toString(),
            name: name,
            category: category,
            content: content,
            keywords: keywords ? keywords.split(',').map(k => k.trim()) : [],
            createdAt: new Date().toISOString(),
            lastUsed: null,
            usage: 0
        };

        // Şablon listesine ekle
        this.templates.push(newTemplate);
        
        // UI'ı güncelle  
        this.renderTemplates();
        
        // Modal'ı kapat
        document.getElementById('addTemplateModal').remove();
        
        // Başarı mesajı
        this.showNotification(`"${name}" şablonu başarıyla oluşturuldu.`, 'success');
        
        console.log('✅ Yeni şablon eklendi:', newTemplate);
    }

    // Template management functions
    getCategoryDisplayName(category) {
        const categoryNames = {
            'business': '🏢 İş',
            'finance': '💰 Finans', 
            'marketing': '📢 Pazarlama',
            'support': '🆘 Destek',
            'social': '👥 Sosyal',
            'custom': '✨ Özel'
        };
        return categoryNames[category] || '📄 Genel';
    }

    editTemplate(templateId, isBuiltIn = false) {
        const template = this.messageTemplates.find(t => t.id === templateId) || 
                        JSON.parse(localStorage.getItem('customTemplates') || '[]').find(t => t.id === templateId);
        
        if (!template) {
            this.showNotification('Şablon bulunamadı!', 'error');
            return;
        }

        // Fill modal with template data
        document.getElementById('templateName').value = isBuiltIn ? template.name + ' (Kopya)' : template.name;
        document.getElementById('templateCategory').value = template.category;
        document.getElementById('templateContent').value = template.content;
        document.getElementById('templateFavorite').checked = template.favorite || false;
        
        // Update modal title and save button
        document.getElementById('templateEditTitle').textContent = isBuiltIn ? 'Şablonu Kopyala' : 'Şablon Düzenle';
        
        // Store template info for saving
        const modal = document.getElementById('templateEditModal');
        modal.dataset.editingId = isBuiltIn ? '' : templateId;
        modal.dataset.isBuiltIn = isBuiltIn;
        
        // Show modal
        modal.classList.add('active');
    }

    useTemplate(templateId) {
        const template = this.messageTemplates.find(t => t.id === templateId) || 
                        JSON.parse(localStorage.getItem('customTemplates') || '[]').find(t => t.id === templateId);
        
        if (!template) {
            this.showNotification('Şablon bulunamadı!', 'error');
            return;
        }

        // Navigate to bulk sender and fill message content
        this.navigateToSection('bulk-sender');
        
        setTimeout(() => {
            const messageContent = document.getElementById('messageContent');
            if (messageContent) {
                messageContent.value = template.content;
                messageContent.focus();
                this.showNotification(`"${template.name}" şablonu yüklendi!`, 'success');
            }
        }, 100);
    }

    deleteTemplate(templateId) {
        if (confirm('Bu şablonu silmek istediğinizden emin misiniz?')) {
            const savedTemplates = JSON.parse(localStorage.getItem('customTemplates') || '[]');
            const filteredTemplates = savedTemplates.filter(t => t.id !== templateId);
            localStorage.setItem('customTemplates', JSON.stringify(filteredTemplates));
            
            this.renderTemplates();
            this.showNotification('Şablon silindi!', 'success');
        }
    }

    createNewTemplate() {
        // Clear form
        document.getElementById('templateName').value = '';
        document.getElementById('templateCategory').value = 'custom';
        document.getElementById('templateContent').value = '';
        document.getElementById('templateFavorite').checked = false;
        
        // Update modal title
        document.getElementById('templateEditTitle').textContent = 'Yeni Şablon Oluştur';
        
        // Clear editing data
        const modal = document.getElementById('templateEditModal');
        modal.dataset.editingId = '';
        modal.dataset.isBuiltIn = 'false';
        
        // Show modal
        modal.classList.add('active');
    }

    saveTemplate() {
        const modal = document.getElementById('templateEditModal');
        const editingId = modal.dataset.editingId;
        const isBuiltIn = modal.dataset.isBuiltIn === 'true';
        
        const name = document.getElementById('templateName').value.trim();
        const category = document.getElementById('templateCategory').value;
        const content = document.getElementById('templateContent').value.trim();
        const favorite = document.getElementById('templateFavorite').checked;

        if (!name || !content) {
            this.showNotification('Lütfen şablon adı ve içeriği girin!', 'warning');
            return;
        }

        const savedTemplates = JSON.parse(localStorage.getItem('customTemplates') || '[]');
        
        if (editingId && !isBuiltIn) {
            // Edit existing template
            const templateIndex = savedTemplates.findIndex(t => t.id === editingId);
            if (templateIndex > -1) {
                savedTemplates[templateIndex] = {
                    ...savedTemplates[templateIndex],
                    name,
                    category,
                    content,
                    favorite,
                    updatedAt: new Date().toISOString()
                };
            }
        } else {
            // Create new template (or copy from built-in)
            const newTemplate = {
                id: Date.now().toString(),
                name,
                category,
                content,
                favorite,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                usageCount: 0
            };
            savedTemplates.push(newTemplate);
        }

        localStorage.setItem('customTemplates', JSON.stringify(savedTemplates));
        
        // Close modal and refresh
        modal.classList.remove('active');
        this.renderTemplates();
        
        this.showNotification(editingId && !isBuiltIn ? 'Şablon güncellendi!' : 'Yeni şablon oluşturuldu!', 'success');
    }

    // Broadcast Lists Management
    initBroadcastLists() {
        // Load from localStorage or create default lists
        const savedLists = localStorage.getItem('broadcastLists');
        if (savedLists) {
            return JSON.parse(savedLists);
        }

        // Create default broadcast lists based on existing contacts
        const defaultLists = [
            {
                id: 'premium',
                name: 'Premium Müşteriler',
                description: 'VIP müşteri segmenti',
                contacts: [],
                criteria: { group: 'vip' },
                stats: {
                    totalSent: 0,
                    readRate: 0,
                    replyRate: 0,
                    lastSent: null
                },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: 'leads',
                name: 'Potansiyel Müşteriler',
                description: 'Lead nurturing segmenti',
                contacts: [],
                criteria: { group: 'lead' },
                stats: {
                    totalSent: 0,
                    readRate: 0,
                    replyRate: 0,
                    lastSent: null
                },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: 'events',
                name: 'Etkinlik Katılımcıları',
                description: 'Webinar ve etkinlik katılımcıları',
                contacts: [],
                criteria: { group: 'event' },
                stats: {
                    totalSent: 0,
                    readRate: 0,
                    replyRate: 0,
                    lastSent: null
                },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        ];

        localStorage.setItem('broadcastLists', JSON.stringify(defaultLists));
        return defaultLists;
    }

    renderBroadcast() {
        console.log('🎯 renderBroadcast called');
        console.log('📋 Broadcast lists count:', this.broadcastLists.length);
        
        // Update stats
        this.updateBroadcastStats();
        
        // Render broadcast lists
        const broadcastContainer = document.querySelector('.broadcast-lists');
        console.log('📦 Broadcast container found:', !!broadcastContainer);
        if (!broadcastContainer) {
            console.error('❌ .broadcast-lists container not found!');
            return;
        }

        broadcastContainer.innerHTML = '';

        this.broadcastLists.forEach((list, index) => {
            console.log(`📝 Rendering list ${index + 1}:`, list.name, 'ID:', list.id);
            // Filter contacts based on criteria
            const listContacts = this.getContactsForBroadcastList(list);
            
            const listCard = document.createElement('div');
            listCard.className = 'broadcast-list-card';
            
            const lastSentText = list.stats.lastSent 
                ? this.formatRelativeTime(list.stats.lastSent)
                : 'Henüz gönderilmedi';
            
            listCard.innerHTML = `
                <div class="list-header">
                    <div class="list-info">
                        <h3>${list.name}</h3>
                        <p>${list.description}</p>
                        <small>${listContacts.length} kişi • Son güncelleme: ${this.formatRelativeTime(list.updatedAt)}</small>
                    </div>
                    <div class="list-actions">
                        <button class="btn-sm btn-primary" onclick="crm.sendBroadcastMessage('${list.id}')">
                            <i class="fas fa-paper-plane"></i>
                            Gönder
                        </button>
                        <button class="btn-sm btn-secondary" onclick="crm.editBroadcastList('${list.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-sm btn-danger" onclick="crm.deleteBroadcastList('${list.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="list-stats">
                    <div class="stat-item">
                        <span class="stat-label">Son Gönderim:</span>
                        <span class="stat-value">${lastSentText}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Okunma Oranı:</span>
                        <span class="stat-value">${list.stats.readRate}%</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Yanıt Oranı:</span>
                        <span class="stat-value">${list.stats.replyRate}%</span>
                    </div>
                </div>
            `;

            broadcastContainer.appendChild(listCard);
        });
    }

    updateBroadcastStats() {
        const totalLists = this.broadcastLists.length;
        const totalContacts = this.broadcastLists.reduce((sum, list) => 
            sum + this.getContactsForBroadcastList(list).length, 0);
        const totalSent = this.broadcastLists.reduce((sum, list) => 
            sum + (list.stats.totalSent || 0), 0);

        // Update stats cards
        document.querySelector('.broadcast-stats .stat-card:nth-child(1) h3').textContent = totalLists;
        document.querySelector('.broadcast-stats .stat-card:nth-child(2) h3').textContent = totalContacts;
        document.querySelector('.broadcast-stats .stat-card:nth-child(3) h3').textContent = totalSent;
    }

    getContactsForBroadcastList(list) {
        console.log('🔍 getContactsForBroadcastList called with:', list);
        console.log('📞 Total contacts available:', this.contacts.length);
        
        if (list.contacts && list.contacts.length > 0) {
            console.log('✅ Using manual contacts:', list.contacts.length);
            // Use manually added contacts - ensure they still exist
            const validContacts = list.contacts.filter(contact => 
                this.contacts.find(c => c.id === contact.id)
            );
            console.log('✅ Valid manual contacts:', validContacts.length);
            return validContacts;
        }
        
        // Filter contacts based on criteria for default lists
        if (list.criteria) {
            console.log('🎯 Using criteria filter:', list.criteria);
            
            // If criteria is looking for 'vip' group but contacts don't have groups,
            // let's return first few contacts as demo data for now
            if (list.criteria.group === 'vip') {
                console.log('🎯 VIP criteria detected, returning first 3 contacts as demo');
                return this.contacts.slice(0, 3);
            }
            
            const filteredContacts = this.contacts.filter(contact => {
                console.log('📞 Checking contact:', contact.name, 'group:', contact.group, 'criteria:', list.criteria.group);
                if (list.criteria.group && contact.group === list.criteria.group) {
                    return true;
                }
                // Add more criteria matching here
                return false;
            });
            console.log('✅ Filtered contacts:', filteredContacts.length);
            
            // If no contacts match criteria, return first few as fallback
            if (filteredContacts.length === 0) {
                console.log('🔄 No criteria matches, returning first 2 contacts as fallback');
                return this.contacts.slice(0, 2);
            }
            
            return filteredContacts;
        }
        
        console.log('❌ No contacts found for list');
        return [];
    }

    sendBroadcastMessage(listId) {
        const list = this.broadcastLists.find(l => l.id === listId);
        if (!list) {
            this.showNotification('Broadcast listesi bulunamadı!', 'error');
            return;
        }

        const contacts = this.getContactsForBroadcastList(list);
        if (contacts.length === 0) {
            this.showNotification('Bu listede hiç kişi yok!', 'warning');
            return;
        }

        // Navigate to bulk sender with pre-selected contacts
        this.navigateToSection('bulk-sender');
        
        setTimeout(() => {
            // Select broadcast list contacts
            this.selectedContacts = [...contacts];
            this.updateSelectedCount();
            
            // Set recipient type to custom
            const customRadio = document.querySelector('input[name="recipientType"][value="custom"]');
            if (customRadio) {
                customRadio.checked = true;
                this.updateRecipientSelection();
            }

            this.showNotification(`${list.name} listesi yüklendi (${contacts.length} kişi)`, 'success');
        }, 100);
    }

    editBroadcastList(listId) {
        console.log('🔧 editBroadcastList called with ID:', listId);
        console.log('📋 Available broadcast lists:', this.broadcastLists.map(l => ({id: l.id, name: l.name})));
        
        const list = this.broadcastLists.find(l => l.id === listId);
        console.log('📝 Found list:', list);
        
        if (!list) {
            console.error('❌ Broadcast listesi bulunamadı!', listId);
            this.showNotification('Broadcast listesi bulunamadı!', 'error');
            return;
        }

        console.log('✅ Opening edit modal for list:', list.name);
        this.showBroadcastEditModal(list);
    }

    deleteBroadcastList(listId) {
        const list = this.broadcastLists.find(l => l.id === listId);
        if (!list) return;

        if (confirm(`"${list.name}" listesini silmek istediğinizden emin misiniz?`)) {
            this.broadcastLists = this.broadcastLists.filter(l => l.id !== listId);
            localStorage.setItem('broadcastLists', JSON.stringify(this.broadcastLists));
            this.renderBroadcast();
            this.showNotification('Broadcast listesi silindi!', 'success');
        }
    }

    createNewBroadcastList() {
        this.showBroadcastEditModal();
    }

    formatRelativeTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = Math.abs(now - date);
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (days === 0) {
            const hours = Math.floor(diff / (1000 * 60 * 60));
            if (hours === 0) {
                const minutes = Math.floor(diff / (1000 * 60));
                return minutes < 1 ? 'Şimdi' : `${minutes} dakika önce`;
            }
            return `${hours} saat önce`;
        } else if (days === 1) {
            return '1 gün önce';
        } else if (days < 7) {
            return `${days} gün önce`;
        } else {
            return date.toLocaleDateString('tr-TR');
        }
    }

    // Broadcast Helper Functions
    showBroadcastEditModal(list = null) {
        const isEdit = !!list;
        const modalId = 'broadcastEditModal';
        
        console.log('🔍 showBroadcastEditModal called:', { isEdit, list });
        
        // Get current contacts for the list
        const currentContacts = isEdit ? this.getContactsForBroadcastList(list) : [];
        
        console.log('📞 Current contacts for list:', currentContacts.length, currentContacts);
        
        // Remove existing modal if any
        document.getElementById(modalId)?.remove();
        
        const modalHTML = `
            <div class="modal active" id="${modalId}">
                <div class="modal-content large">
                    <div class="modal-header">
                        <h3>${isEdit ? 'Broadcast Listesini Düzenle' : 'Yeni Broadcast Listesi'}</h3>
                        <button class="close-btn" onclick="document.getElementById('${modalId}').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form class="broadcast-form">
                            <div class="form-group">
                                <label>Liste Adı *</label>
                                <input type="text" id="broadcastListName" value="${isEdit ? list.name : ''}" placeholder="Örn: VIP Müşteriler" required>
                            </div>
                            <div class="form-group">
                                <label>Açıklama</label>
                                <textarea id="broadcastDescription" placeholder="Liste açıklaması...">${isEdit ? list.description : ''}</textarea>
                            </div>
                            <div class="form-group">
                                <label>Kişi Seçimi</label>
                                <div class="contact-selector">
                                    <div class="contact-search">
                                        <input type="text" id="contactSearchInput" placeholder="Kişi ara..." onkeyup="this.dispatchEvent(new CustomEvent('contactSearch'))">
                                    </div>
                                    <div class="contact-list" id="contactList">
                                        ${this.renderContactsList(currentContacts)}
                                    </div>
                                </div>
                                <div class="selected-contacts" id="selectedContacts">
                                    <h4>Seçilen Kişiler (${currentContacts.length})</h4>
                                    <div class="contact-tags" id="contactTags">
                                        ${this.renderSelectedContactTags(currentContacts)}
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary" onclick="document.getElementById('${modalId}').remove()">İptal</button>
                        <button class="btn-primary" id="saveBroadcastList">${isEdit ? 'Güncelle' : 'Oluştur'}</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Event listeners - pass current contacts instead of list.contacts
        this.setupBroadcastModalEvents(list, currentContacts);
        
        // Focus to name input
        document.getElementById('broadcastListName').focus();
    }

    renderContactsList(selectedContacts = []) {
        const selectedIds = selectedContacts.map(c => c.id);
        
        return this.contacts.map(contact => `
            <div class="contact-item ${selectedIds.includes(contact.id) ? 'selected' : ''}" data-contact-id="${contact.id}">
                <div class="contact-avatar">
                    ${contact.name.charAt(0).toUpperCase()}
                </div>
                <div class="contact-info">
                    <div class="contact-name">${contact.name}</div>
                    <div class="contact-phone">${contact.phone}</div>
                </div>
                <div class="contact-checkbox">
                    <input type="checkbox" ${selectedIds.includes(contact.id) ? 'checked' : ''}>
                </div>
            </div>
        `).join('');
    }

    renderSelectedContactTags(contacts) {
        return contacts.map(contact => `
            <span class="contact-tag" data-contact-id="${contact.id}">
                ${contact.name}
                <button type="button" class="remove-contact-btn">&times;</button>
            </span>
        `).join('');
    }

    setupBroadcastModalEvents(list, initialContacts = []) {
        const modal = document.getElementById('broadcastEditModal');
        const contactList = document.getElementById('contactList');
        const contactTags = document.getElementById('contactTags');
        const selectedContacts = document.getElementById('selectedContacts');
        const searchInput = document.getElementById('contactSearchInput');
        
        let selectedContactsData = [...initialContacts];
        
        // Contact selection
        contactList.addEventListener('click', (e) => {
            const contactItem = e.target.closest('.contact-item');
            if (!contactItem) return;
            
            const contactId = contactItem.dataset.contactId;
            const checkbox = contactItem.querySelector('input[type="checkbox"]');
            const contact = this.contacts.find(c => c.id === contactId);
            
            // Toggle checkbox if clicking on the item (but not on checkbox itself)
            if (e.target.type !== 'checkbox') {
                checkbox.checked = !checkbox.checked;
            }
            
            // Update selectedContactsData based on current checkbox state
            const isSelected = checkbox.checked;
            const alreadySelected = selectedContactsData.find(c => c.id === contactId);
            
            if (isSelected && !alreadySelected) {
                // Add contact
                selectedContactsData.push(contact);
                contactItem.classList.add('selected');
                console.log('Added contact:', contact.name);
            } else if (!isSelected && alreadySelected) {
                // Remove contact
                selectedContactsData = selectedContactsData.filter(c => c.id !== contactId);
                contactItem.classList.remove('selected');
                console.log('Removed contact:', contact.name);
            }
            
            this.updateSelectedContactsDisplay(selectedContactsData, contactTags, selectedContacts);
        });
        
        // Contact search
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const contactItems = contactList.querySelectorAll('.contact-item');
            
            contactItems.forEach(item => {
                const name = item.querySelector('.contact-name').textContent.toLowerCase();
                const phone = item.querySelector('.contact-phone').textContent.toLowerCase();
                const matches = name.includes(query) || phone.includes(query);
                item.style.display = matches ? 'flex' : 'none';
            });
        });
        
        // Remove contact tag
        contactTags.addEventListener('click', (e) => {
            if (e.target.matches('.remove-contact-btn')) {
                const tag = e.target.parentElement;
                const contactId = tag.dataset.contactId;
                
                // Remove from selected data
                selectedContactsData = selectedContactsData.filter(c => c.id !== contactId);
                
                // Uncheck in contact list
                const contactItem = contactList.querySelector(`[data-contact-id="${contactId}"]`);
                if (contactItem) {
                    contactItem.classList.remove('selected');
                    contactItem.querySelector('input[type="checkbox"]').checked = false;
                }
                
                this.updateSelectedContactsDisplay(selectedContactsData, contactTags, selectedContacts);
            }
        });
        
        // Save button
        document.getElementById('saveBroadcastList').addEventListener('click', () => {
            this.saveBroadcastList(list, selectedContactsData);
        });
    }

    updateSelectedContactsDisplay(contacts, tagsContainer, selectedContainer) {
        const h4 = selectedContainer.querySelector('h4');
        h4.textContent = `Seçilen Kişiler (${contacts.length})`;
        tagsContainer.innerHTML = this.renderSelectedContactTags(contacts);
        
        // Debug log
        console.log('Selected contacts updated:', contacts.length, contacts);
    }

    saveBroadcastList(existingList = null, selectedContacts = []) {
        const nameInput = document.getElementById('broadcastListName');
        const descriptionInput = document.getElementById('broadcastDescription');
        
        const name = nameInput.value.trim();
        const description = descriptionInput.value.trim();
        
        if (!name) {
            this.showNotification('Liste adı zorunludur!', 'error');
            nameInput.focus();
            return;
        }
        
        if (selectedContacts.length === 0) {
            this.showNotification('En az bir kişi seçmelisiniz!', 'error');
            return;
        }
        
        const listData = {
            id: existingList ? existingList.id : 'broadcast_' + Date.now(),
            name: name,
            description: description,
            contacts: selectedContacts,
            createdAt: existingList ? existingList.createdAt : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        if (existingList) {
            // Update existing list
            const index = this.broadcastLists.findIndex(l => l.id === existingList.id);
            if (index !== -1) {
                this.broadcastLists[index] = listData;
                this.showNotification('Broadcast listesi güncellendi!', 'success');
            }
        } else {
            // Add new list
            this.broadcastLists.push(listData);
            this.showNotification('Yeni broadcast listesi oluşturuldu!', 'success');
        }
        
        // Save to localStorage
        localStorage.setItem('broadcastLists', JSON.stringify(this.broadcastLists));
        
        // Close modal and refresh display
        document.getElementById('broadcastEditModal').remove();
        this.renderBroadcast();
    }

    // Toplu kişi içe aktarma
    importBulkContacts() {
        // Excel/CSV dosyası yükleme modal'ı oluştur
        const modalHTML = `
            <div class="modal active" id="importContactsModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Toplu Kişi İçe Aktarma</h3>
                        <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label for="contactFile">Excel/CSV Dosyası Seçin</label>
                            <input type="file" id="contactFile" accept=".csv,.xlsx,.xls" />
                            <small style="color: #666; font-size: 0.85rem;">
                                Desteklenen formatlar: CSV, Excel (.xlsx, .xls)<br>
                                Sütun sırası: Ad, Telefon, Email, Grup, Notlar
                            </small>
                        </div>
                        <div class="form-group">
                            <h4>Örnek Format:</h4>
                            <table style="width: 100%; border: 1px solid #ddd; margin-top: 10px;">
                                <thead style="background: #f5f5f5;">
                                    <tr>
                                        <th style="padding: 8px; border: 1px solid #ddd;">Ad Soyad</th>
                                        <th style="padding: 8px; border: 1px solid #ddd;">Telefon</th>
                                        <th style="padding: 8px; border: 1px solid #ddd;">Email</th>
                                        <th style="padding: 8px; border: 1px solid #ddd;">Grup</th>
                                        <th style="padding: 8px; border: 1px solid #ddd;">Notlar</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style="padding: 8px; border: 1px solid #ddd;">Ahmet Yılmaz</td>
                                        <td style="padding: 8px; border: 1px solid #ddd;">905301234567</td>
                                        <td style="padding: 8px; border: 1px solid #ddd;">ahmet@email.com</td>
                                        <td style="padding: 8px; border: 1px solid #ddd;">Müşteri</td>
                                        <td style="padding: 8px; border: 1px solid #ddd;">VIP müşteri</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">İptal</button>
                        <button type="button" class="btn btn-primary" onclick="crm.processImportFile()">İçe Aktar</button>
                    </div>
                </div>
            </div>
        `;
        
        // Modal'ı DOM'a ekle
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    // Dosya içe aktarma işlemi
    processImportFile() {
        const fileInput = document.getElementById('contactFile');
        const file = fileInput.files[0];
        
        if (!file) {
            this.showNotification('Lütfen bir dosya seçin.', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                // Don't log file content to avoid binary data in console
                const content = e.target.result;
                let contacts = [];
                
                if (file.name.endsWith('.csv')) {
                    contacts = this.parseCSV(content);
                } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                    contacts = this.parseExcel(content);
                } else {
                    this.showNotification('Desteklenmeyen dosya formatı. CSV veya Excel kullanın.', 'error');
                    return;
                }
                
                // Only log the count, not the content
                if (contacts.length > 0) {
                    this.showNotification(`${contacts.length} kişi başarıyla import edildi!`, 'success');
                }
                
                this.importParsedContacts(contacts);
                
            } catch (error) {
                console.error('📛 Dosya okuma hatası:', error);
                this.showNotification('Dosya okunamadı: ' + error.message, 'error');
            }
        };
        
        reader.onerror = (error) => {
            console.error('📛 FileReader error:', error);
            this.showNotification('Dosya okuma hatası oluştu.', 'error');
        };
        
        // Use different read methods for different file types
        if (file.name.endsWith('.csv')) {
            reader.readAsText(file, 'UTF-8');
        } else {
            reader.readAsArrayBuffer(file);
        }
    }

    // Excel parse et
    parseExcel(arrayBuffer) {
        try {
            // Ensure XLSX library is loaded
            if (typeof XLSX === 'undefined') {
                throw new Error('XLSX kütüphanesi yüklenmedi');
            }
            
            const workbook = XLSX.read(arrayBuffer, { 
                type: 'array',
                cellDates: true,
                cellNF: false,
                cellText: false
            });
            
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                header: 1,
                raw: false,
                defval: ''
            });
            
            const contacts = [];
            
            // İlk satırı header olarak atla
            for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row || row.length === 0) continue;
                
                const name = row[0] ? String(row[0]).trim() : '';
                const phone = row[1] ? String(row[1]).trim() : '';
                const email = row[2] ? String(row[2]).trim() : '';
                const group = row[3] ? String(row[3]).trim() : 'imported';
                const notes = row[4] ? String(row[4]).trim() : '';
                
                if (name && phone) {
                    // Phone number normalization
                    let normalizedPhone = phone.replace(/\D/g, '');
                    if (normalizedPhone.startsWith('0')) {
                        normalizedPhone = '90' + normalizedPhone.substring(1);
                    } else if (!normalizedPhone.startsWith('90')) {
                        normalizedPhone = '90' + normalizedPhone;
                    }
                    
                    contacts.push({
                        id: Date.now() + Math.random(),
                        name: name,
                        phone: normalizedPhone,
                        email: email,
                        group: group,
                        notes: notes,
                        isImported: true,
                        importedAt: new Date().toISOString()
                    });
                }
            }
            
            return contacts;
            
        } catch (error) {
            console.error('Excel parsing error:', error);
            throw new Error('Excel dosyası okunamadı: ' + error.message);
        }
    }

    // CSV parse et
    parseCSV(content) {
        const lines = content.split('\n');
        const contacts = [];
        
        // İlk satırı header olarak atla
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const columns = line.split(',').map(col => col.trim().replace(/"/g, ''));
            
            if (columns.length >= 2) {
                const contact = {
                    name: columns[0] || '',
                    phone: columns[1] || '',
                    email: columns[2] || '',
                    group: columns[3] || 'İçe Aktarılan',
                    notes: columns[4] || 'Toplu içe aktarma'
                };
                
                if (contact.name && contact.phone) {
                    contacts.push(contact);
                }
            }
        }
        
        return contacts;
    }

    // Parse edilmiş kişileri içe aktar
    importParsedContacts(contacts) {
        let imported = 0;
        let skipped = 0;
        
        contacts.forEach(contactData => {
            // Telefon numarası formatını kontrol et
            const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
            if (!phoneRegex.test(contactData.phone)) {
                skipped++;
                return;
            }
            
            // Kişi zaten var mı kontrol et
            const existingContact = this.contacts.find(c => c.phone === contactData.phone);
            if (existingContact) {
                skipped++;
                return;
            }
            
            // Yeni kişi objesi oluştur
            const newContact = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                name: contactData.name,
                phone: contactData.phone,
                email: contactData.email,
                group: contactData.group,
                notes: contactData.notes,
                status: 'active',
                createdAt: new Date().toISOString(),
                whatsappData: false
            };
            
            this.contacts.push(newContact);
            imported++;
        });
        
        // UI'ı güncelle
        this.renderContacts();
        this.updateStats();
        
        // Modal'ı kapat
        document.getElementById('importContactsModal').remove();
        
        // Sonuç mesajı
        this.showNotification(`Toplu içe aktarma tamamlandı: ${imported} kişi eklendi, ${skipped} kişi atlandı.`, 'success');
        
        console.log(`✅ Toplu içe aktarma: ${imported} eklendi, ${skipped} atlandı`);
    }

    // İstatistikleri güncelle
    updateStats() {
        try {
            // Toplam istatistikler
            const totalContacts = this.contacts ? this.contacts.length : 0;
            const totalGroups = this.whatsappGroups ? this.whatsappGroups.length : 0;
            const totalTemplates = this.templates ? this.templates.length : 0;
            
            // Aktif kişiler (WhatsApp'tan gelenler vs manual)
            const whatsappContacts = this.contacts ? this.contacts.filter(c => c.whatsappData === true).length : 0;
            const manualContacts = this.contacts ? this.contacts.filter(c => c.whatsappData === false).length : 0;
            
            // DOM elementlerini güncelle
            const statsElements = {
                'totalContacts': totalContacts,
                'totalGroups': totalGroups, 
                'totalTemplates': totalTemplates,
                'whatsappContacts': whatsappContacts,
                'manualContacts': manualContacts
            };
            
            Object.entries(statsElements).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) {
                    element.textContent = value;
                }
            });
            
            // Dashboard özet kartları güncelle
            this.updateDashboardStats(totalContacts, totalGroups, totalTemplates);
            
            console.log('📊 İstatistikler güncellendi:', {
                totalContacts,
                totalGroups, 
                totalTemplates,
                whatsappContacts,
                manualContacts
            });
            
        } catch (error) {
            console.error('❌ İstatistik güncelleme hatası:', error);
        }
    }

    // Dashboard istatistik kartlarını güncelle
    updateDashboardStats(contacts, groups, templates) {
        try {
            // Spesifik element ID'leri ile güncelle
            const totalContactsEl = document.getElementById('totalContacts');
            const contactCountEl = document.getElementById('contactCount');
            
            if (totalContactsEl) {
                totalContactsEl.textContent = contacts;
            }
            
            if (contactCountEl) {
                contactCountEl.textContent = contacts;
            }
            
            // Ana istatistik kartları (fallback)
            const statCards = document.querySelectorAll('.stat-card');
            statCards.forEach(card => {
                const titleElement = card.querySelector('h3');
                if (titleElement && titleElement.id !== 'totalContacts') {
                    const title = titleElement.textContent.trim();
                    let value = 0;
                    
                    if (title.includes('Kişi') || title.includes('Contacts')) {
                        value = contacts;
                    } else if (title.includes('Grup') || title.includes('Groups')) {
                        value = groups;
                    } else if (title.includes('Şablon') || title.includes('Templates')) {
                        value = templates;
                    }
                    
                    const valueElement = card.querySelector('.stat-value, h2');
                    if (valueElement) {
                        valueElement.textContent = value;
                    }
                }
            });
            
        } catch (error) {
            console.log('Dashboard stat güncelleme hatası:', error);
        }
    }

    // AI Assistant Modal Functions
    openAISettingsModal() {
        const modal = document.getElementById('aiSettingsModal');
        if (modal) {
            modal.classList.add('active');
            this.loadAISettings();
        }
    }

    closeAISettingsModal() {
        const modal = document.getElementById('aiSettingsModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    loadAISettings() {
        // Load current AI settings from localStorage
        const settings = JSON.parse(localStorage.getItem('aiSettings') || '{}');
        
        // Load AI configuration
        const aiModel = document.getElementById('aiModel');
        const apiKey = document.getElementById('apiKey');
        
        if (aiModel) aiModel.value = settings.aiModel || '';
        if (apiKey) apiKey.value = settings.apiKey || '';
        
        // Load current AI settings into the modal
        if (window.aiAssistant) {
            const toggle = document.getElementById('aiAssistantToggle');
            const bufferDelay = document.getElementById('bufferDelay');
            const workingStart = document.getElementById('workingStart');
            const workingEnd = document.getElementById('workingEnd');
            const appointmentDuration = document.getElementById('appointmentDuration');

            if (toggle) toggle.checked = window.aiAssistant.isActive;
            if (bufferDelay) bufferDelay.value = (window.aiAssistant.settings.bufferDelay / 1000).toString();
            if (workingStart) workingStart.value = window.aiAssistant.settings.workingHours.start.toString();
            if (workingEnd) workingEnd.value = window.aiAssistant.settings.workingHours.end.toString();
            if (appointmentDuration) appointmentDuration.value = window.aiAssistant.settings.appointmentDuration.toString();
        }
        
        // Update toggle text based on configuration
        this.updateToggleText();
    }
    
    updateToggleText() {
        const aiModel = document.getElementById('aiModel')?.value;
        const apiKey = document.getElementById('apiKey')?.value;
        const toggleText = document.querySelector('.toggle-text');
        
        if (toggleText) {
            if (!aiModel || !apiKey || aiModel === 'demo') {
                toggleText.textContent = 'Otomatik yanıtları etkinleştir (Demo Mode)';
            } else {
                toggleText.textContent = `Otomatik yanıtları etkinleştir (${this.getModelDisplayName(aiModel)})`;
            }
        }
    }
    
    getModelDisplayName(model) {
        const displayNames = {
            'gpt-4': 'GPT-4',
            'gpt-3.5-turbo': 'GPT-3.5',
            'claude-3': 'Claude 3',
            'gemini-pro': 'Gemini Pro',
            'demo': 'Demo Mode'
        };
        return displayNames[model] || 'Demo Mode';
    }
    
    saveAISettings() {
        // Get form values
        const aiModel = document.getElementById('aiModel')?.value;
        const apiKey = document.getElementById('apiKey')?.value;
        const bufferDelay = document.getElementById('bufferDelay')?.value;
        const workingStart = document.getElementById('workingStart')?.value;
        const workingEnd = document.getElementById('workingEnd')?.value;
        const appointmentDuration = document.getElementById('appointmentDuration')?.value;
        
        // Save to localStorage
        const settings = {
            aiModel: aiModel || '',
            apiKey: apiKey || '',
            bufferDelay: bufferDelay || '25',
            workingStart: workingStart || '9',
            workingEnd: workingEnd || '18',
            appointmentDuration: appointmentDuration || '30'
        };
        
        localStorage.setItem('aiSettings', JSON.stringify(settings));
        
        // Update AI assistant settings if available
        if (window.aiAssistant) {
            window.aiAssistant.settings.bufferDelay = parseInt(bufferDelay) * 1000;
            window.aiAssistant.settings.workingHours = {
                start: parseInt(workingStart),
                end: parseInt(workingEnd)
            };
            window.aiAssistant.settings.appointmentDuration = parseInt(appointmentDuration);
        }
        
        // Update toggle text
        this.updateToggleText();
        
        // Show success notification
        this.showNotification('AI ayarları kaydedildi', 'success');
        
        // Close modal
        this.closeAISettingsModal();
    }

    updateAIStatus() {
        const aiStatus = document.getElementById('aiStatus');
        const aiBtn = document.getElementById('aiSettingsBtn');
        
        if (window.aiAssistant && aiStatus && aiBtn) {
            if (window.aiAssistant.isActive) {
                aiStatus.textContent = 'AI Aktif';
                aiStatus.className = 'ai-status active';
                aiBtn.className = 'btn-secondary ai-active';
            } else {
                aiStatus.textContent = 'AI Kapalı';
                aiStatus.className = 'ai-status';
                aiBtn.className = 'btn-secondary';
            }
        }
    }

    // ================================
    // AUTOMATION SYSTEM
    // ================================

    async initializeAutomationSystem() {
        console.log('🤖 Initializing Automation System...');
        
        // Setup event listeners
        this.setupAutomationEventListeners();
        
        // Wait for Supabase client if needed  
        if (window.supabaseClient && window.supabaseClient.isRealMode) {
            await this.waitForSupabaseClient();
        }
        
        // Load existing automations from Supabase
        this.loadAutomations();
    }

    setupAutomationEventListeners() {
        // New Automation button
        const createAutomationBtn = document.getElementById('createAutomation');
        if (createAutomationBtn) {
            createAutomationBtn.addEventListener('click', () => {
                this.showCreateAutomationModal();
            });
        }

        // Automation type cards
        document.addEventListener('click', (e) => {
            if (e.target.closest('.automation-type-card')) {
                const card = e.target.closest('.automation-type-card');
                const type = card.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
                if (type) {
                    this.createAutomationType(type);
                }
            }
        });
    }

    async loadAutomations() {
        try {
            if (window.supabaseClient && window.supabaseClient.isRealMode && window.supabaseClient.supabase) {
                const { data: automations, error } = await window.supabaseClient.supabase
                    .from('campaigns')
                    .select('*')
                    .eq('type', 'automation');

                if (error) throw error;

                this.renderAutomations(automations || []);
                console.log('✅ Automations loaded from Supabase:', automations?.length || 0);
            } else {
                // Demo mode disabled - show empty state
                console.log('📝 Demo mode: No automations loaded');
                this.renderAutomations([]);
            }
        } catch (error) {
            console.error('❌ Failed to load automations:', error);
            this.renderAutomations([]);
        }
    }



    renderAutomations(automations) {
        const container = document.querySelector('.active-automations');
        if (!container) return;

        const automationsList = container.querySelector('.automations-list') || 
                                this.createAutomationsListElement(container);

        if (automations.length === 0) {
            automationsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-robot text-gray-400 text-4xl mb-4"></i>
                    <p class="text-gray-500">Henüz otomasyon oluşturulmamış</p>
                    <button class="btn-primary mt-4" onclick="document.getElementById('createAutomation').click()">
                        İlk Otomasyonunu Oluştur
                    </button>
                </div>
            `;
            return;
        }

        automationsList.innerHTML = automations.map(automation => `
            <div class="automation-item" data-id="${automation.id}">
                <div class="automation-header">
                    <div class="automation-info">
                        <h4>${automation.name}</h4>
                        <span class="automation-type">${this.getAutomationTypeName(automation.subtype || automation.type)}</span>
                    </div>
                    <div class="automation-status ${automation.status}">
                        <i class="fas fa-circle"></i>
                        ${automation.status === 'active' ? 'Aktif' : 'Pasif'}
                    </div>
                </div>
                <div class="automation-stats">
                    <span class="stat">
                        <i class="fas fa-paper-plane"></i>
                        ${automation.sent_count || 0} gönderim
                    </span>
                    <span class="stat">
                        <i class="fas fa-calendar"></i>
                        ${new Date(automation.created_at).toLocaleDateString('tr-TR')}
                    </span>
                </div>
                <div class="automation-actions">
                    <button class="btn-secondary btn-sm" onclick="window.crm.editAutomation('${automation.id}')">
                        <i class="fas fa-edit"></i> Düzenle
                    </button>
                    <button class="btn-secondary btn-sm" onclick="window.crm.toggleAutomation('${automation.id}', '${automation.status}')">
                        <i class="fas fa-${automation.status === 'active' ? 'pause' : 'play'}"></i>
                        ${automation.status === 'active' ? 'Duraklat' : 'Başlat'}
                    </button>
                    <button class="btn-danger btn-sm" onclick="window.crm.deleteAutomation('${automation.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    createAutomationsListElement(container) {
        const listElement = document.createElement('div');
        listElement.className = 'automations-list';
        container.appendChild(listElement);
        return listElement;
    }

    getAutomationTypeName(type) {
        const typeNames = {
            'welcome': 'Hoş Geldin',
            'birthday': 'Doğum Günü',
            'followup': 'Takip',
            'abandoned': 'Terk Edilen Sepet',
            'reminder': 'Hatırlatma',
            'survey': 'Anket'
        };
        return typeNames[type] || type;
    }

    createAutomationType(type) {
        console.log('🤖 Creating automation type:', type);
        this.showCreateAutomationModal(type);
    }

    showCreateAutomationModal(type = null) {
        console.log('🤖 Showing create automation modal for type:', type);
        
        // Create modal if it doesn't exist
        let modal = document.getElementById('createAutomationModal');
        if (!modal) {
            modal = this.createAutomationModal();
            document.body.appendChild(modal);
        }

        // Set form based on type
        if (type) {
            this.setupAutomationForm(type);
        }

        modal.classList.add('active');
    }

    createAutomationModal() {
        const modal = document.createElement('div');
        modal.id = 'createAutomationModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content large">
                <div class="modal-header">
                    <h2>
                        <i class="fas fa-robot"></i>
                        Yeni Otomasyon Oluştur
                    </h2>
                    <button class="modal-close" onclick="this.closest('.modal').classList.remove('active')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="automationForm">
                        <div class="form-group">
                            <label>Otomasyon Adı</label>
                            <input type="text" id="automationName" placeholder="Örn: Hoş geldin mesajı" required>
                        </div>

                        <div class="form-group">
                            <label>Otomasyon Türü</label>
                            <select id="automationType" required>
                                <option value="welcome">Hoş Geldin Mesajı</option>
                                <option value="birthday">Doğum Günü Tebriği</option>
                                <option value="followup">Takip Mesajı</option>
                                <option value="abandoned">Terk Edilen Sepet</option>
                                <option value="reminder">Hatırlatma</option>
                                <option value="survey">Anket</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label>Tetikleme Koşulu</label>
                            <select id="automationTrigger" required>
                                <option value="new_contact">Yeni kişi eklendiğinde</option>
                                <option value="birthday">Doğum günü geldiğinde</option>
                                <option value="time_delay">Belirli süre sonra</option>
                                <option value="keyword">Belirli kelime kullanıldığında</option>
                                <option value="manual">Manuel tetikleme</option>
                            </select>
                        </div>

                        <div class="form-group" id="delayGroup" style="display: none;">
                            <label>Gecikme Süresi</label>
                            <div class="input-group">
                                <input type="number" id="delayAmount" min="1" value="1">
                                <select id="delayUnit">
                                    <option value="minutes">Dakika</option>
                                    <option value="hours">Saat</option>
                                    <option value="days">Gün</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-group" id="keywordGroup" style="display: none;">
                            <label>Anahtar Kelimeler</label>
                            <input type="text" id="triggerKeywords" placeholder="fiyat, ürün, bilgi (virgülle ayırın)">
                        </div>

                        <div class="form-group">
                            <label>Mesaj İçeriği</label>
                            <textarea id="automationMessage" rows="6" placeholder="Merhaba {isim}! Mesajınız..." required></textarea>
                            <div class="form-helper">
                                Kullanabileceğiniz değişkenler: {isim}, {soyisim}, {tarih}, {saat}
                            </div>
                        </div>

                        <div class="form-group">
                            <label>Hedef Kişiler</label>
                            <select id="automationTarget">
                                <option value="all">Tüm Kişiler</option>
                                <option value="new">Sadece Yeni Kişiler</option>
                                <option value="existing">Sadece Mevcut Kişiler</option>
                                <option value="groups">Belirli Gruplar</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="automationActive" checked>
                                <span class="checkmark"></span>
                                Oluşturulduktan sonra aktif et
                            </label>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn-secondary" onclick="this.closest('.modal').classList.remove('active')">
                        İptal
                    </button>
                    <button type="button" class="btn-primary" onclick="window.crm.saveAutomation()">
                        <i class="fas fa-save"></i>
                        Otomasyonu Kaydet
                    </button>
                </div>
            </div>
        `;

        // Setup dynamic form behavior
        modal.addEventListener('change', (e) => {
            if (e.target.id === 'automationType') {
                this.updateAutomationForm(e.target.value);
            }
            if (e.target.id === 'automationTrigger') {
                this.updateTriggerOptions(e.target.value);
            }
        });

        return modal;
    }

    setupAutomationForm(type) {
        const typeSelect = document.getElementById('automationType');
        const nameInput = document.getElementById('automationName');
        const messageTextarea = document.getElementById('automationMessage');

        if (typeSelect) typeSelect.value = type;
        
        const templates = {
            'welcome': {
                name: 'Hoş Geldin Mesajı',
                message: `Merhaba {isim}! 

Bizimle iletişime geçtiğiniz için teşekkür ederiz. Size nasıl yardımcı olabiliriz?

Saygılarımızla,
WhatsApp CRM Ekibi`
            },
            'birthday': {
                name: 'Doğum Günü Tebriği',
                message: `🎉 Doğum gününüz kutlu olsun {isim}! 🎂

Bu özel gününüzde size özel %20 indirim fırsatımızdan yararlanabilirsiniz.

Mutlu ve sağlıklı bir yaş dileriz! 🎈`
            },
            'followup': {
                name: 'Takip Mesajı',
                message: `Merhaba {isim},

Son iletişimimizden sonra size nasıl yardımcı olabileceğimizi merak ediyoruz.

Herhangi bir sorunuz varsa çekinmeden yazabilirsiniz!`
            },
            'abandoned': {
                name: 'Terk Edilen Sepet Hatırlatması',
                message: `Merhaba {isim},

Sepetinizde unutulan ürünleriniz var! 🛒

Bu özel fırsatları kaçırmayın. Siparişinizi tamamlamak için buradan devam edebilirsiniz.`
            }
        };

        const template = templates[type];
        if (template) {
            if (nameInput) nameInput.value = template.name;
            if (messageTextarea) messageTextarea.value = template.message;
        }

        this.updateAutomationForm(type);
    }

    updateAutomationForm(type) {
        const triggerSelect = document.getElementById('automationTrigger');
        if (!triggerSelect) return;

        // Update trigger options based on automation type
        const triggerOptions = {
            'welcome': 'new_contact',
            'birthday': 'birthday',
            'followup': 'time_delay',
            'abandoned': 'time_delay'
        };

        if (triggerOptions[type]) {
            triggerSelect.value = triggerOptions[type];
            this.updateTriggerOptions(triggerOptions[type]);
        }
    }

    updateTriggerOptions(triggerType) {
        const delayGroup = document.getElementById('delayGroup');
        const keywordGroup = document.getElementById('keywordGroup');

        // Hide all conditional groups
        if (delayGroup) delayGroup.style.display = 'none';
        if (keywordGroup) keywordGroup.style.display = 'none';

        // Show relevant groups based on trigger type
        if (triggerType === 'time_delay' && delayGroup) {
            delayGroup.style.display = 'block';
        }
        if (triggerType === 'keyword' && keywordGroup) {
            keywordGroup.style.display = 'block';
        }
    }

    async saveAutomation() {
        const form = document.getElementById('automationForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const formData = {
            name: document.getElementById('automationName').value,
            type: document.getElementById('automationType').value,
            trigger: document.getElementById('automationTrigger').value,
            message: document.getElementById('automationMessage').value,
            target: document.getElementById('automationTarget').value,
            active: document.getElementById('automationActive').checked,
            delay_amount: document.getElementById('delayAmount')?.value || null,
            delay_unit: document.getElementById('delayUnit')?.value || null,
            keywords: document.getElementById('triggerKeywords')?.value || null
        };

        try {
            if (window.supabaseClient && window.supabaseClient.isRealMode) {
                const { data, error } = await window.supabaseClient.supabase
                    .from('campaigns')
                    .insert([{
                        name: formData.name,
                        type: 'automation',
                        subtype: formData.type,
                        message: formData.message,
                        status: formData.active ? 'active' : 'inactive',
                        settings: {
                            trigger: formData.trigger,
                            target: formData.target,
                            delay_amount: formData.delay_amount,
                            delay_unit: formData.delay_unit,
                            keywords: formData.keywords?.split(',').map(k => k.trim()).filter(k => k)
                        },
                        created_at: new Date().toISOString()
                    }])
                    .select();

                if (error) throw error;

                console.log('✅ Automation saved to Supabase:', data);
                this.showSuccessMessage('Otomasyon başarıyla oluşturuldu!');
            } else {
                console.log('📝 Demo mode: Automation would be saved:', formData);
                this.showSuccessMessage('Demo modunda otomasyon oluşturuldu!');
            }

            // Close modal and refresh automations
            document.getElementById('createAutomationModal').classList.remove('active');
            this.loadAutomations();

        } catch (error) {
            console.error('❌ Failed to save automation:', error);
            this.showErrorMessage('Otomasyon kaydedilemedi: ' + error.message);
        }
    }

    async deleteAutomation(automationId) {
        if (!confirm('Bu otomasyonu silmek istediğinizden emin misiniz?')) {
            return;
        }

        try {
            if (window.supabaseClient && window.supabaseClient.isRealMode) {
                const { error } = await window.supabaseClient.supabase
                    .from('campaigns')
                    .delete()
                    .eq('id', automationId);

                if (error) throw error;

                console.log('✅ Automation deleted:', automationId);
                this.showSuccessMessage('Otomasyon silindi!');
            } else {
                console.log('📝 Demo mode: Automation would be deleted:', automationId);
                this.showSuccessMessage('Demo modunda otomasyon silindi!');
            }

            this.loadAutomations();

        } catch (error) {
            console.error('❌ Failed to delete automation:', error);
            this.showErrorMessage('Otomasyon silinemedi: ' + error.message);
        }
    }

    async toggleAutomation(automationId, currentStatus) {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

        try {
            if (window.supabaseClient && window.supabaseClient.isRealMode) {
                const { error } = await window.supabaseClient.supabase
                    .from('campaigns')
                    .update({ status: newStatus })
                    .eq('id', automationId);

                if (error) throw error;

                console.log('✅ Automation status updated:', automationId, newStatus);
                this.showSuccessMessage(`Otomasyon ${newStatus === 'active' ? 'aktif edildi' : 'durduruldu'}!`);
            } else {
                console.log('📝 Demo mode: Automation status would be updated:', automationId, newStatus);
                this.showSuccessMessage(`Demo modunda otomasyon ${newStatus === 'active' ? 'aktif edildi' : 'durduruldu'}!`);
            }

            this.loadAutomations();

        } catch (error) {
            console.error('❌ Failed to toggle automation:', error);
            this.showErrorMessage('Otomasyon durumu değiştirilemedi: ' + error.message);
        }
    }

    editAutomation(automationId) {
        console.log('🤖 Editing automation:', automationId);
        // TODO: Implement edit functionality
        this.showInfoMessage('Düzenleme özelliği yakında eklenecek!');
    }

    showSuccessMessage(message) {
        this.showNotification(message, 'success');
    }

    showErrorMessage(message) {
        this.showNotification(message, 'error');
    }

    showInfoMessage(message) {
        this.showNotification(message, 'info');
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation' : 'info'}-circle"></i>
            <span>${message}</span>
        `;

        // Add to page
        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // ================================
    // ANALYTICS SYSTEM
    // ================================

    async initializeAnalyticsSystem() {
        console.log('📊 Initializing Analytics System...');
        
        // Setup date range picker
        this.setupAnalyticsEventListeners();
        
        // Wait for Supabase client with retry mechanism
        await this.waitForSupabaseClient();
        
        // Load initial analytics
        this.loadAnalytics();
    }
    
    async waitForSupabaseClient(maxRetries = 15, delay = 300) {
        for (let i = 0; i < maxRetries; i++) {
            if (window.supabaseClient && 
                window.supabaseClient.supabase && 
                window.supabaseClient.isRealMode &&
                typeof window.supabaseClient.supabase.from === 'function') {
                console.log('✅ Supabase client ready for analytics');
                return true;
            }
            console.log(`⏳ Waiting for Supabase client... (${i + 1}/${maxRetries})`);
            console.log('🔍 Current state:', {
                hasClient: !!window.supabaseClient,
                hasSupabase: !!(window.supabaseClient && window.supabaseClient.supabase),
                isRealMode: !!(window.supabaseClient && window.supabaseClient.isRealMode),
                hasFromMethod: !!(window.supabaseClient && window.supabaseClient.supabase && typeof window.supabaseClient.supabase.from === 'function')
            });
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        console.warn('⚠️ Supabase client not ready after 15 attempts, falling back to demo mode');
        return false;
    }

    setupAnalyticsEventListeners() {
        const dateRangePicker = document.getElementById('analyticsDateRange');
        if (dateRangePicker) {
            dateRangePicker.addEventListener('change', (e) => {
                this.loadAnalytics(parseInt(e.target.value));
            });
        }
    }

    async loadAnalytics(days = 30) {
        try {
            if (window.supabaseClient && window.supabaseClient.isRealMode) {
                // Load real analytics from Supabase
                const [
                    overviewData,
                    campaignStats,
                    messageStats,
                    contactStats
                ] = await Promise.all([
                    this.getAnalyticsOverview(days),
                    this.getCampaignAnalytics(days),
                    this.getMessageAnalytics(days),
                    this.getContactAnalytics(days)
                ]);

                this.renderAnalyticsOverview(overviewData);
                this.renderAnalyticsTables(campaignStats, messageStats, contactStats);
                
                console.log('✅ Analytics loaded from Supabase');
            } else {
                // Show empty state
                this.renderEmptyAnalytics();
                console.log('📝 Analytics: Demo mode disabled');
            }
        } catch (error) {
            console.error('❌ Failed to load analytics:', error);
            this.renderEmptyAnalytics();
        }
    }

    async getAnalyticsOverview(days) {
        try {
            if (!window.supabaseClient || !window.supabaseClient.supabase) {
                throw new Error('Supabase client not available');
            }
            
            // Get message count from messages table
            const { data: messageData, error: messageError } = await window.supabaseClient.supabase
                .from('messages')
                .select('id, created_at, direction')
                .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

            if (messageError) throw messageError;

            // Get contact count
            const { data: contactData, error: contactError } = await window.supabaseClient.supabase
                .from('contacts')
                .select('id, created_at')
                .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

            if (contactError) throw contactError;

            // Get campaign data
            const { data: campaignData, error: campaignError } = await window.supabaseClient.supabase
                .from('campaigns')
                .select('id, sent_count, status, created_at')
                .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

            if (campaignError) throw campaignError;

            // Calculate metrics
            const totalMessages = messageData?.length || 0;
            const sentMessages = messageData?.filter(m => m.direction === 'outbound').length || 0;
            const receivedMessages = messageData?.filter(m => m.direction === 'inbound').length || 0;
            const newContacts = contactData?.length || 0;
            const activeCampaigns = campaignData?.filter(c => c.status === 'active').length || 0;
            const totalCampaignsSent = campaignData?.reduce((sum, c) => sum + (c.sent_count || 0), 0) || 0;

            return {
                totalMessages,
                sentMessages,
                receivedMessages,
                newContacts,
                activeCampaigns,
                totalCampaignsSent,
                deliveryRate: sentMessages > 0 ? ((sentMessages / (sentMessages + 1)) * 100).toFixed(1) : 0,
                responseRate: sentMessages > 0 ? ((receivedMessages / sentMessages) * 100).toFixed(1) : 0
            };
        } catch (error) {
            console.error('Get analytics overview error:', error);
            return this.getEmptyOverviewData();
        }
    }

    async getCampaignAnalytics(days) {
        try {
            if (!window.supabaseClient || !window.supabaseClient.supabase) {
                throw new Error('Supabase client not available');
            }
            
            const { data, error } = await window.supabaseClient.supabase
                .from('campaigns')
                .select('name, type, sent_count, status, created_at')
                .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
                .order('sent_count', { ascending: false })
                .limit(10);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Get campaign analytics error:', error);
            return [];
        }
    }

    async getMessageAnalytics(days) {
        try {
            if (!window.supabaseClient || !window.supabaseClient.supabase) {
                throw new Error('Supabase client not available');
            }
            
            const { data, error } = await window.supabaseClient.supabase
                .from('messages')
                .select('created_at, direction, type')
                .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
                .order('created_at', { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Get message analytics error:', error);
            return [];
        }
    }

    async getContactAnalytics(days) {
        try {
            if (!window.supabaseClient || !window.supabaseClient.supabase) {
                throw new Error('Supabase client not available');
            }
            
            const { data, error } = await window.supabaseClient.supabase
                .from('contacts')
                .select('created_at, last_message_at')
                .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
                .order('created_at', { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Get contact analytics error:', error);
            return [];
        }
    }

    getEmptyOverviewData() {
        return {
            totalMessages: 0,
            sentMessages: 0,
            receivedMessages: 0,
            newContacts: 0,
            activeCampaigns: 0,
            totalCampaignsSent: 0,
            deliveryRate: 0,
            responseRate: 0
        };
    }

    renderAnalyticsOverview(data) {
        const container = document.getElementById('analyticsOverview');
        if (!container) return;

        const formatNumber = (num) => {
            if (num >= 1000) {
                return (num / 1000).toFixed(1) + 'K';
            }
            return num.toString();
        };

        container.innerHTML = `
            <div class="metric-card">
                <div class="metric-header">
                    <h3>Toplam Mesaj</h3>
                    <i class="fas fa-paper-plane"></i>
                </div>
                <div class="metric-value">${formatNumber(data.totalMessages)}</div>
                <div class="metric-change positive">
                    <i class="fas fa-arrow-up"></i>
                    Gönderilen: ${formatNumber(data.sentMessages)}
                </div>
            </div>

            <div class="metric-card">
                <div class="metric-header">
                    <h3>Teslim Oranı</h3>
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="metric-value">${data.deliveryRate}%</div>
                <div class="metric-change ${data.deliveryRate > 90 ? 'positive' : 'negative'}">
                    <i class="fas fa-${data.deliveryRate > 90 ? 'arrow-up' : 'arrow-down'}"></i>
                    ${data.deliveryRate > 90 ? 'Yüksek' : 'Düşük'} performans
                </div>
            </div>

            <div class="metric-card">
                <div class="metric-header">
                    <h3>Yanıt Oranı</h3>
                    <i class="fas fa-reply"></i>
                </div>
                <div class="metric-value">${data.responseRate}%</div>
                <div class="metric-change ${data.responseRate > 30 ? 'positive' : 'negative'}">
                    <i class="fas fa-${data.responseRate > 30 ? 'arrow-up' : 'arrow-down'}"></i>
                    Yanıt: ${formatNumber(data.receivedMessages)}
                </div>
            </div>

            <div class="metric-card">
                <div class="metric-header">
                    <h3>Yeni Kişiler</h3>
                    <i class="fas fa-user-plus"></i>
                </div>
                <div class="metric-value">${formatNumber(data.newContacts)}</div>
                <div class="metric-change positive">
                    <i class="fas fa-users"></i>
                    Aktif kampanya: ${data.activeCampaigns}
                </div>
            </div>
        `;
    }

    renderAnalyticsTables(campaigns, messages, contacts) {
        const container = document.getElementById('analyticsTables');
        if (!container) return;

        // Process campaign data for top performers table
        const topCampaigns = campaigns.slice(0, 5);

        // Process message data for time analysis
        const timeAnalysis = this.analyzeMessagesByTime(messages);

        container.innerHTML = `
            <div class="table-container">
                <h3>En İyi Performans Gösteren Kampanyalar</h3>
                <table class="analytics-table">
                    <thead>
                        <tr>
                            <th>Kampanya Adı</th>
                            <th>Tür</th>
                            <th>Gönderim</th>
                            <th>Durum</th>
                            <th>Tarih</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${topCampaigns.length > 0 ? topCampaigns.map(campaign => `
                            <tr>
                                <td>${campaign.name}</td>
                                <td><span class="campaign-type ${campaign.type}">${this.getCampaignTypeName(campaign.type)}</span></td>
                                <td>${campaign.sent_count || 0}</td>
                                <td><span class="status-badge ${campaign.status}">${campaign.status === 'active' ? 'Aktif' : 'Pasif'}</span></td>
                                <td>${new Date(campaign.created_at).toLocaleDateString('tr-TR')}</td>
                            </tr>
                        `).join('') : `
                            <tr>
                                <td colspan="5" class="empty-cell">
                                    <i class="fas fa-chart-line"></i>
                                    Henüz kampanya verisi bulunmuyor
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>

            <div class="table-container">
                <h3>Gönderim Zamanı Analizi</h3>
                <table class="analytics-table">
                    <thead>
                        <tr>
                            <th>Saat Aralığı</th>
                            <th>Gönderim</th>
                            <th>Alınan</th>
                            <th>Oran</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${timeAnalysis.length > 0 ? timeAnalysis.map(slot => `
                            <tr>
                                <td>${slot.timeSlot}</td>
                                <td>${slot.sent}</td>
                                <td>${slot.received}</td>
                                <td>${slot.rate}%</td>
                            </tr>
                        `).join('') : `
                            <tr>
                                <td colspan="4" class="empty-cell">
                                    <i class="fas fa-clock"></i>
                                    Zaman analizi için yeterli veri yok
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        `;
    }

    analyzeMessagesByTime(messages) {
        const timeSlots = [
            { range: '00:00-06:00', start: 0, end: 6, sent: 0, received: 0 },
            { range: '06:00-12:00', start: 6, end: 12, sent: 0, received: 0 },
            { range: '12:00-18:00', start: 12, end: 18, sent: 0, received: 0 },
            { range: '18:00-24:00', start: 18, end: 24, sent: 0, received: 0 }
        ];

        messages.forEach(message => {
            const hour = new Date(message.created_at).getHours();
            const slot = timeSlots.find(s => hour >= s.start && hour < s.end);
            if (slot) {
                if (message.direction === 'outbound') {
                    slot.sent++;
                } else {
                    slot.received++;
                }
            }
        });

        return timeSlots.map(slot => ({
            timeSlot: slot.range,
            sent: slot.sent,
            received: slot.received,
            rate: slot.sent > 0 ? ((slot.received / slot.sent) * 100).toFixed(1) : 0
        }));
    }

    getCampaignTypeName(type) {
        const typeNames = {
            'broadcast': 'Toplu Gönderim',
            'automation': 'Otomasyon',
            'template': 'Şablon',
            'campaign': 'Kampanya'
        };
        return typeNames[type] || type;
    }

    renderEmptyAnalytics() {
        const overviewContainer = document.getElementById('analyticsOverview');
        const tablesContainer = document.getElementById('analyticsTables');

        if (overviewContainer) {
            overviewContainer.innerHTML = `
                <div class="empty-analytics">
                    <i class="fas fa-chart-line text-gray-400 text-6xl mb-4"></i>
                    <h3 class="text-gray-600 mb-2">Analitik Verisi Bulunamadı</h3>
                    <p class="text-gray-500">Veriler gerçek Supabase veritabanından yüklenir</p>
                    <button class="btn-primary mt-4" onclick="window.crm.loadAnalytics()">
                        <i class="fas fa-refresh"></i>
                        Yenile
                    </button>
                </div>
            `;
        }

        if (tablesContainer) {
            tablesContainer.innerHTML = `
                <div class="empty-analytics">
                    <i class="fas fa-table text-gray-400 text-4xl mb-4"></i>
                    <p class="text-gray-500">Detaylı analitik raporları için veri bekleniyor</p>
                </div>
            `;
        }
    }

    // ================================
    // SETTINGS SYSTEM
    // ================================

    initializeSettingsSystem() {
        console.log('⚙️ Initializing Settings System...');
        
        // Setup settings navigation
        this.setupSettingsNavigation();
        
        // Load current settings panel
        this.loadSettingsPanel('general');
    }

    setupSettingsNavigation() {
        const navItems = document.querySelectorAll('.settings-nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const settingsType = e.currentTarget.dataset.settings;
                this.showSettingsPanel(settingsType);
                
                // Update active nav
                navItems.forEach(nav => nav.classList.remove('active'));
                e.currentTarget.classList.add('active');
            });
        });
    }

    showSettingsPanel(type) {
        console.log('⚙️ Showing settings panel:', type);
        this.loadSettingsPanel(type);
    }

    loadSettingsPanel(type) {
        const container = document.getElementById('settingsContent');
        if (!container) return;

        const panels = {
            'general': this.renderGeneralSettings(),
            'whatsapp': this.renderWhatsAppSettings(),
            'notifications': this.renderNotificationSettings(),
            'templates': this.renderTemplateSettings(),
            'backup': this.renderBackupSettings(),
            'account': this.renderAccountSettings()
        };

        container.innerHTML = panels[type] || panels['general'];
        
        // Setup form handlers
        this.setupSettingsFormHandlers(type);
    }

    renderGeneralSettings() {
        const currentSettings = this.getCurrentSettings('general');
        
        return `
            <div class="settings-panel active" id="general-settings">
                <h3>Genel Ayarlar</h3>
                <div class="settings-form">
                    <div class="form-group">
                        <label>Şirket Adı</label>
                        <input type="text" id="companyName" value="${currentSettings.companyName || 'WhatsApp CRM Pro'}" placeholder="Şirket adınızı girin">
                        <small>CRM'de görünecek şirket ismi</small>
                    </div>
                    
                    <div class="form-group">
                        <label>Saat Dilimi</label>
                        <select id="timezone">
                            <option value="Europe/Istanbul" ${currentSettings.timezone === 'Europe/Istanbul' ? 'selected' : ''}>Türkiye (GMT+3)</option>
                            <option value="Europe/London" ${currentSettings.timezone === 'Europe/London' ? 'selected' : ''}>İngiltere (GMT+0)</option>
                            <option value="America/New_York" ${currentSettings.timezone === 'America/New_York' ? 'selected' : ''}>New York (GMT-5)</option>
                            <option value="Asia/Dubai" ${currentSettings.timezone === 'Asia/Dubai' ? 'selected' : ''}>Dubai (GMT+4)</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Dil</label>
                        <select id="language">
                            <option value="tr" ${currentSettings.language === 'tr' ? 'selected' : ''}>Türkçe</option>
                            <option value="en" ${currentSettings.language === 'en' ? 'selected' : ''}>English</option>
                            <option value="de" ${currentSettings.language === 'de' ? 'selected' : ''}>Deutsch</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Tarih Formatı</label>
                        <select id="dateFormat">
                            <option value="dd/mm/yyyy" ${currentSettings.dateFormat === 'dd/mm/yyyy' ? 'selected' : ''}>DD/MM/YYYY</option>
                            <option value="mm/dd/yyyy" ${currentSettings.dateFormat === 'mm/dd/yyyy' ? 'selected' : ''}>MM/DD/YYYY</option>
                            <option value="yyyy-mm-dd" ${currentSettings.dateFormat === 'yyyy-mm-dd' ? 'selected' : ''}>YYYY-MM-DD</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-option">
                            <input type="checkbox" id="darkMode" ${currentSettings.darkMode ? 'checked' : ''}>
                            <span>Dark Mode (Yakında)</span>
                        </label>
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-option">
                            <input type="checkbox" id="soundNotifications" ${currentSettings.soundNotifications !== false ? 'checked' : ''}>
                            <span>Ses bildirimleri</span>
                        </label>
                    </div>
                </div>
                
                <div class="settings-actions">
                    <button class="btn-primary" onclick="window.crm.saveSettings('general')">
                        <i class="fas fa-save"></i>
                        Kaydet
                    </button>
                    <button class="btn-secondary" onclick="window.crm.resetSettings('general')">
                        <i class="fas fa-undo"></i>
                        Varsayılan
                    </button>
                </div>
            </div>
        `;
    }

    renderWhatsAppSettings() {
        const isConnected = this.connectionStatus === 'connected';
        const currentSettings = this.getCurrentSettings('whatsapp');
        
        return `
            <div class="settings-panel active" id="whatsapp-settings">
                <h3>WhatsApp Bağlantısı</h3>
                
                <div class="connection-status">
                    <div class="status-indicator ${isConnected ? 'connected' : 'disconnected'}">
                        <i class="fas fa-${isConnected ? 'check-circle' : 'times-circle'}"></i>
                        <span>${isConnected ? 'Bağlı' : 'Bağlantı Yok'}</span>
                    </div>
                    <p>${isConnected ? 'WhatsApp Web ile bağlantı aktif' : 'WhatsApp bağlantısı kurulmamış'}</p>
                </div>
                
                <div class="settings-form">
                    <div class="form-group">
                        <label>Server URL</label>
                        <input type="url" id="serverUrl" value="${this.serverUrl}" placeholder="WhatsApp server URL">
                        <small>Local: http://localhost:3025 | Production: Netlify Functions</small>
                    </div>
                    
                    <div class="form-group">
                        <label>Bağlantı Durumu</label>
                        <div class="connection-info">
                            <span class="status-text">${isConnected ? '✅ Aktif' : '❌ Pasif'}</span>
                            <span class="contact-count">${this.contacts.length} kişi senkronize</span>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-option">
                            <input type="checkbox" id="autoReconnect" ${currentSettings.autoReconnect !== false ? 'checked' : ''}>
                            <span>Otomatik yeniden bağlanma</span>
                        </label>
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-option">
                            <input type="checkbox" id="syncGroups" ${currentSettings.syncGroups !== false ? 'checked' : ''}>
                            <span>WhatsApp gruplarını senkronize et</span>
                        </label>
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-option">
                            <input type="checkbox" id="saveMessages" ${currentSettings.saveMessages !== false ? 'checked' : ''}>
                            <span>Gönderilen mesajları veritabanına kaydet</span>
                        </label>
                    </div>
                </div>
                
                <div class="settings-actions">
                    <button class="btn-primary" onclick="window.crm.showQRModal()">
                        <i class="fas fa-qrcode"></i>
                        QR Kod
                    </button>
                    <button class="btn-secondary" onclick="window.crm.saveSettings('whatsapp')">
                        <i class="fas fa-save"></i>
                        Kaydet
                    </button>
                    <button class="btn-secondary" onclick="window.crm.restartWhatsAppConnection()">
                        <i class="fas fa-sync"></i>
                        Yenile
                    </button>
                </div>
            </div>
        `;
    }

    renderNotificationSettings() {
        const currentSettings = this.getCurrentSettings('notifications');
        
        return `
            <div class="settings-panel active" id="notifications-settings">
                <h3>Bildirim Ayarları</h3>
                <div class="settings-form">
                    <div class="form-group">
                        <label class="checkbox-option">
                            <input type="checkbox" id="newMessageNotifications" ${currentSettings.newMessageNotifications !== false ? 'checked' : ''}>
                            <span>Yeni mesaj bildirimleri</span>
                        </label>
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-option">
                            <input type="checkbox" id="deliveryNotifications" ${currentSettings.deliveryNotifications !== false ? 'checked' : ''}>
                            <span>Gönderim tamamlanma bildirimleri</span>
                        </label>
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-option">
                            <input type="checkbox" id="systemNotifications" ${currentSettings.systemNotifications ? 'checked' : ''}>
                            <span>Sistem bakım bildirimleri</span>
                        </label>
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-option">
                            <input type="checkbox" id="aiNotifications" ${currentSettings.aiNotifications !== false ? 'checked' : ''}>
                            <span>AI asistan bildirimleri</span>
                        </label>
                    </div>
                    
                    <div class="form-group">
                        <label>Email Bildirimleri</label>
                        <input type="email" id="notificationEmail" value="${currentSettings.notificationEmail || ''}" placeholder="bildirim@sirket.com">
                        <small>Önemli bildirimlerin gönderileceği email adresi</small>
                    </div>
                    
                    <div class="form-group">
                        <label>Bildirim Sesi</label>
                        <select id="notificationSound">
                            <option value="default" ${currentSettings.notificationSound === 'default' ? 'selected' : ''}>Varsayılan</option>
                            <option value="chime" ${currentSettings.notificationSound === 'chime' ? 'selected' : ''}>Chime</option>
                            <option value="beep" ${currentSettings.notificationSound === 'beep' ? 'selected' : ''}>Beep</option>
                            <option value="none" ${currentSettings.notificationSound === 'none' ? 'selected' : ''}>Sessiz</option>
                        </select>
                    </div>
                </div>
                
                <div class="settings-actions">
                    <button class="btn-primary" onclick="window.crm.saveSettings('notifications')">
                        <i class="fas fa-save"></i>
                        Kaydet
                    </button>
                    <button class="btn-secondary" onclick="window.crm.testNotification()">
                        <i class="fas fa-bell"></i>
                        Test Bildirimi
                    </button>
                </div>
            </div>
        `;
    }

    renderTemplateSettings() {
        const currentSettings = this.getCurrentSettings('templates');
        
        return `
            <div class="settings-panel active" id="templates-settings">
                <h3>Şablon Ayarları</h3>
                <div class="settings-form">
                    <div class="form-group">
                        <label class="checkbox-option">
                            <input type="checkbox" id="autoTemplates" ${currentSettings.autoTemplates !== false ? 'checked' : ''}>
                            <span>Otomatik şablon önerisi</span>
                        </label>
                    </div>
                    
                    <div class="form-group">
                        <label>Varsayılan İmza</label>
                        <textarea id="defaultSignature" rows="3" placeholder="Mesajlarınızın sonuna eklenecek imza">${currentSettings.defaultSignature || 'En iyi dileklerle,\\nWhatsApp CRM Ekibi'}</textarea>
                        <small>Tüm gönderilen mesajlarda otomatik eklenecek imza</small>
                    </div>
                    
                    <div class="form-group">
                        <label>Değişken Format</label>
                        <select id="variableFormat">
                            <option value="curly" ${currentSettings.variableFormat === 'curly' ? 'selected' : ''}>{değişken}</option>
                            <option value="square" ${currentSettings.variableFormat === 'square' ? 'selected' : ''}>[değişken]</option>
                            <option value="percent" ${currentSettings.variableFormat === 'percent' ? 'selected' : ''}>%değişken%</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Mesaj Temaları</label>
                        <select id="defaultTheme">
                            <option value="default" ${currentSettings.defaultTheme === 'default' ? 'selected' : ''}>Varsayılan</option>
                            <option value="professional" ${currentSettings.defaultTheme === 'professional' ? 'selected' : ''}>Profesyonel</option>
                            <option value="friendly" ${currentSettings.defaultTheme === 'friendly' ? 'selected' : ''}>Samimi</option>
                            <option value="urgent" ${currentSettings.defaultTheme === 'urgent' ? 'selected' : ''}>Acil</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-option">
                            <input type="checkbox" id="emojiSupport" ${currentSettings.emojiSupport !== false ? 'checked' : ''}>
                            <span>Emoji desteği</span>
                        </label>
                    </div>
                </div>
                
                <div class="settings-actions">
                    <button class="btn-primary" onclick="window.crm.saveSettings('templates')">
                        <i class="fas fa-save"></i>
                        Kaydet
                    </button>
                    <button class="btn-secondary" onclick="window.crm.resetSettings('templates')">
                        <i class="fas fa-undo"></i>
                        Varsayılan
                    </button>
                </div>
            </div>
        `;
    }

    renderBackupSettings() {
        const currentSettings = this.getCurrentSettings('backup');
        
        return `
            <div class="settings-panel active" id="backup-settings">
                <h3>Yedekleme & Veri Yönetimi</h3>
                <div class="settings-form">
                    <div class="data-info">
                        <div class="data-stats">
                            <div class="stat">
                                <span class="label">Toplam Kişi:</span>
                                <span class="value">${this.contacts.length}</span>
                            </div>
                            <div class="stat">
                                <span class="label">Toplam Mesaj:</span>
                                <span class="value">-</span>
                            </div>
                            <div class="stat">
                                <span class="label">Kampanya:</span>
                                <span class="value">-</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Supabase Durumu</label>
                        <div class="supabase-status">
                            <span class="status-indicator ${window.supabaseClient?.isRealMode ? 'connected' : 'disconnected'}">
                                <i class="fas fa-${window.supabaseClient?.isRealMode ? 'check-circle' : 'times-circle'}"></i>
                                ${window.supabaseClient?.isRealMode ? 'Bağlı' : 'Demo Mode'}
                            </span>
                            ${window.supabaseClient?.isRealMode ? 
                                '<small>Veriler gerçek zamanlı kaydediliyor</small>' : 
                                '<small>Demo modunda - veriler kaydedilmiyor</small>'
                            }
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-option">
                            <input type="checkbox" id="autoBackup" ${currentSettings.autoBackup ? 'checked' : ''}>
                            <span>Otomatik yedekleme (Geliştirilme aşamasında)</span>
                        </label>
                    </div>
                    
                    <div class="form-group">
                        <label>Yedekleme Sıklığı</label>
                        <select id="backupFrequency">
                            <option value="daily" ${currentSettings.backupFrequency === 'daily' ? 'selected' : ''}>Günlük</option>
                            <option value="weekly" ${currentSettings.backupFrequency === 'weekly' ? 'selected' : ''}>Haftalık</option>
                            <option value="monthly" ${currentSettings.backupFrequency === 'monthly' ? 'selected' : ''}>Aylık</option>
                        </select>
                    </div>
                </div>
                
                <div class="backup-actions">
                    <button class="btn-primary" onclick="window.crm.exportData()">
                        <i class="fas fa-download"></i>
                        Verileri Dışa Aktar
                    </button>
                    <button class="btn-secondary" onclick="window.crm.importData()">
                        <i class="fas fa-upload"></i>
                        Veri İçe Aktar
                    </button>
                    <button class="btn-secondary" onclick="window.crm.saveSettings('backup')">
                        <i class="fas fa-save"></i>
                        Kaydet
                    </button>
                </div>
            </div>
        `;
    }

    renderAccountSettings() {
        const authData = JSON.parse(localStorage.getItem('whatsapp_crm_auth') || sessionStorage.getItem('whatsapp_crm_auth') || '{}');
        const currentSettings = this.getCurrentSettings('account');
        
        return `
            <div class="settings-panel active" id="account-settings">
                <h3>Hesap Ayarları</h3>
                <div class="settings-form">
                    <div class="form-group">
                        <label>Kullanıcı Adı</label>
                        <input type="text" id="username" value="${authData.username || 'admin'}" readonly>
                        <small>Giriş için kullanılan kullanıcı adı</small>
                    </div>
                    
                    <div class="form-group">
                        <label>Ad Soyad</label>
                        <input type="text" id="fullName" value="${currentSettings.fullName || 'Admin User'}" placeholder="Adınız Soyadınız">
                    </div>
                    
                    <div class="form-group">
                        <label>E-posta</label>
                        <input type="email" id="email" value="${currentSettings.email || ''}" placeholder="admin@sirket.com">
                    </div>
                    
                    <div class="form-group">
                        <label>Rol</label>
                        <select id="userRole" disabled>
                            <option value="admin" selected>Yönetici</option>
                            <option value="user">Kullanıcı</option>
                            <option value="viewer">Görüntüleyici</option>
                        </select>
                        <small>Rol değişikliği için sistem yöneticisi ile iletişime geçin</small>
                    </div>
                    
                    <div class="form-group">
                        <label>Oturum Bilgileri</label>
                        <div class="session-info">
                            <p><strong>Giriş Zamanı:</strong> ${authData.loginTime ? new Date(authData.loginTime).toLocaleString('tr-TR') : '-'}</p>
                            <p><strong>Oturum Türü:</strong> ${authData.remember ? 'Kalıcı (24 saat)' : 'Geçici (8 saat)'}</p>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-option">
                            <input type="checkbox" id="emailUpdates" ${currentSettings.emailUpdates ? 'checked' : ''}>
                            <span>Email güncellemeleri al</span>
                        </label>
                    </div>
                </div>
                
                <div class="settings-actions">
                    <button class="btn-primary" onclick="window.crm.saveSettings('account')">
                        <i class="fas fa-save"></i>
                        Kaydet
                    </button>
                    <button class="btn-danger" onclick="window.crm.logout()">
                        <i class="fas fa-sign-out-alt"></i>
                        Çıkış Yap
                    </button>
                </div>
            </div>
        `;
    }

    getCurrentSettings(type) {
        return JSON.parse(localStorage.getItem(`settings_${type}`) || '{}');
    }

    setupSettingsFormHandlers(type) {
        // Form change handlers will be added here
        console.log('⚙️ Setting up form handlers for:', type);
    }

    async saveSettings(type) {
        console.log('💾 Saving settings:', type);
        
        const formData = this.collectFormData(type);
        
        // Save to localStorage
        localStorage.setItem(`settings_${type}`, JSON.stringify(formData));
        
        // Apply settings immediately
        this.applySettings(type, formData);
        
        // Show success notification
        this.showSuccessMessage(`${this.getSettingsTypeName(type)} ayarları kaydedildi!`);
        
        // Refresh current panel to show saved values
        setTimeout(() => {
            this.loadSettingsPanel(type);
        }, 1000);
    }

    collectFormData(type) {
        const formData = {};
        const container = document.getElementById('settingsContent');
        
        // Collect all input values based on type
        const inputs = container.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            if (input.type === 'checkbox') {
                formData[input.id] = input.checked;
            } else {
                formData[input.id] = input.value;
            }
        });
        
        return formData;
    }

    applySettings(type, settings) {
        // Apply settings immediately based on type
        switch (type) {
            case 'general':
                if (settings.companyName) {
                    document.title = settings.companyName + ' - CRM';
                }
                break;
            case 'whatsapp':
                if (settings.serverUrl && settings.serverUrl !== this.serverUrl) {
                    this.serverUrl = settings.serverUrl;
                }
                break;
            case 'notifications':
                // Apply notification settings
                break;
        }
    }

    resetSettings(type) {
        if (confirm(`${this.getSettingsTypeName(type)} ayarlarını varsayılan değerlere döndürmek istediğinizden emin misiniz?`)) {
            localStorage.removeItem(`settings_${type}`);
            this.loadSettingsPanel(type);
            this.showSuccessMessage(`${this.getSettingsTypeName(type)} ayarları varsayılan değerlere döndürüldü!`);
        }
    }

    getSettingsTypeName(type) {
        const typeNames = {
            'general': 'Genel',
            'whatsapp': 'WhatsApp',
            'notifications': 'Bildirim',
            'templates': 'Şablon',
            'backup': 'Yedekleme',
            'account': 'Hesap'
        };
        return typeNames[type] || type;
    }

    testNotification() {
        this.showSuccessMessage('Test bildirimi başarıyla gönderildi!');
        
        // Browser notification if permitted
        if (Notification.permission === 'granted') {
            new Notification('WhatsApp CRM', {
                body: 'Test bildirimi - bildirimler çalışıyor!',
                icon: '/favicon.ico'
            });
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    new Notification('WhatsApp CRM', {
                        body: 'Test bildirimi - bildirimler aktif edildi!',
                        icon: '/favicon.ico'
                    });
                }
            });
        }
    }

    async exportData() {
        try {
            const exportData = {
                contacts: this.contacts,
                settings: {
                    general: this.getCurrentSettings('general'),
                    whatsapp: this.getCurrentSettings('whatsapp'),
                    notifications: this.getCurrentSettings('notifications'),
                    templates: this.getCurrentSettings('templates'),
                    backup: this.getCurrentSettings('backup'),
                    account: this.getCurrentSettings('account')
                },
                exportDate: new Date().toISOString(),
                version: '1.0'
            };
            
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `whatsapp-crm-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.showSuccessMessage('Veriler başarıyla dışa aktarıldı!');
        } catch (error) {
            console.error('Export error:', error);
            this.showErrorMessage('Veri dışa aktarma sırasında hata oluştu!');
        }
    }

    importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const importData = JSON.parse(e.target.result);
                        
                        if (confirm('Mevcut veriler üzerine yazılacak. Devam etmek istediğinizden emin misiniz?')) {
                            // Import settings
                            if (importData.settings) {
                                Object.keys(importData.settings).forEach(type => {
                                    localStorage.setItem(`settings_${type}`, JSON.stringify(importData.settings[type]));
                                });
                            }
                            
                            this.showSuccessMessage('Veriler başarıyla içe aktarıldı!');
                            
                            // Refresh current panel
                            const activeNav = document.querySelector('.settings-nav-item.active');
                            if (activeNav) {
                                this.loadSettingsPanel(activeNav.dataset.settings);
                            }
                        }
                    } catch (error) {
                        console.error('Import error:', error);
                        this.showErrorMessage('Geçersiz dosya formatı!');
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }

    restartWhatsAppConnection() {
        if (confirm('WhatsApp bağlantısı yeniden başlatılacak. Devam etmek istediğinizden emin misiniz?')) {
            this.showInfoMessage('WhatsApp bağlantısı yeniden başlatılıyor...');
            
            // Restart connection logic
            this.connectionStatus = 'disconnected';
            setTimeout(() => {
                this.initializeWhatsAppConnection();
                this.loadSettingsPanel('whatsapp');
            }, 2000);
        }
    }

}; // End of WhatsAppCRM class definition
} // End of class definition guard

// Global AI helper functions
function toggleApiKeyVisibility() {
    const apiKeyInput = document.getElementById('apiKey');
    const toggleBtn = document.querySelector('.toggle-password');
    
    if (apiKeyInput && toggleBtn) {
        const isPassword = apiKeyInput.type === 'password';
        apiKeyInput.type = isPassword ? 'text' : 'password';
        
        const icon = toggleBtn.querySelector('i');
        if (icon) {
            icon.className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
        }
    }
}

// Event listeners for AI configuration changes
document.addEventListener('DOMContentLoaded', function() {
    // AI model change handler
    const aiModelSelect = document.getElementById('aiModel');
    const apiKeyInput = document.getElementById('apiKey');
    
    if (aiModelSelect) {
        aiModelSelect.addEventListener('change', function() {
            if (window.crm) {
                window.crm.updateToggleText();
            }
        });
    }
    
    if (apiKeyInput) {
        apiKeyInput.addEventListener('input', function() {
            if (window.crm) {
                window.crm.updateToggleText();
            }
        });
    }
    
    // Save AI settings button
    const saveAISettingsBtn = document.getElementById('saveAISettings');
    if (saveAISettingsBtn) {
        saveAISettingsBtn.addEventListener('click', function() {
            if (window.crm) {
                window.crm.saveAISettings();
            }
        });
    }
});

// Initialize CRM when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (typeof WhatsAppCRM !== 'undefined') {
        window.crm = new WhatsAppCRM();
    } else {
        console.error('WhatsAppCRM class not found');
    }
});

// Confirm send from preview modal
document.addEventListener('click', (e) => {
    if (e.target.id === 'confirmSend') {
        document.getElementById('previewModal').classList.remove('active');
        if (window.crm) {
            window.crm.sendBulkMessage();
        }
    }
});