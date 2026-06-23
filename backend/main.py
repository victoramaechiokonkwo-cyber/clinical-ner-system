from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from transformers import AutoTokenizer, AutoModelForTokenClassification, pipeline
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model
MODEL_NAME = "d4data/biomedical-ner-all"
print("Loading AI model... please wait...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForTokenClassification.from_pretrained(MODEL_NAME)
ner_pipeline = pipeline("ner", model=model, tokenizer=tokenizer, aggregation_strategy="simple")
print("Model loaded successfully!")

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

def extract_text_from_file(file: UploadFile) -> str:
    filename = file.filename.lower()
    content = file.file.read()
    
    if filename.endswith('.txt'):
        return content.decode('utf-8', errors='ignore')
    
    elif filename.endswith('.docx'):
        if not HAS_DOCX:
            raise HTTPException(400, "python-docx not installed. Run: pip install python-docx")
        doc = docx.Document(io.BytesIO(content))
        return "\n".join([para.text for para in doc.paragraphs if para.text.strip()])
    
    elif filename.endswith('.pdf'):
        if not HAS_PDF:
            raise HTTPException(400, "PyPDF2 not installed. Run: pip install PyPDF2")
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
    
    results = ner_pipeline(text)
    entities = []
    for r in results:
        entities.append({
            "text": r["word"],
            "label": r["entity_group"],
            "start": r["start"],
            "end": r["end"],
            "score": round(r["score"], 4)
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
    return {"status": "ok", "model": MODEL_NAME}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)