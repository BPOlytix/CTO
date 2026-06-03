import React, { useState } from 'react';
import { Terminal as TerminalIcon, Send } from 'lucide-react';

const Terminal = () => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<{ type: 'user' | 'bot', text: string }[]>([
    { type: 'bot', text: 'Welcome to Accrue AI Super User terminal. How can I help you today?' }
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setHistory(prev => [...prev, { type: 'user', text: input }]);
    // Mock response
    setTimeout(() => {
      setHistory(prev => [...prev, { type: 'bot', text: `Processing: ${input}... (Not implemented yet)` }]);
    }, 500);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 font-mono rounded-lg overflow-hidden border border-slate-700 shadow-xl">
      <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 border-b border-slate-700">
        <TerminalIcon size={16} />
        <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Super User Command Center</span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-2 text-sm">
        {history.map((msg, i) => (
          <div key={i} className={msg.type === 'user' ? 'text-sky-400' : 'text-emerald-400'}>
            <span className="mr-2 text-slate-500">{msg.type === 'user' ? '>' : '$'}</span>
            {msg.text}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="p-4 bg-slate-800 border-t border-slate-700 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter command..."
          className="flex-1 bg-transparent border-none outline-none text-sm focus:ring-0"
          autoFocus
        />
        <button type="submit" className="text-slate-400 hover:text-sky-400 transition-colors">
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};

export default Terminal;
