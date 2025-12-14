export interface ReportItem {
  id: string;
  employeeName: string;
  date: string;
  department: '食百' | '水产肉品' | '蔬果' | '熟食冻品' | '后勤';
  content: string;
}

export interface ParseResult {
  reports: ReportItem[];
  summary: string;
}

export enum ParsingStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}