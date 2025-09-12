const express = require('express');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('ws');
const axios = require('axios');
const session = require('express-session');
const passport = require('passport');
const { v4: uuidv4 } = require('uuid');

dotenv.config();
const app = express();

// --- Middleware ---
app.use(express.json());
app.use(express.static("public"));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
}));
app.use(passport.initialize());
app.use(passport.session());

// --- Text-to-Speech Helper Function ---
async function textToSpeech(text) {
    if (!text || text.trim() === "") return null;
    const XI_API_KEY = process.env.ELEVENLABS_API_KEY;
    const VOICE_ID = '21m00Tcm4TlvDq8ikWAM';
    if (!XI_API_KEY) throw new Error("ElevenLabs API key is missing.");
    try {
        const response = await axios.post(
            `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
            { text: text, model_id: "eleven_monolingual_v1" },
            { headers: { 'xi-api-key': XI_API_KEY, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' }, responseType: 'arraybuffer' }
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

const userStates = new Map();

wss.on('connection', (ws) => {
    const userId = uuidv4();
    userStates.set(userId, {
        currentWord: "",
        lastLetter: "",
        speakTimeout: null
    });
    console.log(`Client ${userId} connected.`);

    ws.on('message', async (message) => {
        try {
            const user = userStates.get(userId);
            if (!user) return;

            const mlResponse = await axios.post('http://localhost:8000/recognize', {
                image_b64: message.toString(),
            });
            const recognizedLetter = mlResponse.data.text;

            if (recognizedLetter && recognizedLetter !== user.lastLetter) {
                user.currentWord += recognizedLetter;
                user.lastLetter = recognizedLetter;
                console.log(`User ${userId}'s word is now: "${user.currentWord}"`);
                ws.send(JSON.stringify({ type: 'live_text', data: user.currentWord }));

                clearTimeout(user.speakTimeout);
                user.speakTimeout = setTimeout(async () => {
                    const wordToSpeak = user.currentWord;
                    if (!wordToSpeak) return;

                    console.log(`User ${userId} paused. Speaking word: "${wordToSpeak}"`);
                    const audioBuffer = await textToSpeech(wordToSpeak);
                    if (audioBuffer) {
                        ws.send(audioBuffer);
                    }
                    user.currentWord = "";
                    user.lastLetter = "";
                }, 2000); // Wait 2 seconds before speaking
            } else if (!recognizedLetter) {
                // If no letter was recognized, send a status update.
                ws.send(JSON.stringify({ type: 'status', data: 'No sign detected. Try again.' }));
            }
        } catch (error) {
            console.error('Error in message processing:', error.message);
        }
    });

    ws.on('close', () => {
        const user = userStates.get(userId);
        if (user) clearTimeout(user.speakTimeout);
        userStates.delete(userId);
        console.log(`Client ${userId} disconnected.`);
    });
});

// --- Start the Server ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));