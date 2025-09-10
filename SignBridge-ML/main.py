from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class ImageRequest(BaseModel):
    image_b64: str

@app.post("/recognize")
async def recognize_sign(request: ImageRequest):
    """
    This is a MOCK endpoint. It simulates the AI model by
    returning a hardcoded text response for testing.
    """
    print("Mock AI Service received a request!")
    return {"text": "Hello from your AI"}