import React from 'react';
import { Layers, Zap } from 'lucide-react';

export default function SwitchVisualizer({
                                             stackSize,
                                             switchModel,
                                             uplinkCount,
                                             ports,
                                             selectedPortIds,
                                             viewMode,
                                             singleEditPortId,
                                             onPortClick,
                                             hostname,
                                             iosVersion
                                         }) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Layers size={16} className="text-slate-500" />
                    <span className="text-sm font-semibold text-slate-600">Switch Visualizer</span>
                </div>
                {(hostname || iosVersion) && (
                    <div className="flex items-center gap-3 text-xs font-mono text-slate-500 bg-white px-3 py-1 rounded border border-slate-200 shadow-sm">
                        {hostname && (
                            <div className="flex items-center gap-1">
                                <span className="font-bold text-slate-400">Host:</span>
                                <span className="text-blue-600 font-bold">{hostname}</span>
                            </div>
                        )}
                        {hostname && iosVersion && <div className="w-px h-3 bg-slate-300"></div>}
                        {iosVersion && (
                            <div className="flex items-center gap-1">
                                <span className="font-bold text-slate-400">Ver:</span>
                                <span className="text-green-600 font-bold">{iosVersion}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
            <div className="px-6 py-24 overflow-x-auto">
                {Array.from({ length: stackSize }).map((_, stackIndex) => (
                    <div key={stackIndex} className="mb-6 last:mb-0">
                        {stackSize > 1 && <div className="text-xs font-bold text-slate-400 mb-1">Switch {stackIndex + 1}</div>}
                        <div className="bg-slate-800 p-3 rounded-lg border-4 border-slate-700 shadow-inner inline-flex flex-row items-center gap-4 min-w-max">
                            {/* Main Ports Block */}
                            <div className="flex flex-col gap-2">
                                {/* Top Row: Odd Ports */}
                                <div className="flex gap-2">
                                    {Array.from({ length: switchModel / 2 }).map((_, i) => {
                                        const portNum = (i * 2) + 1;
                                        const portsPerSwitch = switchModel + uplinkCount;
                                        const baseIndex = stackIndex * portsPerSwitch;
                                        const portIndex = baseIndex + (portNum - 1);
                                        const portData = ports[portIndex];
                                        if (!portData) return null;

                                        const isSelected = selectedPortIds.has(portData.id);
                                        const isTrunk = portData.mode === 'trunk';
                                        const isActive = portData.accessVlan || portData.description;
                                        const isIncluded = portData.includeInConfig;
                                        const isCurrentSingle = viewMode === 'single' && singleEditPortId === portData.id;
                                        const isPoe = portData.poeMode !== 'never';

                                        return (
                                            <div key={portNum} className="group relative" onClick={(e) => onPortClick(portData.id, e)}>
                                                <div className={`w-8 h-6 rounded-sm border-t-2 ${!isIncluded ? 'opacity-30' : ''} ${isCurrentSingle ? 'ring-2 ring-white ring-offset-2 ring-offset-blue-600 z-10' : ''} ${isSelected ? 'ring-2 ring-yellow-400 ring-offset-1 ring-offset-slate-800' : ''} ${isTrunk ? 'bg-orange-500 border-orange-300' : isActive ? 'bg-green-500 border-green-300' : 'bg-slate-600 border-slate-500'} shadow-md transition-all hover:brightness-110 cursor-pointer relative`}>
                                                    {portData.voiceVlan && <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-purple-400 rounded-full border border-slate-800"></div>}
                                                    {portData.portSecurity && <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-red-500 rounded-full border border-slate-800"></div>}
                                                    {isPoe && <Zap size={8} className="absolute top-0.5 right-0.5 text-yellow-300 opacity-80" fill="currentColor" />}
                                                </div>
                                                <div className={`text-[9px] text-center font-mono mt-0.5 ${isCurrentSingle ? 'text-white font-bold' : 'text-slate-400'}`}>{portNum}</div>
                                                {/* Tooltip */}
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 bg-black text-white text-xs rounded p-2 z-10 pointer-events-none">
                                                    <div className="font-bold">{portData.name}</div>
                                                    <div>Mode: {portData.mode}</div>
                                                    {portData.mode === 'access' && <div>VLAN: {portData.accessVlan || '1'}</div>}
                                                    {portData.portSecurity && <div className="text-red-300">Security: On (Max {portData.secMax})</div>}
                                                    <div className={isPoe ? "text-yellow-300" : "text-slate-500"}>PoE: {portData.poeMode}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                {/* Bottom Row: Even Ports */}
                                <div className="flex gap-2">
                                    {Array.from({ length: switchModel / 2 }).map((_, i) => {
                                        const portNum = (i * 2) + 2;
                                        const portsPerSwitch = switchModel + uplinkCount;
                                        const baseIndex = stackIndex * portsPerSwitch;
                                        const portIndex = baseIndex + (portNum - 1);
                                        const portData = ports[portIndex];
                                        if (!portData) return null;

                                        const isSelected = selectedPortIds.has(portData.id);
                                        const isTrunk = portData.mode === 'trunk';
                                        const isActive = portData.accessVlan || portData.description;
                                        const isIncluded = portData.includeInConfig;
                                        const isCurrentSingle = viewMode === 'single' && singleEditPortId === portData.id;
                                        const isPoe = portData.poeMode !== 'never';

                                        return (
                                            <div key={portNum} className="group relative" onClick={(e) => onPortClick(portData.id, e)}>
                                                <div className={`text-[9px] text-center font-mono mb-0.5 ${isCurrentSingle ? 'text-white font-bold' : 'text-slate-400'}`}>{portNum}</div>
                                                <div className={`w-8 h-6 rounded-sm border-b-2 ${!isIncluded ? 'opacity-30' : ''} ${isCurrentSingle ? 'ring-2 ring-white ring-offset-2 ring-offset-blue-600 z-10' : ''} ${isSelected ? 'ring-2 ring-yellow-400 ring-offset-1 ring-offset-slate-800' : ''} ${isTrunk ? 'bg-orange-500 border-orange-300' : isActive ? 'bg-green-500 border-green-300' : 'bg-slate-600 border-slate-500'} shadow-md transition-all hover:brightness-110 cursor-pointer relative`}>
                                                    {portData.voiceVlan && <div className="absolute -top-1 -right-1 w-2 h-2 bg-purple-400 rounded-full border border-slate-800"></div>}
                                                    {portData.portSecurity && <div className="absolute -top-1 -left-1 w-2 h-2 bg-red-500 rounded-full border border-slate-800"></div>}
                                                    {isPoe && <Zap size={8} className="absolute bottom-0.5 right-0.5 text-yellow-300 opacity-80" fill="currentColor" />}
                                                </div>
                                                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 hidden group-hover:block w-48 bg-black text-white text-xs rounded p-2 z-10 pointer-events-none">
                                                    <div className="font-bold">{portData.name}</div>
                                                    <div>Mode: {portData.mode}</div>
                                                    {portData.mode === 'access' && <div>VLAN: {portData.accessVlan || '1'}</div>}
                                                    {portData.portSecurity && <div className="text-red-300">Security: On (Max {portData.secMax})</div>}
                                                    <div className={isPoe ? "text-yellow-300" : "text-slate-500"}>PoE: {portData.poeMode}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {uplinkCount > 0 && <div className="w-px h-16 bg-slate-600 mx-1"></div>}

                            {/* Uplink Ports Block */}
                            {uplinkCount > 0 && (
                                <div className="flex gap-2 bg-slate-900 p-2 rounded border border-slate-700">
                                    {Array.from({ length: uplinkCount }).map((_, i) => {
                                        const portNum = switchModel + i + 1;
                                        const portsPerSwitch = switchModel + uplinkCount;
                                        const baseIndex = stackIndex * portsPerSwitch;
                                        const portIndex = baseIndex + (portNum - 1);
                                        const portData = ports[portIndex];
                                        if (!portData) return null;

                                        const isSelected = selectedPortIds.has(portData.id);
                                        const isTrunk = portData.mode === 'trunk';
                                        const isActive = portData.accessVlan || portData.description;
                                        const isIncluded = portData.includeInConfig;
                                        const isCurrentSingle = viewMode === 'single' && singleEditPortId === portData.id;

                                        return (
                                            <div key={portNum} className="group relative flex flex-col items-center justify-center" onClick={(e) => onPortClick(portData.id, e)}>
                                                <div className={`w-6 h-6 rounded-md border-2 ${!isIncluded ? 'opacity-30' : ''} ${isCurrentSingle ? 'ring-2 ring-white ring-offset-2 ring-offset-blue-600 z-10' : ''} ${isSelected ? 'ring-2 ring-yellow-400 ring-offset-1 ring-offset-slate-800' : ''} ${isTrunk ? 'bg-orange-900 border-orange-500' : isActive ? 'bg-green-900 border-green-500' : 'bg-slate-800 border-slate-500'} shadow-inner cursor-pointer flex items-center justify-center`}>
                                                    <div className="w-2 h-1 bg-black rounded-full opacity-50"></div>
                                                </div>
                                                <div className={`text-[8px] font-mono mt-1 ${isCurrentSingle ? 'text-white font-bold' : 'text-slate-400'}`}>{portNum}</div>
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-32 bg-black text-white text-xs rounded p-2 z-10 pointer-events-none">
                                                    <div className="font-bold text-orange-300">SFP/Uplink</div>
                                                    <div>{portData.name}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}