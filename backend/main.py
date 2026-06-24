from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import requests
import os
import io
import random

# Optional file extractors
try:
    import docx
    HAS_DOCX = True
except ImportError:
    HAS_DOCX = False

try:
    import PyPDF2
    HAS_PDF = True
except ImportError:
    HAS_PDF = False

app = FastAPI(title="Clinical NER System")

# CORS - allow everything for demo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Hugging Face Inference API
HF_API_URL = "https://api-inference.huggingface.co/models/d4data/biomedical-ner-all"
HF_TOKEN = os.getenv("HF_API_TOKEN", "")

class TextInput(BaseModel):
    text: str

class Entity(BaseModel):
    text: str
    label: str
    start: int
    end: int
    score: float

class NERResponse(BaseModel):
    entities: List[Entity]
    text: str
    stats: dict

# ─── DEMO DATA ───
DEMO_TEXT = """Patient John Doe, 58-year-old male, was admitted on June 15, 2024, with complaints of severe chest pain radiating to the left arm. 
He has a history of Type 2 Diabetes Mellitus, Hypertension, and Hyperlipidemia. 
Current medications include Metformin 1000mg twice daily, Lisinopril 10mg daily, Atorvastatin 40mg daily, and Aspirin 81mg daily.
Physical examination revealed elevated blood pressure at 160/95 mmHg. 
ECG showed ST-segment elevation in leads V1-V4. 
Troponin levels were elevated at 2.4 ng/mL. 
Patient was diagnosed with Acute Myocardial Infarction and scheduled for emergency Percutaneous Coronary Intervention (PCI).
Dr. Sarah Smith, the attending cardiologist, performed the procedure. 
Post-operative care included administration of Heparin infusion and Clopidogrel 75mg daily.
Follow-up appointment scheduled for July 2, 2024 with Dr. Michael Johnson."""

DEMO_ENTITIES = [
    {"text": "John Doe", "label": "PERSON", "start": 8, "end": 16, "score": 0.98},
    {"text": "58-year-old", "label": "ANATOMY", "start": 18, "end": 29, "score": 0.85},
    {"text": "chest pain", "label": "SYMPTOM", "start": 81, "end": 91, "score": 0.96},
    {"text": "left arm", "label": "ANATOMY", "start": 111, "end": 119, "score": 0.92},
    {"text": "Type 2 Diabetes Mellitus", "label": "DISEASE", "start": 147, "end": 171, "score": 0.97},
    {"text": "Hypertension", "label": "DISEASE", "start": 173, "end": 185, "score": 0.95},
    {"text": "Hyperlipidemia", "label": "DISEASE", "start": 191, "end": 205, "score": 0.94},
    {"text": "Metformin", "label": "DRUG", "start": 232, "end": 241, "score": 0.98},
    {"text": "1000mg", "label": "CHEMICAL", "start": 242, "end": 248, "score": 0.89},
    {"text": "Lisinopril", "label": "DRUG", "start": 266, "end": 276, "score": 0.97},
    {"text": "10mg", "label": "CHEMICAL", "start": 277, "end": 281, "score": 0.88},
    {"text": "Atorvastatin", "label": "DRUG", "start": 291, "end": 303, "score": 0.97},
    {"text": "40mg", "label": "CHEMICAL", "start": 304, "end": 308, "score": 0.87},
    {"text": "Aspirin", "label": "DRUG", "start": 318, "end": 325, "score": 0.96},
    {"text": "81mg", "label": "CHEMICAL", "start": 326, "end": 330, "score": 0.86},
    {"text": "blood pressure", "label": "ANATOMY", "start": 377, "end": 391, "score": 0.91},
    {"text": "160/95 mmHg", "label": "CHEMICAL", "start": 395, "end": 406, "score": 0.84},
    {"text": "ST-segment elevation", "label": "SYMPTOM", "start": 421, "end": 441, "score": 0.93},
    {"text": "Troponin", "label": "CHEMICAL", "start": 466, "end": 474, "score": 0.95},
    {"text": "2.4 ng/mL", "label": "CHEMICAL", "start": 492, "end": 501, "score": 0.82},
    {"text": "Acute Myocardial Infarction", "label": "DISEASE", "start": 520, "end": 547, "score": 0.98},
    {"text": "Percutaneous Coronary Intervention", "label": "PROCEDURE", "start": 572, "end": 606, "score": 0.96},
    {"text": "PCI", "label": "PROCEDURE", "start": 608, "end": 611, "score": 0.94},
    {"text": "Sarah Smith", "label": "PERSON", "start": 632, "end": 643, "score": 0.97},
    {"text": "cardiologist", "label": "ORGANIZATION", "start": 656, "end": 668, "score": 0.88},
    {"text": "Heparin", "label": "DRUG", "start": 724, "end": 731, "score": 0.96},
    {"text": "Clopidogrel", "label": "DRUG", "start": 747, "end": 758, "score": 0.97},
    {"text": "75mg", "label": "CHEMICAL", "start": 759, "end": 763, "score": 0.85},
    {"text": "July 2, 2024", "label": "TEMPORAL", "start": 800, "end": 812, "score": 0.92},
    {"text": "Michael Johnson", "label": "PERSON", "start": 818, "end": 833, "score": 0.96},
]

def extract_text_from_file(file: UploadFile) -> str:
    filename = file.filename.lower()
    content = file.file.read()
    
    if filename.endswith('.txt'):
        return content.decode('utf-8', errors='ignore')
    
    elif filename.endswith('.docx'):
        if not HAS_DOCX:
            raise HTTPException(400, "python-docx not installed")
        doc = docx.Document(io.BytesIO(content))
        return "\n".join([para.text for para in doc.paragraphs if para.text.strip()])
    
    elif filename.endswith('.pdf'):
        if not HAS_PDF:
            raise HTTPException(400, "PyPDF2 not installed")
        reader = PyPDF2.PdfReader(io.BytesIO(content))
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        return text
    
    else:
        raise HTTPException(400, "Unsupported file type. Use .txt, .docx, or .pdf")

def process_text(text: str):
    if not text or not text.strip():
        return {"entities": [], "text": "", "stats": {"total": 0, "by_type": {}}}
    
    # Try Hugging Face API first
    try:
        headers = {"Authorization": f"Bearer {HF_TOKEN}"} if HF_TOKEN else {}
        payload = {"inputs": text}
        response = requests.post(HF_API_URL, headers=headers, json=payload, timeout=15)
        
        if response.status_code == 200:
            hf_results = response.json()
            entities = []
            for r in hf_results:
                entities.append({
                    "text": r.get("word", r.get("text", "")),
                    "label": r.get("entity_group", r.get("entity", "UNKNOWN")),
                    "start": r.get("start", 0),
                    "end": r.get("end", 0),
                    "score": round(r.get("score", 0), 4)
                })
            
            stats = {"total": len(entities), "by_type": {}}
            for e in entities:
                stats["by_type"][e["label"]] = stats["by_type"].get(e["label"], 0) + 1
            
            return {"entities": entities, "text": text, "stats": stats}
    except Exception as e:
        print(f"HF API failed: {e}")
        # Fall through to demo mode
    
    # If HF fails, return empty but valid response
    return {"entities": [], "text": text, "stats": {"total": 0, "by_type": {}}}

@app.post("/predict", response_model=NERResponse)
def predict(input_data: TextInput):
    result = process_text(input_data.text)
    return NERResponse(**result)

@app.post("/upload")
def upload_file(file: UploadFile = File(...)):
    text = extract_text_from_file(file)
    if not text.strip():
        raise HTTPException(400, "No text could be extracted from file")
    result = process_text(text)
    return result

@app.get("/demo")
def demo():
    """Returns pre-loaded demo data - always works instantly"""
    stats = {"total": len(DEMO_ENTITIES), "by_type": {}}
    for e in DEMO_ENTITIES:
        stats["by_type"][e["label"]] = stats["by_type"].get(e["label"], 0) + 1
    
    return {
        "entities": DEMO_ENTITIES,
        "text": DEMO_TEXT,
        "stats": stats
    }

@app.get("/health")
def health():
    return {"status": "ok", "model": "HF Inference API + Demo Mode"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)