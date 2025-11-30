import React from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, Edit3, Zap, Shield } from 'lucide-react';

export default function SinglePortEditor({
                                             ports,
                                             singleEditPortId, setSingleEditPortId,
                                             scrollToPreviewPort,
                                             singlePort,
                                             handlePrevPort,
                                             handleNextPort,
                                             updatePort,
                                             toggleNoShut,
                                             toggleInclude,
                                             resetPortToDefault
                                         }) {
    if (!singlePort) return null;

    return (
        <div className="p-6 max-w-2xl mx-auto space-y-6">
            {/* PORT NAVIGATION */}
            <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <button onClick={handlePrevPort} className="p-2 rounded hover:bg-slate-100 text-slate-500"><ChevronLeft/></button>
                <div className="flex-1 px-4 flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select Interface</label>
                    <select
                        className="w-full p-2 border border-slate-300 rounded bg-slate-50 font-mono text-sm font-bold text-blue-900"
                        value={singleEditPortId || ''}
                        onChange={(e) => {
                            setSingleEditPortId(e.target.value);
                            scrollToPreviewPort(e.target.value);
                        }}
                    >
                        {ports.map(p => (
                            <option key={p.id} value={p.id}>{p.name} {p.description ? `(${p.description})` : ''}</option>
                        ))}
                    </select>
                </div>
                <button onClick={handleNextPort} className="p-2 rounded hover:bg-slate-100 text-slate-500"><ChevronRight/></button>
                <button onClick={() => resetPortToDefault(singlePort.id)} className="p-2 ml-2 rounded hover:bg-slate-100 text-red-500" title="Reset to Default Interface"><RotateCcw/></button>
            </div>

            {/* MAIN CONFIG FORM */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 font-semibold text-slate-700 flex items-center gap-2">
                    <Edit3 size={16}/> General Configuration
                </div>
                <div className="p-6 space-y-4">
                    <div className={singlePort.resetOnly ? 'opacity-50 pointer-events-none' : ''}>
                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-600">Description</label>
                                <input
                                    type="text"
                                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    disabled={singlePort.resetOnly}
                                    value={singlePort.description}
                                    onChange={(e) => updatePort(singlePort.id, 'description', e.target.value)}
                                />
                                <p className="text-[10px] text-slate-400">Name oder Funktion des angeschlossenen Geräts (z.B. 'Drucker-HR').</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-600">Switchport Mode</label>
                                <select
                                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    disabled={singlePort.resetOnly}
                                    value={singlePort.mode}
                                    onChange={(e) => updatePort(singlePort.id, 'mode', e.target.value)}
                                >
                                    <option value="access">Access</option>
                                    <option value="trunk">Trunk</option>
                                </select>
                                <p className="text-[10px] text-slate-400">Access für Endgeräte, Trunk für Switches/APs.</p>
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-600">
                                    {singlePort.mode === 'access' ? 'Access VLAN' : 'Allowed VLANs'}
                                </label>
                                {singlePort.mode === 'access' ? (
                                    <input
                                        type="text"
                                        className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                        disabled={singlePort.resetOnly}
                                        value={singlePort.accessVlan}
                                        onChange={(e) => updatePort(singlePort.id, 'accessVlan', e.target.value)}
                                    />
                                ) : (
                                    <input
                                        type="text"
                                        className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                        disabled={singlePort.resetOnly}
                                        value={singlePort.trunkVlans}
                                        onChange={(e) => updatePort(singlePort.id, 'trunkVlans', e.target.value)}
                                    />
                                )}
                                <p className="text-[10px] text-slate-400">{singlePort.mode === 'access' ? 'VLAN-ID des Geräts (z.B. 10).' : 'Liste erlaubter VLANs (z.B. 10,20-30).'}</p>
                            </div>
                        </div>

                        {/* Extra VLANs */}
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            {singlePort.mode === 'access' && (
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-600">Voice VLAN</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            className="flex-1 p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                            disabled={singlePort.resetOnly}
                                            value={singlePort.voiceVlan}
                                            onChange={(e) => updatePort(singlePort.id, 'voiceVlan', e.target.value)}
                                            placeholder="None"
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-400">Separtes VLAN für VoIP-Telefone.</p>
                                </div>
                            )}
                            {singlePort.mode === 'trunk' && (
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-600">Native VLAN</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                        disabled={singlePort.resetOnly}
                                        value={singlePort.nativeVlan}
                                        onChange={(e) => updatePort(singlePort.id, 'nativeVlan', e.target.value)}
                                    />
                                    <p className="text-[10px] text-slate-400">Ungetaggter Traffic (Standard: 1).</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Toggles */}
                    <div className="pt-4 border-t border-slate-100 grid grid-cols-3 gap-4">
                        <label className={`flex flex-col gap-1 cursor-pointer p-2 rounded hover:bg-slate-50 border border-transparent hover:border-slate-200 transition ${singlePort.resetOnly ? 'opacity-50 pointer-events-none' : ''}`}>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" disabled={singlePort.resetOnly} checked={singlePort.portfast} onChange={(e) => updatePort(singlePort.id, 'portfast', e.target.checked)} />
                                <span className="text-sm font-medium text-slate-700">PortFast</span>
                            </div>
                            <span className="text-[10px] text-slate-400 pl-6">Beschleunigt Link-Up. Nur für Endgeräte!</span>
                        </label>
                        <label className={`flex flex-col gap-1 cursor-pointer p-2 rounded hover:bg-slate-50 border border-transparent hover:border-slate-200 transition ${singlePort.resetOnly ? 'opacity-50 pointer-events-none' : ''}`}>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" disabled={singlePort.resetOnly} checked={singlePort.noShutdown} onChange={(e) => toggleNoShut(singlePort.id)} />
                                <span className="text-sm font-medium text-slate-700">No Shutdown</span>
                            </div>
                            <span className="text-[10px] text-slate-400 pl-6">Aktiviert den Port (Strom an).</span>
                        </label>
                        <label className="flex flex-col gap-1 cursor-pointer p-2 rounded hover:bg-slate-50 border border-transparent hover:border-slate-200 transition">
                            <div className="flex items-center gap-2">
                                <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" checked={singlePort.includeInConfig} onChange={(e) => toggleInclude(singlePort.id)} />
                                <span className="text-sm font-medium text-slate-700">Include in Config</span>
                            </div>
                            <span className="text-[10px] text-slate-400 pl-6">Diesen Port in den Output aufnehmen.</span>
                        </label>
                        <label className={`flex flex-col gap-1 cursor-pointer p-2 rounded hover:bg-slate-50 border border-transparent hover:border-slate-200 transition ${singlePort.resetOnly ? 'opacity-50 pointer-events-none' : ''}`}>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" disabled={singlePort.resetOnly} checked={singlePort.prependDefault} onChange={(e) => updatePort(singlePort.id, 'prependDefault', e.target.checked)} />
                                <span className="text-sm font-medium text-slate-700">Reset on Switch</span>
                            </div>
                            <span className="text-[10px] text-slate-400 pl-6">Führt 'default int ...' vor Config aus.</span>
                        </label>
                        <label className="flex flex-col gap-1 cursor-pointer p-2 rounded hover:bg-slate-50 border border-transparent hover:border-slate-200 transition">
                            <div className="flex items-center gap-2">
                                <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" checked={singlePort.resetOnly} onChange={(e) => updatePort(singlePort.id, 'resetOnly', e.target.checked)} />
                                <span className="text-sm font-medium text-slate-700">Full Factory Reset</span>
                            </div>
                            <span className="text-[10px] text-slate-400 pl-6">Führt nur 'default int ...' aus. Keine weitere Konfiguration.</span>
                        </label>
                    </div>
                </div>
            </div>

            {/* POE CONFIG FORM */}
            <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-opacity ${singlePort.resetOnly ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 font-semibold text-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Zap size={16} className="text-yellow-600"/> Power over Ethernet (PoE)
                    </div>
                </div>
                <div className="p-6 space-y-4">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-600">Power Mode</label>
                        <select
                            className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            value={singlePort.poeMode || 'auto'}
                            onChange={(e) => updatePort(singlePort.id, 'poeMode', e.target.value)}
                        >
                            <option value="auto">Auto (Default)</option>
                            <option value="static">Static (Pre-allocate Power)</option>
                            <option value="never">Never (Disable PoE)</option>
                        </select>
                        <p className="text-[10px] text-slate-400">
                            {singlePort.poeMode === 'never' ? 'PoE ist komplett deaktiviert (z.B. für Uplinks).' :
                                singlePort.poeMode === 'static' ? 'Reserviert Leistung auch ohne Link.' :
                                    'Handelt Leistung automatisch aus (IEEE 802.3af/at).'}
                        </p>
                    </div>
                </div>
            </div>

            {/* SECURITY CONFIG FORM */}
            <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-opacity ${singlePort.resetOnly ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 font-semibold text-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Shield size={16}/> Security Configuration
                    </div>
                    <div className="flex items-center">
                        <span className="text-[10px] text-slate-400 mr-2 font-normal">Verhindert fremde Geräte.</span>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <span className="text-xs font-bold text-slate-500 uppercase">Enable</span>
                            <div className={`w-10 h-5 rounded-full p-1 transition-colors ${singlePort.portSecurity ? 'bg-green-500' : 'bg-slate-300'}`}>
                                <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform ${singlePort.portSecurity ? 'translate-x-5' : ''}`}></div>
                            </div>
                            <input type="checkbox" className="hidden" checked={singlePort.portSecurity} onChange={(e) => updatePort(singlePort.id, 'portSecurity', e.target.checked)} />
                        </label>
                    </div>
                </div>

                {singlePort.portSecurity && (
                    <div className="p-6 space-y-4 animate-in fade-in slide-in-from-top-2">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-600">Max MAC Addresses</label>
                                <input
                                    type="text"
                                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={singlePort.secMax}
                                    onChange={(e) => updatePort(singlePort.id, 'secMax', e.target.value)}
                                />
                                <p className="text-[10px] text-slate-400">Anzahl erlaubter Geräte.</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-600">Violation Mode</label>
                                <select
                                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={singlePort.secViolation}
                                    onChange={(e) => updatePort(singlePort.id, 'secViolation', e.target.value)}
                                >
                                    <option value="shutdown">Shutdown</option>
                                    <option value="restrict">Restrict</option>
                                    <option value="protect">Protect</option>
                                </select>
                                <p className="text-[10px] text-slate-400">Aktion bei unbefugtem Gerät (Shutdown = Port aus).</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-600">Aging Time (min)</label>
                                <input
                                    type="text"
                                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={singlePort.secAgingTime}
                                    onChange={(e) => updatePort(singlePort.id, 'secAgingTime', e.target.value)}
                                />
                                <p className="text-[10px] text-slate-400">Zeit bis inaktive MACs vergessen werden.</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-600">Aging Type</label>
                                <select
                                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={singlePort.secAgingType}
                                    onChange={(e) => updatePort(singlePort.id, 'secAgingType', e.target.value)}
                                >
                                    <option value="inactivity">Inactivity</option>
                                    <option value="absolute">Absolute</option>
                                </select>
                            </div>
                        </div>

                        <div className="pt-2">
                            <label className="flex flex-col gap-1 cursor-pointer p-2 rounded hover:bg-slate-50 border border-slate-200 transition bg-slate-50 w-max pr-6">
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" checked={singlePort.secSticky} onChange={(e) => updatePort(singlePort.id, 'secSticky', e.target.checked)} />
                                    <span className="text-sm font-medium text-slate-700">MAC Address Sticky</span>
                                </div>
                                <span className="text-[10px] text-slate-400 pl-6">Lernt MACs automatisch fest in die Config.</span>
                            </label>
                        </div>
                    </div>
                )}
                {!singlePort.portSecurity && (
                    <div className="p-8 text-center text-slate-400 italic bg-slate-50/50">
                        Security is disabled for this port.
                    </div>
                )}
            </div>
        </div>
    );
}