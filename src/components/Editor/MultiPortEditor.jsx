import React from 'react';
import { X, Lock, Edit3, Shield, Power, CheckSquare, Trash2, Zap } from 'lucide-react';
import { isNumeric } from '../../utils/ciscoHelpers';

export default function MultiPortEditor({
                                            ports,
                                            selectedPortIds, setSelectedPortIds,
                                            toggleSelection, toggleSelectAll,
                                            toggleInclude, toggleGlobalInclude,
                                            updatePort,
                                            handleClearDescriptions, confirmClearDesc,
                                            toggleNoShut,
                                            toggleVoiceVlan,
                                            scrollToPreviewPort,
                                            showPoeColumn, showSecColumn, showFastColumn, showVoiceColumn, showStateColumn,
                                            // Bulk Props
                                            bulkMode, setBulkMode,
                                            bulkAccessVlan, setBulkAccessVlan,
                                            bulkTrunkVlans, setBulkTrunkVlans,
                                            bulkVoiceVlan, setBulkVoiceVlan,
                                            bulkPortfast, setBulkPortfast,
                                            bulkInclude, setBulkInclude,
                                            bulkNoShut, setBulkNoShut,
                                            bulkPoeMode, setBulkPoeMode,
                                            bulkSecurity, setBulkSecurity,
                                            bulkSecMax, setBulkSecMax,
                                            bulkSecViolation, setBulkSecViolation,
                                            bulkSecSticky, setBulkSecSticky,
                                            bulkSecAgingTime, setBulkSecAgingTime,
                                            bulkSecAgingType, setBulkSecAgingType,
                                            showSecurityOptions, setShowSecurityOptions,
                                            applyBulkEdit
                                        }) {
    const selectedCount = selectedPortIds.size;
    const allIncluded = ports.length > 0 && ports.every(p => p.includeInConfig);

    return (
        <>
            {/* BULK EDIT TOOLBAR */}
            {selectedCount > 0 && (
                <div className="bg-blue-900 text-white p-3 shadow-md flex flex-col gap-3 sticky top-0 z-20 border-b border-blue-800 animate-in slide-in-from-top-2">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 border-r border-blue-700 pr-4 mr-1">
                            <span className="bg-blue-600 text-xs font-bold px-2 py-1 rounded-full">{selectedCount}</span>
                            <span className="text-sm font-semibold whitespace-nowrap">Selected</span>
                            <button onClick={() => setSelectedPortIds(new Set())} className="text-blue-300 hover:text-white"><X size={14}/></button>
                        </div>
                        <select className="bg-blue-800 border-blue-700 rounded text-xs p-1.5 focus:ring-1 focus:ring-blue-400" value={bulkMode} onChange={(e) => setBulkMode(e.target.value)}>
                            <option value="">Mode (No Change)</option>
                            <option value="access">Access</option>
                            <option value="trunk">Trunk</option>
                        </select>
                        <input type="text" maxLength={4} placeholder="VLAN..." className="bg-blue-800 border-blue-700 rounded text-xs p-1.5 w-16 placeholder-blue-400 focus:ring-1 focus:ring-blue-400" value={bulkAccessVlan} onChange={(e) => isNumeric(e.target.value) && setBulkAccessVlan(e.target.value)} />

                        {showPoeColumn && (
                            <select className="bg-blue-800 border-blue-700 rounded text-xs p-1.5 focus:ring-1 focus:ring-blue-400" value={bulkPoeMode} onChange={(e) => setBulkPoeMode(e.target.value)}>
                                <option value="">PoE (No Change)</option>
                                <option value="auto">Auto</option>
                                <option value="static">Static</option>
                                <option value="never">Never (Off)</option>
                            </select>
                        )}

                        {showVoiceColumn && (
                            <select className="bg-blue-800 border-blue-700 rounded text-xs p-1.5 focus:ring-1 focus:ring-blue-400" value={bulkVoiceVlan} onChange={(e) => setBulkVoiceVlan(e.target.value)}>
                                <option value="">Voice (No Change)</option>
                                <option value="enable">Enable Global</option>
                                <option value="disable">Disable Voice</option>
                            </select>
                        )}

                        {showFastColumn && (
                            <select className="bg-blue-800 border-blue-700 rounded text-xs p-1.5 focus:ring-1 focus:ring-blue-400" value={bulkPortfast} onChange={(e) => setBulkPortfast(e.target.value)}>
                                <option value="no_change">Fast (No Change)</option>
                                <option value="on">Enable PortFast</option>
                                <option value="off">Disable PortFast</option>
                            </select>
                        )}

                        <select className="bg-blue-800 border-blue-700 rounded text-xs p-1.5 focus:ring-1 focus:ring-blue-400" value={bulkInclude} onChange={(e) => setBulkInclude(e.target.value)}>
                            <option value="no_change">Cfg (No Change)</option>
                            <option value="include">Include</option>
                            <option value="exclude">Exclude</option>
                        </select>

                        {showStateColumn && (
                            <select className="bg-blue-800 border-blue-700 rounded text-xs p-1.5 focus:ring-1 focus:ring-blue-400" value={bulkNoShut} onChange={(e) => setBulkNoShut(e.target.value)}>
                                <option value="no_change">State (No Change)</option>
                                <option value="on">No Shutdown</option>
                                <option value="off">Shutdown</option>
                            </select>
                        )}
                        <div className="flex-1"></div>
                        <button onClick={() => setShowSecurityOptions(!showSecurityOptions)} className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded transition ${showSecurityOptions ? 'bg-indigo-600 text-white' : 'bg-blue-800 text-blue-200 hover:bg-blue-700'}`}>
                            <Lock size={12}/> Advanced Sec {showSecurityOptions ? '▼' : '▶'}
                        </button>
                        <button onClick={applyBulkEdit} className="bg-green-600 hover:bg-green-500 text-white text-xs font-bold py-1.5 px-4 rounded transition shadow-lg flex items-center gap-2">
                            <Edit3 size={14} /> Apply
                        </button>
                    </div>
                    {showSecurityOptions && (
                        <div className="flex flex-wrap items-center gap-3 bg-blue-800/50 p-2 rounded border border-blue-700/50 animate-in fade-in">
                            <span className="text-xs font-bold text-blue-200 uppercase tracking-wide flex items-center gap-1"><Shield size={12}/> Port Security:</span>
                            <select className="bg-blue-900 border-blue-700 rounded text-xs p-1.5 focus:ring-1 focus:ring-blue-400" value={bulkSecurity} onChange={(e) => setBulkSecurity(e.target.value)}>
                                <option value="no_change">Enable/Disable</option>
                                <option value="on">Enable Security</option>
                                <option value="off">Disable Security</option>
                            </select>
                            <select className="bg-blue-900 border-blue-700 rounded text-xs p-1.5 focus:ring-1 focus:ring-blue-400" value={bulkSecSticky} onChange={(e) => setBulkSecSticky(e.target.value)}>
                                <option value="no_change">MAC Mode</option>
                                <option value="off">Dynamic (RAM)</option>
                                <option value="on">Sticky (Config)</option>
                            </select>
                            <input type="text" placeholder="Max MACs (e.g. 2)" className="bg-blue-900 border-blue-700 rounded text-xs p-1.5 w-32 placeholder-blue-400 focus:ring-1 focus:ring-blue-400" value={bulkSecMax} onChange={(e) => isNumeric(e.target.value) && setBulkSecMax(e.target.value)} />
                            <select className="bg-blue-900 border-blue-700 rounded text-xs p-1.5 focus:ring-1 focus:ring-blue-400" value={bulkSecViolation} onChange={(e) => setBulkSecViolation(e.target.value)}>
                                <option value="">Violation Mode</option>
                                <option value="shutdown">Shutdown</option>
                                <option value="restrict">Restrict</option>
                                <option value="protect">Protect</option>
                            </select>
                            <div className="h-4 w-px bg-blue-600 mx-1"></div>
                            <input type="text" placeholder="Aging (min)" className="bg-blue-900 border-blue-700 rounded text-xs p-1.5 w-24 placeholder-blue-400 focus:ring-1 focus:ring-blue-400" value={bulkSecAgingTime} onChange={(e) => isNumeric(e.target.value) && setBulkSecAgingTime(e.target.value)} />
                            <select className="bg-blue-900 border-blue-700 rounded text-xs p-1.5 focus:ring-1 focus:ring-blue-400" value={bulkSecAgingType} onChange={(e) => setBulkSecAgingType(e.target.value)}>
                                <option value="">Aging Type</option>
                                <option value="inactivity">Inactivity</option>
                                <option value="absolute">Absolute</option>
                            </select>
                        </div>
                    )}
                </div>
            )}

            <table className="w-full text-left text-sm relative">
                <thead className="bg-slate-50 text-slate-500 sticky top-0 z-10 shadow-sm">
                <tr>
                    <th className="p-2 w-8 text-center bg-slate-100"><input type="checkbox" className="w-4 h-4 rounded border-gray-300" checked={selectedPortIds.size === ports.length && ports.length > 0} onChange={toggleSelectAll}/></th>
                    <th className="p-2 font-medium bg-slate-50 w-16 text-center" title="Include in Config">
                        <button onClick={toggleGlobalInclude} title="Toggle All Config" className="flex items-center justify-center w-full gap-1 hover:text-slate-700">
                            Cfg <Power size={10} className={allIncluded ? "text-green-600" : "text-slate-400"} />
                        </button>
                    </th>
                    <th className="p-2 font-medium w-28 bg-slate-50">Port</th>
                    <th className="p-2 font-medium w-36 bg-slate-50">
                        <div className="flex items-center gap-2">
                            Description
                            <button
                                onClick={handleClearDescriptions}
                                title={confirmClearDesc ? "Wirklich löschen?" : "Alle Beschreibungen löschen"}
                                className={`transition-colors ${confirmClearDesc ? "text-red-600 font-bold animate-pulse" : "text-slate-400 hover:text-red-500"}`}
                            >
                                {confirmClearDesc ? <CheckSquare size={12} /> : <Trash2 size={12}/>}
                            </button>
                        </div>
                    </th>
                    <th className="p-2 font-medium w-56 bg-slate-50">Mode</th>
                    <th className="p-2 font-medium w-24 bg-slate-50">VLAN</th>
                    {showFastColumn && <th className="p-2 font-medium w-24 text-center bg-slate-50" title="PortFast">Fast</th>}
                    {showSecColumn && <th className="p-2 font-medium w-24 text-center bg-slate-50" title="Port Security">Sec</th>}
                    {showVoiceColumn && <th className="p-2 font-medium bg-slate-50">Extra (Voice/Native)</th>}
                    {showPoeColumn && <th className="p-2 font-medium bg-slate-50 w-20 text-center">PoE</th>}
                    {showStateColumn && <th className="p-2 font-medium bg-slate-50 w-16 text-center" title="No Shutdown">State</th>}
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                {ports.map((port) => {
                    const isSelected = selectedPortIds.has(port.id);
                    // Dynamic class generation to ensure selection visibility over exclusion state
                    let rowClasses = "transition-all group border-b border-slate-100 ";
                    if (isSelected) {
                        rowClasses += "bg-yellow-50 hover:bg-yellow-100 ring-1 ring-inset ring-yellow-200 z-10 ";
                        if (!port.includeInConfig) rowClasses += "text-slate-500 "; // Dim text but keep yellow bg
                    } else {
                        if (!port.includeInConfig) {
                            rowClasses += "bg-slate-50 opacity-50 grayscale ";
                        } else {
                            // Active, Not Selected
                            if (port.mode === 'trunk') {
                                rowClasses += "bg-orange-50/50 hover:bg-orange-100 "; // Slight orange for trunks
                            } else {
                                rowClasses += "hover:bg-blue-50 "; // Default hover for access
                            }
                        }
                    }

                    return (
                        <tr key={port.id} id={`row-${port.id}`} className={rowClasses}>
                            <td className="p-2 text-center">
                                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" checked={isSelected} onChange={(e) => toggleSelection(port.id, e)}/>
                            </td>
                            <td className="p-2 text-center"><button onClick={() => toggleInclude(port.id)} className={`p-1.5 rounded-full transition-colors ${port.includeInConfig ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-slate-200 text-slate-400 hover:bg-slate-300'}`}><Power size={14} /></button></td>
                            <td className="p-2 font-mono text-xs font-bold text-slate-600 whitespace-nowrap">
                                <div className="flex flex-col">
                                    <span>{port.name}</span>
                                    {port.isUplink && <span className="w-max mt-1 px-1.5 py-0.5 bg-orange-100 text-orange-700 text-[9px] rounded uppercase leading-none">SFP</span>}
                                </div>
                            </td>
                            <td className="p-2"><input type="text" placeholder="Description..." className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none transition-colors text-slate-700" value={port.description} onChange={(e) => updatePort(port.id, 'description', e.target.value)} onFocus={() => scrollToPreviewPort(port.id)} disabled={!port.includeInConfig && !isSelected}/></td>
                            <td className="p-2">
                                <select className="w-full bg-slate-100 border-none rounded h-8 pl-2 pr-8 text-xs font-medium text-slate-700 cursor-pointer hover:bg-slate-200" value={port.mode} onChange={(e) => updatePort(port.id, 'mode', e.target.value)} onFocus={() => scrollToPreviewPort(port.id)} disabled={!port.includeInConfig && !isSelected}>
                                    <option value="access">Access</option>
                                    <option value="trunk">Trunk</option>
                                </select>
                            </td>
                            <td className="p-2">
                                {port.mode === 'access' ? (
                                    <input type="text" maxLength={4} placeholder="1" className="w-full p-1 border border-slate-200 rounded text-center" value={port.accessVlan} onChange={(e) => updatePort(port.id, 'accessVlan', e.target.value)} onFocus={() => scrollToPreviewPort(port.id)} disabled={!port.includeInConfig && !isSelected}/>
                                ) : (
                                    <input type="text" placeholder="All" className="w-full p-1 border border-slate-200 rounded text-xs text-center" value={port.trunkVlans} onChange={(e) => updatePort(port.id, 'trunkVlans', e.target.value)} onFocus={() => scrollToPreviewPort(port.id)} disabled={!port.includeInConfig && !isSelected}/>
                                )}
                            </td>

                            {showFastColumn && (
                                <td className="p-2 text-center"><input type="checkbox" className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300" checked={port.portfast} onChange={(e) => updatePort(port.id, 'portfast', e.target.checked)} onFocus={() => scrollToPreviewPort(port.id)} disabled={!port.includeInConfig && !isSelected}/></td>
                            )}

                            {showSecColumn && (
                                <td className="p-2 text-center">
                                    {port.mode === 'access' && (
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 text-red-600 rounded focus:ring-red-500 border-gray-300"
                                            checked={port.portSecurity}
                                            onChange={(e) => updatePort(port.id, 'portSecurity', e.target.checked)}
                                            onFocus={() => scrollToPreviewPort(port.id)}
                                            disabled={!port.includeInConfig && !isSelected}
                                        />
                                    )}
                                </td>
                            )}

                            {showVoiceColumn && (
                                <td className="p-2">
                                    {port.mode === 'access' ? (
                                        <div className="flex items-center gap-2">
                                            <input type="checkbox" className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 border-gray-300" title="Enable Voice VLAN" checked={!!port.voiceVlan} onChange={() => toggleVoiceVlan(port.id, port.voiceVlan)} onFocus={() => scrollToPreviewPort(port.id)} disabled={!port.includeInConfig && !isSelected}/>
                                            {port.voiceVlan ? <input type="text" maxLength={4} className="w-10 p-1 text-xs border border-purple-200 bg-purple-50 rounded text-center text-purple-700 font-medium" value={port.voiceVlan} onChange={(e) => updatePort(port.id, 'voiceVlan', e.target.value)} onFocus={() => scrollToPreviewPort(port.id)} disabled={!port.includeInConfig && !isSelected}/> : <span className="text-[10px] text-slate-300 italic">No Voice</span>}
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1"><span className="text-[10px] text-slate-400">Native:</span><input type="text" maxLength={4} className="w-12 p-1 text-xs border border-slate-200 rounded" value={port.nativeVlan} onChange={(e) => updatePort(port.id, 'nativeVlan', e.target.value)} onFocus={() => scrollToPreviewPort(port.id)} disabled={!port.includeInConfig && !isSelected}/></div>
                                    )}
                                </td>
                            )}

                            {showPoeColumn && (
                                <td className="p-2">
                                    <select
                                        className="w-full bg-slate-100 border-none rounded h-8 pl-1 pr-1 text-xs font-medium text-slate-700 cursor-pointer hover:bg-slate-200"
                                        value={port.poeMode || 'auto'}
                                        onChange={(e) => updatePort(port.id, 'poeMode', e.target.value)}
                                        onFocus={() => scrollToPreviewPort(port.id)}
                                        disabled={!port.includeInConfig && !isSelected}
                                    >
                                        <option value="auto">Auto</option>
                                        <option value="static">Static</option>
                                        <option value="never">Off</option>
                                    </select>
                                </td>
                            )}

                            {showStateColumn && (
                                <td className="p-2 text-center"><button onClick={() => toggleNoShut(port.id)} className={`p-1.5 rounded-full transition-colors ${port.noShutdown ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' : 'bg-red-100 text-red-600 hover:bg-red-200'}`} disabled={!port.includeInConfig && !isSelected}><Power size={14} /></button></td>
                            )}
                        </tr>
                    )})}
                </tbody>
            </table>
        </>
    );
}