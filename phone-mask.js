// Phone Input Mask and Normalization
class PhoneMask {
    constructor() {
        this.phonePattern = /^[\+]?[0-9\s\-\(\)]*$/;
    }

    // Apply mask to phone input field
    applyMask(inputElement) {
        const formatPhone = (value) => {
            // Remove all non-digits except +
            const cleaned = value.replace(/[^\d+]/g, '');
            
            // If starts with 8, replace with +7
            let normalized = cleaned;
            if (normalized.startsWith('8')) {
                normalized = '+7' + normalized.slice(1);
            } else if (normalized.startsWith('7') && !normalized.startsWith('+7')) {
                normalized = '+7' + normalized.slice(1);
            } else if (!normalized.startsWith('+7') && normalized.length > 0) {
                normalized = '+7' + normalized;
            }
            
            // Apply formatting: +7 (XXX) XXX-XX-XX
            if (normalized.startsWith('+7') && normalized.length > 2) {
                const digits = normalized.slice(2); // Remove +7
                let formatted = '+7';
                
                if (digits.length > 0) {
                    formatted += ' (';
                    formatted += digits.substring(0, 3);
                    if (digits.length > 3) {
                        formatted += ') ';
                        formatted += digits.substring(3, 6);
                        if (digits.length > 6) {
                            formatted += '-';
                            formatted += digits.substring(6, 8);
                            if (digits.length > 8) {
                                formatted += '-';
                                formatted += digits.substring(8, 10);
                            }
                        }
                    }
                }
                
                return formatted;
            }
            
            return normalized;
        };

        // Add event listeners
        inputElement.addEventListener('input', (e) => {
            const cursorPosition = e.target.selectionStart;
            const oldValue = e.target.value;
            const newValue = formatPhone(oldValue);
            
            e.target.value = newValue;
            
            // Restore cursor position
            const newCursorPosition = this.calculateCursorPosition(oldValue, newValue, cursorPosition);
            e.target.setSelectionRange(newCursorPosition, newCursorPosition);
        });

        // Format on paste
        inputElement.addEventListener('paste', (e) => {
            setTimeout(() => {
                const formatted = formatPhone(e.target.value);
                e.target.value = formatted;
            }, 0);
        });

        // Initial formatting if value exists
        if (inputElement.value) {
            inputElement.value = formatPhone(inputElement.value);
        }
    }

    // Calculate cursor position after formatting
    calculateCursorPosition(oldValue, newValue, oldCursor) {
        // Simple approach: try to maintain relative position
        const ratio = oldCursor / oldValue.length;
        return Math.round(newValue.length * ratio);
    }

    // Normalize phone number for API calls (without +)
    static normalizePhone(phone) {
        if (!phone) return '';
        
        // Remove all non-digits
        const cleaned = phone.replace(/[^\d]/g, '');
        
        // Convert different formats to 7XXXXXXXXXX
        let normalized = cleaned;
        
        // 8XXXXXXXXXX -> 7XXXXXXXXXX
        if (normalized.startsWith('8') && normalized.length === 11) {
            normalized = '7' + normalized.slice(1);
        }
        // +7XXXXXXXXXX -> 7XXXXXXXXXX (remove +)
        else if (normalized.startsWith('7') && normalized.length === 11) {
            normalized = normalized; // already correct
        }
        // XXXXXXXXXX -> 7XXXXXXXXXX
        else if (normalized.length === 10) {
            normalized = '7' + normalized;
        }
        
        // Return normalized format or original if invalid
        if (normalized.startsWith('7') && normalized.length === 11) {
            return normalized;
        }
        
        return phone; // Return original if can't normalize
    }

    // Format for display: +7XXXXXXXXXX -> +7 (XXX) XXX-XX-XX
    static formatForDisplay(phone) {
        const normalized = this.normalizePhone(phone);
        
        if (normalized.startsWith('+7') && normalized.length === 12) {
            const digits = normalized.slice(2); // Remove +7
            return `+7 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8, 10)}`;
        }
        
        return phone;
    }

    // Validate phone number
    static isValid(phone) {
        const normalized = this.normalizePhone(phone);
        return normalized.startsWith('7') && normalized.length === 11 && /^7\d{10}$/.test(normalized);
    }
}

// Export for global use
window.PhoneMask = PhoneMask;