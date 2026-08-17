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
    print("3.6 flash response:", response.text)
except Exception as e:
    print("3.6 flash error:", repr(e))

try:
    response = gemini_client.models.generate_content(
        model="gemini-1.5-flash",
        contents=prompt,
    )
    print("1.5 flash response:", response.text)
except Exception as e:
    print("1.5 flash error:", repr(e))
