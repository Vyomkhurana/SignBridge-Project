# 🌉 SignBridge - Real-time ASL Translation System

[![Node.js](https://img.shields.io/badge/Node.js-v16+-green.svg)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://python.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**SignBridge** is a cutting-edge real-time American Sign Language (ASL) translation system that converts hand gestures into speech using advanced computer vision and AI technologies.

![SignBridge Demo](https://via.placeholder.com/800x400/0066ff/ffffff?text=SignBridge+Demo)

## ✨ Features

- 🤖 **Real-time ASL Detection**: Recognizes 60+ ASL words with high accuracy
- 🎤 **Text-to-Speech**: Converts detected signs to natural speech using ElevenLabs AI
- 🎨 **Modern UI**: Beautiful glassmorphism design with animated gradients
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile devices
- ⚡ **Live Updates**: Instant visual feedback with smooth animations
- 🔧 **Stable Detection**: Anti-flickering technology for consistent recognition
- ⌨️ **Keyboard Shortcuts**: Quick start/stop with spacebar
- 🔊 **Volume Control**: Adjustable speech output volume

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   ML Service   │
│   (Web UI)      │◄──►│   (Node.js)     │◄──►│   (Python)      │
│                 │    │                 │    │                 │
│ • Video Capture │    │ • WebSocket     │    │ • MediaPipe     │
│ • Live Text     │    │ • Session Mgmt  │    │ • Hand Tracking │
│ • Audio Playback│    │ • TTS Integration│    │ • ASL Detection │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** v16 or higher
- **Python** 3.11 or higher
- **ElevenLabs API Key** (for text-to-speech)
- **Webcam** (for video input)

### 1. Clone the Repository

```bash
git clone https://github.com/Vyomkhurana/SignBridge-Project.git
cd SignBridge-Project
```

### 2. Install Dependencies

```bash
# Install main project dependencies
npm install

# Install Python ML dependencies
cd SignBridge-ML
python -m venv venv
venv\Scripts\activate  # On Windows
# source venv/bin/activate  # On macOS/Linux
pip install -r requirements.txt
cd ..
```

### 3. Configure Environment Variables

Create a `.env` file in the `SignBridge-Backend` directory:

```env
# SignBridge-Backend/.env
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
SESSION_SECRET=your_random_session_secret_here
PORT=3000
```

### 4. Get Your ElevenLabs API Key

1. Sign up at [ElevenLabs](https://elevenlabs.io/)
2. Navigate to your [API Keys page](https://elevenlabs.io/app/api-keys)
3. Generate a new API key
4. Copy the key to your `.env` file

### 5. Start the Application

```bash
# Start all services (ML, Backend, Frontend)
npm start
```

This will start:
- 🐍 **ML Service** on `http://localhost:8000`
- 🖥️ **Backend Server** on `http://localhost:3000`
- 🌐 **Frontend** accessible at `http://localhost:3000`

### 6. Open in Browser

Navigate to `http://localhost:3000` and start using SignBridge!

## 📖 Usage Guide

### Basic Usage

1. **Grant Camera Permission**: Allow browser access to your webcam
2. **Click "Start Translation"**: Begin real-time ASL detection
3. **Make ASL Signs**: Hold gestures for 1.5 seconds for detection
4. **Listen to Speech**: Detected words are spoken aloud
5. **Press Spacebar**: Quick start/stop shortcut

### Supported ASL Words

| Category | Words |
|----------|-------|
| **Greetings** | HELLO, WELCOME, HI |
| **Responses** | YES, NO, MAYBE |
| **Emotions** | GOOD, BAD, LOVE, HAPPY, SAD, EXCITED |
| **Family** | MOTHER, FATHER, SISTER, BROTHER, FRIEND, BABY |
| **Actions** | GO, STOP, COME, LOOK, EAT, DRINK |
| **Food & Drink** | FOOD, WATER, MILK, BREAD, COFFEE |
| **Colors** | RED, BLUE, GREEN, YELLOW, BLACK, WHITE |
| **Numbers** | ONE, TWO, THREE, FOUR, FIVE |
| **Communication** | HELP, PLEASE, THANK_YOU, SORRY, EXCUSE_ME |
| **Questions** | WHAT, WHERE, WHEN, WHO, WHY, HOW |

### Gesture Guidelines

- 🤚 **Hold gestures steady** for at least 1.5 seconds
- 💡 **Good lighting** improves detection accuracy
- 📏 **Keep hand in frame** and at comfortable distance
- 🔄 **Wait 2 seconds** between different gestures

## 🔧 Configuration

### Backend Configuration

Edit `SignBridge-Backend/.env`:

```env
# ElevenLabs Text-to-Speech
ELEVENLABS_API_KEY=sk-your-api-key-here

# Session Security
SESSION_SECRET=your-secret-key-here

# Server Port
PORT=3000

# Voice Settings (Optional)
VOICE_ID=21m00Tcm4TlvDq8ikWAM  # Rachel voice
```

### ML Service Configuration

Edit `SignBridge-ML/main.py` detection parameters:

```python
# Timing Configuration
min_detection_interval = 2.0  # Seconds between detections
gesture_hold_time = 1.5       # Hold time required

# Detection Thresholds
min_detection_confidence = 0.5
min_tracking_confidence = 0.5
```

## 🛠️ Development

### Project Structure

```
SignBridge-Project/
├── 📄 package.json              # Main project config
├── 📄 README.md                 # Documentation
├── 📁 SignBridge-Backend/       # Node.js backend
│   ├── 📄 index.js              # Express server & WebSocket
│   ├── 📄 package.json          # Backend dependencies
│   └── 📁 public/               # Static files
│       ├── 📄 index.html        # Frontend UI
│       └── 📄 script.js         # Frontend logic
└── 📁 SignBridge-ML/            # Python ML service
    ├── 📄 main.py               # FastAPI ML server
    ├── 📄 requirements.txt      # Python dependencies
    ├── 📄 start-ml.bat          # ML service launcher
    └── 📄 gesture_recognizer.task # MediaPipe model
```

### Running Individual Services

```bash
# Backend only
cd SignBridge-Backend
npm start

# ML Service only
cd SignBridge-ML
venv\Scripts\activate
python main.py

# Frontend only (served by backend)
# Access http://localhost:3000
```

### API Endpoints

#### WebSocket Connection
- **URL**: `ws://localhost:3000`
- **Purpose**: Real-time video frame processing
- **Data**: Base64 encoded JPEG images

#### REST Endpoints
- `POST /api/translate` - Text translation
- `POST /api/speak` - Text-to-speech conversion

### Adding New ASL Words

1. **Define gesture pattern** in `SignBridge-ML/main.py`:
```python
# Add to detect_asl_word() function
elif fingers == [0, 1, 0, 1, 0]:  # Your pattern
    return "YOUR_WORD"
```

2. **Update vocabulary** in `SignBridge-Backend/public/index.html`:
```html
<div class="vocab-item">YOUR_WORD</div>
```

## 🐛 Troubleshooting

### Common Issues

**Camera not working:**
- Grant browser camera permissions
- Check if camera is used by another application
- Try refreshing the page

**No audio output:**
- Check volume slider settings
- Verify ElevenLabs API key is valid
- Ensure speakers/headphones are working

**ASL detection not working:**
- Ensure good lighting conditions
- Keep hand within camera frame
- Hold gestures steady for 1.5+ seconds
- Check ML service console for errors

**Connection errors:**
- Verify all services are running (`npm start`)
- Check firewall settings
- Ensure ports 3000 and 8000 are available

### Debug Mode

Enable debug logging in `SignBridge-Backend/index.js`:

```javascript
// Add at top of file
const DEBUG = true;

// Add debugging throughout
if (DEBUG) console.log('Debug info:', data);
```

## 📊 Performance

### System Requirements

- **CPU**: Modern multi-core processor
- **RAM**: 4GB minimum, 8GB recommended
- **GPU**: Optional (MediaPipe can use GPU acceleration)
- **Bandwidth**: Minimal (all processing is local)

### Optimization Tips

- Close unnecessary browser tabs
- Use Chrome or Edge for best performance
- Ensure good lighting for better detection
- Keep background simple and contrasting

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Test thoroughly
5. Commit: `git commit -m 'Add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Code Style

- **Frontend**: Prettier + ESLint
- **Backend**: Standard JavaScript style
- **Python**: PEP 8 + Black formatter

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [MediaPipe](https://mediapipe.dev/) - Hand tracking and gesture recognition
- [ElevenLabs](https://elevenlabs.io/) - High-quality text-to-speech
- [FastAPI](https://fastapi.tiangolo.com/) - Modern Python web framework
- [Express.js](https://expressjs.com/) - Node.js web framework


<div align="center">

**Made with ❤️ **

[⭐ Star this repo](https://github.com/Vyomkhurana/SignBridge-Project) • [🍴 Fork it](https://github.com/Vyomkhurana/SignBridge-Project/fork) • [📝 Report bug](https://github.com/Vyomkhurana/SignBridge-Project/issues)

</div>
