import React from 'react';
import { Phone } from 'lucide-react';
import { isNumeric } from '../../utils/ciscoHelpers';

export default function GlobalSettings({
                                           switchModel, setSwitchModel,
                                           uplinkCount, setUplinkCount,
                                           stackSize, setStackSize,
                                           portNaming, setPortNaming,
                                           baseInterfaceType, setBaseInterfaceType,
                                           uplinkInterfaceType, setUplinkInterfaceType,
                                           globalVoiceVlan, setGlobalVoiceVlan
                                       }) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 grid grid-cols-1 md:grid-cols-7 gap-4">
            <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ports pro Switch</label>
                <select className="w-full p-2 border border-slate-300 rounded-md bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none text-sm" value={switchModel} onChange={(e) => setSwitchModel(parseInt(e.target.value))}>
                    <option value={8}>8 Ports</option>
                    <option value={12}>12 Ports</option>
                    <option value={16}>16 Ports</option>
                    <option value={24}>24 Ports</option>
                    <option value={48}>48 Ports</option>
                </select>
            </div>
            <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Uplink Ports</label>
                <select className="w-full p-2 border border-slate-300 rounded-md bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none text-sm" value={uplinkCount} onChange={(e) => setUplinkCount(parseInt(e.target.value))}>
                    <option value={0}>Keine</option>
                    <option value={2}>2 x SFP</option>
                    <option value={4}>4 x SFP</option>
                </select>
            </div>
            <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Stack Member</label>
                <select className="w-full p-2 border border-slate-300 rounded-md bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none text-sm" value={stackSize} onChange={(e) => setStackSize(parseInt(e.target.value))}>
                    <option value={1}>1 Unit</option>
                    <option value={2}>2 Units</option>
                    <option value={3}>3 Units</option>
                    <option value={4}>4 Units</option>
                    <option value={5}>5 Units</option>
                    <option value={6}>6 Units</option>
                    <option value={7}>7 Units</option>
                    <option value={8}>8 Units</option>
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
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Base Type</label>
                <select className="w-full p-2 border border-slate-300 rounded-md bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none text-sm" value={baseInterfaceType} onChange={(e) => setBaseInterfaceType(e.target.value)}>
                    <option value="GigabitEthernet">GigabitEthernet</option>
                    <option value="FastEthernet">FastEthernet</option>
                    <option value="TenGigabitEthernet">TenGigabitEthernet</option>
                </select>
            </div>
            <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Uplink Type</label>
                <select className="w-full p-2 border border-slate-300 rounded-md bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none text-sm" value={uplinkInterfaceType} onChange={(e) => setUplinkInterfaceType(e.target.value)}>
                    <option value="GigabitEthernet">GigabitEthernet</option>
                    <option value="TenGigabitEthernet">TenGigabitEthernet</option>
                    <option value="TwentyFiveGigE">TwentyFiveGigE</option>
                    <option value="FortyGigabitEthernet">FortyGigabitEthernet</option>
                </select>
            </div>
            <div className="space-y-2">
                <label className="text-xs font-semibold text-blue-600 uppercase tracking-wider flex items-center gap-1">
                    <Phone size={12}/> Global Voice</label>
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
    );
}