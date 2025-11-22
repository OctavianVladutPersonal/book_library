/**
 * Barcode Scanner Functions
 * Handles barcode scanning using Quagga2 (loaded dynamically)
 */

let QuaggaLoaded = false;

async function loadQuaggaLibrary() {
    if (QuaggaLoaded && typeof window.Quagga !== 'undefined') {
        return true;
    }
    
    return new Promise((resolve) => {
        // Check if already loading
        if (document.querySelector('script[src*="quagga2"]')) {
            // Wait for it to load
            const checkInterval = setInterval(() => {
                if (typeof window.Quagga !== 'undefined') {
                    clearInterval(checkInterval);
                    QuaggaLoaded = true;
                    resolve(true);
                }
            }, 100);
            setTimeout(() => {
                clearInterval(checkInterval);
                resolve(false);
            }, 10000);
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@ericblade/quagga2@1.10.2/dist/quagga.min.js';
        script.onload = () => {
            if (typeof window.Quagga !== 'undefined') {
                QuaggaLoaded = true;
                resolve(true);
            } else {
                resolve(false);
            }
        };
        script.onerror = () => {
            console.error('Failed to load Quagga library from CDN');
            resolve(false);
        };
        document.head.appendChild(script);
    });
}

function openISBNScanner() {
    if (!CameraUtils.isSecureContext()) {
        const errorMsg = CameraUtils.getCameraErrorMessage(new Error('INSECURE_CONTEXT'));
        StatusManager.updateStatus(DOM.scannerStatus, errorMsg);
        alert(errorMsg);
        return;
    }
    
    DOM.isbnScannerModal.classList.remove('hidden');
    StatusManager.updateStatus(DOM.scannerStatus, 'Ready to scan. Click "▶️ Start Scanning" to begin.');
    StatusManager.updateStatus(DOM.photoStatus, 'Ready to capture. Click "▶️ Start Photo Capture" to begin.');
    // Manual status uses the HTML paragraph element, no need to set it here
}

function closeISBNScanner() {
    DOM.isbnScannerModal.classList.add('hidden');
    stopISBNScan();
    stopPhotoCapture();
}

async function startISBNScan() {
    try {
        // Load Quagga library dynamically if not already loaded
        StatusManager.showLoading(DOM.scannerStatus, 'Loading barcode scanner... Please wait.');
        const quaggaLoaded = await loadQuaggaLibrary();
        
        if (!quaggaLoaded || typeof window.Quagga === 'undefined' || !window.Quagga.init) {
            StatusManager.updateStatus(DOM.scannerStatus, 'Failed to load barcode scanner. Try photo capture instead.');
            DOM.startScannerButton.disabled = false;
            return;
        }

        // Request camera permission explicitly
        AppState.isbnScanStream = await CameraUtils.requestCameraAccess();
        await CameraUtils.initializeVideo(DOM.video, AppState.isbnScanStream);
        DOM.barcodePreview.style.display = 'block';
        DOM.startScannerButton.classList.add('hidden');

        AppState.isbnScanActive = true;
        StatusManager.showLoading(DOM.scannerStatus, 'Scanning... Point camera at ISBN barcode.');
        DOM.startScannerButton.disabled = true;

        // Flag to prevent multiple detections
        let isProcessing = false;

        window.Quagga.init({
            inputStream: {
                name: 'Live',
                type: 'LiveStream',
                target: DOM.video,
                constraints: {
                    facingMode: 'environment'
                }
            },
            decoder: {
                workers: {
                    imageURL: 'https://cdn.jsdelivr.net/npm/@ericblade/quagga2@1.10.2/dist/quagga.worker.min.js',
                    embedded: true
                },
                readers: ['ean_reader', 'ean_8_reader', 'upc_reader', 'upc_e_reader', 'codabar_reader']
            }
        }, function (err) {
            if (err) {
                console.error('Quagga init error:', err);
                StatusManager.showError(DOM.scannerStatus, 'Error initializing scanner. Please try again.');
                DOM.startScannerButton.disabled = false;
                DOM.startScannerButton.classList.remove('hidden');
                DOM.barcodePreview.style.display = 'none';
                stopISBNScan();
                return;
            }
            window.Quagga.start();
        });

        window.Quagga.onDetected(async (result) => {
            if (result && result.codeResult && !isProcessing) {
                isProcessing = true;
                const isbn = result.codeResult.code;
                console.log('ISBN detected:', isbn);

                StatusManager.updateStatus(DOM.scannerStatus, `ISBN found: ${isbn}. Fetching book details...`);

                window.Quagga.stop();
                stopISBNScan();

                const bookDetails = await fetchBookByISBN(isbn);

                if (bookDetails) {
                    document.getElementById('bookName').value = bookDetails.title;
                    document.getElementById('authorName').value = bookDetails.author;

                    const added = await addBookDirect(bookDetails.title, bookDetails.author);

                    if (added) {
                        showNewlyAddedBook(bookDetails.title, bookDetails.author);
                        clearAllFlows();
                        alert(`Book added: "${bookDetails.title}" by ${bookDetails.author}`);
                        // Close scanner after successful add
                        closeISBNScanner();
                    } else {
                        StatusManager.updateStatus(DOM.scannerStatus, 'Book could not be added. Try again or enter manually.');
                        DOM.startScannerButton.disabled = false;
                        DOM.startScannerButton.classList.remove('hidden');
                        isProcessing = false;
                    }
                } else {
                    StatusManager.updateStatus(DOM.scannerStatus, 'Book not found. Try another barcode or enter manually.');
                    DOM.startScannerButton.disabled = false;
                    DOM.startScannerButton.classList.remove('hidden');
                    isProcessing = false;
                }
            }
        });

    } catch (error) {
        console.error('Error accessing camera:', error);
        DOM.startScannerButton.disabled = false;
        DOM.startScannerButton.classList.remove('hidden');
        DOM.barcodePreview.style.display = 'none';

        StatusManager.updateStatus(DOM.scannerStatus, CameraUtils.getCameraErrorMessage(error));
        
        // Show alert for certain errors
        if (error.name === 'NotAllowedError' || error.name === 'NotFoundError' || 
            error.name === 'NotFoundException' || error.name === 'NotReadableError' ||
            error.name === 'TrackStartError') {
            alert(CameraUtils.getCameraErrorAlert(error));
        }
    }
}

function stopISBNScan() {
    CameraUtils.stopMediaStream(AppState.isbnScanStream);
    AppState.isbnScanStream = null;

    try {
        if (window.Quagga && typeof window.Quagga.stop === 'function') {
            window.Quagga.stop();
        }
    } catch (error) {
        console.log('Quagga stop error (expected):', error);
    }

    AppState.isbnScanActive = false;
    DOM.startScannerButton.disabled = false;
}
