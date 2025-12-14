import React, { useState } from 'react';
import { ReportItem } from '../types';
import { Trash2, Users, Calendar, ChevronDown, ChevronRight, MapPin } from 'lucide-react';

interface ReportTableProps {
  reports: ReportItem[];
  onDelete: (id: string) => void;
}

const DepartmentBadge: React.FC<{ dept: string }> = ({ dept }) => {
  const colors: Record<string, string> = {
    '食百': 'bg-orange-100 text-orange-800',
    '水产肉品': 'bg-blue-100 text-blue-800',
    '蔬果': 'bg-green-100 text-green-800',
    '熟食冻品': 'bg-red-100 text-red-800',
    '后勤': 'bg-gray-100 text-gray-800'
  };

  const colorClass = colors[dept] || 'bg-gray-100 text-gray-800';

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium ${colorClass}`}>
      {dept}
    </span>
  );
};

const ReportRow: React.FC<{ report: ReportItem; onDelete: (id: string) => void }> = ({ report, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => setIsExpanded(!isExpanded);

  return (
    <tr 
      onClick={toggleExpand}
      className={`
        group border-b border-gray-100 transition-all cursor-pointer
        ${isExpanded ? 'bg-blue-50/50' : 'hover:bg-gray-50'}
      `}
    >
      <td className="px-6 py-4 text-gray-500 whitespace-nowrap font-mono text-xs align-top">
        <div className="flex items-center gap-2 mt-1">
          <button 
            className="text-gray-400 hover:text-blue-600 transition-colors"
            onClick={(e) => { e.stopPropagation(); toggleExpand(); }}
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {report.date}
          </div>
        </div>
      </td>
      <td className="px-6 py-4 font-medium text-gray-900 align-top">
        <div className="flex items-center gap-2 mt-1">
          <Users className="w-3 h-3 text-gray-400" />
          {report.employeeName}
        </div>
      </td>
      <td className="px-6 py-4 align-top">
        <div className="mt-1">
          <DepartmentBadge dept={report.department} />
        </div>
      </td>
      <td className="px-6 py-4 text-gray-700 leading-relaxed align-top min-w-[300px]">
        {/* Use font-mono to ensure indentation/spacing aligns perfectly like in a text editor */}
        <div className={`transition-all duration-300 ease-in-out font-mono text-sm whitespace-pre-wrap ${isExpanded ? '' : 'line-clamp-3 text-gray-500'}`}>
          {report.content}
        </div>
        {!isExpanded && (
          <div className="text-xs text-blue-500 mt-1 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
            Click to expand
          </div>
        )}
      </td>
      <td className="px-6 py-4 text-right align-top">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if(confirm('Are you sure you want to delete this record?')) {
               onDelete(report.id);
            }
          }}
          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 mt-1"
          title="Delete row"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
};

export const ReportTable: React.FC<ReportTableProps> = ({ reports, onDelete }) => {
  if (reports.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 w-40 pl-10">日期 (Date)</th>
              <th className="px-6 py-4 w-32">姓名 (Name)</th>
              <th className="px-6 py-4 w-32">部门 (Dept)</th>
              <th className="px-6 py-4">汇报内容 (Click to view details)</th>
              <th className="px-6 py-4 w-20 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {reports.map((report) => (
              <ReportRow key={report.id} report={report} onDelete={onDelete} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};