import React from 'react';
import { GitCommit } from 'lucide-react';

export default function PortChannelEditor({ portChannels, updatePortChannel }) {
    if (portChannels.length === 0) {
        return null;
    }

    return (
        <div>
            <h3 className="font-semibold text-slate-700 flex items-center gap-2 mb-4">
                <GitCommit size={18} />
                Port-Channel Configuration
            </h3>
            <div className="space-y-6 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                {portChannels.map(pc => (
                    <div key={pc.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-3 border border-slate-200 rounded-lg bg-slate-50/50">
                        <div className="md:col-span-1 font-mono text-sm font-bold text-purple-700 bg-purple-100 rounded px-2 py-1 flex items-center justify-center">
                            {pc.name}
                        </div>
                        <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <input
                                type="text"
                                placeholder="Description..."
                                className="w-full bg-white p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                value={pc.description}
                                onChange={(e) => updatePortChannel(pc.id, 'description', e.target.value)}
                            />
                            <select
                                className="w-full bg-white p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                value={pc.mode}
                                onChange={(e) => updatePortChannel(pc.id, 'mode', e.target.value)}
                            >
                                <option value="trunk">Trunk</option>
                                <option value="access">Access</option>
                            </select>
                            <input
                                type="text"
                                placeholder="Allowed VLANs (e.g., 10,20,30-40)"
                                className="w-full bg-white p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                value={pc.trunkVlans}
                                onChange={(e) => updatePortChannel(pc.id, 'trunkVlans', e.target.value)}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}