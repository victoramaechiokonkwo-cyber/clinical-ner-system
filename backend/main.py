from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import requests
import os
import io

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

# CORS
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://clinical-ner-system.vercel.app",
    os.getenv("FRONTEND_URL", "")
]
origins = [o for o in origins if o]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Hugging Face Inference API (free, no download needed)
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

def query_hf(text):
    headers = {"Authorization": f"Bearer {HF_TOKEN}"} if HF_TOKEN else {}
    payload = {"inputs": text}
    response = requests.post(HF_API_URL, headers=headers, json=payload, timeout=30)
    if response.status_code != 200:
        raise HTTPException(503, f"Hugging Face API error: {response.text}")
    return response.json()

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
    
    # Call Hugging Face API
    hf_results = query_hf(text)
    
    # Parse results
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

@app.get("/health")
def health():
    return {"status": "ok", "model": "HF Inference API", "hf_url": HF_API_URL}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)