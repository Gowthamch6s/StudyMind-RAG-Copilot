# 🧠 StudyMind: Full-Stack RAG AI Copilot

StudyMind is a production-ready Retrieval-Augmented Generation (RAG) application designed to eliminate AI hallucinations. It allows users to upload local documents (PDFs and Text files) and interact with an AI copilot that generates answers grounded **strictly** in the uploaded context, complete with inline source citations.

## 🚀 System Architecture
This project implements a complete end-to-end RAG pipeline:
1. **Ingestion:** Parses multi-format documents (PDF, TXT) and splits them into optimized semantic chunks.
2. **Vectorization:** Converts text chunks into high-dimensional embeddings using Google's `gemini-embedding-001` model and indexes them locally using ChromaDB.
3. **Semantic Retrieval:** Intercepts user queries to retrieve the top 3 most relevant document chunks based on mathematical vector similarity.
4. **Grounded Generation:** Feeds the retrieved context to the `gemini-3.5-flash` LLM with a strict system prompt to generate accurate, cited responses.

## 🛠️ Tech Stack
* **Frontend:** Next.js, React, Tailwind CSS
* **Backend:** Python, FastAPI, Uvicorn
* **AI Orchestration:** LangChain, LangChain-Chroma
* **Models:** Google Gemini 3.5-Flash (LLM), Gemini-Embedding-001 (Embeddings)
* **Vector Database:** ChromaDB (Local Persistent Storage)

## ✨ Core Features
* **Multi-Format Processing:** Seamlessly ingests both raw `.txt` files and complex `.pdf` documents.
* **Grounded Citations:** The LLM is restricted from using outside knowledge and explicitly cites the source filename for every generated fact.
* **Database Management:** Includes a secure endpoint to wipe the local vector database and reset the knowledge base state.
* **Modern UI:** Responsive, clean interface with uploading states, chat history, and contextual source chips.

## 💻 How to Run Locally

### 1. Backend Setup
Navigate to the backend directory, install the dependencies, and set up your environment variables.
```bash
cd backend
pip install -r requirements.txt
