import React, { useState, useCallback, useEffect } from 'react';
import { parseReportsWithGemini } from './services/geminiService';
import { initFirebase, subscribeToReports, saveReportsToFirebase, clearFirebaseData } from './services/firebaseService';
import { DailyReport, ProcessingStatus, CloudConfig } from './types';
import KeywordInput from './components/KeywordInput';
import ResultsTable from './components/ResultsTable';
import CloudSettings from './components/CloudSettings';
import { SparklesIcon, DownloadIcon, RefreshIcon, CloudIcon, CogIcon } from './components/Icons';

// Default empty config
const DEFAULT_CLOUD_CONFIG: CloudConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
  enabled: false
};

const STORAGE_KEY_CONFIG = 'dingtalk_firebase_config_v1';

function App() {
  const [inputText, setInputText] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [copySuccess, setCopySuccess] = useState('');
  const [filterKeywords, setFilterKeywords] = useState(false);
  const [isStorageFull, setIsStorageFull] = useState(false);
  
  // Load config from LocalStorage
  const [cloudConfig, setCloudConfig] = useState<CloudConfig>(() => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (e) {
        console.warn("Failed to load cloud config", e);
    }
    return DEFAULT_CLOUD_CONFIG;
  });

  const [status, setStatus] = useState<ProcessingStatus>({
    isProcessing: false,
    error: null,
    step: 'idle'
  });

  const [cloudStatus, setCloudStatus] = useState<string>('');

  // Initialize Firebase and Subscribe
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const setupFirebase = async () => {
      if (cloudConfig.enabled && cloudConfig.apiKey) {
        try {
          initFirebase(cloudConfig);
          setCloudStatus('Connecting...');
          
          unsubscribe = subscribeToReports(
            (data) => {
              setReports(data);
              setCloudStatus('Live Sync Active');
              setIsStorageFull(false); // Reset full status on successful sync
            },
            (errorMsg) => {
              console.error(errorMsg);
              setCloudStatus('Sync Error');
            }
          );
        } catch (e) {
          console.error("Firebase Init Error", e);
          setCloudStatus('Config Error');
        }
      } else {
        setCloudStatus('');
      }
    };

    setupFirebase();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [cloudConfig]);

  // Persist Config
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(cloudConfig));
  }, [cloudConfig]);

  // Save Function (Triggered by Parse or Delete)
  const saveAll = async (newReports: DailyReport[]) => {
    // Optimistic Update for UI
    setReports(newReports);

    if (cloudConfig.enabled && cloudConfig.apiKey) {
      try {
        setCloudStatus('Syncing...');
        await saveReportsToFirebase(newReports);
        setCloudStatus('Live Sync Active');
        setIsStorageFull(false);
      } catch (e: any) {
        if (e.message === 'STORAGE_FULL') {
           setIsStorageFull(true);
           setCloudStatus('Storage Full!');
           alert("Cloud Storage Limit Reached (1MB doc limit). Please Export CSV and Clear Data.");
        } else {
           console.error(e);
           setCloudStatus('Save Failed');
        }
      }
    }
  };

  const handleParse = useCallback(async () => {
    if (!inputText.trim()) {
      setStatus({ isProcessing: false, error: "Please enter text to parse.", step: 'idle' });
      return;
    }

    if (isStorageFull) {
        setStatus({ isProcessing: false, error: "Cloud storage is full. Please export and clear data.", step: 'idle' });
        return;
    }

    setStatus({ isProcessing: true, error: null, step: 'analyzing' });

    try {
      const newReports = await parseReportsWithGemini(inputText, keywords);
      // Prepend new reports to existing ones
      const updatedReports = [...newReports, ...reports];
      await saveAll(updatedReports);
      
      setInputText(''); 
      setStatus({ isProcessing: false, error: null, step: 'complete' });
    } catch (err: any) {
      console.error(err);
      setStatus({ isProcessing: false, error: err.message || "An unknown error occurred.", step: 'idle' });
    }
  }, [inputText, keywords, reports, cloudConfig, isStorageFull]);

  // Compute displayed reports based on filter
  const displayedReports = filterKeywords 
    ? reports.filter(r => r.matchedKeywords.length > 0) 
    : reports;

  const handleDownloadCSV = () => {
    if (displayedReports.length === 0) return;
    const BOM = '\uFEFF';
    const headers = ['Department', 'Employee Name', 'Date', 'Content', 'Next Steps', 'Blockers', 'Keywords'].join(',');
    
    const rows = displayedReports.map(r => {
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
    link.setAttribute('download', `dingtalk_reports_${filterKeywords ? 'filtered_' : ''}${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyToClipboard = async () => {
    if (displayedReports.length === 0) return;

    const headers = ['Department', 'Employee Name', 'Date', 'Content', 'Next Steps', 'Blockers', 'Keywords'].join('\t');
    const rows = displayedReports.map(r => {
      const safe = (str: string) => (str || '').replace(/\t/g, ' ').replace(/\n/g, ' '); 
      return [
        safe(r.department),
        safe(r.employeeName),
        safe(r.reportDate),
        safe(r.contentSummary),
        safe(r.nextSteps),
        safe(r.blockers),
        safe(r.matchedKeywords.join('; '))
      ].join('\t');
    }).join('\n');

    const content = headers + '\n' + rows;

    try {
      await navigator.clipboard.writeText(content);
      setCopySuccess('Copied to clipboard!');
      setTimeout(() => setCopySuccess(''), 4000);
    } catch (err) {
      setCopySuccess('Failed to copy.');
    }
  };

  const handleRemoveReport = async (index: number) => {
    const reportToRemove = displayedReports[index];
    if (reportToRemove) {
      const updated = reports.filter(r => r !== reportToRemove);
      await saveAll(updated);
    }
  };

  const clearAll = async () => {
    const confirmMsg = "Are you sure you want to clear ALL data from Firebase Cloud?\n\nThis will delete data for ALL devices synced to this project.\nEnsure you have exported a CSV first!";
    if(window.confirm(confirmMsg)) {
        if (cloudConfig.enabled) {
          try {
             await clearFirebaseData();
             // setReports([]) will happen automatically via subscription
             setIsStorageFull(false);
          } catch(e) {
             alert("Failed to clear cloud data. Check permissions.");
          }
        } else {
           setReports([]);
        }
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
            <div className={`p-2 rounded-lg text-white ${isStorageFull ? 'bg-red-600 animate-pulse' : 'bg-orange-500'}`}>
              <CloudIcon />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">DingTalk Team Report</h1>
              <div className="flex items-center gap-2">
                 <p className="text-xs text-gray-500">
                   {cloudConfig.enabled ? '🔥 Firebase Active' : '⚪️ Local Only'}
                 </p>
                 {cloudStatus && <span className={`text-xs font-medium ${isStorageFull ? 'text-red-600 font-bold' : 'text-orange-600 animate-pulse'}`}>{cloudStatus}</span>}
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

      {/* Storage Full Warning Banner */}
      {isStorageFull && (
        <div className="bg-red-600 text-white text-center py-2 px-4 font-medium text-sm">
          ⚠️ Cloud Storage Full! Please <b>Download CSV</b> to backup your data, then click <b>Clear All</b>.
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
          
          {/* Left Column: Input */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-lg shadow p-6 space-y-4">
              <h2 className="text-lg font-medium text-gray-900">1. Paste Daily Reports</h2>
              <p className="text-sm text-gray-500">
                AI parses DingTalk logs & syncs to Firebase automatically.
              </p>
              
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste DingTalk chat logs here..."
                disabled={isStorageFull}
                className={`w-full h-64 p-3 border rounded-md sm:text-sm font-mono resize-none ${isStorageFull ? 'bg-gray-100 border-red-300 cursor-not-allowed' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500 text-gray-700'}`}
              />

              <KeywordInput keywords={keywords} setKeywords={setKeywords} />

              {status.error && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md">
                  {status.error}
                </div>
              )}

              <button
                onClick={handleParse}
                disabled={status.isProcessing || !inputText.trim() || isStorageFull}
                className={`w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white transition-all
                  ${status.isProcessing || !inputText.trim() || isStorageFull
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {status.isProcessing ? 'Analyzing...' : <><SparklesIcon /> Summarize & Save</>}
              </button>
            </div>
          </div>

          {/* Right Column: Output */}
          <div className="lg:col-span-8 flex flex-col space-y-6">
            <div className={`bg-white rounded-lg shadow flex flex-col h-full ${isStorageFull ? 'ring-2 ring-red-500' : ''}`}>
              <div className="p-6 border-b border-gray-200 flex flex-wrap gap-4 justify-between items-center">
                <div className="flex items-center gap-4">
                  <h2 className="text-lg font-medium text-gray-900">2. Review & Export</h2>
                  <div className="flex items-center">
                      <input
                          id="filter-keywords"
                          type="checkbox"
                          checked={filterKeywords}
                          onChange={(e) => setFilterKeywords(e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                      />
                      <label htmlFor="filter-keywords" className="ml-2 block text-sm text-gray-700 cursor-pointer select-none">
                          Show only matched keywords
                      </label>
                  </div>
                </div>

                <div className="flex gap-2 items-center">
                   {copySuccess && <span className="text-xs text-green-600 font-bold transition-opacity">{copySuccess}</span>}
                   
                   <button onClick={handleCopyToClipboard} disabled={displayedReports.length === 0} className={`inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 ${displayedReports.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      <span className="mr-2">Copy for Excel</span>
                   </button>

                   {reports.length > 0 && (
                    <button onClick={clearAll} className={`inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 hover:bg-red-50 hover:text-red-700 hover:border-red-300 ${isStorageFull ? 'bg-red-50 border-red-300 text-red-700 animate-pulse' : 'bg-white'}`}>
                        {isStorageFull ? 'Clear & Reset' : <RefreshIcon />}
                    </button>
                   )}
                   <button onClick={handleDownloadCSV} disabled={displayedReports.length === 0} className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${displayedReports.length === 0 ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}>
                    <DownloadIcon /> <span className="ml-2">CSV</span>
                  </button>
                </div>
              </div>
              
              <div className="flex-1 p-6 bg-gray-50 overflow-hidden flex flex-col">
                 <ResultsTable data={displayedReports} onRemove={handleRemoveReport} />
                 {cloudConfig.enabled && (
                   <p className="mt-4 text-xs text-gray-400 text-center">
                     Synced with Firebase Firestore.
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