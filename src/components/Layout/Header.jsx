import React from 'react';
import { Server, Upload, RotateCcw, Network } from 'lucide-react';

export default function Header({ version, onReset, onUpload, onToggleConnect, isConnectOpen }) {
    return (
        <header className="bg-blue-900 text-white p-4 shadow-lg sticky top-0 z-50">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2">
                    <Server className="w-8 h-8" />
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Cisco Switchport Gen</h1>
                        <p className="text-blue-200 text-xs">
                            Config Generator & Visualizer <span className="opacity-60 ml-1">{version}</span>
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* NEW CONNECT BUTTON */}
                    <button
                        onClick={onToggleConnect}
                        className={`flex items-center gap-2 px-3 py-1 rounded-lg border text-sm font-medium transition-colors ${isConnectOpen ? 'bg-blue-700 border-blue-500 text-white shadow-inner' : 'bg-blue-800 hover:bg-blue-700 border-blue-700 text-blue-100'}`}
                        title="Connect to Switch via SSH"
                    >
                        <Network size={16} />
                        <span className="hidden sm:inline">Connect to Switch</span>
                    </button>

                    <div className="h-6 w-px bg-blue-800 mx-1"></div>

                    <button
                        onClick={onReset}
                        className="flex items-center gap-2 px-3 py-1 bg-blue-800 hover:bg-blue-700 rounded-lg border border-blue-700 text-sm font-medium transition-colors text-blue-100"
                        title="Alles zurücksetzen"
                    >
                        <RotateCcw size={16} />
                        <span className="hidden sm:inline">Reset</span>
                    </button>
                    <div className="flex items-center gap-3 bg-blue-800 p-2 rounded-lg border border-blue-700">
                        <label className="flex items-center gap-2 cursor-pointer hover:bg-blue-700 px-3 py-1 rounded transition">
                            <Upload size={18} />
                            <span className="text-sm font-medium">Upload Running-Config</span>
                            <input type="file" accept=".txt,.cfg,.log" className="hidden" onChange={onUpload} />
                        </label>
                    </div>
                </div>
            </div>
        </header>
    );
}