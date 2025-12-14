export interface DailyReport {
  employeeName: string;
  reportDate: string;
  department: string;
  contentSummary: string;
  nextSteps: string;
  blockers: string;
  matchedKeywords: string[];
}

export interface ProcessingStatus {
  isProcessing: boolean;
  error: string | null;
  step: 'idle' | 'analyzing' | 'formatting' | 'complete';
}

export enum ViewMode {
  INPUT = 'INPUT',
  PREVIEW = 'PREVIEW'
}

export interface CloudConfig {
  binId: string;
  apiKey: string;
  enabled: boolean;
}