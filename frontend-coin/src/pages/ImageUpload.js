// Enhanced ImageUpload.js with single image restriction
import React, { useState, useRef } from 'react';
import './ImageUpload.css';

function ImageUpload({ onImageUpload, onImageRemove, maxSize = 1024 * 1024, maxWidth = 1024, maxHeight = 768, hasExistingImage = false }) {
    const [dragActive, setDragActive] = useState(false);
    const [error, setError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [debugInfo, setDebugInfo] = useState('');
    const [uploadedImage, setUploadedImage] = useState(null);
    const fileInputRef = useRef(null);
npm
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
        // Check if image already uploaded or exists
        if (uploadedImage || hasExistingImage) {
            setError('You can only upload one image. Please remove the current image first.');
            logDebug('Upload blocked - image already exists');
            return;
        }

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

            // Store uploaded image data locally
            setUploadedImage(imageData);

            // Call parent callback
            onImageUpload(imageData);
        } catch (err) {
            const errorMessage = `Failed to process image: ${err.message}`;
            setError(errorMessage);
            logDebug(errorMessage);
        }
    };

    const handleRemoveImage = () => {
        if (uploadedImage && uploadedImage.preview) {
            URL.revokeObjectURL(uploadedImage.preview);
        }
        setUploadedImage(null);
        setError('');
        setDebugInfo('');
        logDebug('Image removed');

        // Call parent callback if provided
        if (onImageRemove) {
            onImageRemove();
        }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Block drag if image already exists
        if (uploadedImage || hasExistingImage) {
            return;
        }

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

        // Block drop if image already exists
        if (uploadedImage || hasExistingImage) {
            setError('You can only upload one image. Please remove the current image first.');
            return;
        }

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
        // Block file dialog if image already exists
        if (uploadedImage || hasExistingImage) {
            setError('You can only upload one image. Please remove the current image first.');
            return;
        }

        logDebug('Opening file dialog');
        fileInputRef.current?.click();
    };

    const clearDebugInfo = () => {
        setDebugInfo('');
    };

    // Show uploaded image preview
    if (uploadedImage) {
        return (
            <div className="image-upload-container">
                <div className="uploaded-image-container">
                    <div className="image-preview">
                        <img
                            src={uploadedImage.preview}
                            alt="Uploaded"
                            style={{
                                width: '100%',
                                height: '200px',
                                objectFit: 'cover',
                                borderRadius: '12px'
                            }}
                        />
                        <div className="image-overlay">
                            <button
                                className="remove-image-btn"
                                onClick={handleRemoveImage}
                                title="Remove image"
                            >
                                ❌
                            </button>
                        </div>
                    </div>
                    <div className="image-info">
                        <p><strong>File:</strong> {uploadedImage.file.name}</p>
                        <p><strong>Size:</strong> {(uploadedImage.size / 1024).toFixed(1)} KB</p>
                        <p><strong>Dimensions:</strong> {uploadedImage.width}x{uploadedImage.height}px</p>
                        {uploadedImage.wasResized && (
                            <p><strong>Note:</strong> Image was automatically resized for optimization</p>
                        )}
                    </div>
                </div>

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
            </div>
        );
    }

    // Show upload zone if no image exists
    const isDisabled = hasExistingImage;

    return (
        <div className="image-upload-container">
            {hasExistingImage && (
                <div className="existing-image-notice">
                    <p>⚠️ You have already uploaded an image for this lottery. Only one image per lottery is allowed.</p>
                </div>
            )}

            <div
                className={`upload-zone ${dragActive ? 'drag-active' : ''} ${isProcessing ? 'processing' : ''} ${isDisabled ? 'disabled' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={isDisabled ? undefined : openFileDialog}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                    disabled={isDisabled}
                />

                {isProcessing ? (
                    <div className="processing-state">
                        <div className="processing-spinner"></div>
                        <p>Processing image...</p>
                    </div>
                ) : (
                    <div className="upload-content">
                        <div className="upload-icon">📸</div>
                        <h3>{isDisabled ? 'Image Upload Disabled' : 'Upload Your Photo'}</h3>
                        <p>{isDisabled ? 'One image per lottery only' : 'Click to select or drag and drop'}</p>
                        {!isDisabled && (
                            <div className="upload-specs">
                                <span>• Max size: {(maxSize / 1024 / 1024).toFixed(1)}MB</span>
                                <span>• Max dimensions: {maxWidth}x{maxHeight}px</span>
                                <span>• Formats: JPG, PNG, GIF, WebP</span>
                                <span>• Only ONE image allowed per lottery</span>
                            </div>
                        )}
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
                <h4>📝 Tips for your single lottery photo:</h4>
                <ul>
                    <li>Choose your best photo - only one upload allowed per lottery</li>
                    <li>Use good lighting and clear focus</li>
                    <li>Unique and interesting locations are preferred</li>
                    <li>Make sure the image represents the location well</li>
                    <li>You can remove and replace your image before submitting</li>
                </ul>
            </div>
        </div>
    );
}

export default ImageUpload;