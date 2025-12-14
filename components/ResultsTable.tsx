import React, { useState } from 'react';
import { DailyReport } from '../types';
import { TrashIcon, ChevronDownIcon, ChevronUpIcon } from './Icons';

interface ResultsTableProps {
  data: DailyReport[];
  onRemove: (index: number) => void;
}

const ResultsTable: React.FC<ResultsTableProps> = ({ data, onRemove }) => {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleRow = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  if (data.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
        <p className="text-gray-500">No data parsed yet. Paste reports on the left to begin.</p>
        <p className="text-xs text-gray-400 mt-2">Data is automatically saved to your browser.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-300 bg-white">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 w-10"></th>
              <th scope="col" className="py-3.5 pl-2 pr-3 text-left text-sm font-semibold text-gray-900">Name</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Dept</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Date</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Content (Original)</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Plan</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Keywords</th>
              <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {data.map((report, idx) => {
              const isExpanded = expandedRows.has(idx);
              return (
                <tr 
                  key={idx} 
                  className={`hover:bg-gray-50 cursor-pointer transition-colors ${report.matchedKeywords.length > 0 ? 'bg-yellow-50 hover:bg-yellow-100' : ''}`}
                  onClick={() => toggleRow(idx)}
                >
                  <td className="pl-4 pr-2 py-4 text-sm text-gray-400 sm:pl-6">
                    {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                  </td>
                  <td className="whitespace-nowrap pl-2 pr-3 py-4 text-sm font-medium text-gray-900">
                    {report.employeeName}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-700">
                     <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                       ${report.department === '食百' ? 'bg-green-100 text-green-800' : 
                         report.department === '水产肉品' ? 'bg-red-100 text-red-800' :
                         report.department === '蔬果' ? 'bg-orange-100 text-orange-800' :
                         report.department === '熟食冻品' ? 'bg-blue-100 text-blue-800' :
                         'bg-gray-100 text-gray-800'}`}>
                      {report.department || '后勤'}
                     </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{report.reportDate}</td>
                  
                  {/* Content Column - Toggle between truncate and pre-wrap */}
                  <td className={`px-3 py-4 text-sm text-gray-500 transition-all duration-200 ${isExpanded ? 'whitespace-pre-wrap break-words' : 'max-w-xs truncate'}`}>
                    {report.contentSummary}
                    {isExpanded && report.blockers && (
                      <div className="mt-2 pt-2 border-t border-gray-200 text-red-600 text-xs">
                        <strong>Blockers:</strong> {report.blockers}
                      </div>
                    )}
                  </td>
                  
                  {/* Plan Column */}
                  <td className={`px-3 py-4 text-sm text-gray-500 transition-all duration-200 ${isExpanded ? 'whitespace-pre-wrap break-words' : 'max-w-xs truncate'}`}>
                    {report.nextSteps}
                  </td>

                  <td className="px-3 py-4 text-sm text-gray-500">
                    <div className="flex flex-wrap gap-1">
                      {report.matchedKeywords.map((kw, kIdx) => (
                        <span key={kIdx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent row toggle when clicking delete
                        onRemove(idx);
                      }}
                      className="text-red-600 hover:text-red-900 transition-colors p-1"
                      title="Remove Entry"
                    >
                      <TrashIcon />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ResultsTable;