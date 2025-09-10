// This event listener ensures the script runs only after the entire HTML page is loaded and ready.
document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('video');
    const startButton = document.getElementById('startButton');
    const responseDiv = document.getElementById('response');
    let intervalId; // To store the interval timer

    // --- Audio Playback Setup ---
    // Create an AudioContext to handle audio in the browser.
    // It's best to create it only after the user interacts with the page.
    let audioContext;

    if (!video || !startButton || !responseDiv) {
        console.error("Could not find necessary HTML elements.");
        return;
    }

    async function setupWebcam() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = stream;
        } catch (err) {
            console.error("Error accessing webcam:", err);
            responseDiv.innerText = "Error: Could not access webcam. Please grant permission and refresh.";
        }
    }

    function startStreaming() {
        // Initialize AudioContext on user action (important for modern browser security)
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        const ws = new WebSocket('ws://localhost:3000');
        startButton.innerText = "Stop Translation";
        startButton.disabled = true;

        ws.onopen = () => {
            console.log('Connected to WebSocket server!');
            responseDiv.innerText = "Connected! Show me a sign...";
            startButton.disabled = false;

            // Send a frame every 1.5 seconds to avoid hitting ElevenLabs API rate limits
            intervalId = setInterval(() => {
                if (video.readyState === 4) {
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    const data = canvas.toDataURL('image/jpeg');
                    ws.send(data.split(',')[1]);
                }
            }, 1500);
        };

        ws.onmessage = async (event) => {
            // --- Audio Playback Logic ---
            // The server sends back raw audio data as a Blob
            if (event.data instanceof Blob) {
                try {
                    console.log('Received audio data from server.');
                    responseDiv.innerText = `Playing audio...`;

                    // Convert the Blob of audio data into an ArrayBuffer
                    const arrayBuffer = await event.data.arrayBuffer();
                    // Decode the raw audio data into a format the browser can play
                    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

                    // Create a source node to play the decoded audio buffer
                    const source = audioContext.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(audioContext.destination);
                    source.start(0); // Play the audio immediately
                } catch (e) {
                    console.error('Error playing audio:', e);
                }
            } else {
                // This handles any text-based error messages from the server
                const data = JSON.parse(event.data);
                if (data.error) {
                    console.error('Server error:', data.error);
                    responseDiv.innerText = `Error: ${data.error}`;
                }
            }
        };

        ws.onerror = (err) => {
            console.error("WebSocket error:", err);
            responseDiv.innerText = "Error connecting to the backend server.";
        };

        ws.onclose = () => {
            console.log("Disconnected from server.");
            stopStreaming(ws);
        };

        // Update the button's function to stop the stream
        startButton.onclick = () => stopStreaming(ws);
    }

    function stopStreaming(ws) {
        if (intervalId) clearInterval(intervalId);
        if (ws) ws.close();
        startButton.innerText = "Start Translation";
        responseDiv.innerText = "Disconnected.";
        // Reset the button's function to start streaming again
        startButton.onclick = startStreaming;
    }

    // Initial setup
    setupWebcam();
    startButton.onclick = startStreaming;
});

