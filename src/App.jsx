import React, { useState } from 'react';
import { Network, ShieldCheck, Box } from 'lucide-react';

// Tools importieren
import ConfigGen from './components/Tools/ConfigGen';
import AclInspector from './components/Tools/AclInspector';

export default function App() {
    const [activeTool, setActiveTool] = useState('generator'); // 'generator' oder 'acl'

    return (
        <div className="min-h-screen bg-slate-100 font-sans flex flex-col">

            {/* GLOBAL NAVIGATION BAR */}
            <nav className="bg-slate-900 text-white border-b border-slate-700 sticky top-0 z-[100]">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex items-center justify-between h-14">

                        {/* Logo / Brand */}
                        <div className="flex items-center gap-2 font-bold text-lg tracking-tight text-blue-400">
                            <Box className="w-6 h-6" />
                            <span>LabTecs Toolbox</span>
                        </div>

                        {/* Navigation Buttons */}
                        <div className="flex space-x-1">
                            <button
                                onClick={() => setActiveTool('generator')}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-all border-b-2 ${
                                    activeTool === 'generator'
                                        ? 'bg-slate-800 text-white border-blue-500'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800 border-transparent'
                                }`}
                            >
                                <Network size={16} />
                                Switchport Gen
                            </button>

                            <button
                                onClick={() => setActiveTool('acl')}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-all border-b-2 ${
                                    activeTool === 'acl'
                                        ? 'bg-slate-800 text-white border-green-500'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800 border-transparent'
                                }`}
                            >
                                <ShieldCheck size={16} />
                                ACL Inspector
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1">
                {activeTool === 'generator' ? (
                    <div className="animate-in fade-in duration-300">
                        <ConfigGen />
                    </div>
                ) : (
                    <div className="animate-in fade-in duration-300">
                        <AclInspector />
                    </div>
                )}
            </div>
        </div>
    );
}