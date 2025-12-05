import React, { useState, useMemo } from 'react';
import { X, Zap, Activity, Copy, Check, AlertTriangle } from 'lucide-react';

export default function MaintenanceModal({ ports, availableVlans, onClose }) {
    const [targetVlan, setTargetVlan] = useState('');
    const [actionType, setActionType] = useState('poe_cycle'); // 'poe_cycle' | 'link_cycle'
    const [copied, setCopied] = useState(false);

    // 1. ZIELE FINDEN
    const targetPorts = useMemo(() => {
        if (!targetVlan) return [];
        const strVlan = String(targetVlan);

        return ports.filter(p => {
            // Access Ports im VLAN
            if (p.mode === 'access' && String(p.accessVlan) === strVlan) return true;
            // Trunk Ports (wenn nötig, hier optional)
            return false;
        });
    }, [ports, targetVlan]);

    // 2. SKRIPT GENERIEREN
    const scriptOutput = useMemo(() => {
        if (targetPorts.length === 0) return "! Bitte wähle ein VLAN aus, um betroffene Ports zu finden.";

        let out = `! --- MAINTENANCE SCRIPT: ${actionType === 'poe_cycle' ? 'POE RESET' : 'LINK RESET'} ---\n`;
        out += `! Target: VLAN ${targetVlan} (${targetPorts.length} Ports)\n`;
        out += `! Warnung: Dies unterbricht die Verbindung auf den betroffenen Ports!\n\n`;

        out += `configure terminal\n\n`;

        // SCHRITT 1: AUSSCHALTEN
        out += `! >>> SCHRITT 1: ABSCHALTEN <<<\n`;
        targetPorts.forEach(p => {
            out += `interface ${p.name}\n`;
            if (actionType === 'poe_cycle') {
                out += ` power inline never\n`; // Strom aus
            } else {
                out += ` shutdown\n`; // Link aus
            }
            out += ` exit\n`;
        });

        out += `\n! ... WARTE JETZT 5-10 SEKUNDEN ...\n\n`;

        // SCHRITT 2: EINSCHALTEN
        out += `! >>> SCHRITT 2: EINSCHALTEN <<<\n`;
        targetPorts.forEach(p => {
            out += `interface ${p.name}\n`;
            if (actionType === 'poe_cycle') {
                out += ` power inline auto\n`; // Strom an (Standard)
                // Alternativ: "no power inline never"
            } else {
                out += ` no shutdown\n`; // Link an
            }
            out += ` exit\n`;
        });

        out += `\nend\n! Done.`;
        return out;
    }, [targetPorts, actionType, targetVlan]);

    const handleCopy = () => {
        navigator.clipboard.writeText(scriptOutput);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50 rounded-t-xl">
                    <div className="flex items-center gap-2 text-slate-800">
                        <div className="bg-orange-100 p-2 rounded-lg text-orange-600">
                            <Activity size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Maintenance Generator</h3>
                            <p className="text-xs text-slate-500">Erstellt Skripte für Migrationen & Entstörung</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                {/* Controls */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Linke Seite: Einstellungen */}
                    <div className="space-y-6">

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">1. Ziel-VLAN wählen</label>
                            <select
                                className="w-full p-2.5 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                                value={targetVlan}
                                onChange={(e) => setTargetVlan(e.target.value)}
                            >
                                <option value="">-- Wähle ein VLAN --</option>
                                {availableVlans.filter(v => !v.isRange && v.id !== '1').map(v => (
                                    <option key={v.id} value={v.id}>
                                        VLAN {v.id} {v.name ? `(${v.name})` : ''}
                                    </option>
                                ))}
                            </select>
                            {targetVlan && (
                                <div className="text-xs text-blue-600 font-medium flex items-center gap-1 mt-1">
                                    <Check size={12}/> {targetPorts.length} Ports gefunden
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">2. Aktion wählen</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setActionType('poe_cycle')}
                                    className={`p-3 rounded-lg border text-sm font-bold flex flex-col items-center gap-2 transition-all ${
                                        actionType === 'poe_cycle'
                                            ? 'bg-yellow-50 border-yellow-400 text-yellow-800 ring-1 ring-yellow-400'
                                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    <Zap size={20} className={actionType === 'poe_cycle' ? 'fill-yellow-500 text-yellow-600' : ''}/>
                                    PoE Reset
                                </button>
                                <button
                                    onClick={() => setActionType('link_cycle')}
                                    className={`p-3 rounded-lg border text-sm font-bold flex flex-col items-center gap-2 transition-all ${
                                        actionType === 'link_cycle'
                                            ? 'bg-blue-50 border-blue-400 text-blue-800 ring-1 ring-blue-400'
                                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    <Activity size={20} />
                                    Link Bounce
                                </button>
                            </div>
                            <p className="text-[10px] text-slate-400 leading-tight pt-1">
                                {actionType === 'poe_cycle'
                                    ? "Setzt 'power inline never' und danach wieder 'auto'. Startet Telefone/APs neu."
                                    : "Führt 'shutdown' und 'no shutdown' aus. Setzt den Link-Status zurück."}
                            </p>
                        </div>

                        <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg flex gap-3 items-start">
                            <AlertTriangle size={16} className="text-orange-600 shrink-0 mt-0.5" />
                            <div className="text-xs text-orange-800">
                                <strong>Hinweis:</strong> Dieses Skript ändert nur den Betriebsstatus.
                                Die eigentliche Konfiguration (VLANs, Mode) bleibt unberührt.
                            </div>
                        </div>

                    </div>

                    {/* Rechte Seite: Preview */}
                    <div className="flex flex-col h-full min-h-[300px]">
                        <div className="flex justify-between items-end mb-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Generiertes Skript</label>
                            <button
                                onClick={handleCopy}
                                className="text-xs flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded transition-colors"
                            >
                                {copied ? <Check size={12}/> : <Copy size={12}/>}
                                {copied ? "Kopiert!" : "Kopieren"}
                            </button>
                        </div>
                        <textarea
                            className="flex-1 w-full bg-slate-900 text-green-400 font-mono text-xs p-4 rounded-lg resize-none focus:outline-none shadow-inner"
                            value={scriptOutput}
                            readOnly
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}