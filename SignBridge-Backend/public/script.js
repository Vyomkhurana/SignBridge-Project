document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('video');
    const startButton = document.getElementById('startButton');
    const responseDiv = document.getElementById('response');
    const liveTextDiv = document.getElementById('live-text');
    const currentWordDiv = document.getElementById('current-word');
    const videoStatus = document.getElementById('video-status');
    const volumeSlider = document.getElementById('volumeSlider');

    let intervalId;
    let audioContext;
    let gainNode;
    let isConnected = false;
    let currentWord = "";
    let lastDetectedWord = "";

    // --- Enhanced Audio Setup ---
    async function setupAudio() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            gainNode = audioContext.createGain();
            gainNode.connect(audioContext.destination);
        }
    }

    // --- Enhanced Webcam Setup ---
    async function setupWebcam() {
        try {
            videoStatus.textContent = "Requesting camera...";
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                }
            });
            video.srcObject = stream;

            video.onloadedmetadata = () => {
                videoStatus.textContent = "Camera Ready";
                updateStatus("Camera connected successfully", "connected");
            };
        } catch (err) {
            videoStatus.textContent = "Camera Error";
            updateStatus("Could not access camera. Please grant permission and refresh.", "disconnected");
            console.error("Webcam error:", err);
        }
    }

    // --- Enhanced Status Updates ---
    function updateStatus(message, type) {
        responseDiv.textContent = message;
        responseDiv.className = type || "disconnected";
    }

    // --- Enhanced Live Text Updates ---
    function updateLiveText(text) {
        if (text && text.trim() !== "") {
            liveTextDiv.textContent = text;
            liveTextDiv.className = "active";

            // Add visual feedback
            liveTextDiv.style.transform = "scale(1.05)";
            setTimeout(() => {
                liveTextDiv.style.transform = "scale(1)";
            }, 200);

            lastDetectedWord = text;
        } else {
            liveTextDiv.textContent = "Ready to detect...";
            liveTextDiv.className = "empty";
        }
    }

    // --- Enhanced Word Building Display ---
    function updateCurrentWord(word) {
        if (word && word !== currentWord) {
            currentWord = word;
            currentWordDiv.textContent = word;

            // Visual feedback for word building
            currentWordDiv.style.color = "#10b981";
            setTimeout(() => {
                currentWordDiv.style.color = "#0066ff";
            }, 500);
        }
    }

    // --- Enhanced Audio Playback ---
    async function playAudio(audioData) {
        try {
            await setupAudio();
            updateStatus("🔊 Playing audio...", "processing");

            const arrayBuffer = await audioData.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            const source = audioContext.createBufferSource();

            source.buffer = audioBuffer;
            source.connect(gainNode);
            source.start(0);

            source.onended = () => {
                updateStatus("Connected! Show me a sign...", "connected");
                // Clear the live text after audio finishes
                setTimeout(() => {
                    updateLiveText("");
                    currentWordDiv.textContent = "...";
                }, 1000);
            };
        } catch (e) {
            console.error('Error playing audio:', e);
            updateStatus("Audio playback error", "disconnected");
        }
    }

    // --- Enhanced Streaming Function ---
    function startStreaming() {
        setupAudio();

        const ws = new WebSocket('ws://localhost:3000');

        // Update button state
        startButton.textContent = "Connecting...";
        startButton.disabled = true;
        startButton.classList.add('stop');

        ws.onopen = () => {
            isConnected = true;
            updateStatus("🎯 Connected! Show me a sign...", "connected");
            videoStatus.textContent = "🔴 Recording";

            startButton.textContent = "Stop Translation";
            startButton.disabled = false;

            // Send frames at optimized intervals
            intervalId = setInterval(() => {
                if (video.readyState >= 3 && isConnected) {
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                    // Send high quality JPEG
                    const data = canvas.toDataURL('image/jpeg', 0.8);
                    ws.send(data.split(',')[1]);
                }
            }, 1500); // Optimized for your ASL detection timing
        };

        ws.onmessage = async (event) => {
            if (event.data instanceof Blob) {
                // Audio data received
                await playAudio(event.data);
            } else {
                // Text/JSON data received
                try {
                    const data = JSON.parse(event.data);

                    if (data.type === 'live_text') {
                        // This is the live text from your word detection
                        updateLiveText(data.data);
                        updateCurrentWord(data.data);
                        updateStatus("✅ Word detected!", "processing");
                    } else if (data.type === 'status') {
                        // Status messages from backend
                        updateStatus(data.data, "processing");
                    } else if (data.error) {
                        // Error messages
                        updateStatus(`❌ Error: ${data.error}`, "disconnected");
                    }
                } catch (e) {
                    // If it's not JSON, treat as plain text
                    const text = event.data.toString();
                    if (text && text.trim() !== "") {
                        updateLiveText(text);
                        updateCurrentWord(text);
                        updateStatus("📝 Processing...", "processing");
                    }
                }
            }
        };

        ws.onerror = (err) => {
            console.error('WebSocket error:', err);
            updateStatus("❌ Connection error - Check if backend is running", "disconnected");
        };

        ws.onclose = () => {
            stopStreaming(ws);
        };

        // Update stop button functionality
        startButton.onclick = () => stopStreaming(ws);
    }

    // --- Enhanced Stop Function ---
    function stopStreaming(ws) {
        isConnected = false;

        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }

        if (ws && ws.readyState < 2) {
            ws.close();
        }

        // Reset UI state
        startButton.textContent = "Start Translation";
        startButton.classList.remove('stop');
        startButton.disabled = false;
        startButton.onclick = startStreaming;

        videoStatus.textContent = "Camera Ready";
        updateStatus("Disconnected - Click Start to begin", "disconnected");
        updateLiveText("");
        currentWordDiv.textContent = "...";
        currentWord = "";
        lastDetectedWord = "";
    }

    // --- Volume Control ---
    volumeSlider.addEventListener('input', (event) => {
        if (gainNode) {
            gainNode.gain.value = parseFloat(event.target.value);
        }
    });

    // --- Keyboard Shortcuts ---
    document.addEventListener('keydown', (event) => {
        if (event.code === 'Space' && !startButton.disabled) {
            event.preventDefault();
            if (isConnected) {
                stopStreaming();
            } else {
                startStreaming();
            }
        }
    });

    // --- Initialize ---
    setupWebcam();
    startButton.onclick = startStreaming;

    // Add helpful tooltips
    startButton.title = "Press spacebar to start/stop quickly";
    volumeSlider.title = "Adjust speech volume";

    console.log("🚀 SignBridge frontend initialized!");
    console.log("💡 Tip: Press spacebar to quickly start/stop translation");
});