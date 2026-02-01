import React, { useState } from 'react';
import { Button } from './Button';
import { findLeadsOnMaps } from '../services/geminiService';
import { Lead, Language } from '../types';
import { translations } from '../translations';

interface LeadFinderProps {
  onLeadsFound: (leads: Lead[]) => void;
  language: Language;
  businessContext?: string; // Add context prop
}

export const LeadFinder: React.FC<LeadFinderProps> = ({ onLeadsFound, language, businessContext = '' }) => {
  const t = translations[language];
  const [sector, setSector] = useState('');
  const [location, setLocation] = useState('');
  const [strategy, setStrategy] = useState(''); 
  const [isSearching, setIsSearching] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(true);
  const [hiringFilter, setHiringFilter] = useState(false);

  const handleSearch = async () => {
    if (!sector || !location) return;

    setIsSearching(true);
    setStatusMsg(t.processing);
    
    // Combine local input + global context
    const fullContext = `
    User Input Strategy: ${strategy}
    Only Companies Hiring: ${hiringFilter ? "YES - PRIORITIZE GROWING COMPANIES" : "NO"}
    Global Chat Context & Business Info: ${businessContext}
    `;

    try {
      const leads = await findLeadsOnMaps(sector, location, language, fullContext);
      if (leads.length === 0) {
          setStatusMsg(t.noLeads);
      } else {
          onLeadsFound(leads);
      }
    } catch (err) {
      setStatusMsg("Error.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto mt-10">
      <div className="bg-zinc-900/50 backdrop-blur-2xl p-8 rounded-3xl shadow-2xl border border-white/5 relative overflow-hidden">
        
        {/* Abstract Glow */}
        <div className="absolute -top-20 -left-20 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="text-center mb-8 relative z-10">
            <h2 className="text-3xl font-medium text-white mb-2 tracking-tight">{t.leadFinderTitle}</h2>
            <p className="text-zinc-500 text-sm font-light">
            {t.leadFinderDesc}
            </p>
        </div>

        <div className="space-y-6 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="group">
                <label className="block text-xs text-zinc-400 mb-1 ml-1">{t.sectorLabel}</label>
                <input 
                type="text" 
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                placeholder="e.g. Restaurants, Law Firms" 
                className="w-full bg-black/50 border border-white/10 rounded-xl px-5 py-3 text-white focus:border-white/30 focus:outline-none focus:bg-black/80 transition-all text-sm"
                />
            </div>
            <div className="group">
                <label className="block text-xs text-zinc-400 mb-1 ml-1">{t.locationLabel}</label>
                <input 
                type="text" 
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Lyon, France" 
                className="w-full bg-black/50 border border-white/10 rounded-xl px-5 py-3 text-white focus:border-white/30 focus:outline-none focus:bg-black/80 transition-all text-sm"
                />
            </div>
          </div>

          {/* Advanced / Strategy Section */}
          <div className="border-t border-white/5 pt-4">
            <button 
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition-colors mb-3"
            >
                <svg className={`w-3 h-3 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                {language === 'fr' ? "Stratégie & Ciblage Avancé" : "Advanced Strategy & Targeting"}
                {businessContext && <span className="text-[10px] text-blue-400 ml-2 animate-pulse">• AI Context Active</span>}
            </button>
            
            {showAdvanced && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <textarea
                        value={strategy}
                        onChange={(e) => setStrategy(e.target.value)}
                        placeholder={language === 'fr' 
                            ? "Ajoutez des détails spécifiques pour cette recherche..."
                            : "Add specific details for this search..."}
                        className="w-full h-24 bg-black/30 border border-white/10 rounded-xl px-5 py-3 text-white focus:border-blue-500/50 focus:outline-none focus:bg-black/50 transition-all text-sm resize-none"
                    />
                    
                    <div className="flex justify-between items-start mt-3">
                         <label className="flex items-center gap-2 cursor-pointer group">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${hiringFilter ? 'bg-blue-500 border-blue-500' : 'border-zinc-600 group-hover:border-zinc-400'}`}>
                                {hiringFilter && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>}
                            </div>
                            <span className="text-xs text-zinc-400 group-hover:text-zinc-300">
                                {language === 'fr' ? "Cibler uniquement les entreprises qui recrutent" : "Target only companies that are hiring"}
                            </span>
                            <input type="checkbox" checked={hiringFilter} onChange={() => setHiringFilter(!hiringFilter)} className="hidden" />
                        </label>

                        <p className="text-[10px] text-zinc-500 text-right">
                            {businessContext 
                                ? (language === 'fr' ? "L'IA utilise aussi vos conversations du chat." : "AI is also using your chat history.") 
                                : (language === 'fr' ? "Utilisez le chat à droite pour donner plus de contexte." : "Use the chat on the right to provide more context.")}
                        </p>
                    </div>
                </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center mt-8 relative z-10">
            <Button 
                onClick={handleSearch} 
                disabled={!sector || !location} 
                isLoading={isSearching}
                className="w-full py-4 text-base"
            >
                {t.startEngine}
            </Button>
            
            {statusMsg && (
                <p className="mt-4 text-xs text-zinc-400 animate-pulse font-mono">
                    {statusMsg}
                </p>
            )}
        </div>
      </div>
    </div>
  );
};
