import React, { useState, useCallback, useEffect } from 'react';
import { parseReportsWithGemini } from './services/geminiService';
import { fetchFromCloud, saveToCloud } from './services/jsonBinService';
import { DailyReport, ProcessingStatus, CloudConfig } from './types';
import KeywordInput from './components/KeywordInput';
import ResultsTable from './components/ResultsTable';
import CloudSettings from './components/CloudSettings';
import { SparklesIcon, DownloadIcon, RefreshIcon, CloudIcon, CogIcon } from './components/Icons';

function App() {
  const [inputText, setInputText] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  
  const [cloudConfig, setCloudConfig] = useState<CloudConfig>(() => {
    const saved = localStorage.getItem('dingtalk_cloud_config');
    return saved ? JSON.parse(saved) : { binId: '', apiKey: '', enabled: false };
  });

  const [status, setStatus] = useState<ProcessingStatus>({
    isProcessing: false,
    error: null,
    step: 'idle'
  });

  const [cloudStatus, setCloudStatus] = useState<string>('');

  // Initial Data Load (Local -> Cloud)
  useEffect(() => {
    const loadData = async () => {
      // 1. Try Local Storage first for instant render
      const localSaved = localStorage.getItem('dingtalk_reports_v2');
      if (localSaved) {
        try {
          const parsed = JSON.parse(localSaved);
          if (Array.isArray(parsed)) setReports(parsed);
        } catch (e) {
          console.error("Failed to load local", e);
        }
      }

      // 2. If Cloud Enabled, fetch from cloud and overwrite/merge
      if (cloudConfig.enabled && cloudConfig.binId && cloudConfig.apiKey) {
        try {
            setCloudStatus('Syncing...');
            const cloudData = await fetchFromCloud(cloudConfig.binId, cloudConfig.apiKey);
            if (cloudData.length > 0) {
                setReports(cloudData);
                localStorage.setItem('dingtalk_reports_v2', JSON.stringify(cloudData));
            }
            setCloudStatus('Synced');
            setTimeout(() => setCloudStatus(''), 2000);
        } catch (e) {
            console.error(e);
            setCloudStatus('Sync Error');
        }
      }
    };
    loadData();
  }, [cloudConfig.enabled, cloudConfig.binId, cloudConfig.apiKey]);

  // Persist Config
  useEffect(() => {
    localStorage.setItem('dingtalk_cloud_config', JSON.stringify(cloudConfig));
  }, [cloudConfig]);

  // Save to Cloud Function
  const persistReports = async (newReports: DailyReport[]) => {
    setReports(newReports);
    localStorage.setItem('dingtalk_reports_v2', JSON.stringify(newReports));

    if (cloudConfig.enabled && cloudConfig.binId && cloudConfig.apiKey) {
      try {
        setCloudStatus('Saving...');
        await saveToCloud(cloudConfig.binId, cloudConfig.apiKey, newReports);
        setCloudStatus('Saved to Cloud');
        setTimeout(() => setCloudStatus(''), 2000);
      } catch (e) {
        console.error("Cloud Save Failed", e);
        setCloudStatus('Save Failed');
      }
    }
  };

  const handleParse = useCallback(async () => {
    if (!inputText.trim()) {
      setStatus({ isProcessing: false, error: "Please enter text to parse.", step: 'idle' });
      return;
    }

    setStatus({ isProcessing: true, error: null, step: 'analyzing' });

    try {
      const newReports = await parseReportsWithGemini(inputText, keywords);
      const updatedReports = [...newReports, ...reports]; // Prepend new
      await persistReports(updatedReports);
      
      setInputText(''); 
      setStatus({ isProcessing: false, error: null, step: 'complete' });
    } catch (err: any) {
      console.error(err);
      setStatus({ isProcessing: false, error: err.message || "An unknown error occurred.", step: 'idle' });
    }
  }, [inputText, keywords, reports, cloudConfig]);

  const handleDownloadCSV = () => {
    if (reports.length === 0) return;
    const BOM = '\uFEFF';
    const headers = ['Department', 'Employee Name', 'Date', 'Content', 'Next Steps', 'Blockers', 'Keywords'].join(',');
    
    const rows = reports.map(r => {
      const safe = (str: string) => `"${(str || '').replace(/"/g, '""')}"`;
      return [
        safe(r.department),
        safe(r.employeeName),
        safe(r.reportDate),
        safe(r.contentSummary),
        safe(r.nextSteps),
        safe(r.blockers),
        safe(r.matchedKeywords.join('; '))
      ].join(',');
    });

    const csvContent = BOM + [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `dingtalk_reports_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRemoveReport = async (index: number) => {
    const updated = reports.filter((_, i) => i !== index);
    await persistReports(updated);
  };

  const clearAll = async () => {
    if(window.confirm("Are you sure you want to clear all parsed data? This will clear local and cloud storage.")) {
        await persistReports([]);
        setStatus({ isProcessing: false, error: null, step: 'idle' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Settings Modal */}
      {showSettings && (
        <CloudSettings 
          config={cloudConfig} 
          onSave={setCloudConfig} 
          onClose={() => setShowSettings(false)} 
        />
      )}

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <CloudIcon />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">DingTalk Team Report</h1>
              <div className="flex items-center gap-2">
                 <p className="text-xs text-gray-500">
                   {cloudConfig.enabled ? '🟢 Cloud Sync Active' : '⚪️ Local Storage Only'}
                 </p>
                 {cloudStatus && <span className="text-xs text-blue-600 font-medium animate-pulse">{cloudStatus}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <button 
               onClick={() => setShowSettings(true)}
               className="text-gray-500 hover:text-gray-700 flex items-center gap-1 text-sm font-medium"
             >
               <CogIcon /> Settings
             </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
          
          {/* Left Column: Input */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-lg shadow p-6 space-y-4">
              <h2 className="text-lg font-medium text-gray-900">1. Paste Daily Reports</h2>
              <p className="text-sm text-gray-500">
                AI parses DingTalk logs & syncs to cloud if enabled.
              </p>
              
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste chat logs here..."
                className="w-full h-64 p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-mono text-gray-700 resize-none"
              />

              <KeywordInput keywords={keywords} setKeywords={setKeywords} />

              {status.error && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md">
                  {status.error}
                </div>
              )}

              <button
                onClick={handleParse}
                disabled={status.isProcessing || !inputText.trim()}
                className={`w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white transition-all
                  ${status.isProcessing || !inputText.trim() 
                    ? 'bg-blue-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {status.isProcessing ? 'Analyzing...' : <><SparklesIcon /> Summarize & Save</>}
              </button>
            </div>
          </div>

          {/* Right Column: Output */}
          <div className="lg:col-span-8 flex flex-col space-y-6">
            <div className="bg-white rounded-lg shadow flex flex-col h-full">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">2. Review & Export</h2>
                <div className="flex gap-2">
                   {reports.length > 0 && (
                    <button onClick={clearAll} className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                        <span className="mr-2">Clear</span> <RefreshIcon />
                    </button>
                   )}
                   <button onClick={handleDownloadCSV} disabled={reports.length === 0} className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${reports.length === 0 ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}>
                    <DownloadIcon /> <span className="ml-2">Download CSV</span>
                  </button>
                </div>
              </div>
              
              <div className="flex-1 p-6 bg-gray-50 overflow-hidden flex flex-col">
                 <ResultsTable data={reports} onRemove={handleRemoveReport} />
                 {cloudConfig.enabled && (
                   <p className="mt-4 text-xs text-gray-400 text-center">
                     Data is synced to your JSONBin.io cloud bin.
                   </p>
                 )}
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

export default App;