import React, { useState, useEffect, useMemo } from 'react';
import { InputSection } from './components/InputSection';
import { ReportTable } from './components/ReportTable';
import { Dashboard } from './components/Dashboard';
import { parseDingTalkLogs } from './services/geminiService';
import { exportToExcel } from './utils/exportUtils';
import { ReportItem, ParsingStatus } from './types';
import { Download, LayoutDashboard, MessageSquareText, RefreshCw, Calendar as CalendarIcon, Filter, Cloud, CloudOff, AlertTriangle } from 'lucide-react';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, writeBatch, getDocs } from "firebase/firestore";

// ------------------------------------------------------------------
// Firebase Configuration
// ------------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyBZ55456oRdByR6hfogsgEGympq17Yy0o4",
  authDomain: "dingtalk-parser.firebaseapp.com",
  projectId: "dingtalk-parser",
  storageBucket: "dingtalk-parser.firebasestorage.app",
  messagingSenderId: "160835767748",
  appId: "1:160835767748:web:6b8f4790ba362d70a4a891",
  measurementId: "G-4N1QF327QH"
};

// Initialize Firebase only if config is set (which it is now)
const isConfigured = firebaseConfig.apiKey !== "YOUR_API_KEY";
let db: any = null;

if (isConfigured) {
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
  } catch (e) {
    console.error("Firebase init error:", e);
  }
}

const App: React.FC = () => {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [status, setStatus] = useState<ParsingStatus>(ParsingStatus.IDLE);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Date Filtering State
  const [filterDate, setFilterDate] = useState<string>('');

  // 1. Real-time Cloud Sync (Firebase)
  useEffect(() => {
    if (!isConfigured || !db) return;

    // Listen to 'reports' collection, ordered by date descending
    const q = query(collection(db, "reports"), orderBy("date", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cloudReports = snapshot.docs.map(doc => ({
        id: doc.id, // Use Cloud ID
        ...doc.data()
      })) as ReportItem[];
      setReports(cloudReports);
    }, (error) => {
      console.error("Sync error:", error);
      // Only show error if it's likely a permission issue, to avoid scaring users on network blips
      if (error.code === 'permission-denied') {
        setErrorMsg("Cloud sync failed: Permission denied. Please check Firestore Rules.");
      }
    });

    return () => unsubscribe();
  }, []);

  const handleAnalyze = async (text: string) => {
    setStatus(ParsingStatus.ANALYZING);
    setErrorMsg(null);
    try {
      const newReports = await parseDingTalkLogs(text);
      
      if (isConfigured && db) {
        // Cloud Mode: Upload one by one
        // We don't manually setReports here, the onSnapshot listener will do it automatically
        const uploadPromises = newReports.map(item => {
          // Remove temporary ID, let Firebase generate one
          const { id, ...data } = item;
          return addDoc(collection(db, "reports"), data);
        });
        await Promise.all(uploadPromises);
      } else {
        // Fallback Local Mode (if config missing)
        setReports(prev => {
          const updated = [...newReports, ...prev];
          return updated.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        });
      }
      
      setStatus(ParsingStatus.SUCCESS);
      setFilterDate(''); // Reset filter to show new data
    } catch (e) {
      console.error(e);
      setStatus(ParsingStatus.ERROR);
      setErrorMsg("Failed to parse the text. Please check your AI API key or text format.");
    }
  };

  const handleDelete = async (id: string) => {
    if (isConfigured && db) {
      try {
        await deleteDoc(doc(db, "reports", id));
      } catch (e) {
        console.error("Delete failed", e);
        alert("Failed to delete from cloud. Check permissions.");
      }
    } else {
      setReports(prev => prev.filter(r => r.id !== id));
    }
  };

  const handleExport = () => {
    const dateStr = filterDate || new Date().toISOString().split('T')[0];
    exportToExcel(displayedReports, `DingTalk_Summary_${dateStr}.xlsx`);
  };

  const handleReset = async () => {
    const confirmMsg = isConfigured 
      ? "DANGER: This will permanently delete ALL records from the cloud database for EVERYONE. Continue?" 
      : "Are you sure you want to clear all local data?";

    if (confirm(confirmMsg)) {
      if (isConfigured && db) {
        // Batch delete for Cloud
        try {
          setStatus(ParsingStatus.ANALYZING); // Show spinner
          const q = query(collection(db, "reports"));
          const snapshot = await getDocs(q);
          const batch = writeBatch(db);
          snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
          });
          await batch.commit();
          setStatus(ParsingStatus.IDLE);
        } catch (e) {
          console.error("Batch delete failed", e);
          alert("Failed to clear cloud data.");
          setStatus(ParsingStatus.IDLE);
        }
      } else {
        // Local Mode
        setReports([]);
        setStatus(ParsingStatus.IDLE);
      }
    }
  };

  // Compute filtered reports
  const displayedReports = useMemo(() => {
    if (!filterDate) return reports;
    return reports.filter(r => r.date === filterDate);
  }, [reports, filterDate]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20">
      {/* Configuration Warning Banner */}
      {!isConfigured && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 text-sm text-yellow-800 flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>
            <strong>Cloud Sync Inactive:</strong> Firebase configuration is missing. Currently using Local Storage.
          </span>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shrink-0">
              <MessageSquareText className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 truncate">DingTalk Parser</h1>
            <div className={`hidden md:flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${isConfigured ? 'bg-green-50 text-green-700 border-green-100' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
               {isConfigured ? <Cloud className="w-3 h-3" /> : <CloudOff className="w-3 h-3" />}
               <span>{isConfigured ? 'Cloud Connected' : 'Local Mode'}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
             {/* Date Filter */}
             <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Filter className={`w-4 h-4 ${filterDate ? 'text-blue-500' : 'text-gray-400'}`} />
                </div>
                <input 
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className={`
                    pl-9 pr-3 py-1.5 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all
                    ${filterDate ? 'border-blue-200 bg-blue-50 text-blue-800 font-medium' : 'border-gray-300 text-gray-600 bg-gray-50'}
                  `}
                  title="Filter history by date"
                />
                {filterDate && (
                  <button 
                    onClick={() => setFilterDate('')}
                    className="absolute inset-y-0 right-8 flex items-center text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Clear
                  </button>
                )}
             </div>

             {reports.length > 0 && (
               <div className="flex items-center gap-2 border-l border-gray-200 pl-3 ml-1">
                  <button
                    onClick={handleExport}
                    className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="Export Current View to Excel"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleReset}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Clear All History (Danger)"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
               </div>
             )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Input Section - Only show if not strictly filtering history, or always show for quick add */}
        {!filterDate && (
          <InputSection 
            onAnalyze={handleAnalyze} 
            isAnalyzing={status === ParsingStatus.ANALYZING} 
          />
        )}

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 flex items-center gap-2">
            <span className="font-semibold">Error:</span> {errorMsg}
          </div>
        )}

        {reports.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <LayoutDashboard className="w-5 h-5 text-gray-500" />
                <h2 className="text-lg font-semibold text-gray-800">
                  {filterDate ? `Dashboard (${filterDate})` : 'All Time Overview'}
                </h2>
              </div>
              <div className="text-sm text-gray-500">
                Total Records: {reports.length} {filterDate && `(Showing ${displayedReports.length})`}
              </div>
            </div>

            {/* Pass filtered reports to Dashboard so charts update based on date selection */}
            <Dashboard reports={displayedReports} />

            <div className="flex items-center justify-between mb-4 mt-8">
               <h2 className="text-lg font-semibold text-gray-800">
                 {filterDate ? `Records for ${filterDate}` : 'Historical Records'}
               </h2>
            </div>
            
            {displayedReports.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 border-dashed">
                 <p className="text-gray-500">No records found for this date.</p>
                 <button onClick={() => setFilterDate('')} className="mt-2 text-blue-600 hover:underline">Clear Filter</button>
              </div>
            ) : (
              <ReportTable reports={displayedReports} onDelete={handleDelete} />
            )}
          </>
        )}
      </main>
    </div>
  );
};

// Quick helper for trash icon in header
function Trash2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </svg>
  )
}

export default App;