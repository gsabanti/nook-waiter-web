// Nook Waiter Web App Configuration
const CONFIG = {
    // API Configuration
    API_BASE_URL: 'https://api.sabanti.tech/api/v1',
    
    // Development mode (set to false for production)
    DEV_MODE: true,
    
    // Default restaurant ID (should be set per deployment)  
    DEFAULT_RESTAURANT_ID: 'b5eb9327-a738-446c-b097-acc7f3332381', // Richy Richy
    
    // QR Scanner settings
    QR_SCANNER: {
        // How often to scan for QR codes (milliseconds)
        SCAN_INTERVAL: 250, // Slower for better performance
        
        // Video constraints for camera
        VIDEO_CONSTRAINTS: {
            video: {
                facingMode: 'environment', // Use back camera on mobile
                width: { ideal: 1280, max: 1920 },
                height: { ideal: 720, max: 1080 }
            }
        },
        
        // QR detection area (as fraction of video size)  
        SCAN_AREA: {
            x: 0.0,
            y: 0.0,
            width: 1.0,
            height: 1.0
        }
    },
    
    // UI Settings
    UI: {
        // Auto-refresh interval for active tables (milliseconds)
        REFRESH_INTERVAL: 30000, // 30 seconds
        
        // Show debug information
        DEBUG: true,
        
        // Animation durations
        TRANSITION_DURATION: 300
    },
    
    // Local storage keys
    STORAGE_KEYS: {
        STAFF_SESSION: 'nook_waiter_session',
        LAST_RESTAURANT: 'nook_last_restaurant'
    },
    
    // Error messages
    ERROR_MESSAGES: {
        LOGIN_FAILED: 'Неверный логин или пароль',
        NETWORK_ERROR: 'Ошибка сети. Проверьте соединение.',
        CAMERA_ERROR: 'Не удалось получить доступ к камере',
        QR_INVALID: 'Неверный QR-код',
        GUEST_NOT_FOUND: 'Гость не найден',
        PERMISSION_DENIED: 'Недостаточно прав доступа'
    },
    
    // Success messages  
    SUCCESS_MESSAGES: {
        LOGIN_SUCCESS: 'Вход выполнен успешно',
        VISIT_STARTED: 'Обслуживание начато',
        NOTE_ADDED: 'Заметка добавлена',
        OFFER_APPLIED: 'Предложение применено'
    }
};

// Environment-specific overrides
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    CONFIG.API_BASE_URL = 'http://localhost:8000/api/v1';
    CONFIG.DEV_MODE = true;
    CONFIG.UI.DEBUG = true;
}

// Make config available globally
window.NOOK_CONFIG = CONFIG;