import React, { useState } from 'react';
import { Button } from './Button';
import { analyzeWebsite } from '../services/geminiService';
import { Lead, Language } from '../types';
import { translations } from '../translations';

interface WebAnalyzerProps {
  onAuditComplete: (leads: Lead[]) => void;
  language: Language;
}

export const WebAnalyzer: React.FC<WebAnalyzerProps> = ({ onAuditComplete, language }) => {
  const t = translations[language];
  const [url, setUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    if (!url) return;
    setIsAnalyzing(true);
    
    // Clean URL
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http')) {
        cleanUrl = 'https://' + cleanUrl;
    }

    try {
      const report = await analyzeWebsite(cleanUrl, language);
      
      const lead: Lead = {
        id: `audit-${Date.now()}`,
        name: cleanUrl.replace('https://', '').replace('www.', '').split('/')[0],
        address: "Web Prospect",
        status: 'new',
        website: cleanUrl,
        auditReport: report,
        notes: report.summary
      };

      onAuditComplete([lead]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-20">
      <div className="bg-zinc-900/50 backdrop-blur-2xl p-10 rounded-3xl shadow-2xl border border-white/5 text-center relative overflow-hidden">
        
        {/* Abstract Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <h2 className="text-3xl font-medium text-white mb-2 tracking-tight relative z-10">{t.auditTitle}</h2>
        <p className="text-zinc-500 mb-10 text-sm font-light relative z-10">
          {t.auditDesc}
        </p>

        <div className="mb-8 relative z-10">
            <input 
              type="text" 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com" 
              className="w-full bg-black/50 border border-white/10 rounded-xl px-5 py-4 text-white focus:border-white/30 focus:outline-none focus:bg-black/80 transition-all text-sm placeholder-zinc-600 font-mono"
            />
        </div>

        <div className="flex flex-col items-center relative z-10">
            <Button 
                onClick={handleAnalyze} 
                disabled={!url} 
                isLoading={isAnalyzing}
                className="w-full py-4 text-base"
            >
                {t.analyzeBtn}
            </Button>
            
            {isAnalyzing && (
                <div className="mt-8 space-y-2">
                    <p className="text-xs text-zinc-500 font-mono">{t.processing}</p>
                    <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-white/20 animate-pulse w-1/2 rounded-full"></div>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
