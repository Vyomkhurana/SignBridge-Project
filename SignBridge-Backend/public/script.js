// This event listener ensures the script runs only after the entire HTML page is loaded and ready.
document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('video');
    const responseDiv = document.getElementById('response');

    // Check if the necessary HTML elements exist on the page
    if (!video || !responseDiv) {
        console.error("Could not find necessary HTML elements (video or response div).");
        return;
    }

    // Check if the browser supports the modern API for webcam access
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        responseDiv.innerText = "Error: Your browser does not support webcam access.";
        return;
    }

    // This function encapsulates the entire webcam and streaming logic
    async function setupWebcamAndStream() {
        try {
            // This is the line that will trigger the browser's permission prompt for the camera
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = stream;
        } catch (err) {
            console.error("Error accessing webcam:", err);
            responseDiv.innerText = "Error: Could not access webcam. Please grant permission and refresh the page.";
            return;
        }

        // Establish a connection to your NodeJS WebSocket server
        const ws = new WebSocket('ws://localhost:3000');

        ws.onopen = () => {
            console.log('Connected to WebSocket server!');
            responseDiv.innerText = "Connected! Streaming video frames...";

            // Send a frame from the video every 500ms (2 frames per second)
            setInterval(() => {
                // Ensure the video has loaded enough data to capture a frame
                if (video.readyState === 4) {
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    // Convert the frame on the canvas to a JPEG image, then to a Base64 string
                    const data = canvas.toDataURL('image/jpeg');

                    // Send only the Base64 data, removing the "data:image/jpeg;base64," header
                    ws.send(data.split(',')[1]);
                }
            }, 500);
        };

        ws.onmessage = (event) => {
            // The server sends back raw audio data (a Blob). We can't play it directly
            // without more code, but we can confirm that a response was received.
            console.log('Received audio data from server.');
            responseDiv.innerText = `Received new audio response from server!`;
        };

        ws.onerror = (err) => {
            console.error("WebSocket error:", err);
            responseDiv.innerText = "Error connecting to the backend server.";
        };
    }

    // Call the main function to start the process
    setupWebcamAndStream();
});

