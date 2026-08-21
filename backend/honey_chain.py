import hashlib
import json
from datetime import datetime
from fastapi import Request, HTTPException
import logging

def attach_honey_chain_routes(app, supabase, gemini_client, BUSINESS_NAME):
    # --- 1. Hive Management ---
    @app.get("/api/honey/hives")
    def get_hives():
        try:
            business_response = supabase.table("businesses").select("id").eq("name", BUSINESS_NAME).single().execute()
            business_id = business_response.data.get("id") if business_response.data else None
            
            if not business_id:
                return {"hives": []}
                
            res = supabase.table("hives").select("*").eq("business_id", business_id).order("created_at", desc=True).execute()
            return {"hives": res.data or []}
        except Exception as e:
            print("Error fetching hives:", e)
            return {"hives": []}

    @app.post("/api/honey/hives")
    async def create_hive(request: Request):
        try:
            data = await request.json()
            business_response = supabase.table("businesses").select("id").eq("name", BUSINESS_NAME).single().execute()
            business_id = business_response.data.get("id")
            
            data["business_id"] = business_id
            res = supabase.table("hives").insert(data).execute()
            return {"success": True, "hive": res.data[0] if res.data else None}
        except Exception as e:
            print("Error creating hive:", e)
            raise HTTPException(status_code=500, detail=str(e))

    @app.delete("/api/honey/hives/{hive_id}")
    def delete_hive(hive_id: str):
        try:
            supabase.table("hives").delete().eq("id", hive_id).execute()
            return {"success": True}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    # --- 2. IoT Sensor Data Simulation ---
    @app.post("/api/honey/hives/{hive_id}/sensor-data")
    async def add_sensor_data(hive_id: str, request: Request):
        try:
            data = await request.json()
            data["hive_id"] = hive_id
            res = supabase.table("hive_sensor_readings").insert(data).execute()
            return {"success": True, "reading": res.data[0] if res.data else None}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @app.get("/api/honey/hives/{hive_id}/sensor-data")
    def get_sensor_data(hive_id: str):
        try:
            res = supabase.table("hive_sensor_readings").select("*").eq("hive_id", hive_id).order("created_at", desc=True).limit(20).execute()
            return {"readings": res.data or []}
        except Exception as e:
            return {"readings": []}

    # --- 3. AI Hive Insights ---
    @app.get("/api/honey/insights/{hive_id}")
    def get_hive_insights(hive_id: str):
        try:
            hive_res = supabase.table("hives").select("*").eq("id", hive_id).single().execute()
            readings_res = supabase.table("hive_sensor_readings").select("*").eq("hive_id", hive_id).order("created_at", desc=True).limit(5).execute()
            
            if not hive_res.data:
                return {"insight": "Hive not found."}
                
            hive = hive_res.data
            readings = readings_res.data or []
            
            prompt = f"""
You are an expert apiarist (beekeeper) AI.
Analyze the following hive and recent sensor data and provide a concise health summary.
IMPORTANT: State clearly that this is an AI recommendation, not a guaranteed biological diagnosis.

Hive Info: Location: {hive.get('apiary_location')}, Type: {hive.get('colony_type')}, Queen: {hive.get('queen_status')}
Recent Sensors: {json.dumps(readings, default=str)}

Provide JSON response:
{{
  "health_summary": "Overall health summary",
  "warnings": ["List of abnormal conditions or 'None'"],
  "productivity_prediction": "Prediction of honey yield",
  "recommended_action": "Actionable advice",
  "risk_level": "Low/Medium/High"
}}
"""
            response = gemini_client.models.generate_content(
                model="gemini-3.6-flash",
                contents=prompt,
            )
            raw = response.text.strip()
            if raw.startswith("```json"):
                raw = raw.replace("```json", "").replace("```", "").strip()
            return {"insight": json.loads(raw)}
        except Exception as e:
            print("Insights error:", e)
            return {"insight": {"health_summary": "Unable to generate insights at this time.", "warnings": [], "risk_level": "Unknown"}}

    # --- 4. Honey Harvests ---
    @app.get("/api/honey/harvests")
    def get_harvests():
        try:
            res = supabase.table("honey_harvests").select("*, hives(apiary_location)").order("harvest_date", desc=True).execute()
            return {"harvests": res.data or []}
        except Exception as e:
            return {"harvests": []}

    @app.post("/api/honey/harvests")
    async def create_harvest(request: Request):
        try:
            data = await request.json()
            res = supabase.table("honey_harvests").insert(data).execute()
            return {"success": True, "harvest": res.data[0] if res.data else None}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    # --- 5. Honey Batches ---
    @app.get("/api/honey/batches")
    def get_batches():
        try:
            res = supabase.table("honey_batches").select("*, hives(apiary_location), honey_harvests(harvest_date)").order("created_at", desc=True).execute()
            return {"batches": res.data or []}
        except Exception as e:
            return {"batches": []}

    @app.get("/api/honey/batches/{batch_id}")
    def get_batch(batch_id: str):
        try:
            res = supabase.table("honey_batches").select("*, hives(apiary_location, colony_type), honey_harvests(moisture_percentage, quality_grade)").eq("batch_id", batch_id).single().execute()
            return {"batch": res.data}
        except Exception as e:
            raise HTTPException(status_code=404, detail="Batch not found")

    @app.post("/api/honey/batches")
    async def create_batch(request: Request):
        try:
            data = await request.json()
            res = supabase.table("honey_batches").insert(data).execute()
            batch = res.data[0] if res.data else None
            
            if batch:
                record_blockchain_event(supabase, batch["batch_id"], "Batch Created", batch)
                
            return {"success": True, "batch": batch}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @app.post("/api/honey/ai-generate-batch")
    async def ai_generate_batch(request: Request):
        try:
            data = await request.json()
            user_prompt = data.get("prompt", "")
            
            # Fetch random hive to associate if none specified (for demo simplicity)
            hive_res = supabase.table("hives").select("id").limit(1).execute()
            default_hive_id = hive_res.data[0]["id"] if hive_res.data else None
            
            sys_prompt = f"""
You are an AI assistant for ApisAI, a smart apiary platform.
The user wants to log a new honey batch based on their notes.
Extract or reasonably infer the details to create a structured JSON payload for the database.
Assume today's date is {datetime.utcnow().strftime('%Y-%m-%d')} if not specified.
Always generate a batch_id like 'HC-AI-' followed by 4 random digits.
If a hive_id is not identifiable, use this default: {default_hive_id}

Provide ONLY a valid JSON object matching this schema:
{{
  "batch_id": "string",
  "hive_id": "string",
  "product_name": "string",
  "honey_variety": "string",
  "quantity": number,
  "harvest_date": "YYYY-MM-DD",
  "packaging_date": "YYYY-MM-DD",
  "quality_info": "string",
  "status": "Available"
}}

User Notes: {user_prompt}
"""
            response = gemini_client.models.generate_content(
                model="gemini-3.6-flash",
                contents=sys_prompt,
            )
            raw = response.text.strip()
            if raw.startswith("```json"):
                raw = raw.replace("```json", "").replace("```", "").strip()
            return {"success": True, "batch": json.loads(raw)}
        except Exception as e:
            print("AI Generate error:", e)
            raise HTTPException(status_code=500, detail=str(e))

    # --- 6. Blockchain Traceability ---
    def record_blockchain_event(supabase_client, batch_id: str, event_type: str, event_data: dict):
        try:
            prev = supabase_client.table("blockchain_records").select("current_hash").eq("batch_id", batch_id).order("created_at", desc=True).limit(1).execute()
            previous_hash = prev.data[0]["current_hash"] if prev.data else "0" * 64
            
            timestamp = datetime.utcnow().isoformat()
            payload = f"{batch_id}{event_type}{json.dumps(event_data, sort_keys=True)}{previous_hash}{timestamp}"
            current_hash = hashlib.sha256(payload.encode()).hexdigest()
            
            record = {
                "batch_id": batch_id,
                "event_type": event_type,
                "event_data": event_data,
                "previous_hash": previous_hash,
                "current_hash": current_hash
            }
            supabase_client.table("blockchain_records").insert(record).execute()
            return record
        except Exception as e:
            print("Blockchain record error:", e)
            return None

    @app.post("/api/honey/blockchain/record")
    async def manual_blockchain_record(request: Request):
        try:
            data = await request.json()
            record = record_blockchain_event(supabase, data["batch_id"], data["event_type"], data.get("event_data", {}))
            return {"success": True, "record": record}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @app.get("/api/honey/blockchain/verify/{batch_id}")
    def verify_blockchain(batch_id: str):
        try:
            res = supabase.table("blockchain_records").select("*").eq("batch_id", batch_id).order("created_at", desc=False).execute()
            records = res.data or []
            
            is_valid = True
            previous_hash = "0" * 64
            
            for record in records:
                if record["previous_hash"] != previous_hash:
                    is_valid = False
                    break
                previous_hash = record["current_hash"]
                
            return {"verified": is_valid, "records": records}
        except Exception as e:
            return {"verified": False, "records": []}
