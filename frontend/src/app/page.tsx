'use client';

import { useState } from 'react';
import axios from 'axios';
import { Send, Video } from 'lucide-react';

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'bot', content: string}[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!prompt.trim()) return;

    const userMessage = prompt;
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setPrompt('');
    setLoading(true);

    try {
      // NOTE: Ensure your backend is running on port 3001
      const res = await axios.post('http://localhost:3001/api/chat/query', { prompt: userMessage });
      const botResponse = res.data.response + '\n\nReels: ' + res.data.reels.join(', ');
      
      setMessages(prev => [...prev, { role: 'bot', content: botResponse }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'bot', content: 'Sorry, there was an error processing your request.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    try {
      alert('A browser window will open on the server to let you log in.');
      await axios.post('http://localhost:3001/api/reels/login');
      alert('Login session saved successfully on the server!');
    } catch (error) {
      console.error(error);
      alert('Failed to trigger login.');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      <header className="p-4 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Video className="text-pink-500" size={32} />
          <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
            Insta AI Reels Retrieval
          </h1>
        </div>
        <button 
          onClick={handleLogin}
          className="px-4 py-2 bg-gradient-to-r from-pink-500 to-orange-500 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          <Video size={18} /> Login to Instagram
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500">
            <Video size={64} className="mb-4 opacity-50" />
            <p>Ask me to find specific saved reels...</p>
            <p className="text-sm mt-2">Example: "Find reels about Next.js server actions"</p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] p-3 rounded-xl ${msg.role === 'user' ? 'bg-blue-600 rounded-br-none' : 'bg-gray-800 border border-gray-700 rounded-bl-none whitespace-pre-line'}`}>
                {msg.content}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 border border-gray-700 p-3 rounded-xl rounded-bl-none text-gray-400 animate-pulse">
              Thinking...
            </div>
          </div>
        )}
      </main>

      <footer className="p-4 border-t border-gray-700">
        <div className="max-w-4xl mx-auto relative flex items-center">
          <input
            type="text"
            className="w-full bg-gray-800 border border-gray-700 rounded-full py-3 pl-4 pr-12 focus:outline-none focus:border-pink-500 transition-colors"
            placeholder="Type your query..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={loading}
          />
          <button 
            onClick={handleSend}
            disabled={loading || !prompt.trim()}
            className="absolute right-2 p-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <Send size={18} />
          </button>
        </div>
      </footer>
    </div>
  );
}
