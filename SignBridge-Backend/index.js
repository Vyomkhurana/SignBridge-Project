const express = require('express');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('ws');
const axios = require('axios');
const session = require('express-session');

// Load environment variables from your .env file
dotenv.config();

const app = express();

// --- Middleware Setup ---
app.use(express.json());

// --- THIS LINE IS CRITICAL ---
// It tells Express to serve your index.html and script.js files.
app.use(express.static("public"));

app.use(session({
    secret: process.env.SESSION_SECRET || "demosecret",
    resave: false,
    saveUninitialized: true,
}));



// --- Helper Function for ElevenLabs API ---
async function textToSpeech(text) {
    const XI_API_KEY = process.env.ELEVENLABS_API_KEY;
    const VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

    if (!XI_API_KEY) throw new Error("ElevenLabs API key is missing.");

    try {
        const response = await axios.post(
            `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
            { text: text, model_id: "eleven_monolingual_v1" },
            {
                headers: {
                    'xi-api-key': XI_API_KEY,
                    'Content-Type': 'application/json',
                    'Accept': 'audio/mpeg'
                },
                responseType: 'arraybuffer'
            }
        );
        return response.data;
    } catch (error) {
        console.error("Error with ElevenLabs API:", error.message);
        return null;
    }
}

// --- Server and WebSocket Setup ---
const server = http.createServer(app);
const wss = new Server({ server });

wss.on('connection', (ws) => {
    console.log('A client has connected.');
    ws.on('message', async (message) => {
        try {
            console.log('Received a frame from the client.');
            const mlResponse = await axios.post('http://localhost:8000/recognize', {
                image_b64: message.toString(),
            });
            const translatedText = mlResponse.data.text;
            console.log(`AI Service responded with: "${translatedText}"`);
            const audioBuffer = await textToSpeech(translatedText);
            if (audioBuffer) {
                ws.send(audioBuffer);
                console.log('Sent audio data back to the client.');
            }
        } catch (error) {
            console.error('Error in message processing:', error.message);
            ws.send(JSON.stringify({ error: 'Failed to process frame.' }));
        }
    });
    ws.on('close', () => console.log('A client has disconnected.'));
});

const PYTHON_API_URL = "http://127.0.0.1:8000/translate";


app.post("/get-sign", async (req, res) => {
  try {
    // 1. Get the 'text' from the incoming request body.
    const { text } = req.body;

    if (!text) {
      return res.status(400).send({ error: "The 'text' field is required in the request body." });
    }

    // 2. Call the Python translation API.
    const pythonApiResponse = await fetch(PYTHON_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }), // Only send the 'text' field as required by the Python API.
    });

    // 3. Check if the call to the Python API was successful.
    if (!pythonApiResponse.ok) {
      // If not, forward the error from the Python API to the client.
      const errorText = await pythonApiResponse.text();
      return res.status(pythonApiResponse.status).send({
        error: "Failed to get translation from Python API.",
        details: errorText,
      });
    }

    // 4. The Python API returns JSON, so we parse it as JSON.
    const responseData = await pythonApiResponse.json();
    
    // 5. Extract the video_url from the response.
    const videoUrl = responseData.video_url;

    // 6. Send the video URL back to the client.
    res.status(200).send({ video_url: videoUrl });

  } catch (err) {
    console.error("Error in /get-sign endpoint:", err);
    res.status(500).send({ error: err.message });
  }
});


// --- Start the Server ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));

