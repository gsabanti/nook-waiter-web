// Nook API Client
class NookAPI {
    constructor() {
        this.baseUrl = NOOK_CONFIG.API_BASE_URL;
        this.session = this.loadSession();
    }

    // Session Management
    loadSession() {
        const sessionData = localStorage.getItem(NOOK_CONFIG.STORAGE_KEYS.STAFF_SESSION);
        return sessionData ? JSON.parse(sessionData) : null;
    }

    saveSession(sessionData) {
        this.session = sessionData;
        localStorage.setItem(NOOK_CONFIG.STORAGE_KEYS.STAFF_SESSION, JSON.stringify(sessionData));
    }

    clearSession() {
        this.session = null;
        localStorage.removeItem(NOOK_CONFIG.STORAGE_KEYS.STAFF_SESSION);
    }

    isAuthenticated() {
        return this.session && this.session.staff_id;
    }

    // HTTP Helper
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            }
        };

        // Add authentication if available
        if (this.session && this.session.token) {
            defaultOptions.headers['Authorization'] = `Bearer ${this.session.token}`;
        }

        const finalOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, finalOptions);
            
            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage;
                
                try {
                    const errorJson = JSON.parse(errorText);
                    errorMessage = errorJson.detail || errorJson.message || 'Ошибка API';
                } catch {
                    errorMessage = errorText || 'Неизвестная ошибка';
                }
                
                throw new Error(`${response.status}: ${errorMessage}`);
            }

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }
            
            return await response.text();
        } catch (error) {
            console.error('API Request failed:', error);
            
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                throw new Error(NOOK_CONFIG.ERROR_MESSAGES.NETWORK_ERROR);
            }
            
            throw error;
        }
    }

    // Authentication
    async login(phone, password) {
        const response = await this.request('/waiter/login', {
            method: 'POST',
            body: JSON.stringify({
                phone: phone,
                password: password
            })
        });

        // Save session data
        this.saveSession(response);
        
        return response;
    }

    logout() {
        this.clearSession();
    }

    // Guest Management
    async identifyGuestByPhone(phoneNumber, restaurantId) {
        return await this.request('/waiter/identify-guest', {
            method: 'POST',
            body: JSON.stringify({
                phone_number: phoneNumber,
                restaurant_id: restaurantId
            })
        });
    }

    async scanQRCode(qrContent, restaurantId) {
        return await this.request('/waiter/scan-qr', {
            method: 'POST',
            body: JSON.stringify({
                qr_content: qrContent,
                restaurant_id: restaurantId
            })
        });
    }

    // Visit Management
    async startVisit(guestId, restaurantId, tableNumber, partySize = 1, occasion = null) {
        return await this.request('/waiter/start-visit', {
            method: 'POST',
            body: JSON.stringify({
                guest_id: guestId,
                restaurant_id: restaurantId,
                table_number: tableNumber,
                party_size: partySize,
                staff_id: this.session.staff_id,
                ...(occasion && { occasion })
            })
        });
    }

    async updateVisit(visitId, updates) {
        return await this.request(`/staff/visits/${visitId}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    }

    async closeVisit(visitId, billData) {
        return await this.request(`/staff/visits/${visitId}/close`, {
            method: 'POST',
            body: JSON.stringify(billData)
        });
    }

    // Tables and Staff
    async getMyTables(restaurantId) {
        return await this.request(`/waiter/my-tables?staff_id=${this.session.staff_id}&restaurant_id=${restaurantId}`);
    }

    // Offers
    async getAvailableOffers(guestId, restaurantId) {
        return await this.request(`/offers/available?guest_id=${guestId}&restaurant_id=${restaurantId}`);
    }

    async applyOffer(guestId, visitId, offerId, restaurantId, notes = null) {
        return await this.request('/staff/apply-offer', {
            method: 'POST',
            body: JSON.stringify({
                guest_id: guestId,
                visit_id: visitId,
                offer_id: offerId,
                restaurant_id: restaurantId,
                staff_id: this.session.staff_id,
                ...(notes && { notes })
            })
        });
    }

    // Notes
    async addNote(guestId, restaurantId, noteType, noteText, isNetworkWide = false) {
        return await this.request('/staff/notes', {
            method: 'POST',
            body: JSON.stringify({
                guest_id: guestId,
                restaurant_id: restaurantId,
                note_type: noteType,
                note_text: noteText,
                is_network_wide: isNetworkWide
            })
        });
    }

    async getGuestNotes(guestId, restaurantId) {
        return await this.request(`/staff/notes/${guestId}?restaurant_id=${restaurantId}`);
    }
}

// Global API instance
const api = new NookAPI();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NookAPI;
}