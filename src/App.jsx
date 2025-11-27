import React, { useState, useEffect, useMemo } from 'react';
import { Save, Upload, Copy, Server, Layers, Shield, Activity, Terminal, Phone, CheckSquare, Square, Edit3, X } from 'lucide-react';

export default function CiscoConfigGenerator() {
  // --- State ---
  const [switchModel, setSwitchModel] = useState(48); // 8, 24, 48
  const [stackSize, setStackSize] = useState(1);
  const [portNaming, setPortNaming] = useState('stack'); // 'simple' (Gi0/1) or 'stack' (Gi1/0/1)
  const [baseInterfaceType, setBaseInterfaceType] = useState('GigabitEthernet');
  const [globalVoiceVlan, setGlobalVoiceVlan] = useState(''); 

  // Port Data Structure
  const [ports, setPorts] = useState([]);
  const [generatedConfig, setGeneratedConfig] = useState('');

  // Bulk Edit State
  const [selectedPortIds, setSelectedPortIds] = useState(new Set());
  const [bulkMode, setBulkMode] = useState('');
  const [bulkAccessVlan, setBulkAccessVlan] = useState('');
  const [bulkVoiceVlan, setBulkVoiceVlan] = useState('');
  const [bulkTrunkVlans, setBulkTrunkVlans] = useState('');
  const [bulkPortfast, setBulkPortfast] = useState('no_change'); // no_change, on, off
  const [bulkSecurity, setBulkSecurity] = useState('no_change'); // no_change, on, off

  // --- Initialization & Updates ---

  useEffect(() => {
    generatePortList();
  }, [switchModel, stackSize, portNaming, baseInterfaceType]);

  useEffect(() => {
    const config = generateCiscoConfig();
    setGeneratedConfig(config);
  }, [ports]);

  const generatePortList = () => {
    let newPorts = [];
    const currentPortsMap = new Map(ports.map(p => [p.id, p]));

    for (let stackMember = 1; stackMember <= stackSize; stackMember++) {
      for (let portNum = 1; portNum <= switchModel; portNum++) {
        let portId = '';
        let interfaceName = '';

        if (portNaming === 'simple') {
          portId = `0/${portNum}`;
          interfaceName = `${baseInterfaceType}0/${portNum}`;
          if (stackSize > 1) {
             portId = `${stackMember}/0/${portNum}`;
             interfaceName = `${baseInterfaceType}${stackMember}/0/${portNum}`;
          }
        } else {
          // Stack notation: Gi1/0/1
          portId = `${stackMember}/0/${portNum}`;
          interfaceName = `${baseInterfaceType}${stackMember}/0/${portNum}`;
        }

        if (currentPortsMap.has(portId)) {
          newPorts.push(currentPortsMap.get(portId));
        } else {
          newPorts.push({
            id: portId,
            name: interfaceName,
            description: '',
            mode: 'access', 
            accessVlan: '', 
            trunkVlans: 'all',
            nativeVlan: 1,
            portfast: false,
            portSecurity: false,
            voiceVlan: ''
          });
        }
      }
    }
    setPorts(newPorts);
  };

  // --- Parsing Logic (Import) ---

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      parseRunningConfig(event.target.result);
    };
    reader.readAsText(file);
  };

  const parseRunningConfig = (text) => {
    const lines = text.split('\n');
    let currentInterface = null;
    let newPortsMap = new Map();

    const interfaceRegex = /^(?:interface)\s+(GigabitEthernet|FastEthernet|TenGigabitEthernet|Gi|Fa|Te)([0-9\/\.]+)/i;
    
    let detectedNaming = 'simple';
    let detectedStackSize = 1;
    let detectedMaxPort = 0;
    let detectedVoiceVlan = ''; 

    // Pre-scan for global voice vlan
    const voiceVlanCounts = {};
    lines.forEach(line => {
      if (line.trim().includes('switchport voice vlan')) {
        const vlan = line.trim().split('vlan ')[1];
        voiceVlanCounts[vlan] = (voiceVlanCounts[vlan] || 0) + 1;
      }
    });
    let maxCount = 0;
    Object.entries(voiceVlanCounts).forEach(([vlan, count]) => {
      if (count > maxCount) {
        maxCount = count;
        detectedVoiceVlan = vlan;
      }
    });
    if (detectedVoiceVlan) setGlobalVoiceVlan(detectedVoiceVlan);

    lines.forEach(line => {
      const trimmed = line.trim();
      const match = trimmed.match(interfaceRegex);
      if (match) {
        if (currentInterface) newPortsMap.set(currentInterface.id, currentInterface);

        const fullType = match[1]; 
        const numbering = match[2]; 
        const parts = numbering.split('/');
        let id = numbering;
        
        if (parts.length === 3) {
            detectedNaming = 'stack';
            detectedStackSize = Math.max(detectedStackSize, parseInt(parts[0]));
            detectedMaxPort = Math.max(detectedMaxPort, parseInt(parts[2]));
        } else if (parts.length === 2) {
            detectedNaming = 'simple';
            detectedMaxPort = Math.max(detectedMaxPort, parseInt(parts[1]));
        }

        currentInterface = {
          id: id,
          name: `${fullType}${numbering}`,
          description: '',
          mode: 'access',
          accessVlan: '', 
          trunkVlans: '',
          nativeVlan: 1,
          portfast: false,
          portSecurity: false,
          voiceVlan: ''
        };
      } 
      else if (currentInterface) {
        if (trimmed.startsWith('description')) currentInterface.description = trimmed.replace('description ', '');
        else if (trimmed.includes('switchport mode trunk')) currentInterface.mode = 'trunk';
        else if (trimmed.includes('switchport access vlan')) currentInterface.accessVlan = trimmed.split('vlan ')[1];
        else if (trimmed.includes('switchport trunk allowed vlan')) currentInterface.trunkVlans = trimmed.replace('switchport trunk allowed vlan ', '');
        else if (trimmed.includes('switchport trunk native vlan')) currentInterface.nativeVlan = trimmed.split('vlan ')[1];
        else if (trimmed.includes('spanning-tree portfast')) currentInterface.portfast = true;
        else if (trimmed.includes('switchport port-security')) currentInterface.portSecurity = true;
        else if (trimmed.includes('switchport voice vlan')) currentInterface.voiceVlan = trimmed.split('vlan ')[1];
      }
    });
    if (currentInterface) newPortsMap.set(currentInterface.id, currentInterface);

    let bestFitModel = 48;
    if (detectedMaxPort <= 8) bestFitModel = 8;
    else if (detectedMaxPort <= 12) bestFitModel = 12;
    else if (detectedMaxPort <= 24) bestFitModel = 24;
    else bestFitModel = 48;

    setPortNaming(detectedNaming);
    setStackSize(detectedStackSize);
    setSwitchModel(bestFitModel);
    
    let mergedPorts = [];
    for (let s = 1; s <= detectedStackSize; s++) {
      for (let p = 1; p <= bestFitModel; p++) {
        let genId = detectedNaming === 'simple' ? `0/${p}` : `${s}/0/${p}`;
        if (detectedNaming === 'simple' && detectedStackSize > 1) genId = `${s}/0/${p}`;
        const parsed = newPortsMap.get(genId);
        mergedPorts.push(parsed || {
            id: genId,
            name: `${baseInterfaceType}${genId}`,
            description: '',
            mode: 'access',
            accessVlan: '',
            trunkVlans: 'all',
            nativeVlan: 1,
            portfast: false,
            portSecurity: false,
            voiceVlan: ''
        });
      }
    }
    setPorts(mergedPorts);
  };

  // --- Generator Logic ---

  const generateCiscoConfig = () => {
    let output = "! Generated Switchport Config\n";
    ports.forEach(port => {
      output += `interface ${port.name}\n`;
      if (port.description) output += ` description ${port.description}\n`;
      if (port.mode === 'access') {
        output += ` switchport mode access\n`;
        if (port.accessVlan) output += ` switchport access vlan ${port.accessVlan}\n`;
        if (port.voiceVlan) output += ` switchport voice vlan ${port.voiceVlan}\n`;
        if (port.portSecurity) output += ` switchport port-security\n switchport port-security maximum 2\n switchport port-security violation restrict\n switchport port-security aging time 2\n`;
      } else if (port.mode === 'trunk') {
        output += ` switchport mode trunk\n`;
        if (port.trunkVlans && port.trunkVlans !== 'all') output += ` switchport trunk allowed vlan ${port.trunkVlans}\n`;
        if (port.nativeVlan && port.nativeVlan != 1) output += ` switchport trunk native vlan ${port.nativeVlan}\n`;
      }
      if (port.portfast) output += ` spanning-tree portfast edge\n`; 
      output += ` no shutdown\n`; 
      output += ` exit\n`; 
    });
    output += "end\nwr mem\n";
    return output;
  };

  // --- Handlers ---
  
  const updatePort = (id, field, value) => {
    setPorts(ports.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const toggleVoiceVlan = (id, currentVal) => {
    const newVal = currentVal ? '' : (globalVoiceVlan || '1');
    updatePort(id, 'voiceVlan', newVal);
  };

  // --- Selection & Bulk Handlers ---

  const toggleSelection = (id) => {
    const newSet = new Set(selectedPortIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedPortIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedPortIds.size === ports.length) {
      setSelectedPortIds(new Set());
    } else {
      setSelectedPortIds(new Set(ports.map(p => p.id)));
    }
  };

  const applyBulkEdit = () => {
    setPorts(ports.map(p => {
        if (!selectedPortIds.has(p.id)) return p;

        let newPort = { ...p };
        
        if (bulkMode) newPort.mode = bulkMode;
        if (bulkAccessVlan) newPort.accessVlan = bulkAccessVlan;
        if (bulkTrunkVlans && (newPort.mode === 'trunk')) newPort.trunkVlans = bulkTrunkVlans;
        
        if (bulkVoiceVlan === 'enable') newPort.voiceVlan = globalVoiceVlan || '1';
        if (bulkVoiceVlan === 'disable') newPort.voiceVlan = '';
        
        if (bulkPortfast === 'on') newPort.portfast = true;
        if (bulkPortfast === 'off') newPort.portfast = false;

        if (bulkSecurity === 'on') newPort.portSecurity = true;
        if (bulkSecurity === 'off') newPort.portSecurity = false;

        return newPort;
    }));
  };

  const copyToClipboard = () => {
    const el = document.createElement('textarea');
    el.value = generatedConfig;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    alert("Konfiguration in die Zwischenablage kopiert!");
  };

  const downloadFile = () => {
    const element = document.createElement("a");
    const file = new Blob([generatedConfig], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = "switch_config.txt";
    document.body.appendChild(element);
    element.click();
  };

  const selectedCount = selectedPortIds.size;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-32">
      
      {/* HEADER */}
      <header className="bg-blue-900 text-white p-4 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Server className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Cisco Switchport Gen</h1>
              <p className="text-blue-200 text-xs">Config Generator & Visualizer</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-blue-800 p-2 rounded-lg border border-blue-700">
             <label className="flex items-center gap-2 cursor-pointer hover:bg-blue-700 px-3 py-1 rounded transition">
                <Upload size={18} />
                <span className="text-sm font-medium">Upload Running-Config</span>
                <input type="file" accept=".txt,.cfg,.log" className="hidden" onChange={handleFileUpload} />
             </label>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-8">
        {/* CONTROLS */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ports pro Switch</label>
            <select className="w-full p-2 border border-slate-300 rounded-md bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" value={switchModel} onChange={(e) => setSwitchModel(parseInt(e.target.value))}>
              <option value={8}>8 Ports (Compact)</option>
              <option value={12}>12 Ports</option>
              <option value={24}>24 Ports</option>
              <option value={48}>48 Ports (Standard)</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Stack Member Count</label>
            <select className="w-full p-2 border border-slate-300 rounded-md bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" value={stackSize} onChange={(e) => setStackSize(parseInt(e.target.value))}>
              <option value={1}>Standalone (1 Unit)</option>
              <option value={2}>2 Units</option>
              <option value={3}>3 Units</option>
              <option value={4}>4 Units</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Interface Naming</label>
            <select className="w-full p-2 border border-slate-300 rounded-md bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" value={portNaming} onChange={(e) => setPortNaming(e.target.value)}>
              <option value="simple">Simple (Gi0/X)</option>
              <option value="stack">Stack (Gi1/0/X)</option>
            </select>
          </div>
          <div className="space-y-2">
             <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Base Type</label>
             <select className="w-full p-2 border border-slate-300 rounded-md bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" value={baseInterfaceType} onChange={(e) => setBaseInterfaceType(e.target.value)}>
               <option value="GigabitEthernet">GigabitEthernet</option>
               <option value="FastEthernet">FastEthernet</option>
               <option value="TenGigabitEthernet">TenGigabitEthernet</option>
             </select>
          </div>
          <div className="space-y-2">
             <label className="text-xs font-semibold text-blue-600 uppercase tracking-wider flex items-center gap-1">
                 <Phone size={12}/> Global Voice VLAN
             </label>
             <input type="text" className="w-full p-2 border border-blue-200 rounded-md bg-blue-50 focus:ring-2 focus:ring-blue-500 outline-none text-blue-900 font-bold placeholder-blue-300" placeholder="e.g. 40" value={globalVoiceVlan} onChange={(e) => setGlobalVoiceVlan(e.target.value)}/>
          </div>
        </div>

        {/* VISUALIZER */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center gap-2">
                <Layers size={16} className="text-slate-500"/>
                <span className="text-sm font-semibold text-slate-600">Switch Visualizer</span>
            </div>
            <div className="p-6 overflow-x-auto">
                {Array.from({ length: stackSize }).map((_, stackIndex) => (
                    <div key={stackIndex} className="mb-6 last:mb-0">
                        {stackSize > 1 && <div className="text-xs font-bold text-slate-400 mb-1">Switch {stackIndex + 1}</div>}
                        <div className="bg-slate-800 p-3 rounded-lg border-4 border-slate-700 shadow-inner inline-flex flex-col gap-2 min-w-max">
                            {/* Top Row: Odd Ports */}
                            <div className="flex gap-2">
                                {Array.from({ length: switchModel / 2 }).map((_, i) => {
                                    const portNum = (i * 2) + 1;
                                    const targetId = portNaming === 'simple' && stackSize === 1 
                                        ? `0/${portNum}` 
                                        : `${stackIndex + 1}/0/${portNum}`;
                                    const portData = ports.find(p => p.id === targetId);
                                    const isSelected = selectedPortIds.has(targetId);
                                    const isTrunk = portData?.mode === 'trunk';
                                    const isActive = portData?.accessVlan || portData?.description;
                                    const hasVoice = !!portData?.voiceVlan;

                                    return (
                                        <div key={portNum} className="group relative" onClick={() => toggleSelection(targetId)}>
                                            <div className={`w-8 h-6 rounded-sm border-t-2 ${isSelected ? 'ring-2 ring-yellow-400 ring-offset-1 ring-offset-slate-800' : ''} ${isTrunk ? 'bg-orange-500 border-orange-300' : isActive ? 'bg-green-500 border-green-300' : 'bg-slate-600 border-slate-500'} shadow-md transition-all hover:brightness-110 cursor-pointer relative`}>
                                                {hasVoice && <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-purple-400 rounded-full border border-slate-800"></div>}
                                            </div>
                                            <div className="text-[9px] text-slate-400 text-center font-mono mt-0.5">{portNum}</div>
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 bg-black text-white text-xs rounded p-2 z-10 pointer-events-none">
                                                <div className="font-bold">{portData?.name}</div>
                                                <div>Mode: {portData?.mode}</div>
                                                {portData?.mode === 'access' && <div>VLAN: {portData?.accessVlan || '1'}</div>}
                                                {portData?.voiceVlan && <div className="text-purple-300">Voice: {portData.voiceVlan}</div>}
                                                <div className="text-slate-400 mt-1">Click to select</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {/* Bottom Row: Even Ports */}
                            <div className="flex gap-2">
                                {Array.from({ length: switchModel / 2 }).map((_, i) => {
                                    const portNum = (i * 2) + 2;
                                    const targetId = portNaming === 'simple' && stackSize === 1 
                                        ? `0/${portNum}` 
                                        : `${stackIndex + 1}/0/${portNum}`;
                                    const portData = ports.find(p => p.id === targetId);
                                    const isSelected = selectedPortIds.has(targetId);
                                    const isTrunk = portData?.mode === 'trunk';
                                    const isActive = portData?.accessVlan || portData?.description;
                                    const hasVoice = !!portData?.voiceVlan;

                                    return (
                                        <div key={portNum} className="group relative" onClick={() => toggleSelection(targetId)}>
                                            <div className="text-[9px] text-slate-400 text-center font-mono mb-0.5">{portNum}</div>
                                            <div className={`w-8 h-6 rounded-sm border-b-2 ${isSelected ? 'ring-2 ring-yellow-400 ring-offset-1 ring-offset-slate-800' : ''} ${isTrunk ? 'bg-orange-500 border-orange-300' : isActive ? 'bg-green-500 border-green-300' : 'bg-slate-600 border-slate-500'} shadow-md transition-all hover:brightness-110 cursor-pointer relative`}>
                                                {hasVoice && <div className="absolute -top-1 -right-1 w-2 h-2 bg-purple-400 rounded-full border border-slate-800"></div>}
                                            </div>
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 hidden group-hover:block w-48 bg-black text-white text-xs rounded p-2 z-10 pointer-events-none">
                                                <div className="font-bold">{portData?.name}</div>
                                                <div>Mode: {portData?.mode}</div>
                                                {portData?.mode === 'access' && <div>VLAN: {portData?.accessVlan || '1'}</div>}
                                                {portData?.voiceVlan && <div className="text-purple-300">Voice: {portData.voiceVlan}</div>}
                                                <div className="text-slate-400 mt-1">Click to select</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* EDITOR & PREVIEW SPLIT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* LEFT: CONFIG TABLE */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[800px] relative">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <h2 className="font-semibold text-slate-700 flex items-center gap-2">
                        <Activity size={18} />
                        Port Configuration
                    </h2>
                    <span className="text-xs text-slate-400">Total Ports: {ports.length}</span>
                </div>

                {/* BULK EDIT TOOLBAR (TOP) */}
                {selectedCount > 0 && (
                    <div className="bg-blue-900 text-white p-3 shadow-md flex flex-wrap items-center gap-4 z-20 border-b border-blue-800 animate-in slide-in-from-top-2">
                        <div className="flex items-center gap-2 border-r border-blue-700 pr-4">
                            <span className="bg-blue-600 text-xs font-bold px-2 py-1 rounded-full">{selectedCount}</span>
                            <span className="text-sm font-semibold whitespace-nowrap">Selected</span>
                            <button onClick={() => setSelectedPortIds(new Set())} className="text-blue-300 hover:text-white"><X size={14}/></button>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 flex-1">
                            <select className="bg-blue-800 border-blue-700 rounded text-xs p-1.5 focus:ring-1 focus:ring-blue-400" value={bulkMode} onChange={(e) => setBulkMode(e.target.value)}>
                                <option value="">No Change (Mode)</option>
                                <option value="access">Set Access</option>
                                <option value="trunk">Set Trunk</option>
                            </select>

                            <input type="text" placeholder="Access VLAN..." className="bg-blue-800 border-blue-700 rounded text-xs p-1.5 w-24 placeholder-blue-400 focus:ring-1 focus:ring-blue-400" value={bulkAccessVlan} onChange={(e) => setBulkAccessVlan(e.target.value)}/>

                            <select className="bg-blue-800 border-blue-700 rounded text-xs p-1.5 focus:ring-1 focus:ring-blue-400" value={bulkVoiceVlan} onChange={(e) => setBulkVoiceVlan(e.target.value)}>
                                <option value="">No Change (Voice)</option>
                                <option value="enable">Enable Global Voice</option>
                                <option value="disable">Disable Voice</option>
                            </select>

                            <select className="bg-blue-800 border-blue-700 rounded text-xs p-1.5 focus:ring-1 focus:ring-blue-400" value={bulkPortfast} onChange={(e) => setBulkPortfast(e.target.value)}>
                                <option value="no_change">No Change (Fast)</option>
                                <option value="on">Enable PortFast</option>
                                <option value="off">Disable PortFast</option>
                            </select>
                        </div>

                        <button onClick={applyBulkEdit} className="bg-green-600 hover:bg-green-500 text-white text-xs font-bold py-1.5 px-4 rounded transition shadow-lg flex items-center gap-2">
                            <Edit3 size={14} /> Apply
                        </button>
                    </div>
                )}
                
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="p-3 w-10 text-center bg-slate-100">
                                    <input 
                                        type="checkbox" 
                                        className="w-4 h-4 rounded border-gray-300" 
                                        checked={selectedPortIds.size === ports.length && ports.length > 0}
                                        onChange={toggleSelectAll}
                                    />
                                </th>
                                <th className="p-3 font-medium w-24 bg-slate-50">Port</th>
                                <th className="p-3 font-medium w-48 bg-slate-50">Description</th>
                                <th className="p-3 font-medium w-32 bg-slate-50">Mode</th>
                                <th className="p-3 font-medium w-24 bg-slate-50">VLAN</th>
                                <th className="p-3 font-medium w-24 text-center bg-slate-50" title="PortFast">Fast</th>
                                <th className="p-3 font-medium w-24 text-center bg-slate-50" title="Port Security">Sec</th>
                                <th className="p-3 font-medium bg-slate-50">Extra (Voice/Native)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {ports.map((port) => (
                                <tr key={port.id} className={`${selectedPortIds.has(port.id) ? 'bg-yellow-50 hover:bg-yellow-100' : 'hover:bg-blue-50'} transition-colors group`}>
                                    <td className="p-3 text-center">
                                        <input 
                                            type="checkbox" 
                                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                                            checked={selectedPortIds.has(port.id)}
                                            onChange={() => toggleSelection(port.id)}
                                        />
                                    </td>
                                    <td className="p-3 font-mono text-xs font-bold text-slate-600">{port.name}</td>
                                    <td className="p-3">
                                        <input 
                                            type="text" 
                                            placeholder="Description..." 
                                            className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none transition-colors text-slate-700"
                                            value={port.description}
                                            onChange={(e) => updatePort(port.id, 'description', e.target.value)}
                                        />
                                    </td>
                                    <td className="p-3">
                                        <select 
                                            className="w-full bg-slate-100 border-none rounded py-1 px-2 text-xs font-medium text-slate-700 cursor-pointer hover:bg-slate-200"
                                            value={port.mode}
                                            onChange={(e) => updatePort(port.id, 'mode', e.target.value)}
                                        >
                                            <option value="access">Access</option>
                                            <option value="trunk">Trunk</option>
                                        </select>
                                    </td>
                                    <td className="p-3">
                                        {port.mode === 'access' ? (
                                            <input 
                                                type="text" 
                                                placeholder="1"
                                                className="w-full p-1 border border-slate-200 rounded text-center"
                                                value={port.accessVlan}
                                                onChange={(e) => updatePort(port.id, 'accessVlan', e.target.value)}
                                            />
                                        ) : (
                                            <input 
                                                type="text" 
                                                placeholder="All"
                                                className="w-full p-1 border border-slate-200 rounded text-xs"
                                                value={port.trunkVlans}
                                                onChange={(e) => updatePort(port.id, 'trunkVlans', e.target.value)}
                                            />
                                        )}
                                    </td>
                                    <td className="p-3 text-center">
                                        <input type="checkbox" className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300" checked={port.portfast} onChange={(e) => updatePort(port.id, 'portfast', e.target.checked)}/>
                                    </td>
                                    <td className="p-3 text-center">
                                         {port.mode === 'access' && (
                                            <input type="checkbox" className="w-4 h-4 text-red-600 rounded focus:ring-red-500 border-gray-300" checked={port.portSecurity} onChange={(e) => updatePort(port.id, 'portSecurity', e.target.checked)}/>
                                         )}
                                    </td>
                                    <td className="p-3">
                                        {port.mode === 'access' ? (
                                            <div className="flex items-center gap-2">
                                                <input type="checkbox" className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 border-gray-300" title="Enable Voice VLAN" checked={!!port.voiceVlan} onChange={() => toggleVoiceVlan(port.id, port.voiceVlan)}/>
                                                {port.voiceVlan ? (
                                                     <input type="text" className="w-10 p-1 text-xs border border-purple-200 bg-purple-50 rounded text-center text-purple-700 font-medium" value={port.voiceVlan} onChange={(e) => updatePort(port.id, 'voiceVlan', e.target.value)}/>
                                                ) : (
                                                    <span className="text-[10px] text-slate-300 italic">No Voice</span>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1">
                                                <span className="text-[10px] text-slate-400">Native:</span>
                                                <input type="text" className="w-12 p-1 text-xs border border-slate-200 rounded" value={port.nativeVlan} onChange={(e) => updatePort(port.id, 'nativeVlan', e.target.value)}/>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* RIGHT: LIVE PREVIEW */}
            <div className="lg:col-span-1 flex flex-col h-[800px] gap-4">
                <div className="bg-slate-900 rounded-xl shadow-lg border border-slate-800 flex flex-col flex-1 overflow-hidden">
                    <div className="bg-slate-800 p-3 border-b border-slate-700 flex justify-between items-center">
                        <div className="flex items-center gap-2 text-slate-200 font-mono text-sm">
                            <Terminal size={16} />
                            <span>config-preview.ios</span>
                        </div>
                        <div className="flex gap-2">
                             <button onClick={copyToClipboard} className="p-1.5 hover:bg-slate-700 rounded text-slate-300 transition" title="Copy">
                                <Copy size={16} />
                             </button>
                             <button onClick={downloadFile} className="p-1.5 hover:bg-slate-700 rounded text-slate-300 transition" title="Save as File">
                                <Save size={16} />
                             </button>
                        </div>
                    </div>
                    <textarea 
                        className="flex-1 bg-slate-900 text-green-400 font-mono text-xs p-4 resize-none focus:outline-none leading-relaxed"
                        readOnly
                        value={generatedConfig}
                    />
                </div>

                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
                    <h3 className="text-blue-800 font-bold mb-2 text-sm flex items-center gap-2">
                        <Shield size={14}/> 
                        Massenbearbeitung (Bulk Edit)
                    </h3>
                    <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                        <li>Klicke auf die Checkboxen links in der Tabelle, um Ports auszuwählen.</li>
                        <li>Du kannst auch direkt oben in der Switch-Grafik auf einen Port klicken, um ihn zu selektieren (er wird gelb umrandet).</li>
                        <li>Die blaue Leiste oben erscheint automatisch, sobald du Ports ausgewählt hast.</li>
                    </ul>
                </div>
            </div>
        </div>
      </main>
    </div>
  );
}