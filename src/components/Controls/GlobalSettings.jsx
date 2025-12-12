import React, { useState } from 'react';
import { Phone, Server, Layers, Type, LayoutGrid, Globe } from 'lucide-react';
import { isNumeric } from '../../utils/ciscoHelpers';

export default function GlobalSettings({
                                           stackMembers, setStackMembers,
                                           portNaming, setPortNaming,
                                           portLayout, setPortLayout,
                                           globalVoiceVlan, setGlobalVoiceVlan
                                       }) {

    const [activeMemberIndex, setActiveMemberIndex] = useState(0);

    const handleStackSizeChange = (newSize) => {
        const currentSize = stackMembers.length;
        if (newSize > currentSize) {
            const newMembers = Array.from({ length: newSize - currentSize }, () => ({
                model: 48, uplinkCount: 4, baseInterfaceType: 'GigabitEthernet', uplinkInterfaceType: 'TenGigabitEthernet'
            }));
            setStackMembers([...stackMembers, ...newMembers]);
        } else if (newSize < currentSize) {
            setStackMembers(stackMembers.slice(0, newSize));
            if (activeMemberIndex >= newSize) {
                setActiveMemberIndex(Math.max(0, newSize - 1));
            }
        }
    };

    const updateStackMember = (index, field, value) => {
        const updatedMembers = [...stackMembers];
        updatedMembers[index] = { ...updatedMembers[index], [field]: value };
        setStackMembers(updatedMembers);
    };

    const activeMember = stackMembers[activeMemberIndex];

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-6">
            {/* --- GLOBAL SETTINGS SECTION --- */}
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
                <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-4">
                    <div className="p-2 bg-white rounded-md border border-slate-200 shadow-sm">
                        <Globe size={20} className="text-purple-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-700 text-sm">Global Settings</h3>
                        <p className="text-xs text-slate-500">General stack parameters</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase flex items-center gap-1">
                            <Layers size={12} /> Stack Size
                        </label>
                        <select className="w-full p-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm" value={stackMembers.length} onChange={(e) => handleStackSizeChange(parseInt(e.target.value))}>
                            {[...Array(8).keys()].map(i => <option key={i+1} value={i+1}>{i+1} Unit(s)</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase flex items-center gap-1">
                            <Type size={12} /> Naming
                        </label>
                        <select className="w-full p-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm" value={portNaming} onChange={(e) => setPortNaming(e.target.value)}>
                            <option value="simple">Simple (Gi0/X)</option>
                            <option value="stack">Stack (Gi1/0/X)</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase flex items-center gap-1">
                            <LayoutGrid size={12} /> Port Layout
                        </label>
                        <select className="w-full p-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm" value={portLayout} onChange={(e) => setPortLayout(e.target.value)}>
                            <option value="two-row">Two-Row</option>
                            <option value="single-row">Single-Row</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-blue-600 uppercase flex items-center gap-1">
                            <Phone size={12}/> Global Voice VLAN
                        </label>
                        <input
                            type="text"
                            maxLength={4}
                            className="w-full p-2 border border-blue-200 rounded-md bg-white focus:ring-2 focus:ring-blue-500 outline-none text-blue-900 font-bold placeholder-blue-300 text-sm"
                            placeholder="e.g. 40"
                            value={globalVoiceVlan}
                            onChange={(e) => isNumeric(e.target.value) && setGlobalVoiceVlan(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* --- PER-MEMBER SETTINGS --- */}
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
                <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4 border-b border-slate-200 pb-4">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-white rounded-md border border-slate-200 shadow-sm">
                            <Server size={20} className="text-blue-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-700 text-sm">Switch Configuration</h3>
                            <p className="text-xs text-slate-500">Configure individual stack members</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <label className="text-xs font-bold text-slate-500 uppercase whitespace-nowrap">Active Switch:</label>
                        <select 
                            className="flex-1 md:w-48 p-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                            value={activeMemberIndex}
                            onChange={(e) => setActiveMemberIndex(parseInt(e.target.value))}
                        >
                            {stackMembers.map((_, i) => (
                                <option key={i} value={i}>Switch {i + 1}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {activeMember && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-300">
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-slate-500 uppercase">Ports</label>
                            <select className="w-full p-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm" value={activeMember.model} onChange={(e) => updateStackMember(activeMemberIndex, 'model', parseInt(e.target.value))}>
                                <option value={8}>8 Ports</option>
                                <option value={12}>12 Ports</option>
                                <option value={16}>16 Ports</option>
                                <option value={24}>24 Ports</option>
                                <option value={48}>48 Ports</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-slate-500 uppercase">Uplinks</label>
                            <select className="w-full p-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm" value={activeMember.uplinkCount} onChange={(e) => updateStackMember(activeMemberIndex, 'uplinkCount', parseInt(e.target.value))}>
                                <option value={0}>None</option>
                                <option value={2}>2 x SFP</option>
                                <option value={4}>4 x SFP</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-slate-500 uppercase">Base Type</label>
                            <select className="w-full p-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm" value={activeMember.baseInterfaceType} onChange={(e) => updateStackMember(activeMemberIndex, 'baseInterfaceType', e.target.value)}>
                                <option value="GigabitEthernet">GigabitEthernet</option>
                                <option value="FastEthernet">FastEthernet</option>
                                <option value="TenGigabitEthernet">TenGigabitEthernet</option>
                                <option value="TwentyFiveGigE">TwentyFiveGigE</option>
                                <option value="FortyGigabitEthernet">FortyGigabitEthernet</option>
                                <option value="Ethernet">Ethernet</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-slate-500 uppercase">Uplink Type</label>
                            <select className="w-full p-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm" value={activeMember.uplinkInterfaceType} onChange={(e) => updateStackMember(activeMemberIndex, 'uplinkInterfaceType', e.target.value)}>
                                <option value="GigabitEthernet">GigabitEthernet</option>
                                <option value="TenGigabitEthernet">TenGigabitEthernet</option>
                                <option value="TwentyFiveGigE">TwentyFiveGigE</option>
                                <option value="FortyGigabitEthernet">FortyGigabitEthernet</option>
                                <option value="Ethernet">Ethernet</option>
                            </select>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}