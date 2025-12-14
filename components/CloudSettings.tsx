import React, { useState, useEffect } from 'react';
import { CloudConfig } from '../types';

interface CloudSettingsProps {
  config: CloudConfig;
  onSave: (config: CloudConfig) => void;
  onClose: () => void;
}

const CloudSettings: React.FC<CloudSettingsProps> = ({ config, onSave, onClose }) => {
  const [configJson, setConfigJson] = useState('');
  const [enabled, setEnabled] = useState(config.enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Pre-fill existing config if available
    if (config.apiKey) {
      const { enabled: _, ...rest } = config;
      setConfigJson(JSON.stringify(rest, null, 2));
    }
  }, [config]);

  const handleSave = () => {
    try {
      if (!configJson.trim()) {
        // If empty, just save enabled state or clear
        onSave({ 
            apiKey: '', authDomain: '', projectId: '', storageBucket: '', 
            messagingSenderId: '', appId: '', enabled: false 
        });
        onClose();
        return;
      }

      const parsed = JSON.parse(configJson);
      if (!parsed.apiKey || !parsed.projectId) {
        throw new Error("Invalid Config: Missing apiKey or projectId.");
      }

      onSave({ ...parsed, enabled });
      onClose();
    } catch (e) {
      setError("Invalid JSON format. Please copy the object exactly from Firebase Console.");
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="relative mx-auto p-5 border w-[32rem] shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg leading-6 font-medium text-gray-900 text-center">🔥 Firebase Cloud Sync</h3>
          
          <div className="mt-4 px-2 space-y-4">
            
            <div className="bg-orange-50 p-3 rounded text-xs text-orange-800 space-y-2 border border-orange-200">
               <p><b>Setup Instructions (One-time):</b></p>
               <ol className="list-decimal pl-4 space-y-1">
                 <li>Go to <a href="https://console.firebase.google.com/" target="_blank" className="underline font-bold">Firebase Console</a> and create a project.</li>
                 <li>Project Settings &gt; General &gt; Add Web App (<code>&lt;/&gt;</code> icon).</li>
                 <li>Copy the <code>firebaseConfig</code> object (content inside the brackets).</li>
                 <li><strong>Important:</strong> Go to <b>Firestore Database</b>, create database, and select <b>Start in Test Mode</b> (allows read/write).</li>
               </ol>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Firebase Config JSON</label>
              <textarea 
                rows={8}
                value={configJson}
                onChange={(e) => setConfigJson(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-xs font-mono bg-gray-50"
                placeholder={`{
  "apiKey": "AIzaSy...",
  "authDomain": "...",
  "projectId": "...",
  "storageBucket": "...",
  "messagingSenderId": "...",
  "appId": "..."
}`}
              />
              {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
            </div>

            <div className="flex items-center">
                <input
                    id="enable-cloud"
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="enable-cloud" className="ml-2 block text-sm text-gray-900 font-bold">
                    Enable Real-time Sync
                </label>
            </div>
          </div>

          <div className="items-center px-4 py-3 mt-4 flex justify-between gap-4">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-800 text-sm font-medium rounded-md w-full hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-md w-full hover:bg-orange-700 shadow-sm"
            >
              Connect & Sync
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CloudSettings;