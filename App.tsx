import React, { useState, useEffect, useRef } from 'react';
import { LeadFinder } from './components/LeadFinder';
import { EmailDashboard } from './components/EmailDashboard';
import { WebAnalyzer } from './components/WebAnalyzer';
import { GlobalAssistant } from './components/GlobalAssistant';
import { AppStep, Lead, Language, Project } from './types';
import { translations } from './translations';
import { Button } from './components/Button';

// ------------------------------------------------------------------
// CONFIGURATION GOOGLE CLOUD
// ------------------------------------------------------------------
const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID"; // <--- COLLEZ VOTRE ID ICI
// ------------------------------------------------------------------

function App() {
  const [language, setLanguage] = useState<Language>('fr'); 
  const [currentStep, setCurrentStep] = useState<AppStep>(AppStep.MODE_SELECT);
  const [businessDescription, setBusinessDescription] = useState<string>('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  // Project History
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  // File Upload
  const [isDragOver, setIsDragOver] = useState(false);
  const [startupFiles, setStartupFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Gmail State
  const [gmailToken, setGmailToken] = useState<string | null>(null);
  const [tokenClient, setTokenClient] = useState<any>(null);

  const t = translations[language];

  // 1. DATA PERSISTENCE: LOAD
  useEffect(() => {
    // Load Projects
    const savedProjects = localStorage.getItem('autoprospec_projects');
    if (savedProjects) setProjects(JSON.parse(savedProjects));

    // Load Current Active Session (Auto-Save)
    const savedSession = localStorage.getItem('autoprospec_session');
    if (savedSession) {
        try {
            const session = JSON.parse(savedSession);
            if (session.leads) setLeads(session.leads);
            if (session.businessDescription) setBusinessDescription(session.businessDescription);
            if (session.currentStep) setCurrentStep(session.currentStep);
            if (session.currentProjectId) setCurrentProjectId(session.currentProjectId);
        } catch (e) {
            console.error("Failed to restore session", e);
        }
    }
  }, []);

  // 2. DATA PERSISTENCE: SAVE
  useEffect(() => {
    localStorage.setItem('autoprospec_projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    // Save current working state automatically
    const session = {
        leads,
        businessDescription,
        currentStep,
        currentProjectId
    };
    localStorage.setItem('autoprospec_session', JSON.stringify(session));
  }, [leads, businessDescription, currentStep, currentProjectId]);

  // Init Google Identity
  useEffect(() => {
    if (window.google && GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== "YOUR_GOOGLE_CLIENT_ID") {
        try {
            const client = window.google.accounts.oauth2.initTokenClient({
                client_id: GOOGLE_CLIENT_ID,
                scope: 'https://www.googleapis.com/auth/gmail.send',
                callback: (response: any) => {
                    if (response.access_token) {
                        setGmailToken(response.access_token);
                    }
                },
            });
            setTokenClient(client);
        } catch (e) {
            console.error("Error initializing Google Client", e);
        }
    }
  }, []);

  // Theme
  useEffect(() => {
    if (isDarkMode) {
        document.documentElement.classList.add('dark');
        document.body.style.backgroundColor = '#0f172a';
        document.body.style.color = '#f8fafc';
    } else {
        document.documentElement.classList.remove('dark');
        document.body.style.backgroundColor = '#f8fafc';
        document.body.style.color = '#0f172a';
    }
  }, [isDarkMode]);

  // --- File Logic ---
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(false); };
  const processFiles = async (files: File[]) => {
      const newFiles = [...startupFiles, ...files];
      setStartupFiles(newFiles);
      const fileContents: string[] = [];
      for (const file of files) {
          try {
              const text = await file.text();
              fileContents.push(`\n\n[FILE: ${file.name}]\n${text}\n[/FILE]`);
          } catch (err) { console.error(err); }
      }
      setBusinessDescription(prev => prev + fileContents.join(''));
      if (fileContents.length > 0) setIsAssistantOpen(true);
  };
  const handleDrop = async (e: React.DragEvent) => {
      e.preventDefault(); setIsDragOver(false);
      if (e.dataTransfer.files) await processFiles(Array.from(e.dataTransfer.files));
  };
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) await processFiles(Array.from(e.target.files));
  };
  // ------------------

  const createNewProject = (name: string, initialLeads: Lead[] = []) => {
      const newProject: Project = {
          id: Date.now().toString(),
          name: name || `Campaign ${new Date().toLocaleDateString()}`,
          date: new Date(),
          leads: initialLeads,
          businessContext: businessDescription
      };
      setProjects(prev => [newProject, ...prev]);
      setCurrentProjectId(newProject.id);
      setLeads(initialLeads);
  };

  const loadProject = (project: Project) => {
      setCurrentProjectId(project.id);
      setLeads(project.leads);
      setBusinessDescription(project.businessContext);
      setCurrentStep(AppStep.OUTREACH);
  };

  const handleLeadsFound = (foundLeads: Lead[]) => {
    if (currentProjectId) {
        setLeads(foundLeads);
        setProjects(prev => prev.map(p => p.id === currentProjectId ? { ...p, leads: foundLeads } : p));
    } else {
        createNewProject("New Search", foundLeads);
    }
    setCurrentStep(AppStep.OUTREACH);
  };

  const handleUpdateLeads = (updatedLeads: Lead[]) => {
      setLeads(updatedLeads);
      if (currentProjectId) {
        setProjects(prev => prev.map(p => p.id === currentProjectId ? { ...p, leads: updatedLeads } : p));
    }
  };

  const handleConnectGmail = () => {
      if (tokenClient) {
          tokenClient.requestAccessToken();
      } else {
          alert("Erreur de configuration: GOOGLE_CLIENT_ID manquant dans App.tsx");
      }
  };

  const renderContent = () => {
    switch (currentStep) {
      case AppStep.MODE_SELECT:
      case AppStep.CONTEXT: 
        return (
            <div className="flex flex-col h-full overflow-y-auto pb-20 scrollbar-thin scrollbar-thumb-zinc-700">
                <div className="flex-1 flex flex-col justify-center animate-in fade-in zoom-in duration-500 pt-10">
                    <div className="text-center mb-8">
                        <h2 className={`text-4xl font-semibold mb-4 tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{t.selectMode}</h2>
                        <p className="text-zinc-400 max-w-lg mx-auto">
                            {language === 'fr' 
                            ? "Choisissez votre stratégie. Utilisez l'assistant à droite pour affiner votre ciblage à tout moment."
                            : "Choose your strategy. Use the assistant on the right to refine targeting at any time."}
                        </p>
                    </div>

                    <div className="max-w-2xl mx-auto w-full mb-16 px-4">
                        <div 
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`
                                relative rounded-3xl border-2 border-dashed transition-all cursor-pointer p-8 group
                                ${isDragOver 
                                    ? 'border-blue-500 bg-blue-500/10 scale-105' 
                                    : (isDarkMode ? 'border-white/10 hover:border-white/30 bg-white/5 hover:bg-white/10' : 'border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100')
                                }
                            `}
                        >
                            <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
                            <div className="flex flex-col items-center justify-center text-center">
                                <h3 className={`text-lg font-medium mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{t.uploadTitle}</h3>
                                <p className="text-sm text-zinc-500 max-w-sm mb-6">{t.uploadDesc}</p>
                                {startupFiles.length > 0 ? (
                                    <div className="flex flex-wrap gap-2 justify-center">
                                        {startupFiles.map((f, i) => (
                                            <span key={i} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">
                                                {f.name}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="inline-block px-4 py-2 rounded-full text-xs font-medium bg-white/10 text-zinc-400 group-hover:bg-white/20 transition-colors">
                                        Browse Files
                                    </span>
                                )}
                            </div>
                        </div>

                         <div className="mt-4">
                            <input 
                                type="text" 
                                value={businessDescription}
                                onChange={(e) => setBusinessDescription(e.target.value)}
                                placeholder={t.uploadPlaceholder}
                                className={`w-full bg-transparent border-b px-4 py-2 focus:outline-none transition-colors text-center text-sm ${isDarkMode ? 'border-white/10 focus:border-blue-500 text-zinc-300 placeholder-zinc-700' : 'border-zinc-300 focus:border-blue-500 text-slate-700 placeholder-slate-400'}`}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-8 justify-center items-stretch mb-16 px-4">
                        <div onClick={() => setCurrentStep(AppStep.DISCOVERY)} className={`group w-full md:w-80 p-8 backdrop-blur-xl border rounded-3xl cursor-pointer transition-all duration-300 shadow-2xl relative overflow-hidden ${isDarkMode ? 'bg-zinc-900/40 border-white/5 hover:border-blue-500/30' : 'bg-white border-zinc-200 hover:border-blue-500/30 shadow-zinc-200'}`}>
                            <h3 className={`text-2xl font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{t.modeMapsTitle}</h3>
                            <p className="text-zinc-500 text-sm leading-relaxed border-t border-zinc-500/10 pt-4 mt-2">{t.modeMapsDesc}</p>
                        </div>

                        <div onClick={() => setCurrentStep(AppStep.WEB_AUDIT)} className={`group w-full md:w-80 p-8 backdrop-blur-xl border rounded-3xl cursor-pointer transition-all duration-300 shadow-2xl relative overflow-hidden ${isDarkMode ? 'bg-zinc-900/40 border-white/5 hover:border-purple-500/30' : 'bg-white border-zinc-200 hover:border-purple-500/30 shadow-zinc-200'}`}>
                            <h3 className={`text-2xl font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{t.modeAuditTitle}</h3>
                            <p className="text-zinc-500 text-sm leading-relaxed border-t border-zinc-500/10 pt-4 mt-2">{t.modeAuditDesc}</p>
                        </div>
                    </div>
                </div>

                <div className={`p-6 rounded-t-3xl border-t border-x mx-4 lg:mx-auto max-w-7xl ${isDarkMode ? 'bg-zinc-900/80 border-white/10' : 'bg-white border-zinc-200'}`}>
                    <h3 className={`text-sm font-semibold uppercase tracking-wider mb-4 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
                        Recent Projects ({projects.length})
                    </h3>
                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                        {projects.map(p => (
                            <div key={p.id} onClick={() => loadProject(p)} className={`min-w-[200px] p-4 rounded-xl cursor-pointer border hover:scale-105 transition-transform ${isDarkMode ? 'bg-black/40 border-white/10 hover:border-white/30' : 'bg-slate-50 border-zinc-200 hover:border-zinc-300'}`}>
                                <h4 className={`font-medium truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{p.name}</h4>
                                <p className="text-xs text-zinc-500 mt-1">{new Date(p.date).toLocaleDateString()} • {p.leads.length} Leads</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );

      case AppStep.DISCOVERY:
        return <LeadFinder onLeadsFound={handleLeadsFound} language={language} businessContext={businessDescription} />;
      
      case AppStep.WEB_AUDIT:
        return <WebAnalyzer onAuditComplete={handleLeadsFound} language={language} />;

      case AppStep.OUTREACH:
        return (
            <EmailDashboard 
                leads={leads} 
                businessContext={businessDescription} 
                language={language} 
                onUpdateLeads={handleUpdateLeads} 
                gmailToken={gmailToken}
                onConnectGmail={handleConnectGmail}
            />
        );
      
      default:
        return <div>Error</div>;
    }
  };

  return (
    <div className={`h-screen flex flex-col font-sans selection:bg-blue-500/30 overflow-hidden transition-colors duration-500 ${isDarkMode ? 'bg-black text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Background Ambience */}
      {isDarkMode && (
        <div className="fixed inset-0 pointer-events-none z-0">
            <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[120px] opacity-40"></div>
            <div className="absolute bottom-[-10%] right-[20%] w-[600px] h-[600px] bg-purple-900/5 rounded-full blur-[120px] opacity-40"></div>
        </div>
      )}

      {/* Header */}
      <header className={`h-16 flex-shrink-0 flex items-center justify-between px-6 border-b backdrop-blur-md relative z-40 ${isDarkMode ? 'border-white/5 bg-black/40' : 'border-zinc-200 bg-white/80'}`}>
        <div className="flex items-center gap-4 cursor-pointer" onClick={() => setCurrentStep(AppStep.MODE_SELECT)}>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-transform hover:scale-105 ${isDarkMode ? 'bg-white text-black' : 'bg-slate-900 text-white'}`}>
            <span className="font-bold">A</span>
          </div>
          <h1 className={`text-lg font-medium tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{t.title}</h1>
        </div>
        
        <div className="flex items-center gap-4">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-2 rounded-full hidden sm:block ${isDarkMode ? 'bg-white/10 text-yellow-300' : 'bg-slate-200 text-slate-600'}`}>
                {isDarkMode ? '☀' : '☾'}
            </button>

            <div className={`flex rounded-full border p-1 ${isDarkMode ? 'bg-zinc-900/50 border-white/5' : 'bg-white border-zinc-200'}`}>
                {(['en', 'fr', 'es'] as Language[]).map(lang => (
                    <button 
                        key={lang}
                        onClick={() => setLanguage(lang)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${language === lang ? (isDarkMode ? 'bg-white text-black' : 'bg-slate-900 text-white') : 'text-zinc-500 hover:text-zinc-700'}`}
                    >
                        {lang.toUpperCase()}
                    </button>
                ))}
            </div>

            <button 
                onClick={() => setIsAssistantOpen(!isAssistantOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${isAssistantOpen ? 'bg-blue-600 border-blue-500 text-white shadow-blue-500/20' : (isDarkMode ? 'bg-zinc-900/50 border-white/10 text-zinc-400' : 'bg-white border-zinc-200 text-zinc-500')}`}
            >
                <span className="text-xs font-medium">Assistant</span>
            </button>
        </div>
      </header>

      {/* Layout Grid */}
      <div className="flex-1 flex overflow-hidden relative z-10">
          <main 
            className={`flex-1 overflow-hidden transition-all duration-300 ease-in-out ${isAssistantOpen ? 'md:mr-[450px]' : ''}`}
          >
             <div className="container mx-auto max-w-full h-full p-4 md:p-6">
                {renderContent()}
             </div>
          </main>

          {isAssistantOpen && (
            <div 
                className="absolute inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
                onClick={() => setIsAssistantOpen(false)}
            />
          )}

          <GlobalAssistant 
            isOpen={isAssistantOpen} 
            onClose={() => setIsAssistantOpen(false)} 
            onUpdateContext={setBusinessDescription}
            language={language}
            currentContext={businessDescription}
          />
      </div>
    </div>
  );
}

export default App;