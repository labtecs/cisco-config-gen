import React from 'react';
import { Upload } from 'lucide-react';

export default function GlobalHeader({ onUpload }) {
    return (
        <header className="bg-slate-800 text-white p-2 sticky top-[56px] z-50">
            <div className="max-w-7xl mx-auto flex justify-end items-center">
                <div className="flex items-center gap-3 bg-slate-700 p-1 rounded-lg border border-slate-600">
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-600 px-3 py-1 rounded transition">
                        <Upload size={16} />
                        <span className="text-sm font-medium">Upload Running-Config</span>
                        <input type="file" accept=".txt,.cfg,.log" className="hidden" onChange={onUpload} />
                    </label>
                </div>
            </div>
        </header>
    );
}