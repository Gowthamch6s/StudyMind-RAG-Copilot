'use client';

import { useState } from 'react';

export default function StudyMind() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [clearing, setClearing] = useState(false); // NEW: Loading state for clearing DB
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string; sources?: string[] }[]>([]);
  const [input, setInput] = useState('');
  const [loadingAnswer, setLoadingAnswer] = useState(false);

  // This function takes the file from the user and sends it to your Python backend
  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('http://127.0.0.1:8000/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) alert('Notes uploaded and ingested into knowledge base!');
    } catch (err) {
      console.error(err);
      alert('Backend is not ready to receive files yet!');
    } finally {
      setUploading(false);
    }
  };

  // NEW: This function asks the Python backend to delete the ChromaDB folder
  const handleClearDatabase = async () => {
    if (!window.confirm("Are you sure you want to wipe the knowledge base? This cannot be undone.")) return;
    setClearing(true);
    
    try {
      const res = await fetch('http://127.0.0.1:8000/clear', {
        method: 'POST',
      });
      if (res.ok) {
        alert('Knowledge base successfully wiped clean!');
        setMessages([]); // Clears the chat history on the screen
      } else {
        throw new Error('Failed to clear database');
      }
    } catch (err) {
      console.error(err);
      alert('Error clearing the database.');
    } finally {
      setClearing(false);
    }
  };

  // This function takes the user's typed question and sends it to your Python backend
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input;
    setMessages((prev) => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setLoadingAnswer(true);

    try {
      const res = await fetch('http://127.0.0.1:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg }),
      });
      if (!res.ok) throw new Error('Backend not ready');
      const data = await res.json();
      setMessages((prev) => [...prev, { role: 'assistant', text: data.answer, sources: data.sources }]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [...prev, { role: 'assistant', text: "Error: Could not connect to the Python backend. Have we built the AI logic yet?" }]);
    } finally {
      setLoadingAnswer(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#fafafa] text-neutral-900 font-sans">
      {/* Sidebar / Controls */}
      <div className="w-80 border-r border-neutral-200 bg-white p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center space-x-2 mb-8">
            <div className="h-6 w-6 bg-black rounded-md flex items-center justify-center text-white font-bold text-xs">S</div>
            <span className="font-semibold tracking-tight text-lg">StudyMind</span>
          </div>
          
          <div className="space-y-4">
            <label className="block text-sm font-medium text-neutral-600">Upload Study Material</label>
            <input 
              type="file" 
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-xs text-neutral-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-neutral-100 file:text-neutral-700 hover:file:bg-neutral-200"
            />
            <button
              onClick={handleUpload}
              disabled={uploading || clearing}
              className="w-full py-2 bg-black text-white text-sm rounded-md font-medium hover:bg-neutral-800 transition duration-150 active:scale-[0.98] disabled:opacity-50"
            >
              {uploading ? 'Processing Database...' : 'Ingest Document'}
            </button>
            
            {/* NEW: Clear Database Button */}
            <button
              onClick={handleClearDatabase}
              disabled={clearing || uploading}
              className="w-full py-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-md font-medium hover:bg-red-100 transition duration-150 active:scale-[0.98] disabled:opacity-50"
            >
              {clearing ? 'Wiping...' : 'Clear Knowledge Base'}
            </button>
          </div>
        </div>
        <div className="text-xs text-neutral-400">
          Phase 1: Grounded Citations Engine Active
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full bg-white">
        <header className="h-14 border-b border-neutral-100 flex items-center px-8 justify-between">
          <h2 className="text-sm font-medium text-neutral-500">Knowledge Base Workspace</h2>
        </header>

        {/* Chat Log */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-neutral-400 space-y-2">
              <p className="text-sm font-medium">Your knowledge base is ready.</p>
              <p className="text-xs">Upload a text file or PDF on the left to start structured querying.</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-2xl px-4 py-3 rounded-xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-neutral-100 text-neutral-900' : 'bg-white border border-neutral-200/80 text-neutral-800 shadow-sm'}`}>
                <p>{msg.text}</p>
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1 items-center">
                    <span className="text-[10px] text-neutral-400 font-medium uppercase tracking-wider mr-1">Sources:</span>
                    {msg.sources.map((src, idx) => (
                      <span key={idx} className="bg-neutral-50 border border-neutral-200 text-neutral-600 text-[11px] px-2 py-0.5 rounded-md font-mono hover:bg-neutral-100 cursor-pointer transition">
                        {src}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loadingAnswer && (
            <div className="flex justify-start">
              <div className="bg-white border border-neutral-100 px-4 py-3 rounded-xl shadow-sm text-sm text-neutral-400 flex items-center space-x-2">
                <span className="animate-pulse">Consulting knowledge base...</span>
              </div>
            </div>
          )}
        </div>

        {/* Query Input */}
        <footer className="p-6 border-t border-neutral-100 bg-white">
          <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about your notes... (e.g., 'What are the three main causes of...')"
              className="flex-1 px-4 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-neutral-400 placeholder:text-neutral-400 transition"
            />
            <button type="submit" className="px-5 py-2.5 bg-black text-white rounded-lg text-sm font-medium hover:bg-neutral-800 transition active:scale-[0.98]">
              Ask Copilot
            </button>
          </form>
        </footer>
      </div>
    </div>
  );
}