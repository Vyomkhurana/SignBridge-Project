from fastapi import FastAPI
from pydantic import BaseModel
import cv2
import numpy as np
import base64
import os
import uvicorn
import mediapipe as mp
import time
from collections import Counter

app = FastAPI()

# --- ASL WORD Detection Variables (IMPROVED STABILITY) ---
last_detection_time = 0
min_detection_interval = 2.0  # Increased from 1.5 to 2.0 seconds for better stability
recent_detections = []
max_recent_detections = 3
current_gesture_start_time = 0
gesture_hold_time = 1.5  # Increased from 1.0 to 1.5 seconds for more stable detection
gesture_confidence_threshold = 3  # Require gesture to be detected 3 times consistently

# --- MediaPipe Hand Landmarker Setup ---
mp_hands = mp.solutions.hands
mp_drawing = mp.solutions.drawing_utils

hands = mp_hands.Hands(
    static_image_mode=False,
    max_num_hands=1,
    min_detection_confidence=0.5,  # Reduced for faster detection
    min_tracking_confidence=0.5
)

def get_finger_positions(landmarks):
    """Determine which fingers are extended based on landmarks"""
    tip_ids = [4, 8, 12, 16, 20]  # thumb, index, middle, ring, pinky tips
    pip_ids = [3, 6, 10, 14, 18]  # corresponding joints

    fingers = []

    # Thumb (special case - compare x coordinates)
    if landmarks[tip_ids[0]].x > landmarks[pip_ids[0]].x:
        fingers.append(1)
    else:
        fingers.append(0)

    # Other fingers (compare y coordinates)
    for i in range(1, 5):
        if landmarks[tip_ids[i]].y < landmarks[pip_ids[i]].y:
            fingers.append(1)
        else:
            fingers.append(0)

    return fingers

def detect_asl_word(landmarks):
    """Detect ASL WORDS - EXPANDED VOCABULARY"""

    if not landmarks:
        return ""

    fingers = get_finger_positions(landmarks)
    finger_count = sum(fingers)

    # Get landmark positions for detailed analysis
    thumb_tip = landmarks[4]
    index_tip = landmarks[8]
    middle_tip = landmarks[12]
    ring_tip = landmarks[16]
    pinky_tip = landmarks[20]
    thumb_mcp = landmarks[2]
    index_mcp = landmarks[5]
    middle_mcp = landmarks[9]
    wrist = landmarks[0]

    # Calculate distances and angles for more precise detection
    thumb_index_dist = ((thumb_tip.x - index_tip.x)**2 + (thumb_tip.y - index_tip.y)**2)**0.5
    finger_spread = abs(index_tip.x - middle_tip.x)
    hand_openness = abs(pinky_tip.x - thumb_tip.x)

    # EXPANDED ASL WORD VOCABULARY

    # === GREETINGS & BASIC WORDS ===
    if fingers == [0, 1, 1, 1, 1] or fingers == [1, 1, 1, 1, 1]:
        return "HELLO"
    elif fingers == [1, 1, 1, 1, 1] and hand_openness > 0.15:
        return "WELCOME"
    elif fingers == [0, 1, 1, 1, 1] and hand_openness < 0.12:
        return "HI"

    # === YES/NO RESPONSES ===
    elif fingers == [0, 0, 0, 0, 0]:
        return "YES"
    elif fingers == [0, 1, 1, 0, 0] and finger_spread > 0.05:
        return "NO"
    elif fingers == [1, 1, 0, 0, 0] and thumb_index_dist > 0.08:
        return "MAYBE"

    # === EMOTIONS & FEELINGS ===
    elif fingers == [1, 0, 0, 0, 0]:
        return "GOOD"
    elif fingers == [0, 1, 0, 0, 0] and index_tip.y > index_mcp.y:
        return "BAD"
    elif fingers == [1, 0, 0, 0, 1]:
        return "LOVE"
    elif fingers == [0, 1, 1, 1, 1] and middle_tip.y < wrist.y:
        return "HAPPY"
    elif finger_count == 0 and thumb_tip.y > wrist.y:
        return "SAD"
    elif fingers == [1, 1, 1, 0, 0]:
        return "EXCITED"

    # === FAMILY & PEOPLE ===
    elif fingers == [0, 1, 0, 0, 0]:
        return "MOTHER"
    elif fingers == [1, 0, 1, 0, 0]:
        return "FATHER"
    elif fingers == [0, 0, 1, 0, 0]:
        return "SISTER"
    elif fingers == [0, 0, 0, 1, 0]:
        return "BROTHER"
    elif fingers == [0, 1, 1, 0, 0] and finger_spread < 0.03:
        return "FRIEND"
    elif fingers == [1, 1, 0, 0, 0] and thumb_index_dist < 0.05:
        return "BABY"

    # === COMMON ACTIONS ===
    elif fingers == [0, 1, 0, 0, 0] and index_tip.y < wrist.y:
        return "GO"
    elif fingers == [0, 1, 1, 1, 1]:
        return "STOP"
    elif fingers == [1, 1, 1, 1, 0]:
        return "COME"
    elif fingers == [0, 1, 1, 0, 0] and finger_spread > 0.08:
        return "LOOK"
    elif finger_count <= 1 and thumb_tip.y < wrist.y:
        return "EAT"
    elif fingers == [0, 0, 0, 0, 1]:
        return "DRINK"

    # === NEEDS & WANTS ===
    elif finger_count >= 3 and all(tip.y > wrist.y - 0.05 for tip in [index_tip, middle_tip, ring_tip]):
        return "WANT"
    elif fingers == [0, 0, 0, 0, 0] and thumb_tip.x < wrist.x:
        return "NEED"
    elif fingers == [1, 0, 1, 1, 1]:
        return "LIKE"
    elif fingers == [0, 1, 0, 1, 0]:
        return "DISLIKE"

    # === FOOD & DRINK ===
    elif finger_count <= 1 and thumb_index_dist < 0.06:
        return "FOOD"
    elif fingers == [0, 1, 1, 1, 0]:
        return "WATER"
    elif fingers == [1, 0, 0, 1, 1]:
        return "MILK"
    elif fingers == [0, 0, 1, 1, 1]:
        return "BREAD"
    elif fingers == [1, 1, 0, 1, 0]:
        return "COFFEE"

    # === COLORS ===
    elif fingers == [0, 1, 0, 0, 0] and index_tip.x > middle_tip.x:
        return "RED"
    elif fingers == [0, 0, 1, 0, 0]:
        return "BLUE"
    elif fingers == [0, 1, 1, 0, 0] and finger_spread < 0.04:
        return "GREEN"
    elif fingers == [1, 1, 1, 0, 0] and hand_openness < 0.1:
        return "YELLOW"
    elif fingers == [0, 0, 0, 0, 0]:
        return "BLACK"
    elif fingers == [1, 1, 1, 1, 1]:
        return "WHITE"

    # === NUMBERS ===
    elif fingers == [0, 1, 0, 0, 0]:
        return "ONE"
    elif fingers == [0, 1, 1, 0, 0]:
        return "TWO"
    elif fingers == [0, 1, 1, 1, 0]:
        return "THREE"
    elif fingers == [0, 1, 1, 1, 1]:
        return "FOUR"
    elif fingers == [1, 1, 1, 1, 1]:
        return "FIVE"

    # === TIME & PLACES ===
    elif fingers == [1, 0, 0, 0, 0] and thumb_tip.y < middle_tip.y:
        return "TODAY"
    elif fingers == [0, 0, 0, 1, 1]:
        return "TOMORROW"
    elif fingers == [1, 1, 0, 0, 1]:
        return "HOME"
    elif fingers == [0, 1, 1, 1, 0] and middle_tip.y < wrist.y:
        return "WORK"
    elif fingers == [1, 0, 1, 0, 1]:
        return "SCHOOL"

    # === COMMUNICATION ===
    elif fingers == [0, 1, 0, 0, 0]:
        return "HELP"
    elif fingers == [1, 1, 1, 1, 1] and hand_openness > 0.12:
        return "PLEASE"
    elif fingers == [0, 1, 1, 1, 1] and finger_spread < 0.08:
        return "THANK_YOU"
    elif fingers == [0, 0, 0, 0, 0] and thumb_tip.y < wrist.y:
        return "SORRY"
    elif fingers == [1, 0, 1, 1, 0]:
        return "EXCUSE_ME"

    # === WEATHER & NATURE ===
    elif fingers == [0, 1, 1, 1, 1] and all(tip.y < wrist.y for tip in [index_tip, middle_tip]):
        return "SUN"
    elif fingers == [0, 0, 1, 1, 0]:
        return "RAIN"
    elif fingers == [1, 1, 1, 1, 0] and pinky_tip.y > wrist.y:
        return "WIND"
    elif finger_count == 0 and thumb_tip.y > middle_tip.y:
        return "COLD"
    elif fingers == [1, 1, 1, 1, 1] and all(tip.y > wrist.y for tip in [thumb_tip, index_tip]):
        return "HOT"

    # === ANIMALS ===
    elif fingers == [0, 0, 1, 1, 0] and middle_tip.y < ring_tip.y:
        return "CAT"
    elif fingers == [1, 1, 0, 0, 0] and thumb_tip.y < index_tip.y:
        return "DOG"
    elif fingers == [0, 1, 0, 0, 1] and index_tip.y < pinky_tip.y:
        return "BIRD"

    # === QUESTIONS ===
    elif fingers == [0, 1, 0, 0, 0] and index_tip.y < middle_mcp.y:
        return "WHAT"
    elif fingers == [0, 1, 1, 0, 0] and abs(index_tip.y - middle_tip.y) < 0.02:
        return "WHERE"
    elif fingers == [0, 1, 1, 1, 0] and ring_tip.y < middle_tip.y:
        return "WHEN"
    elif fingers == [0, 1, 0, 0, 0] and index_tip.x > wrist.x + 0.1:
        return "WHO"
    elif fingers == [0, 1, 1, 0, 0] and finger_spread > 0.1:
        return "WHY"
    elif fingers == [0, 1, 1, 1, 1] and thumb_tip.y > index_tip.y:
        return "HOW"

    # === DEFAULT FALLBACKS ===
    if finger_count == 5:
        return "HELLO"
    elif finger_count == 2 and fingers[1] == 1 and fingers[2] == 1:
        return "TWO"
    elif finger_count == 1 and fingers[0] == 1:
        return "GOOD"
    elif finger_count == 1 and fingers[1] == 1:
        return "ONE"
    elif finger_count == 0:
        return "YES"

    return ""

# Global variable to track current gesture
current_detected_word = ""
gesture_start_time = 0

class ImageRequest(BaseModel):
    image_b64: str

@app.post("/recognize")
async def recognize_sign(request: ImageRequest):
    try:
        global last_detection_time, recent_detections, current_detected_word, gesture_start_time

        current_time = time.time()

        # Decode image
        img_bytes = base64.b64decode(request.image_b64)
        img_arr = np.frombuffer(img_bytes, dtype=np.uint8)
        image = cv2.imdecode(img_arr, flags=cv2.IMREAD_COLOR)

        if image is None:
            return {"text": ""}

        # Convert BGR to RGB for MediaPipe
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

        # Process with MediaPipe
        results = hands.process(rgb_image)

        predicted_text = ""

        if results.multi_hand_landmarks:
            # Get the first hand
            hand_landmarks = results.multi_hand_landmarks[0]
            landmarks = hand_landmarks.landmark

            # Detect ASL word
            detected_word = detect_asl_word(landmarks)

            if detected_word:
                # Check if this is the same gesture being held
                if detected_word == current_detected_word:
                    # Continue timing the current gesture
                    hold_duration = current_time - gesture_start_time

                    # If held long enough and enough time passed since last detection
                    if (hold_duration >= gesture_hold_time and
                        current_time - last_detection_time >= min_detection_interval):

                        predicted_text = detected_word
                        last_detection_time = current_time
                        print(f"ASL WORD detected: {predicted_text} (held for {hold_duration:.1f}s)")

                        # Reset gesture tracking
                        current_detected_word = ""
                        gesture_start_time = 0

                else:
                    # New gesture detected, start timing
                    current_detected_word = detected_word
                    gesture_start_time = current_time
                    print(f"New gesture detected: {detected_word}, starting timer...")
            else:
                # No gesture detected, reset tracking
                current_detected_word = ""
                gesture_start_time = 0
        else:
            # No hand detected, reset tracking
            current_detected_word = ""
            gesture_start_time = 0

        return {"text": predicted_text}

    except Exception as e:
        print(f"Error during recognition: {e}")
        import traceback
        traceback.print_exc()
        return {"text": ""}

print("EXPANDED ASL WORD Detection System Loaded - IMPROVED STABILITY!")
print("VOCABULARY CATEGORIES:")
print("   • GREETINGS: HELLO, WELCOME, HI")
print("   • RESPONSES: YES, NO, MAYBE")
print("   • EMOTIONS: GOOD, BAD, LOVE, HAPPY, SAD, EXCITED")
print("   • FAMILY: MOTHER, FATHER, SISTER, BROTHER, FRIEND, BABY")
print("   • ACTIONS: GO, STOP, COME, LOOK, EAT, DRINK")
print("   • NEEDS: WANT, NEED, LIKE, DISLIKE")
print("   • FOOD: FOOD, WATER, MILK, BREAD, COFFEE")
print("   • COLORS: RED, BLUE, GREEN, YELLOW, BLACK, WHITE")
print("   • NUMBERS: ONE, TWO, THREE, FOUR, FIVE")
print("   • TIME/PLACES: TODAY, TOMORROW, HOME, WORK, SCHOOL")
print("   • COMMUNICATION: HELP, PLEASE, THANK_YOU, SORRY, EXCUSE_ME")
print("   • WEATHER: SUN, RAIN, WIND, COLD, HOT")
print("   • ANIMALS: CAT, DOG, BIRD")
print("   • QUESTIONS: WHAT, WHERE, WHEN, WHO, WHY, HOW")
print("TIMING: Hold gesture for 1.5 seconds, 2.0 second intervals")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
