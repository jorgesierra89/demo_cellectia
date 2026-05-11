import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import httpx
import os

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma

app = FastAPI()

# --- CONFIGURACIÓN ---
OLLAMA_URL = "http://localhost:11434/api/chat"
MODEL_NAME = "gemma2:2b"
vectorstore = None

BASE_PATH = os.path.dirname(os.path.abspath(__file__))
PERSIST_DIR = os.path.join(BASE_PATH, "chroma_db")
DOCS_PATH = os.path.join(BASE_PATH, "documentos")

CELLECTIA_PROMPT = """Eres Cellectia 4.0, supervisora técnica del laboratorio. Tu tono es profesional, constructivo y orientador. 

MISIÓN:
Ayudar al usuario a dominar los protocolos utilizando EXCLUSIVAMENTE la información del CONTEXTO DE APOYO. No inventes datos fuera de los manuales.

REGLA DE CORTESÍA (IMPORTANTE):
Si el usuario simplemente te saluda (ej: "hola", "buenos días") o hace una afirmación genérica sin pedir información técnica, devuélvele el saludo de forma natural, preséntate brevemente y pregúntale en qué protocolo o área quiere trabajar hoy. En este caso, NO menciones ningún nombre de archivo PDF ni le hagas preguntas socráticas.

ESTRATEGIA PEDAGÓGICA (Solo para preguntas técnicas):
1. Siempre que el usuario pregunte algo técnico, no le des la respuesta directa. Formula una pregunta que le obligue a razonar basándote en el contenido del manual.
2. Mantén una conversación fluida. Si el usuario responde bien, confírmalo y plantea el siguiente paso del protocolo.

REGLA DE APOYO DOCUMENTAL:
- No menciones nombres de archivos PDF constantemente.
- Solo si detectas que el usuario está confundido, comete errores repetidos o explícitamente no logra avanzar tras varios intentos, recomiéndale consultar el documento específico (ej: "Para profundizar en este punto, te sugiero revisar el manual_bioseguridad.pdf").
"""

@app.get("/documentos_lista")
async def listar_documentos():
    estructura = {}
    if not os.path.exists(DOCS_PATH): return {}
    for root, dirs, files in os.walk(DOCS_PATH):
        categoria = os.path.relpath(root, DOCS_PATH)
        if categoria == ".": continue
        archivos = [f for f in files if f.endswith(('.pdf', '.docx'))]
        if archivos: estructura[categoria] = archivos
    return estructura

def inicializar_rag():
    global vectorstore
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

    if os.path.exists(PERSIST_DIR) and len(os.listdir(PERSIST_DIR)) > 0:
        print(f"✅ Cargando base de datos existente")
        vectorstore = Chroma(persist_directory=PERSIST_DIR, embedding_function=embeddings)
        return

    print(f"⚠️ Creando nueva base de datos...")
    documentos_brutos = []
    for root, dirs, files in os.walk(DOCS_PATH):
        for archivo in files:
            ruta = os.path.join(root, archivo)
            try:
                if archivo.endswith(".pdf"):
                    loader = PyPDFLoader(ruta)
                    docs = loader.load()
                    for d in docs: d.metadata["fuente"] = archivo
                    documentos_brutos.extend(docs)
            except Exception as e:
                print(f"Error en {archivo}: {e}")

    if documentos_brutos:
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=700, chunk_overlap=100)
        chunks = text_splitter.split_documents(documentos_brutos)
        vectorstore = Chroma.from_documents(documents=chunks, embedding=embeddings, persist_directory=PERSIST_DIR)
        print("✅ Indexación completada.")

def buscar_contexto_vectorial(pregunta_usuario: str):
    global vectorstore
    if not vectorstore: return "No hay documentos."
    resultados = vectorstore.similarity_search(pregunta_usuario, k=3)
    return "\n---\n".join([f"[ARCHIVO: {d.metadata['fuente']}]\n{d.page_content}" for d in resultados])

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.mount("/web", StaticFiles(directory="web"), name="web")
app.mount("/documentos", StaticFiles(directory="documentos"), name="documentos")

class ChatRequest(BaseModel):
    messages: List[Dict[str, str]]

@app.get("/")
async def read_index(): return FileResponse("web/index.html")

@app.post("/chat")
async def chat(data: ChatRequest):
    ultima_pregunta = data.messages[-1]["content"]
    contexto = buscar_contexto_vectorial(ultima_pregunta)
    
    # Preparamos las instrucciones incluyendo el contexto
    system_instruction = f"{CELLECTIA_PROMPT}\n\nCONTEXTO DE APOYO:\n{contexto}"
    
    payload = {
        "model": MODEL_NAME,
        "messages": [{"role": "system", "content": system_instruction}] + data.messages[-5:],
        "stream": False,
        "options": {"temperature": 0.3} # Un poco más de temperatura para que sea menos rígida
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(OLLAMA_URL, json=payload, timeout=90.0)
        # Devolvemos la respuesta tal cual la genera el modelo
        return {"response": response.json()["message"]["content"]}

@app.on_event("startup")
async def startup_event(): inicializar_rag()

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=7860, reload=True)