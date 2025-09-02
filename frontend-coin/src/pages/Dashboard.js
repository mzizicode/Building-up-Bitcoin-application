import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css"
/**
 * Dashboard Component - FIXED for S3 Image Loading
 * Handles photo uploads to S3, user submissions management, and wallet access
 */

const API_BASE = "http://localhost:8080";

export default function Dashboard() {
    const navigate = useNavigate();

    // User state
    const [userData, setUserData] = useState(null);
    const [userId, setUserId] = useState(null);
    const [walletBalance, setWalletBalance] = useState(0);

    // Upload workflow state
    const [currentStep, setCurrentStep] = useState(1);
    const [uploadedImage, setUploadedImage] = useState(null);
    const [photoDescription, setPhotoDescription] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Data state
    const [userSubmissions, setUserSubmissions] = useState([]);
    const [hasActiveSubmission, setHasActiveSubmission] = useState(false);
    const [submissionStats, setSubmissionStats] = useState(null);

    // UI state
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [showDeleteModal, setShowDeleteModal] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    useEffect(() => {
        initializeDashboard();
    }, []);

    /**
     * Initialize dashboard data
     */
    async function initializeDashboard() {
        const storedUserData = localStorage.getItem("userData");
        const authToken = localStorage.getItem("authToken");

        if (!storedUserData || !authToken) {
            navigate("/signin");
            return;
        }

        try {
            const user = JSON.parse(storedUserData);
            setUserData(user);
            setUserId(user.id);

            await Promise.all([
                loadUserPhotos(user.id),
                loadWalletBalance(),
                checkSubmissionStatus(user.id)
            ]);
        } catch (error) {
            console.error("Dashboard initialization error:", error);
            navigate("/signin");
        } finally {
            setIsLoading(false);
        }
    }

    /**
     * Get authorization headers
     */
    function getAuthHeaders() {
        const token = localStorage.getItem("authToken");
        return {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        };
    }

    /**
     * Load user's photos from backend
     */
    async function loadUserPhotos(userId) {
        try {
            const response = await fetch(`${API_BASE}/api/photos/user/${userId}`, {
                headers: getAuthHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                const photos = data.photos || [];
                setUserSubmissions(photos.map(formatPhotoData));
            }
        } catch (error) {
            console.error("Failed to load photos:", error);
        }
    }

    /**
     * Load wallet balance with improved error handling
     */
    async function loadWalletBalance() {
        try {
            const response = await fetch(`${API_BASE}/api/wallet/balance`, {
                headers: getAuthHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                const balance = data?.wallet?.balance || 0;
                setWalletBalance(balance);
                localStorage.setItem("walletBalance", String(balance));

                // Return success indicator for validation
                return { success: true, balance };
            } else {
                // Return failure but don't throw - use cached value
                const cached = localStorage.getItem("walletBalance");
                setWalletBalance(cached ? parseInt(cached, 10) : 0);

                return {
                    success: false,
                    balance: cached ? parseInt(cached, 10) : 0,
                    cached: true
                };
            }
        } catch (error) {
            console.error("Failed to load wallet:", error);
            // Use cached value as fallback
            const cached = localStorage.getItem("walletBalance");
            setWalletBalance(cached ? parseInt(cached, 10) : 0);

            return {
                success: false,
                balance: cached ? parseInt(cached, 10) : 0,
                cached: true,
                error: error.message
            };
        }
    }

    /**
     * Check if user has active submission
     */
    async function checkSubmissionStatus(userId) {
        try {
            const response = await fetch(`${API_BASE}/api/photos/check-user-submission/${userId}`, {
                headers: getAuthHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                setHasActiveSubmission(data.hasExistingSubmission || false);
                setSubmissionStats(data);
            }
        } catch (error) {
            console.error("Failed to check submission status:", error);
        }
    }

    /**
     * Format photo data from backend
     */
    function formatPhotoData(photo) {
        return {
            id: photo.id,
            image: photo.s3Url || photo.image,
            description: photo.description || "Untitled",
            uploadDate: photo.uploadDate ? new Date(photo.uploadDate).toLocaleDateString() : "Unknown",
            status: photo.isWinner ? "Winner" : "Submitted",
            coinsEarned: photo.coinsEarned || 0
        };
    }

    /**
     * Handle image selection
     */
    function handleImageSelect(event) {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file
        if (!file.type.startsWith("image/")) {
            setError("Please select a valid image file");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setError("Image size must be less than 5MB");
            return;
        }

        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
            setUploadedImage({
                file: file,
                preview: e.target.result,
                name: file.name,
                size: file.size
            });
            setCurrentStep(2);
            setError("");
        };
        reader.readAsDataURL(file);
    }

    /**
     * Submit photo to S3 backend with improved transaction validation
     */
    async function submitPhoto() {
        if (!uploadedImage?.file || !photoDescription.trim()) {
            setError("Please provide both image and description");
            return;
        }

        if (hasActiveSubmission) {
            setError("You already have an active submission. Delete it first.");
            return;
        }

        setIsSubmitting(true);
        setError("");

        try {
            const formData = new FormData();
            formData.append("file", uploadedImage.file);
            formData.append("description", photoDescription.trim());

            const response = await fetch(`${API_BASE}/api/photos/submit`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("authToken")}`
                },
                body: formData
            });

            if (response.status === 401) {
                localStorage.clear();
                navigate("/signin");
                return;
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Upload failed");
            }

            const data = await response.json();

            if (data.success) {
                // Check if coins were actually awarded
                const coinsEarned = data.coinsAwarded ? data.coinsEarned : 0;
                const walletStatus = data.coinsAwarded ? "earned" : "pending";

                // Display appropriate success message
                if (data.coinsAwarded) {
                    setSuccess(`Photo uploaded successfully! You earned ${coinsEarned} coins.`);
                } else {
                    setSuccess("Photo uploaded successfully! Coin reward is pending.");
                    console.warn("Wallet update failed, but photo was uploaded");
                }

                // Update local state
                const newSubmission = formatPhotoData(data.photo);
                setUserSubmissions([newSubmission, ...userSubmissions]);
                setHasActiveSubmission(true);

                // Reset form
                setUploadedImage(null);
                setPhotoDescription("");
                setCurrentStep(1);

                // IMPROVED: Validate wallet update separately
                const walletUpdatePromises = [];

                // Load wallet with error handling
                walletUpdatePromises.push(
                    loadWalletBalance().catch(err => {
                        console.warn("Failed to refresh wallet balance:", err);
                        return { success: false, error: err.message };
                    })
                );

                // Check submission status with error handling
                walletUpdatePromises.push(
                    checkSubmissionStatus(userId).catch(err => {
                        console.warn("Failed to refresh submission status:", err);
                        return { success: false, error: err.message };
                    })
                );

                // Wait for all updates but don't fail if wallet update fails
                const results = await Promise.allSettled(walletUpdatePromises);

                // Log any failures for debugging
                results.forEach((result, index) => {
                    if (result.status === 'rejected') {
                        console.error(`Background update ${index} failed:`, result.reason);
                    }
                });

                // If wallet didn't update, show additional info
                if (!data.coinsAwarded) {
                    setTimeout(() => {
                        setError("");
                        setSuccess("Photo is in the lottery! Check your wallet later for coin rewards.");
                    }, 3000);
                }
            }
        } catch (error) {
            setError(error.message || "Failed to upload photo");
        } finally {
            setIsSubmitting(false);
        }
    }

    /**
     * Delete photo with improved coin reversal handling
     */
    async function deletePhoto(photoId) {
        setDeletingId(photoId);

        try {
            const response = await fetch(`${API_BASE}/api/photos/${photoId}`, {
                method: "DELETE",
                headers: getAuthHeaders()
            });

            const data = await response.json();

            // Handle insufficient balance for coin reversal
            if (response.status === 400 && data.errorCode === "INSUFFICIENT_BALANCE") {
                setError(`Cannot delete photo: You need ${data.coinsRequired} coins in your wallet to reverse the reward.`);
                setDeletingId(null);
                setShowDeleteModal(null);
                return;
            }

            if (response.ok || response.status === 404) {
                // Check if coins were actually reversed
                const coinsReversed = data.coinsReversed || false;
                const coinsDeducted = data.coinsDeducted || 0;

                // Update local state
                setUserSubmissions(userSubmissions.filter(p => p.id !== photoId));
                setHasActiveSubmission(false);

                // Show appropriate success message
                if (coinsReversed && coinsDeducted > 0) {
                    setSuccess(`Photo deleted successfully. ${coinsDeducted} coins were deducted from your wallet.`);
                } else if (data.wasInDraw && !coinsReversed) {
                    setSuccess("Photo deleted. Coin reversal is pending - check your wallet later.");
                    console.warn("Coin reversal failed, but photo was deleted");
                } else {
                    setSuccess("Photo deleted successfully");
                }

                // IMPROVED: Refresh data with error handling
                const refreshPromises = [
                    checkSubmissionStatus(userId).catch(err => {
                        console.warn("Failed to refresh submission status:", err);
                        return { success: false };
                    })
                ];

                // Only refresh wallet if coins were involved
                if (data.wasInDraw) {
                    refreshPromises.push(
                        loadWalletBalance().catch(err => {
                            console.warn("Failed to refresh wallet after deletion:", err);
                            return { success: false };
                        })
                    );
                }

                await Promise.allSettled(refreshPromises);
            } else {
                setError(data.message || "Failed to delete photo");
            }
        } catch (error) {
            setError("Failed to delete photo. Please try again.");
            console.error("Delete error:", error);
        } finally {
            setDeletingId(null);
            setShowDeleteModal(null);
        }
    }

    /**
     * Navigate to wallet
     */
    function goToWallet() {
        navigate("/wallet");
    }

    /**
     * FIXED: Handle S3 image loading errors with better fallback
     */
    function handleImageError(e, imageUrl) {
        console.error('Dashboard S3 image failed to load:', imageUrl);

        // Set a clean fallback image
        e.target.style.background = 'linear-gradient(135deg, #e2e8f0, #cbd5e1)';
        e.target.style.display = 'flex';
        e.target.style.alignItems = 'center';
        e.target.style.justifyContent = 'center';
        e.target.style.color = '#64748b';
        e.target.style.fontSize = '14px';
        e.target.style.fontWeight = '500';
        e.target.innerHTML = '<div style="text-align: center;"><div style="font-size: 24px; margin-bottom: 8px;">📸</div>Image Loading...</div>';

        // Try loading without CORS as fallback
        setTimeout(() => {
            const img = new Image();
            img.onload = () => {
                e.target.src = imageUrl;
                e.target.style.background = 'none';
                e.target.innerHTML = '';
                e.target.style.display = 'block';
            };
            img.onerror = () => {
                e.target.innerHTML = '<div style="text-align: center;"><div style="font-size: 24px; margin-bottom: 8px;">⚠️</div>Image Failed</div>';
            };
            img.src = imageUrl;
        }, 1000);
    }

    if (isLoading) {
        return (
            <div className="dashboard-container">
                <div className="loading">
                    <div className="spinner"></div>
                    <p>Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            {/* Header Section */}
            <div className="dashboard-header">
                <div className="welcome-section">
                    <h1>Welcome, {userData?.name || "User"}!</h1>
                    <p className="user-info">
                        {userData?.email} • {userData?.country}
                    </p>
                </div>

                <div className="stats-section">
                    <div className="stat-card">
                        <span className="stat-number">{userSubmissions.length}</span>
                        <span className="stat-label">Photos</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-number">{walletBalance}</span>
                        <span className="stat-label">Coins</span>
                    </div>
                    <button className="wallet-btn" onClick={goToWallet}>
                        💳 Wallet
                    </button>
                </div>
            </div>

            {/* Messages */}
            {error && (
                <div className="alert error">
                    ⚠️ {error}
                </div>
            )}
            {success && (
                <div className="alert success">
                    ✅ {success}
                </div>
            )}

            <div className="dashboard-content">
                {/* Upload Section */}
                <div className="upload-section">
                    <div className="section-header">
                        <h2>Submit Photo to S3</h2>
                        <div className="progress-indicator">
                            <div className={`step ${currentStep >= 1 ? 'active' : ''}`}>1</div>
                            <div className={`step ${currentStep >= 2 ? 'active' : ''}`}>2</div>
                            <div className={`step ${currentStep >= 3 ? 'active' : ''}`}>3</div>
                        </div>
                    </div>

                    <div className="step-content">
                        {/* Step 1: Upload */}
                        {currentStep === 1 && (
                            <div>
                                <h3>Step 1: Select Photo</h3>
                                <p className="step-description">
                                    Choose a photo to upload to Amazon S3
                                </p>

                                {hasActiveSubmission ? (
                                    <div className="warning-box">
                                        ⚠️ You have an active submission. Delete it to upload a new photo.
                                    </div>
                                ) : (
                                    <div className="upload-area">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageSelect}
                                            id="photo-upload"
                                            style={{ display: 'none' }}
                                        />
                                        <label htmlFor="photo-upload" className="upload-label">
                                            <div className="upload-icon">📸</div>
                                            <p>Click to select photo</p>
                                            <small>Max size: 5MB • JPG, PNG, GIF</small>
                                        </label>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step 2: Description */}
                        {currentStep === 2 && uploadedImage && (
                            <div>
                                <h3>Step 2: Add Description</h3>
                                <div className="preview-section">
                                    <img
                                        src={uploadedImage.preview}
                                        alt="Preview"
                                        className="image-preview"
                                    />
                                    <div className="image-info">
                                        <p><strong>File:</strong> {uploadedImage.name}</p>
                                        <p><strong>Size:</strong> {(uploadedImage.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                </div>

                                <div className="description-input">
                                    <label>Photo Description</label>
                                    <textarea
                                        className="description-field"
                                        rows="4"
                                        placeholder="Describe your photo..."
                                        value={photoDescription}
                                        onChange={(e) => setPhotoDescription(e.target.value)}
                                        maxLength="200"
                                    />
                                    <small>{photoDescription.length}/200 characters</small>
                                </div>

                                <div className="step-buttons">
                                    <button
                                        className="btn-secondary"
                                        onClick={() => setCurrentStep(1)}
                                    >
                                        Back
                                    </button>
                                    <button
                                        className="btn-primary"
                                        onClick={() => setCurrentStep(3)}
                                        disabled={!photoDescription.trim()}
                                    >
                                        Review
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Review & Submit */}
                        {currentStep === 3 && uploadedImage && (
                            <div className="final-review">
                                <h3>Step 3: Review & Submit</h3>
                                <div className="review-card">
                                    <img
                                        src={uploadedImage.preview}
                                        alt="Final preview"
                                        className="final-image-preview"
                                    />
                                    <div className="review-details">
                                        <h4>Ready to Submit</h4>
                                        <p><strong>Description:</strong> {photoDescription}</p>
                                        <p><strong>Destination:</strong> Amazon S3</p>
                                        <p><strong>Lottery Entry:</strong> Automatic</p>
                                    </div>
                                </div>

                                <div className="final-buttons">
                                    <button
                                        className="btn-secondary"
                                        onClick={() => setCurrentStep(2)}
                                    >
                                        Back
                                    </button>
                                    <button
                                        className="btn-submit"
                                        onClick={submitPhoto}
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <span className="spinner"></span>
                                                Uploading to S3...
                                            </>
                                        ) : (
                                            'Submit to Lottery'
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Submissions Section */}
                <div className="submissions-section">
                    <div className="submissions-header">
                        <h2>My Submissions</h2>
                        <span className="submissions-count">{userSubmissions.length}</span>
                    </div>

                    {userSubmissions.length === 0 ? (
                        <div className="empty-state">
                            <span className="empty-icon">📷</span>
                            <p>No photos uploaded yet</p>
                        </div>
                    ) : (
                        <div className="submissions-grid">
                            {userSubmissions.map(submission => (
                                <div key={submission.id} className="submission-card">
                                    <img
                                        src={submission.image}
                                        alt={submission.description}
                                        className="submission-image"
                                        crossOrigin=""
                                        onError={(e) => handleImageError(e, submission.image)}
                                    />
                                    <div className="submission-info">
                                        <h4>{submission.description}</h4>
                                        <p className="submission-date">{submission.uploadDate}</p>
                                        <div className="submission-status">
                                            <span className={`status ${submission.status.toLowerCase()}`}>
                                                {submission.status}
                                            </span>
                                            {submission.coinsEarned > 0 && (
                                                <span className="coins-earned">
                                                    +{submission.coinsEarned} coins
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="submission-actions">
                                        <button
                                            className="delete-btn"
                                            onClick={() => setShowDeleteModal(submission.id)}
                                            disabled={deletingId === submission.id}
                                        >
                                            {deletingId === submission.id ? (
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
            {showDeleteModal && (
                <div className="delete-modal-overlay" onClick={() => setShowDeleteModal(null)}>
                    <div className="delete-modal" onClick={e => e.stopPropagation()}>
                        <div className="delete-modal-header">
                            <h3>Delete Photo?</h3>
                        </div>
                        <div className="delete-modal-content">
                            <p>This will permanently remove your photo from the lottery.</p>
                            <div className="delete-modal-actions">
                                <button
                                    className="btn-cancel"
                                    onClick={() => setShowDeleteModal(null)}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="btn-delete"
                                    onClick={() => deletePhoto(showDeleteModal)}
                                    disabled={deletingId === showDeleteModal}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .wallet-btn {
                    background: linear-gradient(135deg, #ffd700, #ffed4e);
                    color: #333;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 12px;
                    font-size: 1.1rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3);
                }

                .wallet-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(255, 215, 0, 0.4);
                }

                .alert {
                    padding: 15px 20px;
                    border-radius: 10px;
                    margin: 20px 0;
                    font-weight: 500;
                    animation: slideDown 0.3s ease;
                }

                .alert.error {
                    background: #fee;
                    color: #c53030;
                    border: 1px solid #feb2b2;
                }

                .alert.success {
                    background: #f0fdf4;
                    color: #065f46;
                    border: 1px solid #86efac;
                }

                .warning-box {
                    background: #fef3c7;
                    color: #92400e;
                    padding: 20px;
                    border-radius: 10px;
                    border: 1px solid #fbbf24;
                    margin: 20px 0;
                    text-align: center;
                }

                .upload-area {
                    margin: 30px 0;
                }

                .upload-label {
                    display: block;
                    border: 3px dashed #d1d5db;
                    border-radius: 20px;
                    padding: 60px 20px;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    background: #f9fafb;
                }

                .upload-label:hover {
                    border-color: #667eea;
                    background: #f0f9ff;
                }

                .upload-icon {
                    font-size: 4rem;
                    margin-bottom: 10px;
                }

                .coins-earned {
                    color: #10b981;
                    font-weight: 600;
                    margin-left: 10px;
                }

                @keyframes slideDown {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </div>
    );
}