// src/pages/Dashboard.js

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

const API_BASE = "http://localhost:8080";

export default function Dashboard() {
    const navigate = useNavigate();
    const [userData, setUserData] = useState(null);
    const [userId, setUserId] = useState(null);
    const [walletBalance, setWalletBalance] = useState(0);

    const [currentStep, setCurrentStep] = useState(1);
    const [uploadedImage, setUploadedImage] = useState(null);
    const [photoDescription, setPhotoDescription] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [userSubmissions, setUserSubmissions] = useState([]);
    const [hasActiveSubmission, setHasActiveSubmission] = useState(false);
    const [submissionStats, setSubmissionStats] = useState(null);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [showDeleteModal, setShowDeleteModal] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    useEffect(() => {
        initializeDashboard();
    }, []);

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
                checkSubmissionStatus(user.id),
            ]);
        } catch (error) {
            console.error("Dashboard init error:", error);
            navigate("/signin");
        } finally {
            setIsLoading(false);
        }
    }

    function getAuthHeaders() {
        const token = localStorage.getItem("authToken");
        return {
            Authorization: `Bearer ${token}`,
        };
    }

    async function loadUserPhotos(userId) {
        try {
            const res = await fetch(`${API_BASE}/api/photos/user/${userId}`, {
                headers: getAuthHeaders(),
            });
            if (res.ok) {
                const data = await res.json();
                const photos = data.photos || [];
                setUserSubmissions(photos.map(formatPhotoData));
            }
        } catch (e) {
            console.error("Photos load failed", e);
        }
    }

    async function loadWalletBalance() {
        try {
            const res = await fetch(`${API_BASE}/api/wallet/balance`, {
                headers: getAuthHeaders(),
            });
            if (res.ok) {
                const data = await res.json();
                const balance = data?.wallet?.balance || 0;
                setWalletBalance(balance);
                localStorage.setItem("walletBalance", String(balance));
            }
        } catch {
            const fallback = localStorage.getItem("walletBalance");
            setWalletBalance(fallback ? parseInt(fallback) : 0);
        }
    }

    async function checkSubmissionStatus(userId) {
        try {
            const res = await fetch(`${API_BASE}/api/photos/check-user-submission/${userId}`, {
                headers: getAuthHeaders(),
            });
            if (res.ok) {
                const data = await res.json();
                setHasActiveSubmission(data.hasExistingSubmission || false);
                setSubmissionStats(data);
            }
        } catch (e) {
            console.error("Check submission status failed", e);
        }
    }

    function formatPhotoData(photo) {
        return {
            id: photo.id,
            image: photo.s3Url || photo.image,
            description: photo.description || "Untitled",
            uploadDate: photo.uploadDate
                ? new Date(photo.uploadDate).toLocaleDateString()
                : "Unknown",
            status: photo.isWinner ? "Winner" : "Submitted",
            coinsEarned: photo.coinsEarned || 0,
        };
    }

    function handleImageSelect(e) {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            setError("Select a valid image file");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setError("Image size must be less than 5MB");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            setUploadedImage({
                file,
                preview: e.target.result,
                name: file.name,
                size: file.size,
            });
            setCurrentStep(2);
            setError("");
        };
        reader.readAsDataURL(file);
    }

    async function submitPhoto() {
        if (!uploadedImage?.file || !photoDescription.trim()) {
            setError("Provide image and description");
            return;
        }
        if (hasActiveSubmission) {
            setError("You already submitted. Delete first.");
            return;
        }

        setIsSubmitting(true);
        setError("");
        try {
            const formData = new FormData();
            formData.append("file", uploadedImage.file);
            formData.append("description", photoDescription.trim());

            const res = await fetch(`${API_BASE}/api/photos/submit`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: formData,
            });

            if (!res.ok) throw new Error("Upload failed");

            const data = await res.json();
            setSuccess(`Uploaded! ${data.coinsAwarded ? `+${data.coinsEarned} coins` : ""}`);
            const newSubmission = formatPhotoData(data.photo);
            setUserSubmissions([newSubmission, ...userSubmissions]);
            setHasActiveSubmission(true);
            setUploadedImage(null);
            setPhotoDescription("");
            setCurrentStep(1);
            await loadWalletBalance();
            await checkSubmissionStatus(userId);
        } catch (e) {
            setError(e.message);
        } finally {
            setIsSubmitting(false);
        }
    }

    async function deletePhoto(photoId) {
        setDeletingId(photoId);
        try {
            const res = await fetch(`${API_BASE}/api/photos/${photoId}`, {
                method: "DELETE",
                headers: getAuthHeaders(),
            });

            const data = await res.json();

            if (res.status === 400 && data.errorCode === "INSUFFICIENT_BALANCE") {
                setError(`Need ${data.coinsRequired} coins to delete`);
                return;
            }

            if (res.ok || res.status === 404) {
                setUserSubmissions(userSubmissions.filter((p) => p.id !== photoId));
                setHasActiveSubmission(false);
                setSuccess("Photo deleted");
                await loadWalletBalance();
                await checkSubmissionStatus(userId);
            } else {
                setError("Delete failed");
            }
        } catch (e) {
            setError("Delete failed");
        } finally {
            setDeletingId(null);
            setShowDeleteModal(null);
        }
    }

    function goToWallet() {
        navigate("/wallet");
    }

    if (isLoading) {
        return (
            <div className="dashboard-container">
                <div className="loading">
                    <div className="spinner" />
                    <p>Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <div className="welcome-section">
                    <h1>Welcome, {userData?.name}</h1>
                    <p className="user-info">{userData?.email} • {userData?.country}</p>
                </div>
                <div className="stats-section">
                    <div className="stat-card"><span className="stat-number">{userSubmissions.length}</span><span className="stat-label">Photos</span></div>
                    <div className="stat-card"><span className="stat-number">{walletBalance}</span><span className="stat-label">Coins</span></div>
                    <button className="wallet-btn" onClick={goToWallet}>💳 Wallet</button>
                </div>
            </div>

            {error && <div className="alert error">⚠️ {error}</div>}
            {success && <div className="alert success">✅ {success}</div>}

            <div className="dashboard-content">
                <div className="upload-section">
                    <div className="section-header">
                        <h2>Upload Lottery Photo</h2>
                        <div className="progress-indicator">
                            <div className={`step ${currentStep === 1 ? "active" : ""}`}>1</div>
                            <div className={`step ${currentStep === 2 ? "active" : ""}`}>2</div>
                            <div className={`step ${currentStep === 3 ? "active" : ""}`}>3</div>
                        </div>
                    </div>

                    {currentStep === 1 && (
                        <div className="step-content">
                            <h3>Select Image</h3>
                            <label className="upload-label">
                                <span className="upload-icon">📤</span>
                                <p>Click to select an image (Max 5MB)</p>
                                <small>Only .jpg, .png supported</small>
                                <input type="file" accept="image/*" hidden onChange={handleImageSelect} />
                            </label>
                        </div>
                    )}

                    {currentStep === 2 && uploadedImage && (
                        <div className="step-content">
                            <h3>Preview & Describe</h3>
                            <div className="preview-section">
                                <img src={uploadedImage.preview} className="image-preview" />
                                <div className="image-info">
                                    <p><strong>Name:</strong> {uploadedImage.name}</p>
                                    <p><strong>Size:</strong> {(uploadedImage.size / 1024).toFixed(1)} KB</p>
                                </div>
                            </div>
                            <div className="description-input">
                                <label>Description</label>
                                <textarea
                                    value={photoDescription}
                                    onChange={(e) => setPhotoDescription(e.target.value)}
                                    className="description-field"
                                    placeholder="Describe your photo"
                                />
                                <small>This description will be public.</small>
                            </div>
                            <div className="step-buttons">
                                <button className="btn-secondary" onClick={() => setCurrentStep(1)}>Back</button>
                                <button className="btn-primary" onClick={() => setCurrentStep(3)}>Next</button>
                            </div>
                        </div>
                    )}

                    {currentStep === 3 && uploadedImage && (
                        <div className="step-content final-review">
                            <h3>Final Review</h3>
                            <div className="review-card">
                                <img src={uploadedImage.preview} className="final-image-preview" />
                                <div className="review-details">
                                    <h4>{uploadedImage.name}</h4>
                                    <p><strong>Description:</strong> {photoDescription}</p>
                                </div>
                            </div>
                            <div className="final-buttons">
                                <button className="btn-secondary" onClick={() => setCurrentStep(2)}>Back</button>
                                <button className="btn-submit" onClick={submitPhoto} disabled={isSubmitting}>
                                    {isSubmitting ? "Submitting..." : "Submit"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="submissions-section">
                    <div className="submissions-header">
                        <h2>Your Submissions</h2>
                        <span className="submissions-count">{userSubmissions.length}</span>
                    </div>

                    {userSubmissions.length === 0 ? (
                        <div className="empty-state">
                            <span className="empty-icon">🪶</span>
                            <p>No photos uploaded yet</p>
                        </div>
                    ) : (
                        <div className="submissions-grid">
                            {userSubmissions.map((photo) => (
                                <div key={photo.id} className="submission-card">
                                    <img src={photo.image} className="submission-image" />
                                    <div className="submission-info">
                                        <h4>{photo.description}</h4>
                                        <p className="submission-date">{photo.uploadDate}</p>
                                        <div className="submission-status">
                                            <span className={`status ${photo.status.toLowerCase()}`}>{photo.status}</span>
                                            {photo.coinsEarned > 0 && (
                                                <span className="coins-earned">+{photo.coinsEarned} coins</span>
                                            )}
                                        </div>
                                        <div className="submission-actions">
                                            <button
                                                className="delete-btn"
                                                onClick={() => setShowDeleteModal(photo.id)}
                                            >
                                                🗑️ Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="delete-modal-overlay">
                    <div className="delete-modal">
                        <div className="delete-modal-header">
                            <h3>Delete Submission?</h3>
                        </div>
                        <div className="delete-modal-content">
                            <p>Are you sure you want to delete this photo?</p>
                            <div className="delete-modal-actions">
                                <button className="btn-cancel" onClick={() => setShowDeleteModal(null)}>Cancel</button>
                                <button
                                    className="btn-delete"
                                    onClick={() => deletePhoto(showDeleteModal)}
                                    disabled={deletingId === showDeleteModal}
                                >
                                    {deletingId === showDeleteModal ? "Deleting..." : "Delete"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
