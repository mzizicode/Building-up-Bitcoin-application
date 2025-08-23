// Dashboard.js - Enhanced with Wallet Integration and Fixed Authentication
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ImageUpload from './ImageUpload';
import './Dashboard.css';

function Dashboard() {
    const navigate = useNavigate();
    const [userData, setUserData] = useState(null);
    const [uploadedImage, setUploadedImage] = useState(null);
    const [photoDescription, setPhotoDescription] = useState('');
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [userSubmissions, setUserSubmissions] = useState([]);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
    const [deletingPhotoId, setDeletingPhotoId] = useState(null);
    const [error, setError] = useState('');
    const [realUserId, setRealUserId] = useState(null);
    const [walletBalance, setWalletBalance] = useState(0);
    const [showWalletPreview, setShowWalletPreview] = useState(false);

    useEffect(() => {
        initializeUser();
        loadWalletBalance();
    }, [navigate]);

    // Load wallet balance
    const loadWalletBalance = async () => {
        try {
            const authToken = localStorage.getItem('authToken');
            if (!authToken) {
                console.log('No auth token found for wallet balance');
                return;
            }

            const response = await fetch('http://localhost:8080/api/wallet/balance', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.wallet) {
                    setWalletBalance(data.wallet.balance || 0);
                }
            } else if (response.status === 401) {
                console.log('Auth token invalid for wallet balance');
                // Don't redirect here, just log the issue
            }
        } catch (error) {
            console.error('Failed to load wallet balance:', error);
        }
    };

    // ✅ FIXED: Simplified user initialization
    const initializeUser = async () => {
        const storedUserData = localStorage.getItem('userData');

        if (storedUserData) {
            const user = JSON.parse(storedUserData);
            setUserData(user);

            // ✅ Use the user ID from localStorage (set during login)
            if (user.id) {
                setRealUserId(user.id);
                console.log('Using logged-in user ID:', user.id);
                await loadUserPhotos(user.id);
            } else {
                // ✅ Fallback: create/get database user if no ID exists
                await getOrCreateDatabaseUser(user);
            }
        } else {
            navigate('/register');
        }
    };

    // ✅ FIXED: Always load photos using the stored user ID
    const getOrCreateDatabaseUser = async (user) => {
        try {
            console.log('Loading photos for user:', user.email, 'with ID:', user.id);

            // ✅ If we have a user ID from login, use it directly
            if (user.id) {
                setRealUserId(user.id);
                console.log('Using stored user ID:', user.id);
                await loadUserPhotos(user.id);
                return;
            }

            // ✅ Only try to get user by email if no ID exists (rare case)
            const authToken = localStorage.getItem('authToken');
            if (!authToken) {
                console.error('No auth token found');
                navigate('/signin');
                return;
            }

            const getUserResponse = await fetch(`http://localhost:8080/api/users/by-email?email=${encodeURIComponent(user.email)}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                }
            });

            if (getUserResponse.ok) {
                const getUserData = await getUserResponse.json();
                if (getUserData.success && getUserData.user) {
                    const dbUserId = getUserData.user.id;
                    setRealUserId(dbUserId);
                    console.log('Found existing user with ID:', dbUserId);

                    // Update localStorage with the database ID
                    const updatedUserData = { ...user, id: dbUserId };
                    localStorage.setItem('userData', JSON.stringify(updatedUserData));
                    setUserData(updatedUserData);

                    await loadUserPhotos(dbUserId);
                    return;
                }
            } else if (getUserResponse.status === 401) {
                console.error('Authentication failed');
                localStorage.removeItem('userData');
                localStorage.removeItem('authToken');
                navigate('/signin');
                return;
            }

            // ✅ If still no user found, session is invalid
            console.error('User not found in database. Please log in again.');
            setError('User session invalid. Please log in again.');

            // Clear invalid session and redirect
            localStorage.removeItem('userData');
            localStorage.removeItem('authToken');
            navigate('/signin');

        } catch (error) {
            console.error('Database user initialization failed:', error);
            setError('Failed to load user photos. Please try refreshing the page.');

            // Don't use fallback IDs - this causes data loss
            console.log('Error loading user photos, but keeping user session');
        }
    };

    // ✅ IMPROVED: Load user photos with better error handling
    const loadUserPhotos = async (userId) => {
        if (!userId) {
            console.log('No user ID available, skipping photo load');
            setUserSubmissions([]);
            return;
        }

        try {
            console.log('Loading photos for user ID:', userId);

            const authToken = localStorage.getItem('authToken');
            if (!authToken) {
                console.log('No auth token for loading photos');
                setUserSubmissions([]);
                return;
            }

            const response = await fetch(`http://localhost:8080/api/photos/user/${userId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                }
            });

            console.log('Photos API response status:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('Photos API response data:', data);

                if (data.success && data.photos && Array.isArray(data.photos)) {
                    const transformedPhotos = data.photos.map(photo => ({
                        id: photo.id,
                        image: photo.s3Url || photo.image, // Use S3 URL
                        description: photo.description || photo.filename || 'Untitled',
                        uploadDate: new Date(photo.uploadDate).toLocaleDateString(),
                        status: photo.status === 'SUBMITTED' ? 'Submitted' :
                            photo.status === 'WINNER' ? 'Winner' : 'Submitted',
                        user: userData?.name || 'Unknown'
                    }));

                    setUserSubmissions(transformedPhotos);
                    console.log('Successfully loaded', transformedPhotos.length, 'photos from S3');

                    if (transformedPhotos.length > 0) {
                        console.log('Sample photo:', transformedPhotos[0]);
                    }
                } else {
                    console.log('No photos found for user:', userId);
                    setUserSubmissions([]);
                }
            } else if (response.status === 404) {
                console.log('User photos endpoint not found or user has no photos');
                setUserSubmissions([]);
            } else if (response.status === 401) {
                console.error('Authentication failed while loading photos');
                setUserSubmissions([]);
            } else {
                console.error('Failed to load photos, status:', response.status);
                const errorText = await response.text();
                console.error('Error response:', errorText);
                setUserSubmissions([]);
            }
        } catch (error) {
            console.error('Failed to load user photos:', error);
            setError('Failed to load photos from S3. Your photos are safe, but there may be a connection issue.');
            setUserSubmissions([]);
        }
    };

    const handleImageUpload = (imageData) => {
        setUploadedImage(imageData);
        setCurrentStep(2);
        setError('');
    };

    const handleDescriptionSubmit = () => {
        if (photoDescription.trim()) {
            setCurrentStep(3);
            setError('');
        }
    };

    // ✅ FIXED: Photo submission with proper authentication
    const handleFinalSubmit = async () => {
        if (!uploadedImage || !photoDescription.trim()) {
            setError('Missing image or description');
            return;
        }

        if (!realUserId) {
            setError('User session not initialized. Please refresh the page.');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            console.log('Submitting photo with user ID:', realUserId);

            const formData = new FormData();
            formData.append('file', uploadedImage.file);
            formData.append('description', photoDescription.trim());
            formData.append('userId', realUserId.toString());

            // Get the auth token
            const authToken = localStorage.getItem('authToken');
            if (!authToken) {
                setError('Authentication token not found. Please sign in again.');
                setIsSubmitting(false);
                return;
            }

            const response = await fetch('http://localhost:8080/api/photos/submit', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`, // Make sure Bearer prefix is included
                    // Don't set Content-Type for FormData - let browser set it
                },
                body: formData
            });

            const responseText = await response.text();
            console.log('Backend response:', responseText);

            if (response.status === 401) {
                // Token might be expired or invalid
                localStorage.removeItem('authToken');
                localStorage.removeItem('userData');
                setError('Session expired. Please sign in again.');
                navigate('/signin');
                return;
            }

            if (!response.ok) {
                throw new Error(`Server error: ${response.status} - ${responseText}`);
            }

            let result;
            try {
                result = JSON.parse(responseText);
            } catch (parseError) {
                throw new Error('Invalid response from server');
            }

            if (result.success) {
                const newSubmission = {
                    id: result.photo.id,
                    image: result.photo.s3Url,
                    description: photoDescription,
                    uploadDate: new Date().toLocaleDateString(),
                    status: 'Submitted',
                    user: userData.name
                };

                setUserSubmissions(prev => [...prev, newSubmission]);
                setUploadedImage(null);
                setPhotoDescription('');
                setCurrentStep(1);

                // Reload wallet balance after earning coins for photo upload
                loadWalletBalance();

                alert('🎉 Photo submitted successfully to S3! You earned 25 coins! 💰');
            } else {
                throw new Error(result.message || 'Submission failed');
            }

        } catch (error) {
            console.error('Submission error:', error);
            setError(`Failed to submit photo: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetUpload = () => {
        setUploadedImage(null);
        setPhotoDescription('');
        setCurrentStep(1);
        setError('');
    };

    const handleDeletePhoto = (photoId) => {
        setShowDeleteConfirm(photoId);
    };

    const confirmDeletePhoto = async (photoId) => {
        if (!realUserId) {
            setError('User not properly initialized');
            return;
        }

        setDeletingPhotoId(photoId);
        setError('');

        try {
            const authToken = localStorage.getItem('authToken');
            if (!authToken) {
                setError('Authentication token not found. Please sign in again.');
                return;
            }

            const response = await fetch(`http://localhost:8080/api/photos/${photoId}?userId=${realUserId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                }
            });

            if (response.status === 401) {
                localStorage.removeItem('authToken');
                localStorage.removeItem('userData');
                setError('Session expired. Please sign in again.');
                navigate('/signin');
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to delete photo');
            }

            const result = await response.json();

            if (result.success) {
                const updatedSubmissions = userSubmissions.filter(sub => sub.id !== photoId);
                setUserSubmissions(updatedSubmissions);
            } else {
                throw new Error(result.message || 'Delete failed');
            }

        } catch (error) {
            console.error('Delete error:', error);
            setError('Failed to delete photo. Please try again.');
        } finally {
            setShowDeleteConfirm(null);
            setDeletingPhotoId(null);
        }
    };

    const cancelDelete = () => {
        setShowDeleteConfirm(null);
    };

    if (!userData) {
        return <div className="loading">Loading dashboard...</div>;
    }

    return (
        <div className="dashboard-container">
            {/* Header Section with Wallet Integration */}
            <div className="dashboard-header">
                <div className="welcome-section">
                    <h1>Welcome back, {userData.name || userData.fullName}! 👋</h1>
                    <p className="user-info">
                        📍 {userData.country} | 📧 {userData.email}
                        {realUserId && <span> | 🆔 User ID: {realUserId}</span>}
                    </p>
                </div>

                <div className="stats-section">
                    <div className="stat-card">
                        <span className="stat-number">{userSubmissions.length}</span>
                        <span className="stat-label">Photos Submitted</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-number">
                            {userSubmissions.filter(s => s.status === 'Winner').length}
                        </span>
                        <span className="stat-label">Wins</span>
                    </div>

                    {/* 💰 NEW: Wallet Balance Card with Click Action */}
                    <div
                        className="stat-card wallet-card"
                        onClick={() => setShowWalletPreview(!showWalletPreview)}
                        style={{
                            cursor: 'pointer',
                            background: 'linear-gradient(135deg, #ffd700, #ffed4e)',
                            color: '#333',
                            position: 'relative',
                            transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-5px)';
                            e.currentTarget.style.boxShadow = '0 10px 30px rgba(255, 215, 0, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 5px 15px rgba(102, 126, 234, 0.3)';
                        }}
                    >
                        <span className="stat-number">💰 {walletBalance}</span>
                        <span className="stat-label">Coins</span>
                        <div style={{
                            position: 'absolute',
                            top: '5px',
                            right: '10px',
                            fontSize: '10px',
                            opacity: 0.8
                        }}>
                            Click to view
                        </div>
                    </div>
                </div>
            </div>

            {/* 💰 NEW: Wallet Quick Actions Bar */}
            {showWalletPreview && (
                <div style={{
                    background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 237, 78, 0.1))',
                    borderRadius: '20px',
                    padding: '20px',
                    margin: '0 0 30px 0',
                    border: '2px solid #ffd700',
                    animation: 'fadeIn 0.3s ease-in'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '20px'
                    }}>
                        <div>
                            <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>💰 My Wallet</h3>
                            <p style={{ margin: 0, color: '#666' }}>
                                Current Balance: <strong style={{ color: '#f59e0b', fontSize: '1.2rem' }}>{walletBalance} coins</strong>
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            <button
                                onClick={() => window.open('/wallet', '_blank')}
                                style={{
                                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                                    color: 'white',
                                    border: 'none',
                                    padding: '12px 24px',
                                    borderRadius: '10px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.transform = 'translateY(-2px)';
                                    e.target.style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.3)';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.transform = 'translateY(0)';
                                    e.target.style.boxShadow = 'none';
                                }}
                            >
                                💳 Open Wallet Dashboard
                            </button>

                            <button
                                onClick={() => window.open('/marketplace', '_blank')}
                                style={{
                                    background: 'linear-gradient(135deg, #10b981, #059669)',
                                    color: 'white',
                                    border: 'none',
                                    padding: '12px 24px',
                                    borderRadius: '10px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.transform = 'translateY(-2px)';
                                    e.target.style.boxShadow = '0 8px 20px rgba(16, 185, 129, 0.3)';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.transform = 'translateY(0)';
                                    e.target.style.boxShadow = 'none';
                                }}
                            >
                                🛒 Marketplace
                            </button>

                            <button
                                onClick={() => {
                                    setShowWalletPreview(false);
                                }}
                                style={{
                                    background: '#f8f9fa',
                                    color: '#666',
                                    border: '2px solid #e1e8ed',
                                    padding: '12px 24px',
                                    borderRadius: '10px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                ✕ Close
                            </button>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                        gap: '15px',
                        marginTop: '20px'
                    }}>
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.8)',
                            padding: '15px',
                            borderRadius: '10px',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>+25</div>
                            <div style={{ fontSize: '0.9rem', color: '#666' }}>Per Photo Upload</div>
                        </div>
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.8)',
                            padding: '15px',
                            borderRadius: '10px',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#3b82f6' }}>+10</div>
                            <div style={{ fontSize: '0.9rem', color: '#666' }}>Daily Login</div>
                        </div>
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.8)',
                            padding: '15px',
                            borderRadius: '10px',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f59e0b' }}>+50</div>
                            <div style={{ fontSize: '0.9rem', color: '#666' }}>Referral Bonus</div>
                        </div>
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.8)',
                            padding: '15px',
                            borderRadius: '10px',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ef4444' }}>🎰</div>
                            <div style={{ fontSize: '0.9rem', color: '#666' }}>Lottery Wins</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Display */}
            {error && (
                <div style={{
                    background: '#fee',
                    color: '#c53030',
                    padding: '15px',
                    borderRadius: '10px',
                    margin: '0 20px 20px 20px',
                    border: '1px solid #fed7d7'
                }}>
                    ⚠️ {error}
                </div>
            )}

            {/* Main Content */}
            <div className="dashboard-content">
                <div className="upload-section">
                    <div className="section-header">
                        <h2>📸 Submit Your Photo to S3</h2>
                        <div className="progress-indicator">
                            <div className={`step ${currentStep >= 1 ? 'active' : ''}`}>1</div>
                            <div className={`step ${currentStep >= 2 ? 'active' : ''}`}>2</div>
                            <div className={`step ${currentStep >= 3 ? 'active' : ''}`}>3</div>
                        </div>
                    </div>

                    {/* Step 1: Upload Image */}
                    {currentStep === 1 && (
                        <div className="step-content">
                            <h3>Step 1: Upload Your Amazing Photo</h3>
                            <p className="step-description">
                                Choose a high-quality image (max 2MB) - Earn 25 coins! 💰
                            </p>
                            <ImageUpload
                                onImageUpload={handleImageUpload}
                                maxSize={2 * 1024 * 1024}
                                maxWidth={1920}
                                maxHeight={1080}
                            />

                            {/* 💰 NEW: Earn Coins Tip */}
                            <div style={{
                                background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 237, 78, 0.1))',
                                border: '2px solid #ffd700',
                                borderRadius: '10px',
                                padding: '15px',
                                marginTop: '20px',
                                textAlign: 'center'
                            }}>
                                <strong style={{ color: '#f59e0b' }}>💡 Tip:</strong> Each photo upload earns you 25 coins!
                                Use coins in the marketplace or save them for special rewards.
                            </div>
                        </div>
                    )}

                    {/* Step 2: Add Description */}
                    {currentStep === 2 && uploadedImage && (
                        <div className="step-content">
                            <h3>Step 2: Where was this photo taken?</h3>
                            <div className="preview-section">
                                <img
                                    src={uploadedImage.preview}
                                    alt="Upload preview"
                                    className="image-preview"
                                />
                                <div className="image-info">
                                    <p><strong>Size:</strong> {(uploadedImage.file.size / 1024 / 1024).toFixed(2)} MB</p>
                                    <p><strong>Dimensions:</strong> {uploadedImage.width}x{uploadedImage.height}px</p>
                                    <p><strong>Will be uploaded to:</strong> AWS S3</p>
                                    <p style={{ color: '#10b981', fontWeight: 'bold' }}>
                                        <strong>Coins to earn:</strong> 💰 25 coins
                                    </p>
                                </div>
                            </div>

                            <div className="description-input">
                                <label htmlFor="description">Photo Location/Description</label>
                                <input
                                    type="text"
                                    id="description"
                                    placeholder="e.g., Great Wall of China, Sunset at Santorini"
                                    value={photoDescription}
                                    onChange={(e) => setPhotoDescription(e.target.value)}
                                    className="description-field"
                                />
                                <div className="step-buttons">
                                    <button onClick={resetUpload} className="btn-secondary">← Back</button>
                                    <button
                                        onClick={handleDescriptionSubmit}
                                        className="btn-primary"
                                        disabled={!photoDescription.trim()}
                                    >
                                        Continue →
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Final Confirmation */}
                    {currentStep === 3 && uploadedImage && (
                        <div className="step-content">
                            <h3>Step 3: Final Review & Submit to S3</h3>
                            <div className="final-review">
                                <div className="review-card">
                                    <img
                                        src={uploadedImage.preview}
                                        alt="Final preview"
                                        className="final-image-preview"
                                    />
                                    <div className="review-details">
                                        <h4>📍 {photoDescription}</h4>
                                        <p><strong>Submitted by:</strong> {userData.name || userData.fullName}</p>
                                        <p><strong>From:</strong> {userData.country}</p>
                                        <p><strong>Storage:</strong> AWS S3</p>
                                        <p><strong>User ID:</strong> {realUserId || 'Pending...'}</p>
                                        <p style={{
                                            background: 'linear-gradient(135deg, #ffd700, #ffed4e)',
                                            color: '#333',
                                            padding: '10px',
                                            borderRadius: '8px',
                                            fontWeight: 'bold',
                                            marginTop: '10px'
                                        }}>
                                            💰 You'll earn: 25 coins
                                        </p>
                                    </div>
                                </div>

                                <div className="final-buttons">
                                    <button onClick={() => setCurrentStep(2)} className="btn-secondary">← Edit</button>
                                    <button
                                        onClick={handleFinalSubmit}
                                        className={`btn-submit ${isSubmitting ? 'loading' : ''}`}
                                        disabled={isSubmitting || !realUserId}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <span className="spinner"></span>
                                                Uploading to S3...
                                            </>
                                        ) : !realUserId ? (
                                            '⏳ Initializing...'
                                        ) : (
                                            '☁️ Submit & Earn 25 Coins'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* My Submissions Section */}
                <div className="submissions-section">
                    <div className="submissions-header">
                        <h2>📋 My S3 Photos</h2>
                        <span className="submissions-count">{userSubmissions.length} photo{userSubmissions.length !== 1 ? 's' : ''}</span>
                    </div>

                    {userSubmissions.length === 0 ? (
                        <div className="empty-state">
                            <span className="empty-icon">☁️</span>
                            <p>No S3 photos yet. Upload your first photo above!</p>
                            <p style={{ fontSize: '0.9rem', color: '#10b981', marginTop: '10px' }}>
                                Earn 25 coins per photo! 💰
                            </p>
                        </div>
                    ) : (
                        <div className="submissions-grid">
                            {userSubmissions.map((submission) => (
                                <div key={submission.id} className="submission-card">
                                    <img
                                        src={submission.image}
                                        alt={submission.description}
                                        className="submission-image"
                                        onError={(e) => {
                                            console.error('Failed to load S3 image:', submission.image);
                                            e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA4MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yNSAyMkgyOVYyNkgyNVYyMlpNMzUgMjJIMzlWMjZIMzVWMjJaTTI1IDI4SDI5VjMySDI1VjI4Wk0zNSAyOEgzOVYzMkgzNVYyOFoiIGZpbGw9IiNEMUQ1REIiLz4KPHRleHQgeD0iNDAiIHk9IjM1IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iOCIgZmlsbD0iIzlDQTNBRiI+SW1hZ2UgRmFpbGVkPC90ZXh0Pgo8L3N2Zz4K';
                                        }}
                                    />
                                    <div className="submission-info">
                                        <h4>{submission.description}</h4>
                                        <p className="submission-date">{submission.uploadDate}</p>
                                        <div className="submission-status">
                                            <span className={`status ${submission.status.toLowerCase()}`}>
                                                {submission.status}
                                                {submission.status === 'Winner' && ' 🏆'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="submission-actions">
                                        <button
                                            className="action-btn edit-btn"
                                            onClick={() => alert('Edit feature coming soon!')}
                                            title="Edit photo details"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            className="action-btn delete-btn"
                                            onClick={() => handleDeletePhoto(submission.id)}
                                            disabled={deletingPhotoId === submission.id}
                                            title="Delete from S3"
                                        >
                                            {deletingPhotoId === submission.id ? (
                                                <span className="mini-spinner"></span>
                                            ) : (
                                                '🗑️'
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="delete-modal-overlay" onClick={cancelDelete}>
                    <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="delete-modal-header">
                            <h3>🗑️ Delete S3 Photo</h3>
                        </div>
                        <div className="delete-modal-content">
                            <p>Are you sure you want to delete this photo from S3?</p>
                            <div className="photo-to-delete">
                                {userSubmissions.find(sub => sub.id === showDeleteConfirm) && (
                                    <>
                                        <img
                                            src={userSubmissions.find(sub => sub.id === showDeleteConfirm).image}
                                            alt={userSubmissions.find(sub => sub.id === showDeleteConfirm).description}
                                            className="delete-preview-image"
                                        />
                                        <div className="delete-photo-info">
                                            <strong>📍 {userSubmissions.find(sub => sub.id === showDeleteConfirm).description}</strong>
                                            <p>Uploaded: {userSubmissions.find(sub => sub.id === showDeleteConfirm).uploadDate}</p>
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="delete-warning">
                                <span className="warning-icon">⚠️</span>
                                <p>This will permanently remove the photo from AWS S3 and the lottery.</p>
                            </div>
                        </div>
                        <div className="delete-modal-actions">
                            <button className="btn-cancel" onClick={cancelDelete}>Cancel</button>
                            <button
                                className="btn-delete"
                                onClick={() => confirmDeletePhoto(showDeleteConfirm)}
                                disabled={deletingPhotoId === showDeleteConfirm}
                            >
                                {deletingPhotoId === showDeleteConfirm ? (
                                    <>
                                        <span className="spinner"></span>
                                        Deleting from S3...
                                    </>
                                ) : (
                                    'Delete Photo'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Dashboard;