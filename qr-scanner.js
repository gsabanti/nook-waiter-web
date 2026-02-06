// QR Code Scanner Module
class QRScanner {
    constructor() {
        this.isScanning = false;
        this.stream = null;
        this.codeReader = null;
        this.scanInterval = null;
        
        // DOM elements
        this.video = null;
        this.canvas = null;
        this.statusElement = null;
        
        // Initialize ZXing library when available
        this.initializeReader();
    }

    async initializeReader() {
        // Wait for ZXing library to load
        if (typeof ZXing === 'undefined') {
            console.log('Waiting for ZXing library...');
            setTimeout(() => this.initializeReader(), 100);
            return;
        }

        try {
            // Create multiple format reader for better compatibility
            this.codeReader = new ZXing.BrowserMultiFormatReader();
            
            // Test if reader is working
            console.log('QR Scanner initialized successfully');
            console.log('ZXing version:', ZXing.version || 'unknown');
            
        } catch (error) {
            console.error('Failed to initialize QR scanner:', error);
            
            // Try alternative initialization
            try {
                this.codeReader = new ZXing.BrowserQRCodeReader();
                console.log('QR Scanner initialized with QR-only reader');
            } catch (altError) {
                console.error('All QR scanner initialization methods failed:', altError);
            }
        }
    }

    // Initialize scanner elements
    init(videoElement, canvasElement, statusElement) {
        this.video = videoElement;
        this.canvas = canvasElement;
        this.statusElement = statusElement;
        
        // Set canvas size to match video
        this.canvas.width = this.video.videoWidth || 640;
        this.canvas.height = this.video.videoHeight || 480;
    }

    // Start camera and scanning
    async startScanning(onQRDetected, onError) {
        if (this.isScanning) {
            return;
        }

        if (!this.codeReader) {
            onError?.(new Error('QR Scanner not initialized'));
            return;
        }

        try {
            this.updateStatus('Запуск камеры...');
            
            // Get camera stream
            this.stream = await navigator.mediaDevices.getUserMedia(
                NOOK_CONFIG.QR_SCANNER.VIDEO_CONSTRAINTS
            );
            
            // Set video source
            this.video.srcObject = this.stream;
            this.video.play();
            
            this.isScanning = true;
            this.updateStatus('Наведите камеру на QR-код');
            
            // Wait for video to be ready
            await new Promise((resolve) => {
                this.video.addEventListener('loadedmetadata', resolve, { once: true });
            });
            
            // Update canvas size
            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;
            
            // Start scanning loop
            this.scanInterval = setInterval(() => {
                this.scanFrame(onQRDetected, onError);
            }, NOOK_CONFIG.QR_SCANNER.SCAN_INTERVAL);
            
        } catch (error) {
            console.error('Failed to start camera:', error);
            let errorMessage = 'Не удалось запустить камеру';
            
            if (error.name === 'NotAllowedError') {
                errorMessage = 'Доступ к камере запрещен. Разрешите доступ в настройках браузера.';
            } else if (error.name === 'NotFoundError') {
                errorMessage = 'Камера не найдена';
            } else if (error.name === 'NotSupportedError') {
                errorMessage = 'Камера не поддерживается';
            }
            
            this.updateStatus(errorMessage);
            onError?.(new Error(errorMessage));
        }
    }

    // Stop scanning and camera
    stopScanning() {
        this.isScanning = false;
        
        // Clear scan interval
        if (this.scanInterval) {
            clearInterval(this.scanInterval);
            this.scanInterval = null;
        }
        
        // Stop video stream
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        // Clear video
        if (this.video) {
            this.video.srcObject = null;
        }
        
        this.updateStatus('');
        console.log('QR Scanner stopped');
    }

    // Scan current video frame for QR codes
    scanFrame(onQRDetected, onError) {
        if (!this.isScanning || !this.video || this.video.readyState !== 4) {
            return;
        }

        try {
            const context = this.canvas.getContext('2d');
            
            // Draw current video frame to canvas
            context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
            
            // Get full canvas image data for better detection
            const imageData = context.getImageData(0, 0, this.canvas.width, this.canvas.height);
            
            // Try to decode QR code using ZXing
            try {
                const result = this.codeReader.decodeFromImageData(imageData);
                
                if (result && result.text) {
                    this.updateStatus('QR-код найден!');
                    console.log('QR Code detected:', result.text);
                    
                    // Stop scanning
                    this.stopScanning();
                    
                    // Callback with result
                    onQRDetected?.(result.text);
                    return;
                }
            } catch (decodeError) {
                // Try alternative method with luminance source
                try {
                    const luminanceSource = new ZXing.RGBLuminanceSource(
                        imageData.data,
                        this.canvas.width,
                        this.canvas.height
                    );
                    const binaryBitmap = new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(luminanceSource));
                    const result = this.codeReader.decode(binaryBitmap);
                    
                    if (result && result.text) {
                        this.updateStatus('QR-код найден!');
                        console.log('QR Code detected (alt method):', result.text);
                        
                        // Stop scanning
                        this.stopScanning();
                        
                        // Callback with result
                        onQRDetected?.(result.text);
                        return;
                    }
                } catch (altError) {
                    // Both methods failed, continue scanning
                    if (altError.name !== 'NotFoundException' && altError.message !== 'No QR code found') {
                        console.debug('QR decode attempt failed:', altError.message);
                    }
                }
            }
            
        } catch (error) {
            console.error('QR scan frame error:', error);
            onError?.(error);
        }
    }

    // Check if camera is supported
    static isSupportedCamera() {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }

    // Check if ZXing library is loaded
    isReaderReady() {
        return !!this.codeReader;
    }

    // Update status message
    updateStatus(message) {
        if (this.statusElement) {
            this.statusElement.textContent = message;
        }
        console.log('Scanner status:', message);
    }

    // Get camera list (for future camera selection feature)
    async getCameraList() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.filter(device => device.kind === 'videoinput');
        } catch (error) {
            console.error('Failed to get camera list:', error);
            return [];
        }
    }
}

// Utility functions for QR code processing
class QRProcessor {
    static processQRContent(qrContent) {
        // Try to detect QR code format and extract relevant data
        
        // Format 1: Simple UUID (36 characters with dashes)
        if (qrContent.length === 36 && qrContent.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
            return {
                type: 'guest_id',
                content: qrContent,
                valid: true
            };
        }
        
        // Format 2: Base64 encoded JSON
        try {
            const decoded = atob(qrContent);
            const data = JSON.parse(decoded);
            
            if (data.type === 'nook_guest' && data.guest_id) {
                // Check expiration if present
                if (data.expires_at) {
                    const expiresAt = new Date(data.expires_at);
                    if (new Date() > expiresAt) {
                        return {
                            type: 'encoded',
                            content: data,
                            valid: false,
                            error: 'QR-код истёк'
                        };
                    }
                }
                
                return {
                    type: 'encoded',
                    content: data,
                    valid: true
                };
            }
        } catch (error) {
            // Not base64 or not JSON, continue checking
        }
        
        // Format 3: Phone hash (64 character hex)
        if (qrContent.length === 64 && qrContent.match(/^[0-9a-f]{64}$/i)) {
            return {
                type: 'phone_hash',
                content: qrContent,
                valid: true
            };
        }
        
        // Unknown format
        return {
            type: 'unknown',
            content: qrContent,
            valid: false,
            error: 'Неизвестный формат QR-кода'
        };
    }
    
    static extractGuestId(processedQR) {
        if (!processedQR.valid) {
            return null;
        }
        
        switch (processedQR.type) {
            case 'guest_id':
                return processedQR.content;
                
            case 'encoded':
                return processedQR.content.guest_id;
                
            case 'phone_hash':
                // Phone hash requires API lookup
                return null;
                
            default:
                return null;
        }
    }
}

// Export classes
window.QRScanner = QRScanner;
window.QRProcessor = QRProcessor;