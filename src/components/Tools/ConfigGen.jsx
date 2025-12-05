import React from 'react';
import { CheckSquare, Zap, Shield, FastForward, Phone, Power, Filter, Activity } from 'lucide-react';
import MaintenanceModal from './MaintenanceModal';
// Components & Hooks
// WICHTIG: Hier nur EIN Import mit dem korrekten Pfad (zwei Ebenen hoch)
import { useCiscoGen } from '../../hooks/useCiscoGen';
import ConnectionBar from '../Layout/ConnectionBar';
import SwitchVisualizer from '../Visualizer/SwitchVisualizer';
import GlobalSettings from '../Controls/GlobalSettings';
import ConfigPreview from '../Editor/ConfigPreview';
import SinglePortEditor from '../Editor/SinglePortEditor';
import MultiPortEditor from '../Editor/MultiPortEditor';

export default function ConfigGen({ fileContent }) {
    const APP_VERSION = "v3.8";
    const logic = useCiscoGen({ fileContent });
    const [showMaintenance, setShowMaintenance] = React.useState(false);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-32 relative">
            {/* CONNECTION BAR - SLIDES IN */}
            {logic.showConnectionBar && (
                <ConnectionBar
                    onConnect={logic.handleSSHConnect}
                    onClose={() => logic.setShowConnectionBar(false)}
                    isLoading={logic.isConnecting}
                />
            )}

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
                    <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[1000px] relative">

                        {/* HEADER AREA */}
                        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col gap-4">

                            {/* Row 1: Title & Toggles */}
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <h2 className="font-semibold text-slate-700 flex items-center gap-2">
                                    <Activity size={18} />
                                    Port Configuration
                                </h2>

                                <div className="flex items-center gap-4 self-end md:self-auto">
                                    {/* COLUMNS TOGGLE */}
                                    {logic.viewMode === 'multi' && (
                                        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 shadow-sm">
                                            <button
                                                onClick={() => logic.setShowPoeColumn(!logic.showPoeColumn)}
                                                className={`px-2 py-1 text-[10px] font-bold uppercase rounded transition-colors flex items-center gap-1 ${logic.showPoeColumn ? 'bg-white text-yellow-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                                                title="Show PoE"
                                            >
                                                <Zap size={10} className={logic.showPoeColumn ? "fill-yellow-500" : ""} /> PoE
                                            </button>
                                            <div className="w-px h-3 bg-slate-300 mx-1"></div>
                                            <button
                                                onClick={() => logic.setShowSecColumn(!logic.showSecColumn)}
                                                className={`px-2 py-1 text-[10px] font-bold uppercase rounded transition-colors flex items-center gap-1 ${logic.showSecColumn ? 'bg-white text-red-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                                                title="Show Security"
                                            >
                                                <Shield size={10} className={logic.showSecColumn ? "fill-red-500" : ""} /> Sec
                                            </button>
                                            <div className="w-px h-3 bg-slate-300 mx-1"></div>
                                            <button
                                                onClick={() => logic.setShowFastColumn(!logic.showFastColumn)}
                                                className={`px-2 py-1 text-[10px] font-bold uppercase rounded transition-colors flex items-center gap-1 ${logic.showFastColumn ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                                                title="Show Fast"
                                            >
                                                <FastForward size={10} className={logic.showFastColumn ? "fill-blue-500" : ""} /> Fast
                                            </button>
                                            <div className="w-px h-3 bg-slate-300 mx-1"></div>
                                            <button
                                                onClick={() => logic.setShowVoiceColumn(!logic.showVoiceColumn)}
                                                className={`px-2 py-1 text-[10px] font-bold uppercase rounded transition-colors flex items-center gap-1 ${logic.showVoiceColumn ? 'bg-white text-purple-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                                                title="Show Voice"
                                            >
                                                <Phone size={10} className={logic.showVoiceColumn ? "fill-purple-500" : ""} /> Voice
                                            </button>
                                            <div className="w-px h-3 bg-slate-300 mx-1"></div>
                                            <button
                                                onClick={() => logic.setShowStateColumn(!logic.showStateColumn)}
                                                className={`px-2 py-1 text-[10px] font-bold uppercase rounded transition-colors flex items-center gap-1 ${logic.showStateColumn ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                                                title="Show State"
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
                                            MultiPort
                                        </button>
                                        <button
                                            onClick={() => logic.setViewMode('single')}
                                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${logic.viewMode === 'single' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}
                                        >
                                            SinglePort
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Row 2: VLANs and Legend */}
                            {logic.viewMode === 'multi' && (
                                <div className="space-y-3">
                                    {logic.availableVlans.length > 0 && (
                                        <div className="flex items-start gap-2 text-xs animate-in fade-in">
                                            <span className="text-slate-400 flex items-center gap-1 mt-1"><Filter size={12}/> VLANs:</span>
                                            <div className="flex flex-wrap gap-2">
                                                {logic.availableVlans.map(vlanObj => {
                                                    let styleClass = "bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-700 border-slate-200";
                                                    let title = `VLAN ${vlanObj.id} (Detected & Used)`;

                                                    // Use Stronger Colors for Visibility
                                                    if (vlanObj.status === 'unused') {
                                                        styleClass = "bg-orange-200 hover:bg-orange-300 text-orange-900 border-orange-400 font-bold shadow-sm";
                                                    }
                                                    else if (vlanObj.status === 'manual') {
                                                        styleClass = "bg-indigo-100 hover:bg-indigo-200 text-indigo-800 border-indigo-300";
                                                    }
                                                    else if (vlanObj.status === 'default') {
                                                        styleClass = "bg-slate-100 text-slate-400 border-slate-200 cursor-default";
                                                    }

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
                                    )}

                                    {/* LEGENDE - Immer sichtbar in Multi View */}
                                    <div className="flex items-center gap-4 pt-2 border-t border-slate-100 text-[10px] text-slate-500 font-medium">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-2.5 h-2.5 rounded-full bg-slate-200 border border-slate-300"></div>
                                            <span>Genutzt (Config)</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-2.5 h-2.5 rounded-full bg-blue-200 border border-blue-200"></div>
                                            <span>Neu / Manuell</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-2.5 h-2.5 rounded-full bg-orange-200 border border-orange-400"></div>
                                            <span className="text-orange-400 font-bold">Ungenutzt (Running-Config)</span>
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
                                    onEditPort={logic.switchToSingleEditor}
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
                        includeBaseConfig={logic.includeBaseConfig}
                        setIncludeBaseConfig={logic.setIncludeBaseConfig}
                        forcePoeReset={logic.forcePoeReset}
                        setForcePoeReset={logic.setForcePoeReset}
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
                    {showMaintenance && (
                        <MaintenanceModal
                            ports={logic.ports}
                            availableVlans={logic.availableVlans}
                            onClose={() => setShowMaintenance(false)}
                        />
                    )}
            </main>
        </div>
    );
}