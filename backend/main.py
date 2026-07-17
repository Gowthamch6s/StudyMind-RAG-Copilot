import os
import shutil
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pypdf import PdfReader 

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_classic.chains import create_retrieval_chain
from langchain_classic.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate

# 1. Load Environment Variables Securely
if not os.getenv("GOOGLE_API_KEY"):
    raise ValueError("GOOGLE_API_KEY is missing! Please add it to your .env file.")

# 2. Initialize the Server
app = FastAPI(title="StudyMind AI Backend - Enterprise Edition")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Set up the AI Models and Database (No more deprecation warnings!)
embeddings = GoogleGenerativeAIEmbeddings(model="gemini-embedding-001")
DB_DIR = "./chroma_db"
vector_store = Chroma(embedding_function=embeddings, persist_directory=DB_DIR)

class ChatRequest(BaseModel):
    message: str

# 4. Multi-Format Upload Route (Now supports PDFs!)
@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    try:
        text_content = ""
        
        # Handle PDF Files
        if file.filename.lower().endswith(".pdf"):
            pdf_reader = PdfReader(file.file)
            for page in pdf_reader.pages:
                text_content += page.extract_text() + "\n"
                
        # Handle Text Files
        elif file.filename.lower().endswith(".txt"):
            content = await file.read()
            text_content = content.decode("utf-8", errors="ignore")
            
        else:
            raise HTTPException(status_code=400, detail="Only .txt and .pdf files are supported.")
            
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        chunks = text_splitter.split_text(text_content)
        
        metadatas = [{"source": file.filename} for _ in chunks]
        vector_store.add_texts(texts=chunks, metadatas=metadatas)
        
        return {"status": "success", "message": f"Successfully memorized {file.filename}!"}
    except Exception as e:
        print("Upload Error:", str(e))
        raise HTTPException(status_code=500, detail=str(e))

# 5. NEW: Database Management Route
@app.post("/clear")
async def clear_database():
    try:
        # Safely delete the directory and re-initialize the database
        if os.path.exists(DB_DIR):
            shutil.rmtree(DB_DIR)
            global vector_store
            vector_store = Chroma(embedding_function=embeddings, persist_directory=DB_DIR)
        return {"status": "success", "message": "Knowledge base completely wiped!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 6. The Chat Route
@app.post("/chat")
async def chat(request: ChatRequest):
    try:
        retriever = vector_store.as_retriever(search_kwargs={"k": 3})
        llm = ChatGoogleGenerativeAI(model="gemini-3.5-flash", temperature=0)
        
        system_prompt = (
            "You are an expert Study Copilot. Answer the student's question using ONLY the provided context.\n"
            "For every fact you state, you MUST cite the source file inline like this: [filename.txt].\n"
            "If the answer is not in the context, say 'I cannot find that in your uploaded notes.'\n\n"
            "Context:\n{context}"
        )
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", "{input}"),
        ])
        
        question_answer_chain = create_stuff_documents_chain(llm, prompt)
        rag_chain = create_retrieval_chain(retriever, question_answer_chain)
        
        response = rag_chain.invoke({"input": request.message})
        sources = list(set([doc.metadata.get("source", "Unknown") for doc in response.get("context", [])]))
        
        return {
            "answer": response["answer"],
            "sources": sources
        }
    except Exception as e:
        print("Error in chat endpoint:", str(e))
        raise HTTPException(status_code=500, detail=str(e))