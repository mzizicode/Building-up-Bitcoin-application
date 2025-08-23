// Enhanced ImageUpload.js with better debugging and error handling
import React, { useState, useRef } from 'react';
import './ImageUpload.css';

function ImageUpload({ onImageUpload, maxSize = 1024 * 1024, maxWidth = 1024, maxHeight = 768 }) {
    const [dragActive, setDragActive] = useState(false);
    const [error, setError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [debugInfo, setDebugInfo] = useState('');
    const fileInputRef = useRef(null);

    const logDebug = (message) => {
        console.log('🖼️ ImageUpload:', message);
        setDebugInfo(prev => prev + `\n${new Date().toLocaleTimeString()}: ${message}`);
    };

    const validateImage = (file) => {
        logDebug(`Validating file: ${file.name}, size: ${file.size}, type: ${file.type}`);

        // Check file type
        if (!file.type.startsWith('image/')) {
            return 'Please select a valid image file (JPG, PNG, GIF, etc.)';
        }

        // Check file size
        if (file.size > maxSize) {
            return `File size must be less than ${(maxSize / 1024 / 1024).toFixed(1)}MB`;
        }

        // Check if file is corrupted
        if (file.size === 0) {
            return 'The selected file appears to be empty or corrupted';
        }

        logDebug('File validation passed');
        return null;
    };

    const processImage = async (file) => {
        setIsProcessing(true);
        setError('');
        logDebug('Starting image processing...');

        try {
            const img = new Image();

            return new Promise((resolve, reject) => {
                img.onload = () => {
                    try {
                        logDebug(`Image loaded: ${img.width}x${img.height}`);

                        // Auto-resize if image is too large
                        let { width, height } = img;

                        if (width > maxWidth || height > maxHeight) {
                            const ratio = Math.min(maxWidth / width, maxHeight / height);
                            width = Math.floor(width * ratio);
                            height = Math.floor(height * ratio);
                            logDebug(`Resizing to: ${width}x${height} (ratio: ${ratio})`);

                            // Create canvas to resize image
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');
                            canvas.width = width;
                            canvas.height = height;

                            ctx.drawImage(img, 0, 0, width, height);
                            logDebug('Canvas created and image drawn');

                            canvas.toBlob((resizedBlob) => {
                                if (!resizedBlob) {
                                    reject(new Error('Failed to create resized image blob'));
                                    return;
                                }

                                const resizedFile = new File([resizedBlob], file.name, {
                                    type: file.type,
                                    lastModified: Date.now()
                                });

                                const preview = URL.createObjectURL(resizedFile);
                                logDebug(`Resized file created: ${resizedFile.size} bytes`);

                                resolve({
                                    file: resizedFile,
                                    preview,
                                    width,
                                    height,
                                    size: resizedBlob.size,
                                    originalSize: file.size,
                                    wasResized: true
                                });
                            }, file.type, 0.85);
                        } else {
                            // Image is already the right size
                            const preview = URL.createObjectURL(file);
                            logDebug('No resizing needed');

                            resolve({
                                file,
                                preview,
                                width: img.width,
                                height: img.height,
                                size: file.size,
                                originalSize: file.size,
                                wasResized: false
                            });
                        }
                    } catch (canvasError) {
                        logDebug(`Canvas error: ${canvasError.message}`);
                        reject(canvasError);
                    }
                };

                img.onerror = (imgError) => {
                    logDebug(`Image load error: ${imgError}`);
                    reject(new Error('Invalid or corrupted image file'));
                };

                // Create object URL for the image
                const imageUrl = URL.createObjectURL(file);
                logDebug(`Created object URL: ${imageUrl}`);
                img.src = imageUrl;
            });
        } catch (err) {
            logDebug(`Processing error: ${err.message}`);
            throw err;
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFiles = async (files) => {
        const file = files[0];
        if (!file) {
            logDebug('No file selected');
            return;
        }

        logDebug(`Processing file: ${file.name}`);
        setError('');
        setDebugInfo(''); // Clear previous debug info

        const validationError = validateImage(file);
        if (validationError) {
            setError(validationError);
            logDebug(`Validation failed: ${validationError}`);
            return;
        }

        try {
            const imageData = await processImage(file);
            logDebug('Image processing successful, calling onImageUpload');
            onImageUpload(imageData);
        } catch (err) {
            const errorMessage = `Failed to process image: ${err.message}`;
            setError(errorMessage);
            logDebug(errorMessage);
        }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        logDebug('File dropped');

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFiles(e.dataTransfer.files);
        }
    };

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files[0]) {
            logDebug('File selected via input');
            handleFiles(e.target.files);
        }
    };

    const openFileDialog = () => {
        logDebug('Opening file dialog');
        fileInputRef.current?.click();
    };

    const clearDebugInfo = () => {
        setDebugInfo('');
    };

    return (
        <div className="image-upload-container">
            <div
                className={`upload-zone ${dragActive ? 'drag-active' : ''} ${isProcessing ? 'processing' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={openFileDialog}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                />

                {isProcessing ? (
                    <div className="processing-state">
                        <div className="processing-spinner"></div>
                        <p>Processing image...</p>
                    </div>
                ) : (
                    <div className="upload-content">
                        <div className="upload-icon">📸</div>
                        <h3>Upload Your Photo</h3>
                        <p>Click to select or drag and drop</p>
                        <div className="upload-specs">
                            <span>• Max size: {(maxSize / 1024 / 1024).toFixed(1)}MB</span>
                            <span>• Max dimensions: {maxWidth}x{maxHeight}px</span>
                            <span>• Formats: JPG, PNG, GIF, WebP</span>
                        </div>
                    </div>
                )}
            </div>

            {error && (
                <div className="error-message">
                    <span className="error-icon">⚠️</span>
                    {error}
                </div>
            )}

            {/* Debug Info Panel */}
            {debugInfo && (
                <div style={{
                    marginTop: '15px',
                    padding: '15px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e1e8ed'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <h4 style={{ margin: 0, fontSize: '14px', color: '#666' }}>🔧 Debug Information</h4>
                        <button
                            onClick={clearDebugInfo}
                            style={{
                                background: 'none',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                fontSize: '12px',
                                cursor: 'pointer'
                            }}
                        >
                            Clear
                        </button>
                    </div>
                    <pre style={{
                        fontSize: '11px',
                        color: '#666',
                        margin: 0,
                        whiteSpace: 'pre-wrap',
                        maxHeight: '150px',
                        overflow: 'auto'
                    }}>
                        {debugInfo}
                    </pre>
                </div>
            )}

            <div className="upload-tips">
                <h4>📝 Tips for better photos:</h4>
                <ul>
                    <li>Use good lighting and clear focus</li>
                    <li>Images are automatically optimized for best performance</li>
                    <li>Unique and interesting locations are preferred</li>
                    <li>Make sure the image represents the location well</li>
                </ul>
            </div>
        </div>
    );
}

export default ImageUpload;