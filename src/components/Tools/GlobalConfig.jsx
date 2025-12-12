import React from 'react';
import { useGlobalConfig } from '../../hooks/Cisco/useGlobalConfig';
import { Copy, Download, Plus, Trash2, Settings, Network, Shield, GitFork, Clock, Server, Fingerprint, AlertTriangle } from 'lucide-react';

const Section = ({ icon, title, children }) => (
    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <h3 className="font-semibold mb-3 text-slate-600 flex items-center gap-2">{icon}{title}</h3>
        <div className="space-y-4">
            {children}
        </div>
    </div>
);

const Input = (props) => <input {...props} className="w-full p-2 border border-slate-300 rounded-md bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none text-sm" />;
const Select = (props) => <select {...props} className="w-full p-2 border border-slate-300 rounded-md bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none text-sm" />;

export default function GlobalConfig({ fileContent }) {
    const {
        hostname, setHostname,
        enableSecret, setEnableSecret,
        vlans, addVlan, updateVlan, removeVlan,
        mgmtVlan, setMgmtVlan,
        mgmtIp, setMgmtIp,
        mgmtMask, setMgmtMask,
        mgmtDescription, setMgmtDescription,
        defaultGateway, setDefaultGateway,
        spanningTreeMode, setSpanningTreeMode,
        passwordEncryption, setPasswordEncryption,
        ntpServers, setNtpServers,
        generatedConfig,
        copyToClipboard,
        downloadFile,
        macAddress,
        serialNumber,
        isGatewayLive,
    } = useGlobalConfig({ fileContent });

    return (
        <main className="max-w-7xl mx-auto p-4 md:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* --- SETTINGS --- */}
                <div className="space-y-6">
                    <Section icon={<Server size={16} />} title="System Information">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-medium text-slate-500">Hostname</label>
                                <Input type="text" value={hostname} onChange={e => setHostname(e.target.value)} placeholder="Hostname" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-500">Base MAC Address</label>
                                <Input type="text" value={macAddress || ''} readOnly placeholder="Nicht gefunden" className="bg-slate-100 cursor-not-allowed" />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-500">Processor Board ID (Serial)</label>
                            {serialNumber ? (
                                <div className="font-mono text-sm p-2 bg-slate-100 rounded-md flex items-center gap-2">
                                    <Fingerprint size={14} className="text-slate-400"/> {serialNumber}
                                </div>
                            ) : (
                                <div className="text-sm p-2 bg-yellow-50 text-yellow-700 rounded-md flex items-center gap-2">
                                    <AlertTriangle size={14} /> Keine Seriennummer gefunden. (Nur via SSH-Connect)
                                </div>
                            )}
                        </div>
                    </Section>

                    <Section icon={<Settings size={16} />} title="Allgemein">
                        <div>
                            <label className="text-xs font-medium text-slate-500">Enable Secret</label>
                            <Input type="password" value={enableSecret} onChange={e => setEnableSecret(e.target.value)} placeholder="Enable Secret" />
                        </div>
                    </Section>

                    <Section icon={<Network size={16} />} title="VLANs">
                        {vlans.map((vlan, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <Input type="text" value={vlan.id} onChange={e => updateVlan(index, 'id', e.target.value)} placeholder="VLAN ID" className="w-1/4" />
                                <Input type="text" value={vlan.name} onChange={e => updateVlan(index, 'name', e.target.value)} placeholder="VLAN Name" className="w-3/4" />
                                <button onClick={() => removeVlan(index)} className="text-red-500 p-2 rounded-md hover:bg-red-50"><Trash2 size={16} /></button>
                            </div>
                        ))}
                        <button onClick={addVlan} className="flex items-center gap-2 text-blue-500 font-medium text-sm pt-2"><Plus size={16} /> VLAN hinzufügen</button>
                    </Section>

                    <Section icon={<Shield size={16} />} title="Management Interface (SVI)">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Input type="text" value={mgmtVlan} onChange={e => setMgmtVlan(e.target.value)} placeholder="Mgmt VLAN ID" />
                            <Input type="text" value={mgmtIp} onChange={e => setMgmtIp(e.target.value)} placeholder="IP-Adresse" />
                            <Input type="text" value={mgmtMask} onChange={e => setMgmtMask(e.target.value)} placeholder="Subnetzmaske" />
                        </div>
                        <Input type="text" value={mgmtDescription} onChange={e => setMgmtDescription(e.target.value)} placeholder="Beschreibung" />
                    </Section>

                    <Section icon={<GitFork size={16} />} title="Routing">
                        <div>
                            <label className="text-xs font-medium text-slate-500 flex items-center gap-1">
                                Default Gateway
                                {isGatewayLive ? (
                                    <span className="text-green-600 font-bold text-[10px] bg-green-100 px-1.5 py-0.5 rounded-full" title="Aus 'show ip route' - sehr zuverlässig">LIVE</span>
                                ) : (
                                    <span className="text-orange-600 font-bold text-[10px] bg-orange-100 px-1.5 py-0.5 rounded-full" title="Aus 'running-config' - bitte prüfen">CONFIG</span>
                                )}
                            </label>
                            <Input type="text" value={defaultGateway} onChange={e => setDefaultGateway(e.target.value)} placeholder="Default Gateway" />
                        </div>
                    </Section>

                    <Section icon={<Clock size={16} />} title="Services">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                            <Select value={spanningTreeMode} onChange={e => setSpanningTreeMode(e.target.value)}>
                                <option value="rapid-pvst">Spanning-Tree: rapid-pvst</option>
                                <option value="pvst">Spanning-Tree: pvst</option>
                                <option value="mst">Spanning-Tree: mst</option>
                            </Select>
                            <label className="flex items-center gap-2 text-sm text-slate-700">
                                <input type="checkbox" checked={passwordEncryption} onChange={e => setPasswordEncryption(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                Password-Encryption
                            </label>
                        </div>
                        <Input type="text" value={ntpServers} onChange={e => setNtpServers(e.target.value)} placeholder="NTP-Server (kommagetrennt)" />
                    </Section>
                </div>

                {/* --- PREVIEW --- */}
                <div className="relative bg-slate-900 rounded-xl shadow-lg border border-slate-800 flex flex-col h-[1000px]">
                    <div className="bg-slate-800 p-3 border-b border-slate-700 flex justify-between items-center text-slate-200 font-mono text-sm">
                        <div className="flex items-center gap-2">
                            <Settings size={16} />
                            <span>global-config.ios</span>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={copyToClipboard} className="p-1.5 hover:bg-slate-700 rounded text-slate-300 transition" title="Copy"><Copy size={16} /></button>
                            <button onClick={downloadFile} className="p-1.5 hover:bg-slate-700 rounded text-slate-300 transition" title="Save"><Download size={16} /></button>
                        </div>
                    </div>
                    <textarea
                        readOnly
                        value={generatedConfig}
                        className="flex-1 bg-slate-900 text-green-400 font-mono text-xs p-4 resize-none focus:outline-none leading-relaxed"
                    />
                </div>
            </div>
        </main>
    );
}