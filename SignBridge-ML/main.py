from fastapi import FastAPI
from pydantic import BaseModel
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import cv2
import numpy as np
import base64
import os
import urllib.request

app = FastAPI()

# --- Step 1: Download and Set Up the Pre-trained Model ---
# Define the path where the model will be saved
model_path = 'gesture_recognizer.task'

# Download the model from Google's servers if it doesn't already exist
if not os.path.exists(model_path):
    print(f"Downloading pre-trained ASL model to {model_path}...")
    url = 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task'
    urllib.request.urlretrieve(url, model_path)
    print("Download complete.")

# Create the Gesture Recognizer instance with the downloaded model
base_options = python.BaseOptions(model_asset_path=model_path)
options = vision.GestureRecognizerOptions(base_options=base_options)
recognizer = vision.GestureRecognizer.create_from_options(options)
print("ASL Gesture Recognizer loaded successfully.")


# --- Step 2: Define the API Structure ---
class ImageRequest(BaseModel):
    image_b64: str

@app.post("/recognize")
async def recognize_sign(request: ImageRequest):
    """
    This endpoint receives a video frame, processes it with MediaPipe,
    and uses the pre-trained model to predict the ASL alphabet letter.
    """
    try:
        # 1. Decode the Base64 image string from the request
        img_bytes = base64.b64decode(request.image_b64)
        img_arr = np.frombuffer(img_bytes, dtype=np.uint8)
        image = cv2.imdecode(img_arr, flags=cv2.IMREAD_COLOR)

        # The model needs the image in RGB format, but OpenCV loads it in BGR
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

        # Create a MediaPipe Image object for the model
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_rgb)

        # 2. Use the model to recognize the gesture in the image
        recognition_result = recognizer.recognize(mp_image)

        predicted_text = ""
        # 3. Process the results to find the most likely letter
        if recognition_result.gestures:
            # Get the top gesture prediction from the list of results
            top_gesture = recognition_result.gestures[0][0]
            # Format the output to include the letter and confidence score
            predicted_text = f"{top_gesture.category_name} (Confidence: {top_gesture.score:.2f})"
            print(f"Recognized: {predicted_text}")

        return {"text": predicted_text}

    except Exception as e:
        print(f"Error during recognition: {e}")
        return {"text": ""}