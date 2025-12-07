import React from 'react';
import { Phone, PlusCircle, MinusCircle } from 'lucide-react';
import { isNumeric } from '../../utils/ciscoHelpers';

export default function GlobalSettings({
                                           stackMembers, setStackMembers,
                                           portNaming, setPortNaming,
                                           portLayout, setPortLayout,
                                           globalVoiceVlan, setGlobalVoiceVlan
                                       }) {

    const handleStackSizeChange = (newSize) => {
        const currentSize = stackMembers.length;
        if (newSize > currentSize) {
            const newMembers = Array.from({ length: newSize - currentSize }, () => ({
                model: 48, uplinkCount: 4, baseInterfaceType: 'GigabitEthernet', uplinkInterfaceType: 'TenGigabitEthernet'
            }));
            setStackMembers([...stackMembers, ...newMembers]);
        } else if (newSize < currentSize) {
            setStackMembers(stackMembers.slice(0, newSize));
        }
    };

    const updateStackMember = (index, field, value) => {
        const updatedMembers = [...stackMembers];
        updatedMembers[index] = { ...updatedMembers[index], [field]: value };
        setStackMembers(updatedMembers);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-6">
            {/* --- GLOBAL ROW --- */}
            <div className="grid grid-cols-1 md:grid-cols-8 gap-4">
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Stack Size</label>
                    <select className="w-full p-2 border border-slate-300 rounded-md bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none text-sm" value={stackMembers.length} onChange={(e) => handleStackSizeChange(parseInt(e.target.value))}>
                        {[...Array(8).keys()].map(i => <option key={i+1} value={i+1}>{i+1} Unit(s)</option>)}
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Naming</label>
                    <select className="w-full p-2 border border-slate-300 rounded-md bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none text-sm" value={portNaming} onChange={(e) => setPortNaming(e.target.value)}>
                        <option value="simple">Simple (Gi0/X)</option>
                        <option value="stack">Stack (Gi1/0/X)</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Port Layout</label>
                    <select className="w-full p-2 border border-slate-300 rounded-md bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none text-sm" value={portLayout} onChange={(e) => setPortLayout(e.target.value)}>
                        <option value="two-row">Two-Row</option>
                        <option value="single-row">Single-Row</option>
                    </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-semibold text-blue-600 uppercase tracking-wider flex items-center gap-1">
                        <Phone size={12}/> Global Voice VLAN
                    </label>
                    <input
                        type="text"
                        maxLength={4}
                        className="w-full p-2 border border-blue-200 rounded-md bg-blue-50 focus:ring-2 focus:ring-blue-500 outline-none text-blue-900 font-bold placeholder-blue-300 text-sm"
                        placeholder="e.g. 40"
                        value={globalVoiceVlan}
                        onChange={(e) => isNumeric(e.target.value) && setGlobalVoiceVlan(e.target.value)}
                    />
                </div>
            </div>

            {/* --- PER-MEMBER SETTINGS --- */}
            <div className="space-y-4">
                {stackMembers.map((member, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-8 gap-4 items-center p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="font-bold text-sm text-slate-600">Switch {index + 1}</div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-slate-500 uppercase">Ports</label>
                            <select className="w-full p-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm" value={member.model} onChange={(e) => updateStackMember(index, 'model', parseInt(e.target.value))}>
                                <option value={8}>8 Ports</option>
                                <option value={12}>12 Ports</option>
                                <option value={16}>16 Ports</option>
                                <option value={24}>24 Ports</option>
                                <option value={48}>48 Ports</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-slate-500 uppercase">Uplinks</label>
                            <select className="w-full p-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm" value={member.uplinkCount} onChange={(e) => updateStackMember(index, 'uplinkCount', parseInt(e.target.value))}>
                                <option value={0}>None</option>
                                <option value={2}>2 x SFP</option>
                                <option value={4}>4 x SFP</option>
                            </select>
                        </div>
                        <div className="space-y-1 md:col-span-2">
                            <label className="text-[10px] font-semibold text-slate-500 uppercase">Base Type</label>
                            <select className="w-full p-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm" value={member.baseInterfaceType} onChange={(e) => updateStackMember(index, 'baseInterfaceType', e.target.value)}>
                                <option value="GigabitEthernet">GigabitEthernet</option>
                                <option value="FastEthernet">FastEthernet</option>
                                <option value="TenGigabitEthernet">TenGigabitEthernet</option>
                                <option value="TwentyFiveGigE">TwentyFiveGigE</option>
                                <option value="FortyGigabitEthernet">FortyGigabitEthernet</option>
                                <option value="Ethernet">Ethernet</option>
                            </select>
                        </div>
                        <div className="space-y-1 md:col-span-2">
                            <label className="text-[10px] font-semibold text-slate-500 uppercase">Uplink Type</label>
                            <select className="w-full p-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm" value={member.uplinkInterfaceType} onChange={(e) => updateStackMember(index, 'uplinkInterfaceType', e.target.value)}>
                                <option value="GigabitEthernet">GigabitEthernet</option>
                                <option value="TenGigabitEthernet">TenGigabitEthernet</option>
                                <option value="TwentyFiveGigE">TwentyFiveGigE</option>
                                <option value="FortyGigabitEthernet">FortyGigabitEthernet</option>
                                <option value="Ethernet">Ethernet</option>
                            </select>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}