import React, { useState } from 'react';
import { CloudConfig } from '../types';

interface CloudSettingsProps {
  config: CloudConfig;
  onSave: (config: CloudConfig) => void;
  onClose: () => void;
}

const CloudSettings: React.FC<CloudSettingsProps> = ({ config, onSave, onClose }) => {
  const [binId, setBinId] = useState(config.binId);
  const [apiKey, setApiKey] = useState(config.apiKey);
  const [enabled, setEnabled] = useState(config.enabled);

  const handleSave = () => {
    onSave({ binId, apiKey, enabled });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="relative mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3 text-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900">☁️ 云端同步设置</h3>
          <p className="text-xs text-gray-500 mt-2">
            使用 <b>JSONBin.io</b> 进行免费云端存储。
          </p>
          <div className="mt-4 px-2 text-left space-y-4">
            
            <div className="bg-blue-50 p-3 rounded text-xs text-blue-800 space-y-2">
               <p><b>配置步骤 (解决 Bin cannot be blank 报错):</b></p>
               <ol className="list-decimal pl-4 space-y-1">
                 <li>登录 <a href="https://jsonbin.io/app/bins" target="_blank" className="underline font-bold">jsonbin.io</a>，点击左侧 <b>BINS</b>。</li>
                 <li>点击页面中间或右上方的 <b>Create a Bin</b> 按钮。</li>
                 <li><b>关键：</b>在右侧大块编辑区域（标有行号 1 的位置），输入 <code className="bg-blue-100 px-1 font-bold">[]</code>。</li>
                 <li>如果仍然提示错误，请尝试输入 <code className="bg-blue-100 px-1 font-bold">["init"]</code>。</li>
                 <li>点击蓝色的 <b>Save Bin</b> 按钮保存。</li>
                 <li>复制编辑器上方显示的 <b>Bin ID</b> (例如 67be...)。</li>
                 <li>点击左侧 <b>API KEYS</b> -> Create New Key -> 复制 <b>Master Key</b>。</li>
               </ol>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">X-Master-Key (API Key)</label>
              <input 
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm"
                placeholder="$2b$10$..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Bin ID</label>
              <input 
                type="text"
                value={binId}
                onChange={(e) => setBinId(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm"
                placeholder="67be..."
              />
            </div>

            <div className="flex items-center">
                <input
                    id="enable-cloud"
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="enable-cloud" className="ml-2 block text-sm text-gray-900">
                    启用自动同步
                </label>
            </div>
          </div>

          <div className="items-center px-4 py-3 mt-4 flex justify-between gap-4">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CloudSettings;