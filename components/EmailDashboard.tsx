import React, { useState, useEffect, useRef } from 'react';
import { Lead, Language, Message } from '../types';
import { Button } from './Button';
import { deepAnalyzeLead, generateInitialEmail, refineEmailWithAI, analyzeWebsite } from '../services/geminiService';
import { sendGmail } from '../services/gmailService';
import { translations } from '../translations';
import { Markdown } from './Markdown';

interface EmailDashboardProps {
  leads: Lead[];
  businessContext: string;
  language: Language;
  onUpdateLeads: (leads: Lead[]) => void;
  gmailToken?: string | null;
  onConnectGmail?: () => void;
}

export const EmailDashboard: React.FC<EmailDashboardProps> = ({ 
    leads, 
    businessContext, 
    language, 
    onUpdateLeads, 
    gmailToken, 
    onConnectGmail 
}) => {
  const t = translations[language];
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [loadingLeadId, setLoadingLeadId] = useState<string | null>(null);
  
  // Refinement Chat State
  const [refineInput, setRefineInput] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // UI State
  const [isExpanded, setIsExpanded] = useState(false);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedLead?.emailRefinementHistory]);

  const handleDeepAnalyze = async (lead: Lead) => {
    setLoadingLeadId(lead.id);
    let updatedLead = { ...lead };

    // 1. Web Audit if needed
    if (lead.website && !lead.auditReport) {
        updatedLead.auditReport = await analyzeWebsite(lead.website, language);
    }

    // 2. Deep Fit Analysis
    updatedLead.deepAnalysis = await deepAnalyzeLead(updatedLead, language, businessContext);

    // 3. Generate Initial Email
    if (!updatedLead.generatedEmail) {
        updatedLead.generatedEmail = await generateInitialEmail(businessContext, updatedLead, language);
        updatedLead.emailRefinementHistory = [{
            id: 'init',
            role: 'model',
            text: updatedLead.generatedEmail,
            timestamp: new Date()
        }];
    }

    updatedLead.status = 'analyzed';
    
    // Update State
    const newLeads = leads.map(l => l.id === lead.id ? updatedLead : l);
    onUpdateLeads(newLeads);
    setSelectedLead(updatedLead);
    setLoadingLeadId(null);
  };

  const handleRefineEmail = async () => {
    if (!selectedLead || !refineInput.trim() || !selectedLead.generatedEmail) return;

    setIsRefining(true);
    const instruction = refineInput;
    setRefineInput('');

    // Add User Instruction to History
    const userMsg: Message = {
        id: Date.now().toString(),
        role: 'user',
        text: instruction,
        timestamp: new Date()
    };
    
    const newHistory = [...(selectedLead.emailRefinementHistory || []), userMsg];
    let updatedLead = { ...selectedLead, emailRefinementHistory: newHistory };
    
    // Call AI
    const newEmail = await refineEmailWithAI(
        updatedLead.generatedEmail, 
        instruction, 
        businessContext, 
        updatedLead,
        newHistory
    );

    const modelMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: newEmail, // This is just for history tracking, the actual email field updates too
        timestamp: new Date()
    };

    updatedLead.emailRefinementHistory = [...newHistory, modelMsg];
    updatedLead.generatedEmail = newEmail;

    // Update State
    const newLeads = leads.map(l => l.id === selectedLead.id ? updatedLead : l);
    onUpdateLeads(newLeads);
    setSelectedLead(updatedLead);
    setIsRefining(false);
  };

  const handleSendEmail = async () => {
      if (!selectedLead || !selectedLead.generatedEmail || !gmailToken) {
          if (onConnectGmail) onConnectGmail();
          return;
      }

      try {
          const subject = "Proposal for " + selectedLead.name; // Simplified subject
          const result = await sendGmail(gmailToken, "example@test.com", subject, selectedLead.generatedEmail);
          
          const updated = { 
            ...selectedLead, 
            status: 'contacted' as const, 
            gmailMessageId: result.id,
            lastEmailSentAt: new Date()
          };
          onUpdateLeads(leads.map(l => l.id === selectedLead.id ? updated : l));
          setSelectedLead(updated);
          alert("Sent!");
      } catch (e: any) {
          alert("Error: " + e.message);
      }
  };

  return (
    <div className="flex h-full gap-6">
      
      {/* LEFT COLUMN: LIST (Hidden in Focus Mode) */}
      {!isExpanded && (
        <div className="w-1/3 flex flex-col bg-zinc-900/30 rounded-2xl border border-white/5 overflow-hidden transition-all duration-300">
            <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
                <h2 className="text-white font-medium">Prospects ({leads.length})</h2>
                <div className={`text-xs px-2 py-1 rounded border ${gmailToken ? 'border-green-500/30 text-green-400 bg-green-500/10' : 'border-zinc-500/30 text-zinc-500'}`}>
                    {gmailToken ? 'Gmail Ready' : 'Gmail Offline'}
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin scrollbar-thumb-zinc-700">
                {leads.map(lead => (
                    <div 
                        key={lead.id}
                        onClick={() => setSelectedLead(lead)}
                        className={`p-4 rounded-xl cursor-pointer border transition-all group ${
                            selectedLead?.id === lead.id 
                            ? 'bg-blue-600 border-blue-400 shadow-lg' 
                            : 'bg-white/5 border-white/5 hover:bg-white/10'
                        }`}
                    >
                        <div className="flex justify-between items-start">
                            <h3 className={`font-medium text-sm truncate ${selectedLead?.id === lead.id ? 'text-white' : 'text-zinc-200'}`}>{lead.name}</h3>
                            {lead.status === 'contacted' && <span className="text-xs text-green-300">✓</span>}
                        </div>
                        <p className={`text-xs truncate mt-1 ${selectedLead?.id === lead.id ? 'text-blue-100' : 'text-zinc-500'}`}>{lead.businessType}</p>
                        
                        {lead.deepAnalysis && (
                            <div className="mt-2 flex gap-1">
                                <span className={`text-[10px] px-1.5 rounded ${lead.deepAnalysis.leadScore > 70 ? 'bg-green-500 text-black font-bold' : 'bg-white/10 text-zinc-300'}`}>
                                    Score: {lead.deepAnalysis.leadScore}
                                </span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
      )}

      {/* RIGHT COLUMN: WORKSPACE (Expands to Full Width) */}
      <div className={`${isExpanded ? 'w-full' : 'flex-1'} flex flex-col bg-zinc-900/50 rounded-2xl border border-white/5 overflow-hidden backdrop-blur-sm relative transition-all duration-300`}>
        {selectedLead ? (
            <div className="flex flex-col h-full">
                
                {/* Header */}
                <div className="p-4 md:p-6 border-b border-white/5 bg-black/20 flex justify-between items-start">
                    <div className="flex items-center gap-4">
                        {/* Expand Button */}
                        <button 
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors border border-white/5"
                            title={isExpanded ? "Collapse View" : "Focus Mode (Expand)"}
                        >
                            {isExpanded ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                            ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path></svg>
                            )}
                        </button>

                        <div>
                            <h1 className="text-xl md:text-2xl font-bold text-white mb-1">{selectedLead.name}</h1>
                            <p className="text-sm text-zinc-400 flex items-center gap-2">
                                {selectedLead.website || "No Website"}
                                <span className="w-1 h-1 bg-zinc-600 rounded-full"></span>
                                {selectedLead.address}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button 
                            onClick={() => handleDeepAnalyze(selectedLead)} 
                            isLoading={loadingLeadId === selectedLead.id}
                            variant="secondary"
                            className="text-xs h-9"
                        >
                            {selectedLead.deepAnalysis ? "Re-Analyze" : "Analyze Fit"}
                        </Button>
                        <Button 
                            onClick={handleSendEmail} 
                            disabled={!selectedLead.generatedEmail}
                            className={`text-xs h-9 border-none text-white ${gmailToken ? 'bg-blue-600 hover:bg-blue-500' : 'bg-zinc-700'}`}
                        >
                            {gmailToken ? "Send Email" : "Connect Gmail"}
                        </Button>
                    </div>
                </div>

                {/* Content Area */}
                {!selectedLead.deepAnalysis ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                        </div>
                        <p>Click "Analyze Fit" to start intelligence.</p>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        
                        {/* 1. ANALYSIS BOX */}
                        <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Client Fit Analysis</h3>
                            <div className="flex flex-col md:flex-row gap-6">
                                <div className="flex-1">
                                    <p className="text-sm text-zinc-200 leading-relaxed">
                                        {selectedLead.deepAnalysis.fitReasoning}
                                    </p>
                                    <div className="mt-3 flex gap-2">
                                        {selectedLead.deepAnalysis.techStack.map(t => (
                                            <span key={t} className="text-[10px] bg-white/10 px-2 py-1 rounded text-zinc-400">{t}</span>
                                        ))}
                                    </div>
                                </div>
                                <div className="w-full md:w-24 text-center border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6">
                                    <div className="text-3xl font-bold text-white mb-1">{selectedLead.deepAnalysis.leadScore}</div>
                                    <div className="text-[10px] text-zinc-500 uppercase">Fit Score</div>
                                </div>
                            </div>
                        </div>

                        {/* 2. EMAIL EDITOR + CHAT */}
                        <div className="flex-1 flex flex-col md:flex-row gap-0 min-h-0">
                            {/* Editor */}
                            <div className="flex-1 p-6 flex flex-col bg-white text-black relative">
                                <span className="absolute top-2 right-2 text-[10px] text-gray-400 uppercase font-bold tracking-widest">Email Draft</span>
                                <textarea 
                                    className="w-full h-full resize-none outline-none bg-transparent text-base md:text-lg leading-relaxed p-2 font-serif"
                                    value={selectedLead.generatedEmail || ""}
                                    onChange={(e) => {
                                        const updated = { ...selectedLead, generatedEmail: e.target.value };
                                        setSelectedLead(updated);
                                        onUpdateLeads(leads.map(l => l.id === selectedLead.id ? updated : l));
                                    }}
                                />
                            </div>

                            {/* Refinement Chat */}
                            <div className="w-full md:w-96 bg-zinc-950 border-t md:border-t-0 md:border-l border-white/10 flex flex-col h-[40%] md:h-auto">
                                <div className="p-3 border-b border-white/5 text-[10px] text-zinc-500 uppercase font-bold text-center bg-zinc-900/50">
                                    AI Refinement Coach 🤖
                                </div>
                                
                                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                    {selectedLead.emailRefinementHistory?.filter(m => m.id !== 'init').map(msg => (
                                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`text-xs p-3 rounded-xl max-w-[90%] ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-300'}`}>
                                                {msg.role === 'user' ? msg.text : "✅ Email Updated"}
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={chatEndRef} />
                                </div>

                                <div className="p-4 border-t border-white/5 bg-zinc-900">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={refineInput}
                                            onChange={(e) => setRefineInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleRefineEmail()}
                                            disabled={isRefining}
                                            placeholder="Ex: Make it shorter ✂️, Add urgency 🔥..."
                                            className="w-full bg-black border border-white/10 rounded-xl pl-4 pr-10 py-3 text-sm text-white focus:border-blue-500 outline-none shadow-inner"
                                        />
                                        <button 
                                            onClick={handleRefineEmail}
                                            disabled={isRefining}
                                            className="absolute right-2 top-2 p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                                        >
                                            <svg className={`w-5 h-5 ${isRefining ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        ) : (
            <div className="flex-1 flex items-center justify-center text-zinc-600">
                <p>Select a prospect from the list</p>
            </div>
        )}
      </div>
    </div>
  );
};