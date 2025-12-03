import React, { useState } from 'react';
import { Play, X } from 'lucide-react';

export default function ConnectionBar({ onConnect, onClose, isLoading }) {
    const [ip, setIp] = useState('');
    const [port, setPort] = useState('22');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        onConnect({ ip, port, username, password });
    };

    return (
        <div className="bg-blue-800 border-t border-blue-700 shadow-md text-white animate-in slide-in-from-top-2">
            <div className="max-w-7xl mx-auto p-3">
                <form onSubmit={handleSubmit} className="flex flex-col md:flex-row items-center gap-3">
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <span className="text-xs font-bold text-blue-200 uppercase w-16">Switch IP:</span>
                        <input
                            type="text"
                            placeholder="192.168.1.1"
                            className="bg-blue-900 border border-blue-600 rounded px-2 py-1 text-sm text-white placeholder-blue-400 outline-none focus:border-blue-400 w-full md:w-32"
                            value={ip}
                            onChange={(e) => setIp(e.target.value)}
                            required
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <span className="text-xs font-bold text-blue-200 uppercase">Port:</span>
                        <input
                            type="text"
                            placeholder="22"
                            className="bg-blue-900 border border-blue-600 rounded px-2 py-1 text-sm text-white placeholder-blue-400 outline-none focus:border-blue-400 w-12 text-center"
                            value={port}
                            onChange={(e) => setPort(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <span className="text-xs font-bold text-blue-200 uppercase">User:</span>
                        <input
                            type="text"
                            placeholder="admin"
                            className="bg-blue-900 border border-blue-600 rounded px-2 py-1 text-sm text-white placeholder-blue-400 outline-none focus:border-blue-400 w-full md:w-28"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <span className="text-xs font-bold text-blue-200 uppercase">Pass:</span>
                        <input
                            type="password"
                            placeholder="••••••"
                            className="bg-blue-900 border border-blue-600 rounded px-2 py-1 text-sm text-white placeholder-blue-400 outline-none focus:border-blue-400 w-full md:w-28"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <div className="flex-1"></div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`flex items-center gap-2 px-4 py-1 rounded text-sm font-bold shadow-lg transition-colors ${isLoading ? 'bg-slate-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500'}`}
                        >
                            {isLoading ? (
                                <span className="animate-pulse">Connecting...</span>
                            ) : (
                                <>
                                    <Play size={14} fill="currentColor" /> Connect
                                </>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 hover:bg-blue-700 rounded text-blue-300 hover:text-white transition-colors"
                            title="Close"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}