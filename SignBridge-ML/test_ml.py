#!/usr/bin/env python3
"""
Test script to verify ML service is working correctly
"""
import requests
import base64
import cv2
import numpy as np

def test_ml_service():
    print("Testing ML service...")

    # Create a simple test image (solid color)
    test_image = np.zeros((480, 640, 3), dtype=np.uint8)
    test_image[:, :] = [100, 150, 200]  # Light blue background

    # Encode as JPEG
    _, buffer = cv2.imencode('.jpg', test_image)
    test_b64 = base64.b64encode(buffer).decode('utf-8')

    try:
        # Test the ML service
        response = requests.post(
            'http://localhost:8000/recognize',
            json={'image_b64': test_b64},
            timeout=10
        )

        print(f"Response status: {response.status_code}")
        print(f"Response body: {response.json()}")

        if response.status_code == 200:
            print("✅ ML service is responding correctly!")
        else:
            print("❌ ML service returned error status")

    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to ML service. Is it running on localhost:8000?")
    except requests.exceptions.Timeout:
        print("❌ ML service request timed out")
    except Exception as e:
        print(f"❌ Error testing ML service: {e}")

if __name__ == "__main__":
    test_ml_service()
