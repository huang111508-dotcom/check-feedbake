import * as XLSX from 'xlsx';
import { ReportItem } from '../types';

export const exportToExcel = (reports: ReportItem[], filename: string = 'DingTalk_Summary.xlsx') => {
  const worksheetData = reports.map(r => ({
    '日期 (Date)': r.date,
    '部门 (Department)': r.department,
    '姓名 (Name)': r.employeeName,
    '汇报内容 (Content)': r.content
  }));

  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Daily Reports");
  
  // Auto-width columns
  const wscols = [
    { wch: 15 }, // Date
    { wch: 15 }, // Department
    { wch: 15 }, // Name
    { wch: 80 }, // Content (Wider for full text)
  ];
  worksheet['!cols'] = wscols;

  XLSX.writeFile(workbook, filename);
};