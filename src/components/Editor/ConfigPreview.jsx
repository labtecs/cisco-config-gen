import React from 'react';
import { Terminal, Copy, Save, Shield } from 'lucide-react';

export default function ConfigPreview({
                                          generatedConfig,
                                          copyToClipboard,
                                          downloadFile,
                                          includeWrMem, setIncludeWrMem,
                                          useModernPortfast, setUseModernPortfast,
                                          includeNoShutdown, setIncludeNoShutdown,
                                          includeDescriptions, setIncludeDescriptions,
                                          version
                                      }) {
    return (
        <div className="lg:col-span-1 flex flex-col h-[800px] gap-4">
            <div className="bg-slate-900 rounded-xl shadow-lg border border-slate-800 flex flex-col flex-1 overflow-hidden">
                <div className="bg-slate-800 p-3 border-b border-slate-700 flex flex-col gap-3">
                    <div className="flex justify-between items-center text-slate-200 font-mono text-sm">
                        <div className="flex items-center gap-2">
                            <Terminal size={16} />
                            <span>config-preview.ios</span>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={copyToClipboard} className="p-1.5 hover:bg-slate-700 rounded text-slate-300 transition" title="Copy">
                                <Copy size={16} />
                            </button>
                            <button onClick={downloadFile} className="p-1.5 hover:bg-slate-700 rounded text-slate-300 transition" title="Save as File">
                                <Save size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-4 text-xs text-slate-400 pt-1 border-t border-slate-700">
                        <label className="flex items-center gap-2 cursor-pointer hover:text-slate-200">
                            <input
                                type="checkbox"
                                className="rounded bg-slate-700 border-slate-600 text-green-500 focus:ring-green-500/50"
                                checked={includeWrMem}
                                onChange={(e) => setIncludeWrMem(e.target.checked)}
                            />
                            <span>Auto-Save (wr mem)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer hover:text-slate-200">
                            <input
                                type="checkbox"
                                className="rounded bg-slate-700 border-slate-600 text-green-500 focus:ring-green-500/50"
                                checked={useModernPortfast}
                                onChange={(e) => setUseModernPortfast(e.target.checked)}
                            />
                            <span>Modern Portfast (edge)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer hover:text-slate-200">
                            <input
                                type="checkbox"
                                className="rounded bg-slate-700 border-slate-600 text-green-500 focus:ring-green-500/50"
                                checked={includeNoShutdown}
                                onChange={(e) => setIncludeNoShutdown(e.target.checked)}
                            />
                            <span>Enable Ports (no shut)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer hover:text-slate-200">
                            <input
                                type="checkbox"
                                className="rounded bg-slate-700 border-slate-600 text-green-500 focus:ring-green-500/50"
                                checked={includeDescriptions}
                                onChange={(e) => setIncludeDescriptions(e.target.checked)}
                            />
                            <span>Show Descriptions</span>
                        </label>
                    </div>
                </div>
                <textarea
                    className="flex-1 bg-slate-900 text-green-400 font-mono text-xs p-4 resize-none focus:outline-none leading-relaxed"
                    readOnly
                    value={generatedConfig}
                />
            </div>

            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
                <h3 className="text-blue-800 font-bold mb-2 text-sm flex items-center gap-2">
                    <Shield size={14} />
                    Neue Funktionen ({version})
                </h3>
                <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                    <li><strong>Full Factory Reset:</strong> Neuer Modus im Single Port Editor, der nur <code>default interface</code> ausgibt.</li>
                    <li><strong>Reset on Switch:</strong> Bestehende Funktion zum Voranstellen des Reset-Befehls.</li>
                    <li><strong>UI Optimierung:</strong> Bei "Reset Only" werden Config-Felder deaktiviert.</li>
                </ul>
            </div>
        </div>
    );
}