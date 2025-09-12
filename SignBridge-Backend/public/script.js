document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('video');
    const startButton = document.getElementById('startButton');
    const responseDiv = document.getElementById('response');
    const liveTextDiv = document.getElementById('live-text');
    const volumeSlider = document.getElementById('volumeSlider');
    let intervalId;

    // --- Audio Playback Setup with Volume Control ---
    let audioContext;
    let gainNode;

    async function setupWebcam() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = stream;
            responseDiv.innerText = "Status: Webcam ready.";
        } catch (err) {
            responseDiv.innerText = "Error: Could not access webcam. Please grant permission.";
        }
    }

    function startStreaming() {
        // Initialize AudioContext on user action (important for browser policy)
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            gainNode = audioContext.createGain(); // Create a Gain Node for volume
            gainNode.connect(audioContext.destination); // Connect Gain Node to speakers
        }

        const ws = new WebSocket('ws://localhost:3000');
        startButton.innerText = "Stop Translation";
        startButton.disabled = true;

        ws.onopen = () => {
            responseDiv.innerText = "Status: Connected! Show me a sign...";
            liveTextDiv.innerText = "";
            startButton.disabled = false;

            // Send a frame every 1.5 seconds to avoid ElevenLabs rate limits
            intervalId = setInterval(() => {
                if (video.readyState >= 3) {
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    const data = canvas.toDataURL('image/jpeg', 0.8);
                    ws.send(data.split(',')[1]);
                }
            }, 1500);
        };

        ws.onmessage = async (event) => {
            // Check if the message is audio data
            if (event.data instanceof Blob) {
                try {
                    responseDiv.innerText = `Status: Playing audio...`;
                    const arrayBuffer = await event.data.arrayBuffer();
                    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                    const source = audioContext.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(gainNode); // Connect audio to the gain node for volume control
                    source.start(0);
                    source.onended = () => {
                        liveTextDiv.innerText = "";
                        responseDiv.innerText = "Status: Connected! Show me a sign...";
                    }
                } catch (e) { console.error('Error playing audio:', e); }
            } else {
                // Otherwise, it must be a JSON message with text
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'live_text') {
                        liveTextDiv.innerText = data.data; // Update the live text display
                        responseDiv.innerText = "Status: Detected a letter...";
                    } else if (data.type === 'status') {
                        responseDiv.innerText = `Status: ${data.data}`; // Display status messages
                    }
                } catch (e) { console.error("Error parsing message:", e); }
            }
        };

        ws.onerror = (err) => { responseDiv.innerText = "Status: Error connecting."; };
        ws.onclose = () => stopStreaming(ws);
        startButton.onclick = () => stopStreaming(ws);
    }

    function stopStreaming(ws) {
        if (intervalId) clearInterval(intervalId);
        if (ws && ws.readyState < 2) ws.close();
        startButton.innerText = "Start Translation";
        responseDiv.innerText = "Status: Disconnected.";
        liveTextDiv.innerText = "...";
        startButton.onclick = startStreaming;
    }

    // --- Event Listener for Volume Slider ---
    volumeSlider.addEventListener('input', (event) => {
        if (gainNode) {
            gainNode.gain.value = event.target.value;
        }
    });

    setupWebcam();
    startButton.onclick = startStreaming;
});