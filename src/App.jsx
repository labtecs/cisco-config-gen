import React from 'react';
import { CheckSquare, Zap, Shield, FastForward, Phone, Power, Filter, Activity, Copy, Save, Terminal } from 'lucide-react';
import { useCiscoGen } from './hooks/useCiscoGen';

// Components
import Header from './components/Layout/Header';
import SwitchVisualizer from './components/Visualizer/SwitchVisualizer';
import GlobalSettings from './components/Controls/GlobalSettings';
import ConfigPreview from './components/Editor/ConfigPreview';
import SinglePortEditor from './components/Editor/SinglePortEditor';
import MultiPortEditor from './components/Editor/MultiPortEditor';

export default function CiscoConfigGenerator() {
    const APP_VERSION = "v3.5";
    console.log(APP_VERSION);
    const logic = useCiscoGen();

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-32 relative">
            <Header
                version={APP_VERSION}
                onReset={logic.resetToDefaults}
                onUpload={logic.handleFileUpload}
            />

            <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-8">
                {/* CONTROLS */}
                <GlobalSettings
                    switchModel={logic.switchModel} setSwitchModel={logic.setSwitchModel}
                    uplinkCount={logic.uplinkCount} setUplinkCount={logic.setUplinkCount}
                    stackSize={logic.stackSize} setStackSize={logic.setStackSize}
                    portNaming={logic.portNaming} setPortNaming={logic.setPortNaming}
                    baseInterfaceType={logic.baseInterfaceType} setBaseInterfaceType={logic.setBaseInterfaceType}
                    uplinkInterfaceType={logic.uplinkInterfaceType} setUplinkInterfaceType={logic.setUplinkInterfaceType}
                    globalVoiceVlan={logic.globalVoiceVlan} setGlobalVoiceVlan={logic.setGlobalVoiceVlan}
                />

                {/* VISUALIZER */}
                <SwitchVisualizer
                    stackSize={logic.stackSize}
                    switchModel={logic.switchModel}
                    uplinkCount={logic.uplinkCount}
                    ports={logic.ports}
                    selectedPortIds={logic.selectedPortIds}
                    viewMode={logic.viewMode}
                    singleEditPortId={logic.singleEditPortId}
                    onPortClick={logic.handleVisualizerClick}
                    hostname={logic.hostname}
                    iosVersion={logic.iosVersion}
                />

                {/* EDITOR & PREVIEW SPLIT */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* LEFT: CONFIG AREA */}
                    <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[800px] relative">

                        {/* HEADER AREA - ORIGINAL v3.4 RESTORED */}
                        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col gap-3">
                            <div className="flex justify-between items-center">
                                <h2 className="font-semibold text-slate-700 flex items-center gap-2">
                                    <Activity size={18} />
                                    Port Configuration
                                </h2>

                                <div className="flex items-center gap-4">
                                    {/* COLUMNS TOGGLE */}
                                    {logic.viewMode === 'multi' && (
                                        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
                                            <button
                                                onClick={() => logic.setShowPoeColumn(!logic.showPoeColumn)}
                                                className={`px-2 py-1 text-[10px] font-bold uppercase rounded transition-colors flex items-center gap-1 ${logic.showPoeColumn ? 'bg-white text-yellow-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                                                title={logic.showPoeColumn ? "Hide PoE Column" : "Show PoE Column"}
                                            >
                                                <Zap size={10} className={logic.showPoeColumn ? "fill-yellow-500" : ""} /> PoE
                                            </button>
                                            <div className="w-px h-3 bg-slate-300 mx-1"></div>
                                            <button
                                                onClick={() => logic.setShowSecColumn(!logic.showSecColumn)}
                                                className={`px-2 py-1 text-[10px] font-bold uppercase rounded transition-colors flex items-center gap-1 ${logic.showSecColumn ? 'bg-white text-red-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                                                title={logic.showSecColumn ? "Hide Security Column" : "Show Security Column"}
                                            >
                                                <Shield size={10} className={logic.showSecColumn ? "fill-red-500" : ""} /> Sec
                                            </button>
                                            <div className="w-px h-3 bg-slate-300 mx-1"></div>
                                            <button
                                                onClick={() => logic.setShowFastColumn(!logic.showFastColumn)}
                                                className={`px-2 py-1 text-[10px] font-bold uppercase rounded transition-colors flex items-center gap-1 ${logic.showFastColumn ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                                                title={logic.showFastColumn ? "Hide Fast Column" : "Show Fast Column"}
                                            >
                                                <FastForward size={10} className={logic.showFastColumn ? "fill-blue-500" : ""} /> Fast
                                            </button>
                                            <div className="w-px h-3 bg-slate-300 mx-1"></div>
                                            <button
                                                onClick={() => logic.setShowVoiceColumn(!logic.showVoiceColumn)}
                                                className={`px-2 py-1 text-[10px] font-bold uppercase rounded transition-colors flex items-center gap-1 ${logic.showVoiceColumn ? 'bg-white text-purple-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                                                title={logic.showVoiceColumn ? "Hide Voice Column" : "Show Voice Column"}
                                            >
                                                <Phone size={10} className={logic.showVoiceColumn ? "fill-purple-500" : ""} /> Voice
                                            </button>
                                            <div className="w-px h-3 bg-slate-300 mx-1"></div>
                                            <button
                                                onClick={() => logic.setShowStateColumn(!logic.showStateColumn)}
                                                className={`px-2 py-1 text-[10px] font-bold uppercase rounded transition-colors flex items-center gap-1 ${logic.showStateColumn ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                                                title={logic.showStateColumn ? "Hide State Column" : "Show State Column"}
                                            >
                                                <Power size={10} className={logic.showStateColumn ? "fill-blue-500" : ""} /> State
                                            </button>
                                        </div>
                                    )}

                                    {/* VIEW TOGGLE */}
                                    <div className="bg-white border border-slate-200 rounded-lg p-1 flex shadow-sm">
                                        <button
                                            onClick={() => logic.setViewMode('multi')}
                                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${logic.viewMode === 'multi' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}
                                        >
                                            Multiport Editor
                                        </button>
                                        <button
                                            onClick={() => logic.setViewMode('single')}
                                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${logic.viewMode === 'single' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}
                                        >
                                            Single Port Editor
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* VLAN LEGEND (Original Inline Logic) */}
                            {logic.viewMode === 'multi' && logic.availableVlans.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 text-xs animate-in fade-in">
                                        <span className="text-slate-400 flex items-center gap-1"><Filter size={12}/> VLANs:</span>
                                        <div className="flex flex-wrap gap-2">
                                            {logic.availableVlans.map(vlanObj => {
                                                // Exakte Kopie der v3.4 Logik
                                                let styleClass = "bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-700 border-slate-200";
                                                let title = `VLAN ${vlanObj.id} (Detected & Used)`;
                                                if (vlanObj.status === 'unused') { styleClass = "bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200"; }
                                                else if (vlanObj.status === 'manual') { styleClass = "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200"; }
                                                else if (vlanObj.status === 'default') { styleClass = "bg-slate-100 text-slate-400 border-slate-200 cursor-default"; }

                                                const tooltip = vlanObj.name
                                                    ? `VLAN ${vlanObj.id}: ${vlanObj.name}`
                                                    : vlanObj.status === 'default' ? "VLAN 1 (Default)" : title;

                                                return (
                                                    <button
                                                        key={vlanObj.id}
                                                        onClick={() => logic.selectPortsByVlan(vlanObj.id)}
                                                        className={`border px-2 py-0.5 rounded-full transition-colors font-mono cursor-pointer flex items-center gap-1 ${styleClass}`}
                                                        title={tooltip}
                                                    >
                                                        {vlanObj.id}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
                                        <div className="flex items-center gap-1">
                                            <div className="w-2 h-2 rounded-full bg-slate-200 border border-slate-300"></div>
                                            <span>Genutzt (Config)</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className="w-2 h-2 rounded-full bg-indigo-100 border border-indigo-200"></div>
                                            <span>Neu / Manuell</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className="w-2 h-2 rounded-full bg-orange-100 border border-orange-200"></div>
                                            <span>Ungenutzt</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* CONTENT AREA */}
                        <div className="flex-1 overflow-auto bg-slate-50/50">
                            {logic.viewMode === 'multi' && (
                                <MultiPortEditor
                                    ports={logic.ports}
                                    selectedPortIds={logic.selectedPortIds} setSelectedPortIds={logic.setSelectedPortIds}
                                    toggleSelection={logic.toggleSelection} toggleSelectAll={logic.toggleSelectAll}
                                    toggleInclude={logic.toggleInclude} toggleGlobalInclude={logic.toggleGlobalInclude}
                                    updatePort={logic.updatePort}
                                    handleClearDescriptions={logic.handleClearDescriptions} confirmClearDesc={logic.confirmClearDesc}
                                    toggleNoShut={logic.toggleNoShut} toggleVoiceVlan={logic.toggleVoiceVlan}
                                    scrollToPreviewPort={logic.scrollToPreviewPort}
                                    showPoeColumn={logic.showPoeColumn}
                                    showSecColumn={logic.showSecColumn}
                                    showFastColumn={logic.showFastColumn}
                                    showVoiceColumn={logic.showVoiceColumn}
                                    showStateColumn={logic.showStateColumn}
                                    // Bulk Props
                                    bulkMode={logic.bulkMode} setBulkMode={logic.setBulkMode}
                                    bulkAccessVlan={logic.bulkAccessVlan} setBulkAccessVlan={logic.setBulkAccessVlan}
                                    bulkTrunkVlans={logic.bulkTrunkVlans} setBulkTrunkVlans={logic.setBulkTrunkVlans}
                                    bulkVoiceVlan={logic.bulkVoiceVlan} setBulkVoiceVlan={logic.setBulkVoiceVlan}
                                    bulkPortfast={logic.bulkPortfast} setBulkPortfast={logic.setBulkPortfast}
                                    bulkInclude={logic.bulkInclude} setBulkInclude={logic.setBulkInclude}
                                    bulkNoShut={logic.bulkNoShut} setBulkNoShut={logic.setBulkNoShut}
                                    bulkPoeMode={logic.bulkPoeMode} setBulkPoeMode={logic.setBulkPoeMode}
                                    bulkSecurity={logic.bulkSecurity} setBulkSecurity={logic.setBulkSecurity}
                                    bulkSecMax={logic.bulkSecMax} setBulkSecMax={logic.setBulkSecMax}
                                    bulkSecViolation={logic.bulkSecViolation} setBulkSecViolation={logic.setBulkSecViolation}
                                    bulkSecSticky={logic.bulkSecSticky} setBulkSecSticky={logic.setBulkSecSticky}
                                    bulkSecAgingTime={logic.bulkSecAgingTime} setBulkSecAgingTime={logic.setBulkSecAgingTime}
                                    bulkSecAgingType={logic.bulkSecAgingType} setBulkSecAgingType={logic.setBulkSecAgingType}
                                    showSecurityOptions={logic.showSecurityOptions} setShowSecurityOptions={logic.setShowSecurityOptions}
                                    applyBulkEdit={logic.applyBulkEdit}
                                />
                            )}

                            {logic.viewMode === 'single' && (
                                <SinglePortEditor
                                    ports={logic.ports}
                                    singleEditPortId={logic.singleEditPortId}
                                    setSingleEditPortId={logic.setSingleEditPortId}
                                    scrollToPreviewPort={logic.scrollToPreviewPort}
                                    singlePort={logic.singlePort}
                                    handlePrevPort={logic.handlePrevPort}
                                    handleNextPort={logic.handleNextPort}
                                    updatePort={logic.updatePort}
                                    toggleNoShut={logic.toggleNoShut}
                                    toggleInclude={logic.toggleInclude}
                                    resetPortToDefault={logic.resetPortToDefault}
                                />
                            )}
                        </div>
                    </div>

                    {/* RIGHT: LIVE PREVIEW */}
                    <ConfigPreview
                        generatedConfig={logic.generatedConfig}
                        copyToClipboard={logic.copyToClipboard}
                        downloadFile={logic.downloadFile}
                        includeWrMem={logic.includeWrMem} setIncludeWrMem={logic.setIncludeWrMem}
                        useModernPortfast={logic.useModernPortfast} setUseModernPortfast={logic.setUseModernPortfast}
                        includeNoShutdown={logic.includeNoShutdown} setIncludeNoShutdown={logic.setIncludeNoShutdown}
                        includeDescriptions={logic.includeDescriptions} setIncludeDescriptions={logic.setIncludeDescriptions}
                        version={APP_VERSION}
                    />

                    {/* Toast Notification */}
                    {logic.toast.show && (
                        <div className="fixed bottom-4 right-4 bg-slate-800 text-white px-4 py-2 rounded shadow-lg animate-bounce text-sm flex items-center gap-2 z-50">
                            <CheckSquare size={16} className="text-green-400"/>
                            {logic.toast.message}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}