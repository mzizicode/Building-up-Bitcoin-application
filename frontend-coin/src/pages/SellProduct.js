// src/pages/SellProduct.js - COMPLETELY FIXED
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function SellProduct() {
    const navigate = useNavigate();
    const [productData, setProductData] = useState({
        title: '',
        description: '',
        price: '',
        category: 'Photography',
        condition: 'NEW',
        quantity: 1,
        location: '',
        isNegotiable: false,
        images: []
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [uploadingImages, setUploadingImages] = useState(false);

    // 🛠️ FIXED: Handle image upload properly
    const handleImageUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setUploadingImages(true);
        setError('');

        try {
            const authToken = localStorage.getItem('authToken');
            if (!authToken) {
                alert('Please sign in to upload images');
                navigate('/signin');
                return;
            }

            // Upload images to marketplace endpoint
            const formData = new FormData();
            files.forEach(file => {
                formData.append('images', file);
            });

            console.log('🖼️ Uploading', files.length, 'images...');

            const response = await fetch('http://localhost:8080/api/marketplace/items/upload-images', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                    // Don't set Content-Type for FormData
                },
                body: formData
            });

            const result = await response.json();
            console.log('📸 Image upload response:', result);

            if (response.ok && result.success) {
                setProductData(prev => ({
                    ...prev,
                    images: [...prev.images, ...result.imageUrls]
                }));
                console.log('✅ Images uploaded successfully:', result.imageUrls);
            } else {
                throw new Error(result.message || 'Image upload failed');
            }

        } catch (error) {
            console.error('🔴 Image upload error:', error);
            setError('Failed to upload images: ' + error.message);
        } finally {
            setUploadingImages(false);
        }
    };

    // 🛠️ FIXED: Handle form submission with proper API call
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            const authToken = localStorage.getItem('authToken');
            if (!authToken) {
                alert('Please sign in to sell products');
                navigate('/signin');
                return;
            }

            // 🛠️ ENHANCED: Validate form data
            if (!productData.title.trim()) {
                throw new Error('Product title is required');
            }
            if (!productData.description.trim()) {
                throw new Error('Product description is required');
            }
            if (!productData.price || parseFloat(productData.price) <= 0) {
                throw new Error('Valid price is required');
            }

            // 🛠️ FIXED: Prepare request data matching backend expectations
            const requestData = {
                title: productData.title.trim(),
                description: productData.description.trim(),
                price: parseFloat(productData.price),
                originalPrice: productData.originalPrice ? parseFloat(productData.originalPrice) : null,
                categoryId: productData.category === 'Photography' ? 1 :
                    productData.category === 'Electronics' ? 2 :
                        productData.category === 'Books' ? 3 :
                            productData.category === 'Travel' ? 4 :
                                productData.category === 'Art' ? 5 : 6,
                condition: productData.condition,
                quantity: parseInt(productData.quantity),
                location: productData.location.trim(),
                isNegotiable: productData.isNegotiable,
                images: productData.images // Array of image URLs
            };

            console.log('📦 Submitting product data:', requestData);

            const response = await fetch('http://localhost:8080/api/marketplace/items', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            const result = await response.json();
            console.log('🛒 Product creation response:', result);

            if (response.ok && result.success) {
                alert('🎉 Product listed successfully!');
                navigate('/marketplace');
            } else {
                throw new Error(result.message || `Server error: ${response.status}`);
            }

        } catch (error) {
            console.error('🔴 Product creation error:', error);
            setError('Failed to create listing: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // 🛠️ NEW: Remove image from list
    const removeImage = (index) => {
        setProductData(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index)
        }));
    };

    // 🛠️ NEW: Handle input changes
    const handleInputChange = (field, value) => {
        setProductData(prev => ({
            ...prev,
            [field]: value
        }));
        setError(''); // Clear error when user types
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            padding: '20px',
            color: 'white'
        }}>
            <div style={{
                maxWidth: '800px',
                margin: '0 auto',
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(15px)',
                borderRadius: '25px',
                padding: '40px',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
            }}>
                <h1 style={{ textAlign: 'center', marginBottom: '30px', fontSize: '2.5rem' }}>
                    📦 Sell Your Product
                </h1>

                <form onSubmit={handleSubmit}>
                    {/* Product Title */}
                    <div style={{ marginBottom: '25px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                            Product Title *
                        </label>
                        <input
                            type="text"
                            value={productData.title}
                            onChange={(e) => handleInputChange('title', e.target.value)}
                            required
                            maxLength="200"
                            style={{
                                width: '100%',
                                padding: '15px',
                                borderRadius: '10px',
                                border: '2px solid rgba(255, 255, 255, 0.3)',
                                background: 'rgba(255, 255, 255, 0.1)',
                                color: 'white',
                                fontSize: '1rem',
                                outline: 'none'
                            }}
                            placeholder="Enter a descriptive product title"
                        />
                    </div>

                    {/* Description */}
                    <div style={{ marginBottom: '25px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                            Description *
                        </label>
                        <textarea
                            value={productData.description}
                            onChange={(e) => handleInputChange('description', e.target.value)}
                            required
                            rows="4"
                            maxLength="1000"
                            style={{
                                width: '100%',
                                padding: '15px',
                                borderRadius: '10px',
                                border: '2px solid rgba(255, 255, 255, 0.3)',
                                background: 'rgba(255, 255, 255, 0.1)',
                                color: 'white',
                                fontSize: '1rem',
                                resize: 'vertical',
                                outline: 'none'
                            }}
                            placeholder="Describe your product in detail..."
                        />
                        <small style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                            {productData.description.length}/1000 characters
                        </small>
                    </div>

                    {/* Price and Category */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                                Price (coins) *
                            </label>
                            <input
                                type="number"
                                value={productData.price}
                                onChange={(e) => handleInputChange('price', e.target.value)}
                                required
                                min="1"
                                step="1"
                                style={{
                                    width: '100%',
                                    padding: '15px',
                                    borderRadius: '10px',
                                    border: '2px solid rgba(255, 255, 255, 0.3)',
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    color: 'white',
                                    fontSize: '1rem',
                                    outline: 'none'
                                }}
                                placeholder="Set price in coins"
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                                Category
                            </label>
                            <select
                                value={productData.category}
                                onChange={(e) => handleInputChange('category', e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '15px',
                                    borderRadius: '10px',
                                    border: '2px solid rgba(255, 255, 255, 0.3)',
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    color: 'white',
                                    fontSize: '1rem',
                                    outline: 'none'
                                }}
                            >
                                <option value="Photography">📸 Photography</option>
                                <option value="Electronics">🔌 Electronics</option>
                                <option value="Books">📚 Books</option>
                                <option value="Travel">✈️ Travel</option>
                                <option value="Art">🎨 Art & Crafts</option>
                                <option value="Sports">⚽ Sports & Recreation</option>
                            </select>
                        </div>
                    </div>

                    {/* Condition and Quantity */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                                Condition
                            </label>
                            <select
                                value={productData.condition}
                                onChange={(e) => handleInputChange('condition', e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '15px',
                                    borderRadius: '10px',
                                    border: '2px solid rgba(255, 255, 255, 0.3)',
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    color: 'white',
                                    fontSize: '1rem',
                                    outline: 'none'
                                }}
                            >
                                <option value="NEW">🆕 Brand New</option>
                                <option value="USED_LIKE_NEW">✨ Used - Like New</option>
                                <option value="USED_GOOD">👍 Used - Good</option>
                                <option value="USED_FAIR">👌 Used - Fair</option>
                                <option value="FOR_PARTS">🔧 For Parts/Repair</option>
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                                Quantity
                            </label>
                            <input
                                type="number"
                                value={productData.quantity}
                                onChange={(e) => handleInputChange('quantity', e.target.value)}
                                required
                                min="1"
                                max="999"
                                style={{
                                    width: '100%',
                                    padding: '15px',
                                    borderRadius: '10px',
                                    border: '2px solid rgba(255, 255, 255, 0.3)',
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    color: 'white',
                                    fontSize: '1rem',
                                    outline: 'none'
                                }}
                            />
                        </div>
                    </div>

                    {/* Location */}
                    <div style={{ marginBottom: '25px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                            Location (Optional)
                        </label>
                        <input
                            type="text"
                            value={productData.location}
                            onChange={(e) => handleInputChange('location', e.target.value)}
                            maxLength="200"
                            style={{
                                width: '100%',
                                padding: '15px',
                                borderRadius: '10px',
                                border: '2px solid rgba(255, 255, 255, 0.3)',
                                background: 'rgba(255, 255, 255, 0.1)',
                                color: 'white',
                                fontSize: '1rem',
                                outline: 'none'
                            }}
                            placeholder="e.g., Bangkok, Thailand"
                        />
                    </div>

                    {/* Negotiable Checkbox */}
                    <div style={{ marginBottom: '25px' }}>
                        <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            cursor: 'pointer',
                            fontSize: '1rem'
                        }}>
                            <input
                                type="checkbox"
                                checked={productData.isNegotiable}
                                onChange={(e) => handleInputChange('isNegotiable', e.target.checked)}
                                style={{
                                    marginRight: '10px',
                                    width: '18px',
                                    height: '18px',
                                    cursor: 'pointer'
                                }}
                            />
                            💬 Price is negotiable
                        </label>
                    </div>

                    {/* Image Upload */}
                    <div style={{ marginBottom: '25px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                            Product Images
                        </label>
                        <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleImageUpload}
                            disabled={uploadingImages}
                            style={{
                                width: '100%',
                                padding: '15px',
                                borderRadius: '10px',
                                border: '2px solid rgba(255, 255, 255, 0.3)',
                                background: 'rgba(255, 255, 255, 0.1)',
                                color: 'white',
                                fontSize: '1rem',
                                cursor: uploadingImages ? 'not-allowed' : 'pointer'
                            }}
                        />

                        {uploadingImages && (
                            <div style={{
                                marginTop: '10px',
                                color: '#ffd700',
                                fontSize: '0.9rem'
                            }}>
                                📤 Uploading images to S3...
                            </div>
                        )}

                        {/* Image previews */}
                        {productData.images.length > 0 && (
                            <div style={{ marginTop: '20px' }}>
                                <h4 style={{ marginBottom: '15px' }}>
                                    📸 Uploaded Images ({productData.images.length})
                                </h4>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                                    gap: '15px'
                                }}>
                                    {productData.images.map((imgUrl, index) => (
                                        <div key={index} style={{ position: 'relative' }}>
                                            <img
                                                src={imgUrl}
                                                alt={`Product ${index + 1}`}
                                                style={{
                                                    width: '100%',
                                                    height: '120px',
                                                    objectFit: 'cover',
                                                    borderRadius: '10px',
                                                    border: '2px solid rgba(255, 255, 255, 0.3)'
                                                }}
                                                onError={(e) => {
                                                    console.error('Failed to load image:', imgUrl);
                                                    e.target.style.display = 'none';
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeImage(index)}
                                                style={{
                                                    position: 'absolute',
                                                    top: '5px',
                                                    right: '5px',
                                                    background: 'rgba(255, 0, 0, 0.8)',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '50%',
                                                    width: '25px',
                                                    height: '25px',
                                                    cursor: 'pointer',
                                                    fontSize: '14px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                                title="Remove image"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div style={{
                            background: 'rgba(239, 68, 68, 0.2)',
                            color: '#ff6b6b',
                            padding: '15px',
                            borderRadius: '10px',
                            marginBottom: '25px',
                            border: '2px solid rgba(239, 68, 68, 0.5)'
                        }}>
                            ⚠️ {error}
                        </div>
                    )}

                    {/* Form Actions */}
                    <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
                        <button
                            type="submit"
                            disabled={isSubmitting || uploadingImages}
                            style={{
                                flex: 1,
                                background: isSubmitting ? 'rgba(16, 185, 129, 0.5)' : 'linear-gradient(135deg, #10b981, #059669)',
                                border: 'none',
                                color: 'white',
                                padding: '18px',
                                borderRadius: '25px',
                                fontSize: '1.1rem',
                                fontWeight: 'bold',
                                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                transition: 'all 0.3s ease',
                                textTransform: 'uppercase',
                                letterSpacing: '1px'
                            }}
                        >
                            {isSubmitting ? '📤 Creating Listing...' : '🚀 List Product'}
                        </button>

                        <button
                            type="button"
                            onClick={() => navigate('/marketplace')}
                            disabled={isSubmitting}
                            style={{
                                background: 'rgba(255, 255, 255, 0.2)',
                                border: '2px solid rgba(255, 255, 255, 0.3)',
                                color: 'white',
                                padding: '18px 30px',
                                borderRadius: '25px',
                                fontSize: '1.1rem',
                                fontWeight: 'bold',
                                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            Cancel
                        </button>
                    </div>

                    {/* Help Text */}
                    <div style={{
                        marginTop: '25px',
                        padding: '20px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '15px',
                        fontSize: '0.9rem',
                        lineHeight: '1.6'
                    }}>
                        <h4 style={{ marginBottom: '10px', color: '#ffd700' }}>💡 Tips for Better Sales</h4>
                        <ul style={{ margin: 0, paddingLeft: '20px' }}>
                            <li>Use clear, high-quality photos from multiple angles</li>
                            <li>Write detailed descriptions including size, condition, and features</li>
                            <li>Set competitive prices by checking similar items</li>
                            <li>Be honest about condition to build trust with buyers</li>
                            <li>Respond quickly to buyer questions and offers</li>
                        </ul>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default SellProduct;