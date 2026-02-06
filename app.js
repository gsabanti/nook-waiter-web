// Main Application Logic
class WaiterApp {
    constructor() {
        this.currentScreen = null;
        this.currentGuest = null;
        this.activeVisit = null;
        this.qrScanner = new QRScanner();
        this.refreshInterval = null;
        
        this.initializeApp();
    }

    // Initialize the application
    async initializeApp() {
        console.log('Initializing Nook Waiter App...');
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupApp());
        } else {
            this.setupApp();
        }
    }

    setupApp() {
        this.setupEventListeners();
        
        // Check if user is already logged in
        if (api.isAuthenticated()) {
            this.showMainScreen();
            this.loadDashboard();
        } else {
            this.showLoginScreen();
        }
    }

    setupEventListeners() {
        // Login form
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Navigation buttons
        document.getElementById('scan-guest-btn').addEventListener('click', () => this.showQRScanner());
        document.getElementById('logout-btn').addEventListener('click', () => this.handleLogout());
        document.getElementById('close-scanner-btn').addEventListener('click', () => this.hideQRScanner());
        document.getElementById('back-to-dashboard-btn').addEventListener('click', () => this.showMainScreen());

        // Manual input
        document.getElementById('manual-input-btn').addEventListener('click', () => this.showManualInput());
        document.getElementById('manual-search-btn').addEventListener('click', () => this.searchGuestByPhone());

        // Guest profile actions
        document.getElementById('start-visit-btn').addEventListener('click', () => this.showVisitModal());
        document.getElementById('add-note-btn').addEventListener('click', () => this.showAddNoteModal());
        document.getElementById('confirm-visit-btn').addEventListener('click', () => this.confirmStartVisit());

        // Modal close handlers
        this.setupModalHandlers();
    }

    setupModalHandlers() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            const closeButtons = modal.querySelectorAll('.modal-close');
            closeButtons.forEach(button => {
                button.addEventListener('click', () => this.hideModal(modal));
            });
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal(modal);
                }
            });
        });
    }

    // Screen Management
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
            this.currentScreen = screenId;
        }
    }

    showLoginScreen() {
        this.showScreen('login-screen');
        this.clearRefreshInterval();
    }

    showMainScreen() {
        this.showScreen('main-screen');
        this.loadDashboard();
        this.startRefreshInterval();
    }

    showGuestProfile(guestData) {
        this.currentGuest = guestData;
        this.populateGuestProfile(guestData);
        this.showScreen('guest-profile-screen');
    }

    // Authentication
    async handleLogin() {
        const phone = document.getElementById('phone').value;
        const password = document.getElementById('password').value;
        const errorElement = document.getElementById('login-error');
        
        if (!phone || !password) {
            this.showError(errorElement, 'Введите телефон и пароль');
            return;
        }

        this.showLoading(true);
        
        try {
            const response = await api.login(phone, password);
            console.log('Login successful:', response);
            
            // Update UI with staff info
            document.getElementById('staff-name').textContent = response.name || 'Официант';
            
            this.hideError(errorElement);
            this.showMainScreen();
            
        } catch (error) {
            console.error('Login failed:', error);
            this.showError(errorElement, error.message || NOOK_CONFIG.ERROR_MESSAGES.LOGIN_FAILED);
        } finally {
            this.showLoading(false);
        }
    }

    handleLogout() {
        if (confirm('Вы уверены, что хотите выйти?')) {
            api.logout();
            this.currentGuest = null;
            this.activeVisit = null;
            this.clearRefreshInterval();
            this.showLoginScreen();
        }
    }

    // Dashboard
    async loadDashboard() {
        if (!api.isAuthenticated()) {
            this.showLoginScreen();
            return;
        }

        try {
            const restaurantId = NOOK_CONFIG.DEFAULT_RESTAURANT_ID;
            const tablesData = await api.getMyTables(restaurantId);
            
            this.displayTables(tablesData.tables || []);
            
        } catch (error) {
            console.error('Failed to load dashboard:', error);
            this.showError(null, 'Ошибка загрузки данных');
        }
    }

    displayTables(tables) {
        const tablesList = document.getElementById('tables-list');
        const noTablesElement = document.getElementById('no-tables');
        
        if (tables.length === 0) {
            tablesList.innerHTML = '';
            noTablesElement.style.display = 'flex';
            return;
        }

        noTablesElement.style.display = 'none';
        
        tablesList.innerHTML = tables.map(table => `
            <div class="table-card" onclick="app.viewTable('${table.visit_id}')">
                <div class="table-header">
                    <div class="table-number">Стол ${table.table_number}</div>
                    <div class="table-duration">${table.duration_minutes}м</div>
                </div>
                <div class="guest-name">${table.guest_name}</div>
                <div class="party-size">
                    <i class="fas fa-users"></i>
                    ${table.party_size} ${this.getGuestWord(table.party_size)}
                </div>
            </div>
        `).join('');
    }

    getGuestWord(count) {
        if (count === 1) return 'гость';
        if (count >= 2 && count <= 4) return 'гостя';
        return 'гостей';
    }

    // QR Scanner
    showQRScanner() {
        if (!QRScanner.isSupportedCamera()) {
            alert('Камера не поддерживается в этом браузере');
            return;
        }

        this.showScreen('qr-scanner-screen');
        
        // Initialize scanner elements
        const video = document.getElementById('qr-video');
        const canvas = document.getElementById('qr-canvas');
        const status = document.getElementById('scanner-status');
        
        this.qrScanner.init(video, canvas, status);
        
        // Start scanning
        this.qrScanner.startScanning(
            (qrContent) => this.handleQRDetected(qrContent),
            (error) => this.handleQRError(error)
        );
    }

    hideQRScanner() {
        this.qrScanner.stopScanning();
        this.showMainScreen();
    }

    async handleQRDetected(qrContent) {
        console.log('QR detected:', qrContent);
        
        // Process QR content
        const processed = QRProcessor.processQRContent(qrContent);
        
        if (!processed.valid) {
            this.handleQRError(new Error(processed.error || 'Неверный QR-код'));
            return;
        }

        this.showLoading(true);
        
        try {
            const restaurantId = NOOK_CONFIG.DEFAULT_RESTAURANT_ID;
            const guestData = await api.scanQRCode(qrContent, restaurantId);
            
            if (guestData.found) {
                console.log('Guest identified:', guestData);
                this.showGuestProfile(guestData);
            } else {
                this.handleQRError(new Error('Гость не найден'));
            }
            
        } catch (error) {
            console.error('QR scan failed:', error);
            this.handleQRError(error);
        } finally {
            this.showLoading(false);
        }
    }

    handleQRError(error) {
        console.error('QR Scanner error:', error);
        
        const status = document.getElementById('scanner-status');
        if (status) {
            status.textContent = error.message || 'Ошибка сканирования';
            status.style.color = '#ff6b6b';
        }
        
        // Restart scanning after a brief pause
        setTimeout(() => {
            if (this.currentScreen === 'qr-scanner-screen') {
                const status = document.getElementById('scanner-status');
                if (status) {
                    status.textContent = 'Попробуйте еще раз';
                    status.style.color = 'white';
                }
            }
        }, 2000);
    }

    // Manual Guest Search
    showManualInput() {
        this.hideQRScanner();
        this.showModal('manual-input-modal');
        document.getElementById('manual-phone').focus();
    }

    async searchGuestByPhone() {
        const phone = document.getElementById('manual-phone').value.trim();
        
        if (!phone) {
            alert('Введите номер телефона');
            return;
        }

        this.hideModal(document.getElementById('manual-input-modal'));
        this.showLoading(true);
        
        try {
            const restaurantId = NOOK_CONFIG.DEFAULT_RESTAURANT_ID;
            const guestData = await api.identifyGuestByPhone(phone, restaurantId);
            
            if (guestData.found) {
                this.showGuestProfile(guestData);
            } else {
                alert('Гость не найден. Это новый гость.');
                this.showMainScreen();
            }
            
        } catch (error) {
            console.error('Guest search failed:', error);
            alert(error.message || 'Ошибка поиска гостя');
            this.showMainScreen();
        } finally {
            this.showLoading(false);
        }
    }

    // Guest Profile
    populateGuestProfile(guestData) {
        const guest = guestData.guest;
        const profile = guestData.profile;
        
        // Basic info
        document.getElementById('guest-name').textContent = guest.display_name || 'Гость';
        document.getElementById('guest-phone').textContent = guest.phone_number || '';
        
        // Statistics
        if (profile) {
            document.getElementById('total-visits').textContent = profile.total_visits || 0;
            document.getElementById('avg-check').textContent = profile.avg_check ? `₽${Math.round(profile.avg_check)}` : '-';
            document.getElementById('last-visit').textContent = profile.days_since_last_visit || '-';
            document.getElementById('price-tier').textContent = this.formatPriceTier(profile.price_tier);
        }
        
        // Alerts
        this.populateAlerts(guestData.alerts || [], guestData.restrictions || []);
        
        // Preferences
        this.populatePreferences(profile);
        
        // Notes
        this.populateNotes(guestData.recent_notes || []);
        
        // Load available offers
        this.loadAvailableOffers(guest.id);
    }

    populateAlerts(alerts, restrictions) {
        const alertsList = document.getElementById('alerts-list');
        const alertsSection = document.getElementById('alerts-section');
        
        const allAlerts = [...alerts];
        
        // Add critical restrictions as alerts
        restrictions.forEach(restriction => {
            if (restriction.severity === 'critical') {
                allAlerts.push(`⚠️ ${restriction.type}: ${restriction.value}`);
            }
        });
        
        if (allAlerts.length === 0) {
            alertsSection.style.display = 'none';
            return;
        }
        
        alertsSection.style.display = 'block';
        alertsList.innerHTML = allAlerts.map(alert => `
            <div class="alert-item">
                ${alert}
            </div>
        `).join('');
    }

    populatePreferences(profile) {
        const preferencesList = document.getElementById('preferences-list');
        const preferencesSection = document.getElementById('preferences-section');
        
        if (!profile) {
            preferencesSection.style.display = 'none';
            return;
        }
        
        const preferences = [];
        
        if (profile.preferred_time_slot) {
            preferences.push(`Время: ${this.formatTimeSlot(profile.preferred_time_slot)}`);
        }
        
        if (profile.top_food_categories && profile.top_food_categories.length > 0) {
            const topCategories = profile.top_food_categories.slice(0, 3).map(cat => cat.name).join(', ');
            preferences.push(`Кухня: ${topCategories}`);
        }
        
        if (profile.preferred_wine_type) {
            preferences.push(`Вино: ${this.formatWineType(profile.preferred_wine_type)}`);
        }
        
        if (profile.usually_tips) {
            preferences.push(`Обычно оставляет чаевые (${profile.avg_tip_percent}%)`);
        }
        
        if (preferences.length === 0) {
            preferencesSection.style.display = 'none';
            return;
        }
        
        preferencesSection.style.display = 'block';
        preferencesList.innerHTML = preferences.map(pref => `
            <div class="preference-item">${pref}</div>
        `).join('');
    }

    populateNotes(notes) {
        const notesList = document.getElementById('notes-list');
        const notesSection = document.getElementById('notes-section');
        
        if (notes.length === 0) {
            notesSection.style.display = 'none';
            return;
        }
        
        notesSection.style.display = 'block';
        notesList.innerHTML = notes.map(note => `
            <div class="note-item">
                <strong>${this.formatNoteType(note.type)}:</strong> ${note.text}
                <div style="font-size: 0.8rem; color: #999; margin-top: 0.25rem;">
                    ${new Date(note.created_at).toLocaleDateString('ru-RU')}
                </div>
            </div>
        `).join('');
    }

    async loadAvailableOffers(guestId) {
        try {
            const restaurantId = NOOK_CONFIG.DEFAULT_RESTAURANT_ID;
            const offersData = await api.getAvailableOffers(guestId, restaurantId);
            
            this.populateOffers(offersData.offers || []);
            
        } catch (error) {
            console.error('Failed to load offers:', error);
        }
    }

    populateOffers(offers) {
        const offersList = document.getElementById('offers-list');
        const offersSection = document.getElementById('offers-section');
        
        if (offers.length === 0) {
            offersSection.style.display = 'none';
            return;
        }
        
        offersSection.style.display = 'block';
        offersList.innerHTML = offers.map(offer => `
            <div class="offer-item" onclick="app.applyOffer('${offer.id}', '${offer.name}')">
                <div class="offer-name">${offer.name}</div>
                <div class="offer-description">${offer.description || ''}</div>
            </div>
        `).join('');
    }

    // Visit Management
    showVisitModal() {
        this.showModal('visit-modal');
        document.getElementById('table-number').focus();
    }

    async confirmStartVisit() {
        const tableNumber = document.getElementById('table-number').value.trim();
        const partySize = parseInt(document.getElementById('party-size').value);
        const occasion = document.getElementById('occasion').value;
        
        if (!tableNumber) {
            alert('Введите номер стола');
            return;
        }
        
        if (!partySize || partySize < 1) {
            alert('Укажите количество гостей');
            return;
        }

        this.hideModal(document.getElementById('visit-modal'));
        this.showLoading(true);
        
        try {
            const restaurantId = NOOK_CONFIG.DEFAULT_RESTAURANT_ID;
            const visitData = await api.startVisit(
                this.currentGuest.guest.id,
                restaurantId,
                tableNumber,
                partySize,
                occasion || null
            );
            
            if (visitData.success) {
                this.activeVisit = {
                    id: visitData.visit_id,
                    table_number: tableNumber,
                    party_size: partySize
                };
                
                alert('Обслуживание начато!');
                this.showMainScreen();
            }
            
        } catch (error) {
            console.error('Failed to start visit:', error);
            alert(error.message || 'Ошибка начала обслуживания');
        } finally {
            this.showLoading(false);
        }
    }

    // Utility Methods
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
        }
    }

    hideModal(modal) {
        if (typeof modal === 'string') {
            modal = document.getElementById(modal);
        }
        if (modal) {
            modal.classList.remove('active');
        }
    }

    showLoading(show) {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.classList.toggle('active', show);
        }
    }

    showError(element, message) {
        if (element) {
            element.textContent = message;
            element.classList.add('active');
        } else {
            alert(message);
        }
    }

    hideError(element) {
        if (element) {
            element.classList.remove('active');
        }
    }

    // Formatters
    formatPriceTier(tier) {
        const tiers = {
            'budget': 'Эконом',
            'mid': 'Средний',
            'premium': 'Премиум',
            'vip': 'VIP'
        };
        return tiers[tier] || tier || '-';
    }

    formatTimeSlot(slot) {
        const slots = {
            'morning': 'Утро',
            'lunch': 'Обед',
            'dinner': 'Ужин',
            'late': 'Поздний'
        };
        return slots[slot] || slot;
    }

    formatWineType(type) {
        const types = {
            'red': 'Красное',
            'white': 'Белое',
            'rose': 'Розовое',
            'sparkling': 'Игристое'
        };
        return types[type] || type;
    }

    formatNoteType(type) {
        const types = {
            'general': 'Общее',
            'preference': 'Предпочтение',
            'warning': 'Внимание',
            'vip': 'VIP',
            'complaint': 'Жалоба'
        };
        return types[type] || type;
    }

    // Auto-refresh
    startRefreshInterval() {
        this.clearRefreshInterval();
        this.refreshInterval = setInterval(() => {
            if (this.currentScreen === 'main-screen') {
                this.loadDashboard();
            }
        }, NOOK_CONFIG.UI.REFRESH_INTERVAL);
    }

    clearRefreshInterval() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }
}

// Initialize the application
const app = new WaiterApp();

// Global functions for onclick handlers
window.showQRScanner = () => app.showQRScanner();
window.app = app;