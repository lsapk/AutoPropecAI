import React, { useState, useRef, useEffect } from 'react';
import { Message, Language } from '../types';
import { Button } from './Button';
import { sendAssistantMessage } from '../services/geminiService';
import { translations } from '../translations';

interface ContextChatProps {
  onContextComplete: (summary: string) => void;
  language: Language;
}

export const ContextChat: React.FC<ContextChatProps> = ({ onContextComplete, language }) => {
  const t = translations[language];
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'model',
      text: t.contextIntro,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && files.length === 0) || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const fileContents: string[] = [];
    for (const file of files) {
      try {
        const text = await file.text();
        fileContents.push(`File: ${file.name}\nContent: ${text}`);
      } catch (err) {
        console.error("Error reading file", err);
      }
    }
    setFiles([]); 

    const history = messages.map(m => ({ role: m.role, text: m.text }));
    // Use sendAssistantMessage as the primary chat function, passing a context string.
    const responseText = await sendAssistantMessage(history, userMsg.text, fileContents, language, "User is defining their business context.");

    const modelMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      text: responseText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, modelMsg]);
    setIsLoading(false);
  };

  const handleFinish = () => {
    const fullContext = messages.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n');
    onContextComplete(fullContext);
  };

  return (
    <div className="flex flex-col h-full bg-black/40 backdrop-blur-xl rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
      <div className="bg-white/5 p-6 border-b border-white/5 flex justify-between items-center backdrop-blur-md">
        <div>
          <h2 className="text-lg font-medium text-white tracking-tight">{t.contextTitle}</h2>
          <p className="text-xs text-zinc-400">AI Assistant</p>
        </div>
        <Button onClick={handleFinish} variant="primary" className="text-xs px-6">
          {t.finishContext}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] p-5 text-sm leading-relaxed rounded-2xl ${
              msg.role === 'user' 
                ? 'bg-white text-black' 
                : 'bg-zinc-800/50 text-zinc-200 border border-white/5'
            }`}>
              <p className="whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}
        {isLoading && (
            <div className="flex justify-start">
                 <div className="bg-zinc-800/50 p-4 rounded-2xl animate-pulse border border-white/5">
                    <div className="h-1.5 w-8 bg-zinc-600 rounded-full"></div>
                 </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 m-4 bg-zinc-900/50 backdrop-blur-lg rounded-2xl border border-white/10">
        {files.length > 0 && (
          <div className="mb-3 flex gap-2 overflow-x-auto">
            {files.map((f, i) => (
              <span key={i} className="text-[10px] bg-white/10 text-white px-3 py-1.5 rounded-full flex items-center border border-white/5">
                {f.name}
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-3 items-center">
          <label className="cursor-pointer p-2 text-zinc-500 hover:text-white transition-colors">
             <input type="file" multiple className="hidden" onChange={handleFileUpload} />
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
          </label>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={t.contextIntro.split('.')[0] + "..."}
            className="flex-1 bg-transparent border-none text-white focus:outline-none placeholder-zinc-600 text-sm"
            disabled={isLoading}
          />
          <Button onClick={handleSend} disabled={!input && files.length === 0} isLoading={isLoading} variant="secondary" className="!p-2 !rounded-full">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M12 5l7 7-7 7"></path></svg>
          </Button>
        </div>
      </div>
    </div>
  );
};