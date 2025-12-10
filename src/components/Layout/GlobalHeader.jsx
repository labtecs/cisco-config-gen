import React from 'react';
import { UploadCloud, Network, ArrowDown, RotateCcw, Maximize, Minimize } from 'lucide-react';
import { useAppConfig } from '../../context/ConfigContext';

export default function GlobalHeader({ onUpload, dragActive, showSshButton, onToggleConnect, isConnectOpen, onReset }) {
    const { settings, toggleLayoutMode } = useAppConfig();

    const headerContainerClass = settings.layout.mode === 'full-width'
        ? "w-full mx-auto flex justify-between items-center gap-2 px-4"
        : "max-w-7xl mx-auto flex justify-between items-center gap-2";

    return (
        <>
            <header className="bg-slate-800 text-white p-2 sticky top-[56px] z-50">
                <div className={headerContainerClass}>
                    {/* Layout Toggle Button */}
                    <button
                        onClick={toggleLayoutMode}
                        className="p-2 rounded-lg hover:bg-slate-700 transition-colors text-slate-400 hover:text-white"
                        title={settings.layout.mode === 'standard' ? 'Full-Width Ansicht' : 'Standard Ansicht'}
                    >
                        {settings.layout.mode === 'standard' ? <Maximize size={18} /> : <Minimize size={18} />}
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={onReset}
                            className="flex items-center gap-2 px-3 py-1 bg-slate-700 hover:bg-red-600 rounded-lg border border-slate-600 text-sm font-medium transition-colors text-slate-300 hover:text-white"
                            title="Alles zurücksetzen"
                        >
                            <RotateCcw size={16} />
                            <span className="hidden sm:inline">Reset</span>
                        </button>

                        {/* Gemeinsamer Container für Connect und Import */}
                        <div className="flex items-center bg-slate-700 p-1 rounded-lg border border-slate-600">
                            {showSshButton && (
                                <>
                                    <button
                                        onClick={onToggleConnect}
                                        className={`flex items-center gap-2 px-3 py-1 rounded text-sm font-medium transition-colors ${isConnectOpen ? 'bg-blue-600 text-white shadow-inner' : 'hover:bg-slate-600 text-blue-100'}`}
                                        title="Connect to Switch via SSH"
                                    >
                                        <Network size={16} />
                                        <span className="hidden sm:inline">Connect</span>
                                    </button>
                                    <div className="w-px h-4 bg-slate-600"></div>
                                </>
                            )}
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-600 px-3 py-1 rounded transition">
                                <UploadCloud size={16} />
                                <span className="text-sm font-medium">Import / Drop Config</span>
                                <input type="file" accept=".txt,.cfg,.log" className="hidden" onChange={onUpload} />
                            </label>
                        </div>
                    </div>
                </div>
            </header>

            {dragActive && (
                <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center backdrop-blur-sm">
                    <div className="text-center text-white font-bold text-2xl flex flex-col items-center gap-4">
                        <ArrowDown className="w-12 h-12 animate-bounce" />
                        <span>Datei hier ablegen, um sie zu importieren</span>
                    </div>
                </div>
            )}
        </>
    );
}