export type Language = 'en' | 'fr' | 'es';

declare global {
  interface Window {
    google: any;
  }
}

export interface AuditReport {
  seoScore: number;
  designScore: number;
  mobileScore: number;
  criticalIssues: string[];
  positivePoints: string[];
  summary: string;
}

// Simplified Analysis
export interface DeepAnalysis {
  leadScore: number; // 0-100
  fitReasoning: string; // "Why this is a good client for me"
  keyPainPoints: string[];
  techStack: string[];
  decisionMaker?: string;
  verificationStatus?: 'Verified Active' | 'Uncertain' | 'Likely Closed';
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  isProcessing?: boolean;
}

export interface Lead {
  id: string;
  name: string;
  address: string;
  rating?: number;
  website?: string;
  phone?: string;
  businessType?: string;
  openingHours?: string;
  status: 'new' | 'analyzed' | 'contacted' | 'converted';
  notes?: string;
  
  auditReport?: AuditReport;
  deepAnalysis?: DeepAnalysis;
  
  // Single Email Focus
  generatedEmail?: string; 
  emailRefinementHistory?: Message[]; // Chat history for refining this specific lead's email
  
  // Gmail Integration
  gmailMessageId?: string;
  gmailThreadId?: string;
  lastEmailSentAt?: Date;
  sendingError?: string;
  complianceStatus?: 'Safe (B2B)' | 'Warning (Personal Email)';
}

export interface Project {
  id: string;
  name: string;
  date: Date;
  leads: Lead[];
  businessContext: string;
}

export interface BusinessContext {
  description: string;
  uploadedFilesContent: string[];
}

export enum AppStep {
  CONTEXT = 'CONTEXT',
  MODE_SELECT = 'MODE_SELECT',
  DISCOVERY = 'DISCOVERY',
  WEB_AUDIT = 'WEB_AUDIT',
  OUTREACH = 'OUTREACH',
}