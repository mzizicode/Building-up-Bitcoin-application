// src/pages/Lottery.js - Enhanced with 24-Hour Countdown Timer & Automated Lottery + Marketplace
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import './Lottery.css';
// Add this import after other imports
import notificationService from '../services/NotificationService';

function Lottery() {
    const navigate = useNavigate();
    const mountRef = useRef(null);
    const sceneRef = useRef(null);
    const globeRef = useRef(null);
    const photoMeshesRef = useRef([]);
    const rendererRef = useRef(null);
    const cameraRef = useRef(null);
    const animationIdRef = useRef(null);
    const mouseRef = useRef(new THREE.Vector2());
    const raycasterRef = useRef(new THREE.Raycaster());
    const countdownIntervalRef = useRef(null);

    const [submissions, setSubmissions] = useState([]);
    const [currentWinner, setCurrentWinner] = useState(null);
    const [isSpinning, setIsSpinning] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hoveredPhoto, setHoveredPhoto] = useState(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [error, setError] = useState('');
    const [retryCount, setRetryCount] = useState(0);
    const [notificationsSent, setNotificationsSent] = useState({
        hour: false,
        tenMin: false,
        oneMin: false
    });
    // 🚀 NEW: Countdown Timer State
    const [timeRemaining, setTimeRemaining] = useState(24 * 60 * 60); // 24 hours in seconds
    const [nextDrawTime, setNextDrawTime] = useState(null);

    const maxRetries = 3;

    // 🚀 NEW: Initialize countdown timer from localStorage or set to 24 hours
    useEffect(() => {
        const savedNextDrawTime = localStorage.getItem('nextDrawTime');

        if (savedNextDrawTime) {
            const nextDraw = new Date(parseInt(savedNextDrawTime));
            const now = new Date();
            const remainingMs = nextDraw.getTime() - now.getTime();

            if (remainingMs > 0) {
                setTimeRemaining(Math.floor(remainingMs / 1000));
                setNextDrawTime(nextDraw);
            } else {
                // Timer expired, start new 24-hour cycle
                startNewCountdown();
            }
        } else {
            // First time visitor - start new countdown
            startNewCountdown();
        }
    }, []);

    // 🚀 ENHANCED: Trigger countdown notifications at milestones with better logic
    useEffect(() => {
        // Only trigger if user is logged in
        if (!isLoggedIn) return;

        console.log(`⏰ Current time remaining: ${timeRemaining} seconds`);

        // Trigger 1-hour notification (3600 seconds)
        if (timeRemaining === 3600 && !notificationsSent.hour) {
            console.log('🔔 Triggering 1-hour countdown notification');
            notificationService.triggerCountdown(60);
            setNotificationsSent(prev => ({ ...prev, hour: true }));
        }
        // Trigger 10-minute notification (600 seconds)
        else if (timeRemaining === 600 && !notificationsSent.tenMin) {
            console.log('🔔 Triggering 10-minute countdown notification');
            notificationService.triggerCountdown(10);
            setNotificationsSent(prev => ({ ...prev, tenMin: true }));
        }
        // Trigger 1-minute notification (60 seconds)
        else if (timeRemaining === 60 && !notificationsSent.oneMin) {
            console.log('🔔 Triggering 1-minute countdown notification');
            notificationService.triggerCountdown(1);
            setNotificationsSent(prev => ({ ...prev, oneMin: true }));
        }

        // Reset notification flags when countdown restarts (24 hours = 86400 seconds)
        if (timeRemaining === 24 * 60 * 60) {
            console.log('🔄 Resetting notification flags for new countdown cycle');
            setNotificationsSent({
                hour: false,
                tenMin: false,
                oneMin: false
            });
        }
    }, [timeRemaining, isLoggedIn, notificationsSent]);

    // 🚀 NEW: Start a new 24-hour countdown
    const startNewCountdown = useCallback(() => {
        const now = new Date();
        const nextDraw = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

        setTimeRemaining(24 * 60 * 60);
        setNextDrawTime(nextDraw);
        localStorage.setItem('nextDrawTime', nextDraw.getTime().toString());

        console.log('New 24-hour countdown started. Next draw at:', nextDraw);

        // Reset notification flags for new cycle
        setNotificationsSent({
            hour: false,
            tenMin: false,
            oneMin: false
        });
    }, []);

    // 🚀 NEW: Countdown timer effect
    useEffect(() => {
        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
        }

        countdownIntervalRef.current = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev <= 1) {
                    // Timer reached zero - trigger automated lottery
                    console.log('⏰ Countdown reached zero! Triggering automated lottery...');
                    automatedLotteryDraw();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
            }
        };
    }, []);

    // 🚀 NEW: Format time remaining for display
    const formatTime = useCallback((seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }, []);

    useEffect(() => {
        // Check if user is logged in
        const userData = localStorage.getItem('userData');
        const userIsLoggedIn = !!userData;
        setIsLoggedIn(userIsLoggedIn);

        console.log('🔍 User login status:', userIsLoggedIn ? 'Logged in' : 'Not logged in');

        // Load submissions from S3/backend only
        loadLotteryPhotos();

        // Load current winner from backend
        loadCurrentWinner();

        // Initialize Three.js scene
        initThreeJS();

        return () => {
            // Cleanup
            if (animationIdRef.current) {
                cancelAnimationFrame(animationIdRef.current);
            }
            if (rendererRef.current && mountRef.current) {
                // Remove event listeners
                const canvas = rendererRef.current.domElement;
                if (canvas.onMouseMove) canvas.removeEventListener('mousemove', canvas.onMouseMove);
                if (canvas.onMouseClick) canvas.removeEventListener('click', canvas.onMouseClick);
                if (canvas.onMouseLeave) canvas.removeEventListener('mouseleave', canvas.onMouseLeave);

                mountRef.current.removeChild(rendererRef.current.domElement);
            }
            if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
            }
        };
    }, []);

    // 🚀 Load photos from S3/backend only - NO localStorage fallback
    const loadLotteryPhotos = async () => {
        try {
            setError('');
            console.log('Loading lottery photos from backend/S3...');

            const response = await fetch('http://localhost:8080/api/photos/lottery', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            console.log('Lottery API response status:', response.status);

            if (!response.ok) {
                throw new Error(`Backend responded with status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Lottery API response data:', data);

            if (data.success && data.photos && Array.isArray(data.photos)) {
                // Transform backend data to frontend format
                const transformedPhotos = data.photos.map(photo => ({
                    id: photo.id,
                    image: photo.s3Url || photo.image, // Use S3 URL
                    description: photo.description || photo.filename || 'Untitled',
                    user: photo.user || 'Anonymous',
                    uploadDate: new Date(photo.uploadDate).toLocaleDateString(),
                    status: photo.status === 'WINNER' ? 'Winner' : 'Submitted'
                }));

                console.log('Loaded photos from S3 for lottery:', transformedPhotos.length);
                if (transformedPhotos.length > 0) {
                    console.log('Sample lottery photo:', transformedPhotos[0]);
                }

                setSubmissions(transformedPhotos);
                setRetryCount(0); // Reset retry count on success
            } else {
                console.warn('No photos found in backend response or invalid format');
                setSubmissions([]);
            }

        } catch (error) {
            console.error('Failed to load lottery photos from backend:', error);
            setError(`Failed to load photos: ${error.message}`);

            // Retry logic for network issues
            if (retryCount < maxRetries) {
                console.log(`Retrying... attempt ${retryCount + 1}/${maxRetries}`);
                setRetryCount(prev => prev + 1);
                setTimeout(() => loadLotteryPhotos(), 2000 * (retryCount + 1)); // Exponential backoff
            } else {
                setSubmissions([]); // Empty state if all retries fail
                setError('Unable to load photos. Please check your connection and try refreshing the page.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // 🚀 Load current winner from backend
    const loadCurrentWinner = async () => {
        try {
            const response = await fetch('http://localhost:8080/api/photos/current-winner', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.winner) {
                    const winner = {
                        id: data.winner.id,
                        image: data.winner.s3Url || data.winner.image,
                        description: data.winner.description,
                        user: data.winner.user,
                        uploadDate: new Date(data.winner.uploadDate).toLocaleDateString(),
                        status: 'Winner'
                    };
                    setCurrentWinner(winner);
                    console.log('Current winner loaded from backend:', winner);
                }
            }
        } catch (error) {
            console.error('Failed to load current winner:', error);
            // Don't show error for winner loading failure - it's optional
        }
    };

    useEffect(() => {
        if (submissions.length > 0 && sceneRef.current) {
            createPhotoSphere();
        }
    }, [submissions]);

    const initThreeJS = () => {
        if (!mountRef.current) return;

        // Scene setup
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a0a0f);
        sceneRef.current = scene;

        // Camera setup
        const camera = new THREE.PerspectiveCamera(
            75,
            mountRef.current.clientWidth / mountRef.current.clientHeight,
            0.1,
            1000
        );
        camera.position.set(0, 0, 8);
        cameraRef.current = camera;

        // Renderer setup
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        rendererRef.current = renderer;
        mountRef.current.appendChild(renderer.domElement);

        // Lighting setup
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        scene.add(directionalLight);

        // Point lights for atmosphere
        const pointLight1 = new THREE.PointLight(0x4169e1, 0.8, 100);
        pointLight1.position.set(5, 5, 5);
        scene.add(pointLight1);

        const pointLight2 = new THREE.PointLight(0xff6b6b, 0.6, 100);
        pointLight2.position.set(-5, -5, 5);
        scene.add(pointLight2);

        // Create main globe
        createGlobe();

        // Create stars background
        createStars();

        // Start animation
        animate();

        // Add mouse interaction
        addMouseInteraction();

        // Handle window resize
        const handleResize = () => {
            if (!mountRef.current || !camera || !renderer) return;

            camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    };

    const createGlobe = () => {
        // Create Earth-like globe
        const geometry = new THREE.SphereGeometry(2, 64, 64);

        // Load earth texture (using a simple blue for now, can be replaced with actual earth texture)
        const material = new THREE.MeshPhongMaterial({
            color: 0x2194ce,
            transparent: true,
            opacity: 0.8,
            shininess: 100
        });

        const globe = new THREE.Mesh(geometry, material);
        globe.castShadow = true;
        globe.receiveShadow = true;
        globeRef.current = globe;
        sceneRef.current.add(globe);

        // Add globe atmosphere
        const atmosphereGeometry = new THREE.SphereGeometry(2.1, 64, 64);
        const atmosphereMaterial = new THREE.MeshPhongMaterial({
            color: 0x87ceeb,
            transparent: true,
            opacity: 0.2,
            side: THREE.BackSide
        });
        const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
        sceneRef.current.add(atmosphere);
    };

    const createStars = () => {
        const starGeometry = new THREE.BufferGeometry();
        const starCount = 1000;
        const positions = new Float32Array(starCount * 3);

        for (let i = 0; i < starCount * 3; i++) {
            positions[i] = (Math.random() - 0.5) * 100;
        }

        starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const starMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 2,
            sizeAttenuation: false
        });

        const stars = new THREE.Points(starGeometry, starMaterial);
        sceneRef.current.add(stars);
    };

    const addMouseInteraction = () => {
        if (!mountRef.current || !rendererRef.current) return;

        const canvas = rendererRef.current.domElement;
        let currentHoveredMesh = null;
        let isClicking = false;

        // Mouse move for hover effects
        const onMouseMove = (event) => {
            if (isClicking) return; // Prevent hover during click animations

            const rect = canvas.getBoundingClientRect();
            mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            // Update raycaster
            raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
            const intersects = raycasterRef.current.intersectObjects(photoMeshesRef.current);

            // Reset previous hovered mesh
            if (currentHoveredMesh && currentHoveredMesh !== intersects[0]?.object) {
                currentHoveredMesh.scale.setScalar(1);
                currentHoveredMesh = null;
                setHoveredPhoto(null);
                canvas.style.cursor = 'default';
            }

            if (intersects.length > 0) {
                const hoveredMesh = intersects[0].object;

                if (hoveredMesh !== currentHoveredMesh) {
                    // New mesh hovered
                    currentHoveredMesh = hoveredMesh;
                    setHoveredPhoto(hoveredMesh.userData.submission);
                    canvas.style.cursor = 'pointer';

                    // Smooth scale animation
                    hoveredMesh.scale.setScalar(1.3);
                }
            }
        };

        // Mouse click for photo selection
        const onMouseClick = (event) => {
            const rect = canvas.getBoundingClientRect();
            mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
            const intersects = raycasterRef.current.intersectObjects(photoMeshesRef.current);

            if (intersects.length > 0) {
                const clickedMesh = intersects[0].object;
                const submission = clickedMesh.userData.submission;

                isClicking = true;

                // Smooth click animation
                clickedMesh.scale.setScalar(0.9);

                // Reset after animation and open modal
                setTimeout(() => {
                    clickedMesh.scale.setScalar(1);
                    isClicking = false;
                    setSelectedPhoto(submission);
                }, 150);
            }
        };

        // Mouse leave to reset hover states
        const onMouseLeave = () => {
            if (currentHoveredMesh) {
                currentHoveredMesh.scale.setScalar(1);
                currentHoveredMesh = null;
            }
            setHoveredPhoto(null);
            canvas.style.cursor = 'default';
        };

        canvas.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('click', onMouseClick);
        canvas.addEventListener('mouseleave', onMouseLeave);

        // Store references for cleanup
        canvas.onMouseMove = onMouseMove;
        canvas.onMouseClick = onMouseClick;
        canvas.onMouseLeave = onMouseLeave;
    };

    const createPhotoSphere = () => {
        // Clear existing photo meshes
        photoMeshesRef.current.forEach(mesh => {
            sceneRef.current.remove(mesh);
        });
        photoMeshesRef.current = [];

        submissions.forEach((submission, index) => {
            // Create photo frame
            const frameGeometry = new THREE.PlaneGeometry(0.6, 0.4);

            // Load image texture from S3
            const loader = new THREE.TextureLoader();

            // Add CORS headers if needed for S3 images
            loader.crossOrigin = 'anonymous';

            loader.load(
                submission.image, // This should be the S3 URL
                (texture) => {
                    const frameMaterial = new THREE.MeshBasicMaterial({
                        map: texture,
                        side: THREE.DoubleSide
                    });

                    const photoMesh = new THREE.Mesh(frameGeometry, frameMaterial);

                    // Position photos around the globe
                    const phi = Math.acos(-1 + (2 * index) / submissions.length);
                    const theta = Math.sqrt(submissions.length * Math.PI) * phi;

                    const radius = 2.5; // Distance from globe center

                    photoMesh.position.setFromSphericalCoords(radius, phi, theta);
                    photoMesh.lookAt(0, 0, 0); // Face the center

                    // Add glow effect for winners
                    if (submission.status === 'Winner') {
                        const glowGeometry = new THREE.PlaneGeometry(0.8, 0.6);
                        const glowMaterial = new THREE.MeshBasicMaterial({
                            color: 0xffd700,
                            transparent: true,
                            opacity: 0.3,
                            side: THREE.DoubleSide
                        });
                        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
                        glowMesh.position.copy(photoMesh.position);
                        glowMesh.lookAt(0, 0, 0);
                        sceneRef.current.add(glowMesh);
                    }

                    // Store reference for interaction
                    photoMesh.userData = { submission, index };
                    photoMeshesRef.current.push(photoMesh);
                    sceneRef.current.add(photoMesh);
                },
                undefined,
                (error) => {
                    console.error('Error loading S3 image texture:', error, 'URL:', submission.image);
                    // Fallback: create colored plane with text indicator
                    const fallbackMaterial = new THREE.MeshBasicMaterial({
                        color: 0x666666,
                        side: THREE.DoubleSide
                    });
                    const photoMesh = new THREE.Mesh(frameGeometry, fallbackMaterial);

                    const phi = Math.acos(-1 + (2 * index) / submissions.length);
                    const theta = Math.sqrt(submissions.length * Math.PI) * phi;
                    const radius = 2.5;

                    photoMesh.position.setFromSphericalCoords(radius, phi, theta);
                    photoMesh.lookAt(0, 0, 0);
                    photoMesh.userData = { submission, index };
                    photoMeshesRef.current.push(photoMesh);
                    sceneRef.current.add(photoMesh);
                }
            );
        });
    };

    const animate = () => {
        if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;

        animationIdRef.current = requestAnimationFrame(animate);

        // Rotate globe smoothly
        if (globeRef.current) {
            globeRef.current.rotation.y += isSpinning ? 0.02 : 0.005;
        }

        // Rotate photos with globe (but don't interfere with scale)
        photoMeshesRef.current.forEach((mesh) => {
            // Only rotate, don't change scale here
            mesh.rotation.y += isSpinning ? 0.02 : 0.005;
        });

        // Smooth camera auto-rotation
        const time = Date.now() * 0.0003; // Slower for less motion sickness
        cameraRef.current.position.x = Math.cos(time) * 8;
        cameraRef.current.position.z = Math.sin(time) * 8;
        cameraRef.current.lookAt(0, 0, 0);

        rendererRef.current.render(sceneRef.current, cameraRef.current);
    };

    // 🚀 NEW: Automated lottery draw when countdown reaches zero
    const automatedLotteryDraw = async () => {
        if (submissions.length === 0) {
            console.warn('No submissions available for automated lottery!');
            startNewCountdown(); // Start new countdown even if no submissions
            return;
        }

        setIsSpinning(true);
        setError('');

        try {
            console.log('🤖 Running automated lottery draw...');

            // Trigger final notification for lottery draw
            if (isLoggedIn) {
                notificationService.triggerLotteryDraw(submissions.length);
            }

            // Call backend to determine winner
            const response = await fetch('http://localhost:8080/api/photos/spin-lottery', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error(`Automated lottery failed: ${response.status}`);
            }

            const result = await response.json();
            console.log('Automated lottery result:', result);

            if (result.success && result.winner) {
                const winner = {
                    id: result.winner.id,
                    image: result.winner.s3Url || result.winner.image,
                    description: result.winner.description,
                    user: result.winner.user,
                    uploadDate: new Date(result.winner.uploadDate).toLocaleDateString(),
                    status: 'Winner'
                };

                // Update current winner
                setCurrentWinner(winner);

                // Update submissions with winner status
                const updatedSubmissions = submissions.map(sub => ({
                    ...sub,
                    status: sub.id === winner.id ? 'Winner' : 'Submitted'
                }));
                setSubmissions(updatedSubmissions);

                // Trigger winner notification
                if (isLoggedIn) {
                    notificationService.triggerWinner(winner);
                }

                // Recreate photo sphere with updated winner status
                setTimeout(() => {
                    createPhotoSphere();
                }, 500);

                console.log(`🎉 Automated lottery complete! Winner: "${winner.description}" by ${winner.user}`);

                // Show notification (could be enhanced with better UX)
                if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification('🎉 Photo Lottery Winner!', {
                        body: `${winner.description} by ${winner.user}`,
                        icon: winner.image
                    });
                }
            } else {
                throw new Error(result.message || 'Automated lottery failed');
            }

        } catch (error) {
            console.error('Automated lottery error:', error);
            setError(`Automated lottery failed: ${error.message}`);
        } finally {
            // End spinning animation after 3 seconds minimum for visual effect
            setTimeout(() => {
                setIsSpinning(false);
            }, 3000);

            // Start next 24-hour countdown cycle
            setTimeout(() => {
                startNewCountdown();
            }, 5000); // Give 5 seconds to show the winner before starting new countdown
        }
    };

    const openPhotoModal = (submission) => {
        setSelectedPhoto(submission);
    };

    const closePhotoModal = () => {
        setSelectedPhoto(null);
    };

    const handleJoinLottery = () => {
        navigate('/register');
    };

    const handleGoToDashboard = () => {
        const userData = localStorage.getItem('userData');
        if (userData) {
            navigate('/dashboard');
        } else {
            navigate('/register');
        }
    };

    const handleRetry = () => {
        setError('');
        setRetryCount(0);
        setIsLoading(true);
        loadLotteryPhotos();
    };

    // 🚀 NEW: Request notification permission on component mount
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            console.log('🔔 Requesting notification permission...');
            Notification.requestPermission().then(permission => {
                console.log('🔔 Notification permission:', permission);
            });
        }
    }, []);

    // 🚀 ENHANCED: Get countdown timer class for styling
    const getCountdownClass = () => {
        if (timeRemaining <= 600) return 'countdown-timer final'; // Last 10 minutes
        if (timeRemaining <= 3600) return 'countdown-timer urgent'; // Last hour
        return 'countdown-timer';
    };

    return (
        <div className="lottery-container">
            {/* 🚀 ENHANCED: Countdown Timer with Dynamic Styling */}
            <div className={getCountdownClass()}>
                <div className="countdown-content">
                    <h3 className="countdown-label">Next Auto Draw In</h3>
                    <div className="timer-display">
                        {formatTime(timeRemaining)}
                    </div>
                    <p className="countdown-subtitle">
                        {timeRemaining > 0
                            ? `Automated lottery drawing • ${submissions.length} photos entered`
                            : 'Drawing winner now...'
                        }
                    </p>
                </div>
            </div>

            {/* Header */}
            <div className="lottery-header">
                <h1 className="lottery-title">🌍 24-Hour Auto Lottery</h1>
                <p className="lottery-subtitle">
                    Automated draws every 24 hours with S3 photos orbiting Earth!
                </p>

                {/* 🚀 ENHANCED: Current Winner Section */}
                {currentWinner && (
                    <div className="current-winner-section">
                        <div className="winner-announcement">
                            <div className="winner-card">
                                <span className="winner-badge">🏆 Current 24-Hour Winner!</span>
                                <img
                                    src={currentWinner.image}
                                    alt={currentWinner.description}
                                    className="winner-image"
                                    onError={(e) => {
                                        console.error('Winner image failed to load:', currentWinner.image);
                                        e.target.style.display = 'none';
                                    }}
                                />
                                <div className="winner-details">
                                    <h3>📍 {currentWinner.description}</h3>
                                    <p><strong>Winner:</strong> {currentWinner.user}</p>
                                    <p><strong>Submitted:</strong> {currentWinner.uploadDate}</p>
                                    <p><strong>Source:</strong> AWS S3</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 🛍️ NEW: Marketplace Section - Public View */}
                <div style={{
                    textAlign: 'center',
                    margin: '30px auto',
                    padding: '30px',
                    background: 'rgba(255, 215, 0, 0.15)',
                    backdropFilter: 'blur(15px)',
                    borderRadius: '25px',
                    border: '2px solid rgba(255, 215, 0, 0.3)',
                    maxWidth: '600px',
                    boxShadow: '0 20px 40px rgba(255, 215, 0, 0.2)'
                }}>
                    <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🛍️</div>
                    <h3 style={{
                        fontSize: '1.8rem',
                        color: '#fff',
                        margin: '0 0 15px 0',
                        textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
                        fontWeight: '700'
                    }}>
                        Community Marketplace
                    </h3>
                    <p style={{
                        fontSize: '1.1rem',
                        color: 'rgba(255, 255, 255, 0.9)',
                        margin: '0 0 25px 0',
                        lineHeight: '1.5'
                    }}>
                        Buy and sell items using coins earned from the lottery!
                    </p>

                    <button
                        onClick={() => {
                            // Check if user is logged in
                            const userData = localStorage.getItem('userData');
                            if (userData) {
                                navigate('/marketplace');
                            } else {
                                alert('Please sign in to access the marketplace for trading. You can browse without signing in.');
                                navigate('/marketplace');
                            }
                        }}
                        style={{
                            padding: '18px 40px',
                            fontSize: '1.3rem',
                            fontWeight: '700',
                            borderRadius: '30px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #ffd700, #ff9500)',
                            color: 'white',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            boxShadow: '0 15px 35px rgba(255, 215, 0, 0.4)',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            width: '100%',
                            maxWidth: '350px'
                        }}
                        onMouseOver={(e) => {
                            e.target.style.transform = 'translateY(-5px) scale(1.05)';
                            e.target.style.boxShadow = '0 20px 50px rgba(255, 215, 0, 0.6)';
                        }}
                        onMouseOut={(e) => {
                            e.target.style.transform = 'translateY(0) scale(1)';
                            e.target.style.boxShadow = '0 15px 35px rgba(255, 215, 0, 0.4)';
                        }}
                    >
                        🛒 BROWSE MARKETPLACE
                    </button>

                    <div style={{
                        marginTop: '20px',
                        padding: '15px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '15px',
                        fontSize: '0.9rem',
                        color: 'rgba(255, 255, 255, 0.8)'
                    }}>
                        <strong>💡 Tip:</strong> Sign in to buy/sell items. Earn coins from photo uploads to trade!
                    </div>
                </div>

                {/* Login/Join Button - Only show if not logged in */}
                {!isLoggedIn && (
                    <div style={{
                        textAlign: 'center',
                        margin: '30px auto',
                        padding: '30px',
                        background: 'rgba(255, 107, 107, 0.15)',
                        backdropFilter: 'blur(15px)',
                        borderRadius: '25px',
                        border: '2px solid rgba(255, 107, 107, 0.3)',
                        maxWidth: '500px',
                        boxShadow: '0 20px 40px rgba(255, 107, 107, 0.2)'
                    }}>
                        <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🎯</div>
                        <h3 style={{
                            fontSize: '1.5rem',
                            color: '#fff',
                            margin: '0 0 15px 0',
                            textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
                            fontWeight: '700'
                        }}>
                            Join the 24-Hour Auto Lottery!
                        </h3>
                        <p style={{
                            fontSize: '1.1rem',
                            color: 'rgba(255, 255, 255, 0.9)',
                            margin: '0 0 25px 0',
                            lineHeight: '1.5'
                        }}>
                            Upload photos to S3 and get automatically entered in every 24-hour draw!
                        </p>
                        <button
                            onClick={handleJoinLottery}
                            style={{
                                padding: '18px 40px',
                                fontSize: '1.3rem',
                                fontWeight: '700',
                                borderRadius: '30px',
                                border: 'none',
                                background: 'linear-gradient(135deg, #ff6b6b, #ffd700)',
                                color: 'white',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                boxShadow: '0 15px 35px rgba(255, 107, 107, 0.4)',
                                textTransform: 'uppercase',
                                letterSpacing: '1px',
                                width: '100%',
                                maxWidth: '300px'
                            }}
                            onMouseOver={(e) => {
                                e.target.style.transform = 'translateY(-5px) scale(1.05)';
                                e.target.style.boxShadow = '0 20px 50px rgba(255, 107, 107, 0.6)';
                            }}
                            onMouseOut={(e) => {
                                e.target.style.transform = 'translateY(0) scale(1)';
                                e.target.style.boxShadow = '0 15px 35px rgba(255, 107, 107, 0.4)';
                            }}
                        >
                            🚀 JOIN AUTO LOTTERY!
                        </button>
                    </div>
                )}

                {/* Dashboard Button - Only show if logged in */}
                {isLoggedIn && (
                    <div style={{
                        textAlign: 'center',
                        margin: '30px auto',
                        padding: '30px',
                        background: 'rgba(102, 126, 234, 0.15)',
                        backdropFilter: 'blur(15px)',
                        borderRadius: '25px',
                        border: '2px solid rgba(102, 126, 234, 0.3)',
                        maxWidth: '500px',
                        boxShadow: '0 20px 40px rgba(102, 126, 234, 0.2)'
                    }}>
                        <div style={{ fontSize: '3rem', marginBottom: '15px' }}>📸</div>
                        <h3 style={{
                            fontSize: '1.5rem',
                            color: '#fff',
                            margin: '0 0 15px 0',
                            textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
                            fontWeight: '700'
                        }}>
                            Auto-Entered Every 24 Hours!
                        </h3>
                        <p style={{
                            fontSize: '1.1rem',
                            color: 'rgba(255, 255, 255, 0.9)',
                            margin: '0 0 25px 0',
                            lineHeight: '1.5'
                        }}>
                            Your S3 photos are automatically included in every draw!
                        </p>
                        <button
                            onClick={handleGoToDashboard}
                            style={{
                                padding: '18px 40px',
                                fontSize: '1.3rem',
                                fontWeight: '700',
                                borderRadius: '30px',
                                border: 'none',
                                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                                color: 'white',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                boxShadow: '0 15px 35px rgba(102, 126, 234, 0.4)',
                                textTransform: 'uppercase',
                                letterSpacing: '1px',
                                width: '100%',
                                maxWidth: '300px'
                            }}
                            onMouseOver={(e) => {
                                e.target.style.transform = 'translateY(-5px) scale(1.05)';
                                e.target.style.boxShadow = '0 20px 50px rgba(102, 126, 234, 0.6)';
                            }}
                            onMouseOut={(e) => {
                                e.target.style.transform = 'translateY(0) scale(1)';
                                e.target.style.boxShadow = '0 15px 35px rgba(102, 126, 234, 0.4)';
                            }}
                        >
                            📸 UPLOAD MORE PHOTOS
                        </button>
                    </div>
                )}
            </div>

            {/* Stats Section */}
            <div className="lottery-stats-section">
                <div className="lottery-stats">
                    <div className="stat">
                        <span className="stat-number">{submissions.length}</span>
                        <span className="stat-label">S3 Photos</span>
                    </div>
                    <div className="stat">
                        <span className="stat-number">24H</span>
                        <span className="stat-label">Auto Draw</span>
                    </div>
                    <div className="stat">
                        <span className="stat-number">Live</span>
                        <span className="stat-label">S3 Stream</span>
                    </div>
                </div>
            </div>

            {/* Three.js Globe Container */}
            <div className="threejs-container">
                {isLoading && (
                    <div className="loading-overlay">
                        <div className="loading-spinner"></div>
                        <p>Loading S3 Photos...</p>
                    </div>
                )}

                {/* Hover tooltip */}
                {hoveredPhoto && (
                    <div className="photo-tooltip">
                        <strong>📍 {hoveredPhoto.description}</strong>
                        <br />
                        <span>by {hoveredPhoto.user}</span>
                        <br />
                        <small>S3 Hosted • Click to view</small>
                    </div>
                )}

                {/* 🚀 NEW: Spinning indicator when automated lottery is running */}
                {isSpinning && (
                    <div className="automated-draw-overlay">
                        <div className="draw-animation">
                            <div className="draw-spinner"></div>
                            <h3>🤖 Automated Draw in Progress</h3>
                            <p>Selecting winner from {submissions.length} S3 photos...</p>
                        </div>
                    </div>
                )}

                <div
                    ref={mountRef}
                    className="threejs-mount"
                    style={{ width: '100%', height: '600px' }}
                />

                {submissions.length === 0 && !isLoading && !error && (
                    <div className="empty-globe-message">
                        <h3>🌍 No S3 Photos Yet</h3>
                        <p>Upload photos to AWS S3 to join the automated 24-hour lottery!</p>
                        <button
                            className="upload-first-btn"
                            onClick={handleJoinLottery}
                        >
                            📤 Join Auto Lottery
                        </button>
                    </div>
                )}
            </div>

            {/* Instructions */}
            <div className="instructions-section">
                <h2>🤖 24-Hour Automated Lottery</h2>
                <div className="instruction-cards">
                    <div className="instruction-card">
                        <span className="instruction-icon">⏰</span>
                        <h3>24-Hour Timer</h3>
                        <p>Countdown runs continuously - winners selected automatically every 24 hours</p>
                    </div>
                    <div className="instruction-card">
                        <span className="instruction-icon">🤖</span>
                        <h3>Fully Automated</h3>
                        <p>No manual spins needed - the system draws winners automatically</p>
                    </div>
                    <div className="instruction-card">
                        <span className="instruction-icon">☁️</span>
                        <h3>S3 Integration</h3>
                        <p>All photos stored in AWS S3 and automatically entered in every draw</p>
                    </div>
                    <div className="instruction-card">
                        <span className="instruction-icon">🔄</span>
                        <h3>Continuous Cycle</h3>
                        <p>New countdown starts immediately after each draw - never stops</p>
                    </div>
                </div>
            </div>

            {/* Enhanced Controls Info */}
            <div className="controls-info">
                <h3>⚡ Automated Lottery Features</h3>
                <ul>
                    <li><strong>24-Hour Countdown:</strong> Digital timer shows exact time until next automated draw</li>
                    <li><strong>Auto-Entry:</strong> All S3 photos are automatically included in every lottery</li>
                    <li><strong>Continuous Operation:</strong> New cycle begins immediately after each winner selection</li>
                    <li><strong>Winner Display:</strong> Current winner remains visible for their full 24-hour reign</li>
                    <li><strong>S3 Real-Time:</strong> Photos loaded directly from AWS S3 cloud storage</li>
                    <li><strong>No Manual Input:</strong> Completely automated system - just upload and wait!</li>
                    <li><strong>Smart Notifications:</strong> Get alerts 1 hour, 10 minutes, and 1 minute before draws</li>
                    <li><strong>🛍️ Marketplace Integration:</strong> Use earned coins to buy and sell items with the community</li>
                </ul>
            </div>

            {/* Error Display */}
            {error && (
                <div style={{
                    background: '#fee',
                    color: '#c53030',
                    padding: '20px',
                    borderRadius: '15px',
                    margin: '20px auto',
                    maxWidth: '600px',
                    textAlign: 'center',
                    border: '1px solid #fed7d7'
                }}>
                    <h3>⚠️ System Error</h3>
                    <p>{error}</p>
                    <button
                        onClick={handleRetry}
                        style={{
                            background: '#4299e1',
                            color: 'white',
                            border: 'none',
                            padding: '12px 24px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            marginTop: '15px'
                        }}
                    >
                        🔄 Retry Connection
                    </button>
                </div>
            )}

            {/* Photo Modal */}
            {selectedPhoto && (
                <div className="photo-modal" onClick={closePhotoModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="close-modal" onClick={closePhotoModal}>×</button>
                        <img
                            src={selectedPhoto.image}
                            alt={selectedPhoto.description}
                            className="modal-image"
                            onError={(e) => {
                                console.error('Modal image failed to load:', selectedPhoto.image);
                                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzY2NiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIEZhaWxlZDwvdGV4dD48L3N2Zz4=';
                            }}
                        />
                        <div className="modal-details">
                            <h3>📍 {selectedPhoto.description}</h3>
                            <p><strong>Photographer:</strong> {selectedPhoto.user}</p>
                            <p><strong>Submitted:</strong> {selectedPhoto.uploadDate}</p>
                            <p><strong>Storage:</strong> AWS S3</p>
                            <p><strong>Auto-Lottery:</strong> Entered in every 24-hour draw</p>
                            <p><strong>Status:</strong>
                                <span className={`status ${selectedPhoto.status.toLowerCase()}`}>
                                    {selectedPhoto.status}
                                    {selectedPhoto.status === 'Winner' && ' 🏆'}
                                </span>
                            </p>
                            <p><strong>Image URL:</strong>
                                <span style={{
                                    fontSize: '0.8rem',
                                    color: '#888',
                                    wordBreak: 'break-all',
                                    marginLeft: '5px'
                                }}>
                                    {selectedPhoto.image}
                                </span>
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Lottery;