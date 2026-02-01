import React, { useState, useRef, useEffect } from 'react';
import { Message, Language } from '../types';
import { Button } from './Button';
import { sendAssistantMessage } from '../services/geminiService';
import { translations } from '../translations';
import { Markdown } from './Markdown';

interface GlobalAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateContext: (summary: string) => void;
  language: Language;
  currentContext: string;
}

export const GlobalAssistant: React.FC<GlobalAssistantProps> = ({ 
  isOpen, 
  onClose, 
  onUpdateContext, 
  language,
  currentContext 
}) => {
  const t = translations[language];
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init',
      role: 'model',
      text: language === 'fr' 
        ? "Bonjour ! Je suis votre assistant stratégique. **Expliquez-moi votre business**, ou glissez des fichiers pour commencer."
        : language === 'es'
        ? "¡Hola! Soy tu asistente estratégico. **Explícame tu negocio** o arrastra archivos para empezar."
        : "Hello! I am your strategic assistant. **Explain your business**, or drop files to start.",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && files.length === 0) || isLoading) return;

    setIsLoading(true);

    // 1. Process Files First
    const fileContents: string[] = [];
    let combinedInput = input;

    for (const file of files) {
      try {
        const text = await file.text();
        const fileTag = `\n\n[FILE: ${file.name}]\n${text}\n[/FILE]`;
        fileContents.push(fileTag);
        // Append to combinedInput so it is stored in the message history for context
        combinedInput += fileTag; 
      } catch (err) {
        console.error("Error reading file", err);
      }
    }
    setFiles([]); 

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: combinedInput, // Store full content including files
      timestamp: new Date()
    };

    setMessages(prev => {
        const newHistory = [...prev, userMsg];
        // 2. IMMEDIATE CONTEXT UPDATE
        // We join the conversation history to act as the "Global Context"
        onUpdateContext(newHistory.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n---\n'));
        return newHistory;
    });
    setInput('');

    // 3. Send to Gemini
    // We pass the raw fileContents array to the service helper for better prompting, 
    // even though we appended it to text for storage.
    const history = messages.map(m => ({ role: m.role, text: m.text }));
    const responseText = await sendAssistantMessage(history, input, fileContents, language, currentContext);

    const modelMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      text: responseText,
      timestamp: new Date()
    };

    setMessages(prev => {
        const newHistory = [...prev, modelMsg];
        onUpdateContext(newHistory.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n---\n'));
        return newHistory;
    });
    setIsLoading(false);
  };

  return (
    <div 
        className={`
            fixed inset-y-0 right-0 w-full md:w-[450px] 
            bg-zinc-900/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl z-50 
            flex flex-col transform transition-transform duration-300 ease-in-out
            ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
    >
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
        <div>
           <h2 className="text-white font-medium flex items-center gap-2">
             <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
             AI Assistant
           </h2>
           <p className="text-[10px] text-zinc-400">Connected to Search & Analysis</p>
        </div>
        <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin scrollbar-thumb-zinc-700">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-2xl ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                : 'bg-white/5 text-zinc-200 border border-white/5 shadow-inner'
            }`}>
              {msg.role === 'user' ? (
                 <p className="text-sm whitespace-pre-wrap max-h-96 overflow-hidden text-ellipsis">{msg.text.substring(0, 500) + (msg.text.length > 500 ? '... [File Content Hidden]' : '')}</p>
              ) : (
                 <Markdown content={msg.text} />
              )}
            </div>
          </div>
        ))}
        {isLoading && (
            <div className="flex justify-start">
               <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce delay-200"></div>
                  </div>
               </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-zinc-950/50 border-t border-white/10">
        {files.length > 0 && (
          <div className="mb-2 flex gap-2 overflow-x-auto">
            {files.map((f, i) => (
              <span key={i} className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-1 rounded flex items-center border border-blue-500/30">
                📎 {f.name}
              </span>
            ))}
          </div>
        )}
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={language === 'fr' ? "Envoyez des infos pour améliorer la recherche..." : "Send info to improve search..."}
            className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 pr-12 text-sm text-white focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 resize-none h-14 scrollbar-hide"
          />
          <div className="absolute right-2 bottom-2 flex gap-1">
            <label className="cursor-pointer p-1.5 text-zinc-500 hover:text-white transition-colors rounded-lg hover:bg-white/10">
               <input type="file" multiple className="hidden" onChange={handleFileUpload} />
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
            </label>
            <button 
              onClick={handleSend} 
              disabled={!input && files.length === 0}
              className="p-1.5 bg-white text-black rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M12 5l7 7-7 7"></path></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
