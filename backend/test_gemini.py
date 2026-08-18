import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

try:
    gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    prompt = "Hello"
    
    response = gemini_client.models.generate_content(
        model="gemini-3.6-flash",
        contents=prompt,
    )
    print("gemini-3.6-flash response:", response.text)
except Exception as e:
    print("gemini-3.6-flash error:", repr(e))
