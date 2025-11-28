import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Save, Upload, Copy, Server, Layers, Shield, Activity, Terminal, Phone, Edit3, X, Power, Filter, Lock, CheckSquare, PlusCircle, AlertCircle, Info } from 'lucide-react';

export default function CiscoConfigGenerator() {
  // --- State ---
  const [switchModel, setSwitchModel] = useState(48); 
  const [uplinkCount, setUplinkCount] = useState(4); 
  const [stackSize, setStackSize] = useState(1);
  const [portNaming, setPortNaming] = useState('stack'); 
  const [baseInterfaceType, setBaseInterfaceType] = useState('GigabitEthernet');
  const [uplinkInterfaceType, setUplinkInterfaceType] = useState('TenGigabitEthernet'); 
  const [globalVoiceVlan, setGlobalVoiceVlan] = useState(''); 
  const [hostname, setHostname] = useState(''); 
  const [iosVersion, setIosVersion] = useState('');
  
  // Generator Options
  const [includeWrMem, setIncludeWrMem] = useState(true); 
  const [useModernPortfast, setUseModernPortfast] = useState(true); 
  const [includeNoShutdown, setIncludeNoShutdown] = useState(true); 

  // Port Data Structure
  const [ports, setPorts] = useState([]);
  
  // Detected VLANs from Upload (Static after upload)
  const [detectedVlans, setDetectedVlans] = useState([]);

  // Toast Notification State
  const [toast, setToast] = useState({ show: false, message: '' });

  // Bulk Edit State
  const [selectedPortIds, setSelectedPortIds] = useState(new Set());
  const [lastSelectedId, setLastSelectedId] = useState(null);

  // Refs for Scrolling
  const tableRefs = useRef({});

  // Standard Bulk
  const [bulkMode, setBulkMode] = useState('');
  const [bulkAccessVlan, setBulkAccessVlan] = useState('');
  const [bulkVoiceVlan, setBulkVoiceVlan] = useState('');
  const [bulkTrunkVlans, setBulkTrunkVlans] = useState('');
  const [bulkPortfast, setBulkPortfast] = useState('no_change'); 
  const [bulkInclude, setBulkInclude] = useState('no_change'); 
  const [bulkNoShut, setBulkNoShut] = useState('no_change');

  // Security Bulk
  const [bulkSecurity, setBulkSecurity] = useState('no_change'); 
  const [bulkSecMax, setBulkSecMax] = useState('');
  const [bulkSecViolation, setBulkSecViolation] = useState('');
  const [bulkSecSticky, setBulkSecSticky] = useState('no_change');
  const [bulkSecAgingTime, setBulkSecAgingTime] = useState('');
  const [bulkSecAgingType, setBulkSecAgingType] = useState('');

  // UI Toggles
  const [showSecurityOptions, setShowSecurityOptions] = useState(false);

  // --- Regex Validators ---
  const isNumeric = (val) => /^\d*$/.test(val);
  const isVlanRange = (val) => /^[0-9,\-\s]*$/.test(val);

  // --- Initialization & Updates ---

  useEffect(() => {
    generatePortList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [switchModel, uplinkCount, stackSize, portNaming, baseInterfaceType, uplinkInterfaceType]);

  const generatePortList = useCallback(() => {
    setPorts(currentPorts => {
        const currentPortsMap = new Map(currentPorts.map(p => [p.id, p]));
        let newPorts = [];

        for (let stackMember = 1; stackMember <= stackSize; stackMember++) {
            for (let portNum = 1; portNum <= switchModel; portNum++) {
                newPorts.push(createPortObject(currentPortsMap, stackMember, portNum, false));
            }
            for (let u = 1; u <= uplinkCount; u++) {
                const portNum = switchModel + u;
                newPorts.push(createPortObject(currentPortsMap, stackMember, portNum, true));
            }
        }
        return newPorts;
    });
  }, [switchModel, uplinkCount, stackSize, portNaming, baseInterfaceType, uplinkInterfaceType]);

  const createPortObject = (existingMap, stackMember, portNum, isUplink) => {
    let portId = '';
    let interfaceName = '';
    const type = isUplink ? uplinkInterfaceType : baseInterfaceType;
    
    if (portNaming === 'simple') {
        portId = `0/${portNum}`;
        interfaceName = `${type}0/${portNum}`;
        if (stackSize > 1) { 
            portId = `${stackMember}/0/${portNum}`;
            interfaceName = `${type}${stackMember}/0/${portNum}`;
        }
    } else {
        portId = `${stackMember}/0/${portNum}`;
        interfaceName = `${type}${stackMember}/0/${portNum}`;
    }

    if (existingMap.has(portId)) {
        const existing = existingMap.get(portId);
        return { ...existing, name: interfaceName, isUplink }; 
    } else {
        return {
            id: portId,
            name: interfaceName,
            description: isUplink ? 'Uplink' : '',
            mode: isUplink ? 'trunk' : 'access', 
            accessVlan: '', 
            trunkVlans: 'all',
            nativeVlan: 1,
            portfast: !isUplink, 
            voiceVlan: '',
            includeInConfig: !isUplink, 
            isUplink: isUplink,
            noShutdown: true,
            portSecurity: false,
            secMax: 1,
            secViolation: 'shutdown', 
            secSticky: false,
            secAgingTime: 0, 
            secAgingType: 'inactivity'
        };
    }
  };

  // --- Dynamic VLAN List ---
  const availableVlans = useMemo(() => {
      const activeOnPorts = new Set();
      const allVlans = new Set(detectedVlans);
      ports.forEach(p => {
          if (p.mode === 'access' && p.accessVlan) {
              activeOnPorts.add(p.accessVlan);
              allVlans.add(p.accessVlan); 
          }
      });
      return Array.from(allVlans).sort((a, b) => parseInt(a) - parseInt(b)).map(vlan => {
          const isDetected = detectedVlans.includes(vlan);
          const isUsed = activeOnPorts.has(vlan);
          let status = 'manual'; 
          if (isDetected && isUsed) status = 'used';
          else if (isDetected && !isUsed) status = 'unused'; 
          return { id: vlan, status };
      });
  }, [detectedVlans, ports]);

  // --- Parsing Logic (Import) ---

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => parseRunningConfig(event.target.result);
    reader.readAsText(file);
    e.target.value = null; 
  };

  const parseRunningConfig = (text) => {
    const hostnameMatch = text.match(/^hostname\s+([^\s]+)/m);
    if (hostnameMatch) setHostname(hostnameMatch[1]);
    else setHostname('');

    const versionMatch = text.match(/^version\s+(\d+\.?\d*)/m);
    if (versionMatch) {
        setIosVersion(versionMatch[1]);
        if (parseFloat(versionMatch[1]) < 15.0) {
             setUseModernPortfast(false);
        } else {
             setUseModernPortfast(true);
        }
    } else {
        setIosVersion('');
    }

    let detectedModern = true;
    if (text.includes('spanning-tree portfast edge')) detectedModern = true;
    else if (text.includes('spanning-tree portfast')) detectedModern = false;
    setUseModernPortfast(detectedModern);

    const lines = text.split('\n');
    let newPortsMap = new Map();
    const interfaceRegex = /^(?:interface)\s+([a-zA-Z]+)([0-9\/\.]+)/i;
    let detectedNaming = 'simple';
    let detectedStackSize = 1;
    let detectedMaxPort = 0;
    const typeCounts = {};
    const voiceVlanCounts = {};
    const foundVlans = new Set();

    lines.forEach(line => {
      const trimmed = line.trim();
      const match = trimmed.match(interfaceRegex);
      if (match) typeCounts[match[1]] = (typeCounts[match[1]] || 0) + 1;
      
      if (trimmed.includes('switchport voice vlan')) {
          const [, vlanPart] = trimmed.split('vlan ');
          const v = vlanPart?.split(/\s+/)[0];
          if(v) { voiceVlanCounts[v] = (voiceVlanCounts[v] || 0) + 1; }
      }
      if (trimmed.includes('switchport access vlan')) {
          const [, vlanPart] = trimmed.split('vlan ');
          const v = vlanPart?.split(/\s+/)[0];
          if(v) foundVlans.add(v);
      }
      const sviMatch = trimmed.match(/^interface Vlan\s?(\d+)/i);
      if (sviMatch) foundVlans.add(sviMatch[1]);
      const l2Match = trimmed.match(/^vlan\s+(\d+)/i);
      if (l2Match) foundVlans.add(l2Match[1]);
    });

    const sortedTypes = Object.entries(typeCounts).sort((a,b) => b[1] - a[1]);
    let detBase = sortedTypes[0]?.[0] || 'GigabitEthernet';
    let detUplink = sortedTypes[1]?.[0] || detBase;

    const expandType = (t) => {
        if(t.startsWith('Gi')) return 'GigabitEthernet';
        if(t.startsWith('Te')) return 'TenGigabitEthernet';
        if(t.startsWith('Fa')) return 'FastEthernet';
        if(t.startsWith('Two')) return 'TwentyFiveGigE';
        if(t.startsWith('Fo')) return 'FortyGigabitEthernet';
        return t;
    };

    setBaseInterfaceType(expandType(detBase));
    setUplinkInterfaceType(expandType(detUplink));

    let maxCount = 0;
    let detectedVoiceVlan = '';
    Object.entries(voiceVlanCounts).forEach(([vlan, count]) => {
      if (count > maxCount) { maxCount = count; detectedVoiceVlan = vlan; }
    });
    if (detectedVoiceVlan) setGlobalVoiceVlan(detectedVoiceVlan);
    setDetectedVlans(Array.from(foundVlans).sort((a,b) => parseInt(a) - parseInt(b)));

    let currentInterface = null;
    
    lines.forEach(line => {
      const trimmed = line.trim();
      const match = trimmed.match(interfaceRegex);
      
      if (match) {
        if (currentInterface) newPortsMap.set(currentInterface.id, currentInterface);
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
          name: `${expandType(match[1])}${numbering}`,
          description: '', mode: 'access', accessVlan: '', trunkVlans: '', nativeVlan: 1,
          portfast: false, voiceVlan: '', includeInConfig: false, isUplink: false,
          noShutdown: true, 
          portSecurity: false, secMax: 1, secViolation: 'shutdown', secSticky: false, secAgingTime: 0, secAgingType: 'inactivity'
        };
      } 
      else if (currentInterface) {
        if (trimmed.startsWith('description')) {
          currentInterface.description = trimmed.replace('description ', '');
          currentInterface.includeInConfig = true;
        }
        else if (trimmed.includes('switchport mode trunk')) { currentInterface.mode = 'trunk'; currentInterface.includeInConfig = true; }
        else if (trimmed.includes('switchport access vlan')) { 
            const [, vlanPart] = trimmed.split('vlan ');
            currentInterface.accessVlan = vlanPart?.split(/\s+/)[0] ?? ''; 
            currentInterface.includeInConfig = true; 
        }
        else if (trimmed.includes('switchport trunk allowed vlan')) { 
            currentInterface.trunkVlans = trimmed.replace('switchport trunk allowed vlan ', '').replace(/^add\s+/, ''); 
            currentInterface.includeInConfig = true; 
        }
        else if (trimmed.includes('spanning-tree portfast')) { currentInterface.portfast = true; currentInterface.includeInConfig = true; }
        else if (trimmed.includes('switchport voice vlan')) { 
            const [, vlanPart] = trimmed.split('vlan ');
            currentInterface.voiceVlan = vlanPart?.split(/\s+/)[0] ?? '';
            currentInterface.includeInConfig = true; 
        }
        else if (trimmed === 'shutdown') {
             currentInterface.noShutdown = false;
        }
        else if (trimmed.includes('switchport port-security')) {
            currentInterface.includeInConfig = true;
            if (trimmed === 'switchport port-security') {
                currentInterface.portSecurity = true;
            } else if (trimmed.includes('maximum')) {
                const parts = trimmed.split('maximum ');
                currentInterface.secMax = parseInt(parts[1]);
            } else if (trimmed.includes('violation')) {
                currentInterface.secViolation = trimmed.split('violation ')[1]?.trim();
            } else if (trimmed.includes('mac-address sticky')) {
                currentInterface.secSticky = true;
            } else if (trimmed.includes('aging time')) {
                currentInterface.secAgingTime = parseInt(trimmed.split('time ')[1]);
            } else if (trimmed.includes('aging type')) {
                currentInterface.secAgingType = trimmed.split('type ')[1]?.trim();
            }
        }
      }
    });
    if (currentInterface) newPortsMap.set(currentInterface.id, currentInterface);

    let bestFitModel = 48;
    let uplinks = 0;
    if (detectedMaxPort <= 10) { bestFitModel = 8; uplinks = Math.max(0, detectedMaxPort - 8); }
    else if (detectedMaxPort <= 14) { bestFitModel = 12; uplinks = Math.max(0, detectedMaxPort - 12); }
    else if (detectedMaxPort <= 18) { bestFitModel = 16; uplinks = Math.max(0, detectedMaxPort - 16); }
    else if (detectedMaxPort <= 28) { bestFitModel = 24; uplinks = Math.max(0, detectedMaxPort - 24); }
    else { bestFitModel = 48; uplinks = Math.max(0, detectedMaxPort - 48); }
    if (uplinks > 0 && uplinks <= 2) uplinks = 2;
    if (uplinks > 2) uplinks = 4;

    setPortNaming(detectedNaming);
    setStackSize(detectedStackSize);
    setSwitchModel(bestFitModel);
    setUplinkCount(uplinks);
    
    rebuildFromMap(detectedNaming, detectedStackSize, bestFitModel, uplinks, newPortsMap, expandType(detBase), expandType(detUplink));
  };

  const rebuildFromMap = (naming, stack, model, upCount, map, baseType, upType) => {
    let mergedPorts = [];
    for (let s = 1; s <= stack; s++) {
      for (let p = 1; p <= model; p++) {
        let genId = naming === 'simple' ? `0/${p}` : `${s}/0/${p}`;
        if (naming === 'simple' && stack > 1) genId = `${s}/0/${p}`;
        const parsed = map.get(genId);
        const name = parsed ? parsed.name : `${baseType}${genId}`;
        
        if (parsed) mergedPorts.push({ ...parsed, name, isUplink: false });
        else mergedPorts.push({
            id: genId, name, description: '', mode: 'access', accessVlan: '', trunkVlans: 'all', nativeVlan: 1, 
            portfast: false, voiceVlan: '', includeInConfig: false, isUplink: false,
            noShutdown: true,
            portSecurity: false, secMax: 1, secViolation: 'shutdown', secSticky: false, secAgingTime: 0, secAgingType: 'inactivity'
        });
      }
      for (let u = 1; u <= upCount; u++) {
        let p = model + u;
        let genId = naming === 'simple' ? `0/${p}` : `${s}/0/${p}`;
        if (naming === 'simple' && stack > 1) genId = `${s}/0/${p}`;
        const parsed = map.get(genId);
        const name = parsed ? parsed.name : `${upType}${genId}`;

        if (parsed) mergedPorts.push({ ...parsed, name, isUplink: true });
        else mergedPorts.push({
            id: genId, name, description: 'Uplink', mode: 'trunk', accessVlan: '', trunkVlans: 'all', nativeVlan: 1, 
            portfast: false, voiceVlan: '', includeInConfig: false, isUplink: true,
            noShutdown: true,
            portSecurity: false, secMax: 1, secViolation: 'shutdown', secSticky: false, secAgingTime: 0, secAgingType: 'inactivity'
        });
      }
    }
    setPorts(mergedPorts);
  };

  // --- Generator Helper for Single Port ---
  const getPortConfigString = (port) => {
    let lines = [];
    lines.push(`interface ${port.name}`);
    if (port.description) lines.push(` description ${port.description}`);
    
    if (port.mode === 'access') {
      lines.push(` switchport mode access`);
      if (port.accessVlan) lines.push(` switchport access vlan ${port.accessVlan}`);
      if (port.voiceVlan) lines.push(` switchport voice vlan ${port.voiceVlan}`);
      
      if (port.portSecurity) {
          lines.push(` switchport port-security`);
          if (port.secMax > 1) lines.push(` switchport port-security maximum ${port.secMax}`);
          if (port.secViolation !== 'shutdown') lines.push(` switchport port-security violation ${port.secViolation}`);
          if (port.secSticky) lines.push(` switchport port-security mac-address sticky`);
          if (port.secAgingTime > 0) {
              lines.push(` switchport port-security aging time ${port.secAgingTime}`);
              lines.push(` switchport port-security aging type ${port.secAgingType}`);
          }
      }
    } else if (port.mode === 'trunk') {
      lines.push(` switchport mode trunk`);
      if (port.trunkVlans && port.trunkVlans !== 'all') lines.push(` switchport trunk allowed vlan ${port.trunkVlans}`);
      if (port.nativeVlan && port.nativeVlan != 1) lines.push(` switchport trunk native vlan ${port.nativeVlan}`);
    }
    
    if (port.portfast) {
        lines.push(useModernPortfast ? ` spanning-tree portfast edge` : ` spanning-tree portfast`);
    }
    
    if (includeNoShutdown) {
        if (port.noShutdown) lines.push(` no shutdown`); 
        else lines.push(` shutdown`);
    } else {
        if (!port.noShutdown) lines.push(` shutdown`);
    }

    lines.push(` exit`);
    return lines.join('\n');
  };

  // --- Generator Logic (Memoized) ---
  const generatedConfig = useMemo(() => {
    let output = "! Generated Switchport Config\n";
    ports.forEach(port => {
      if (!port.includeInConfig) return;
      output += getPortConfigString(port) + "\n";
    });
    
    output += "end\n";
    if (includeWrMem) {
        output += "wr mem\n";
    }
    return output;
  }, [ports, includeWrMem, useModernPortfast, includeNoShutdown]);

  // --- Handlers ---
  
  const updatePort = (id, field, value) => {
    if (['accessVlan', 'voiceVlan', 'nativeVlan'].includes(field)) {
        if (!isNumeric(value)) return;
    }
    if (field === 'trunkVlans') {
        if (!isVlanRange(value)) return;
    }
    setPorts(ports.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const toggleInclude = (id) => {
    setPorts(ports.map(p => p.id === id ? { ...p, includeInConfig: !p.includeInConfig } : p));
  };

  const toggleNoShut = (id) => {
    setPorts(ports.map(p => p.id === id ? { ...p, noShutdown: !p.noShutdown } : p));
  };

  const toggleVoiceVlan = (id, currentVal) => {
    const newVal = currentVal ? '' : (globalVoiceVlan || '1');
    updatePort(id, 'voiceVlan', newVal);
  };

  // --- Scroll & Selection Handlers ---
  
  // Scroll Helper
  const scrollToTablePort = (id) => {
      const el = document.getElementById(`row-${id}`);
      if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('bg-blue-100');
          setTimeout(() => el.classList.remove('bg-blue-100'), 1500);
      }
  };

  const scrollToPreviewPort = (id) => {
      const el = document.getElementById(`preview-config-${id}`);
      if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Highlight logic for preview block
          el.classList.add('bg-slate-700'); 
          setTimeout(() => el.classList.remove('bg-slate-700'), 1500);
      }
  };

  const toggleSelection = (id, e) => {
    const newSet = new Set(selectedPortIds);
    const isShift = e && (e.shiftKey || (e.nativeEvent && e.nativeEvent.shiftKey));
    const isAlt = e && (e.altKey || (e.nativeEvent && e.nativeEvent.altKey));

    // Only scroll to table if ALT is pressed
    if (isAlt && !newSet.has(id)) { 
        scrollToTablePort(id);
    }

    if (isShift && lastSelectedId) {
        const startIdx = ports.findIndex(p => p.id === lastSelectedId);
        const endIdx = ports.findIndex(p => p.id === id);
        if (startIdx !== -1 && endIdx !== -1) {
            const min = Math.min(startIdx, endIdx);
            const max = Math.max(startIdx, endIdx);
            for (let i = min; i <= max; i++) newSet.add(ports[i].id);
        }
    } else {
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setLastSelectedId(id);
    }
    setSelectedPortIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedPortIds.size === ports.length) {
        setSelectedPortIds(new Set());
        setLastSelectedId(null);
    } else {
        setSelectedPortIds(new Set(ports.map(p => p.id)));
    }
  };

  const selectPortsByVlan = (vlanId) => {
    const matchingIds = ports.filter(p => p.accessVlan === vlanId && p.mode === 'access').map(p => p.id);
    setSelectedPortIds(new Set(matchingIds));
    setLastSelectedId(null);
  };

  const applyBulkEdit = () => {
    setPorts(ports.map(p => {
        if (!selectedPortIds.has(p.id)) return p;
        let newPort = { ...p };
        
        if (bulkMode) newPort.mode = bulkMode;
        if (bulkAccessVlan && isNumeric(bulkAccessVlan)) newPort.accessVlan = bulkAccessVlan;
        if (bulkTrunkVlans && (newPort.mode === 'trunk' || bulkMode === 'trunk')) newPort.trunkVlans = bulkTrunkVlans;
        if (bulkVoiceVlan === 'enable') newPort.voiceVlan = globalVoiceVlan || '1';
        if (bulkVoiceVlan === 'disable') newPort.voiceVlan = '';
        if (bulkPortfast === 'on') newPort.portfast = true;
        if (bulkPortfast === 'off') newPort.portfast = false;
        
        if (bulkInclude === 'include') newPort.includeInConfig = true;
        if (bulkInclude === 'exclude') newPort.includeInConfig = false;

        if (bulkNoShut === 'on') newPort.noShutdown = true;
        if (bulkNoShut === 'off') newPort.noShutdown = false;

        // Security Bulk Logic
        if (bulkSecurity === 'on') newPort.portSecurity = true;
        if (bulkSecurity === 'off') newPort.portSecurity = false;
        if (bulkSecMax && isNumeric(bulkSecMax)) newPort.secMax = parseInt(bulkSecMax);
        if (bulkSecViolation) newPort.secViolation = bulkSecViolation;
        if (bulkSecSticky === 'on') newPort.secSticky = true;
        if (bulkSecSticky === 'off') newPort.secSticky = false;
        if (bulkSecAgingTime && isNumeric(bulkSecAgingTime)) newPort.secAgingTime = parseInt(bulkSecAgingTime);
        if (bulkSecAgingType) newPort.secAgingType = bulkSecAgingType;

        return newPort;
    }));
  };

  const copyToClipboard = async () => {
    try {
        await navigator.clipboard.writeText(generatedConfig);
        showToast("Konfiguration in die Zwischenablage kopiert!");
    } catch (err) {
        alert("Fehler beim Kopieren: " + err);
    }
  };

  const downloadFile = () => {
    const blob = new Blob([generatedConfig], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const element = document.createElement("a");
    element.href = url;
    element.download = "switch_config.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(url);
  };

  const showToast = (msg) => {
      setToast({ show: true, message: msg });
      setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

  const selectedCount = selectedPortIds.size;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-32 relative">
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
                className="w-full p-2 border border-blue-200 rounded-md bg-blue-50 focus:ring-2 focus:ring-blue-500 outline-none text-blue-900 font-bold placeholder-blue-300 text-sm" 
                placeholder="e.g. 40" 
                value={globalVoiceVlan} 
                onChange={(e) => isNumeric(e.target.value) && setGlobalVoiceVlan(e.target.value)}
             />
          </div>
        </div>

        {/* VISUALIZER */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Layers size={16} className="text-slate-500"/>
                    <span className="text-sm font-semibold text-slate-600">Switch Visualizer</span>
                </div>
                {(hostname || iosVersion) && (
                    <div className="flex items-center gap-3 text-xs font-mono text-slate-500 bg-white px-3 py-1 rounded border border-slate-200 shadow-sm">
                        {hostname && (
                            <div className="flex items-center gap-1">
                                <span className="font-bold text-slate-400">Host:</span>
                                <span className="text-blue-600 font-bold">{hostname}</span>
                            </div>
                        )}
                        {hostname && iosVersion && <div className="w-px h-3 bg-slate-300"></div>}
                        {iosVersion && (
                            <div className="flex items-center gap-1">
                                <span className="font-bold text-slate-400">Ver:</span>
                                <span className="text-green-600 font-bold">{iosVersion}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
            <div className="p-6 overflow-x-auto">
                {Array.from({ length: stackSize }).map((_, stackIndex) => (
                    <div key={stackIndex} className="mb-6 last:mb-0">
                        {stackSize > 1 && <div className="text-xs font-bold text-slate-400 mb-1">Switch {stackIndex + 1}</div>}
                        <div className="bg-slate-800 p-3 rounded-lg border-4 border-slate-700 shadow-inner inline-flex flex-row items-center gap-4 min-w-max">
                            {/* Main Ports Block */}
                            <div className="flex flex-col gap-2">
                                {/* Top Row: Odd Ports */}
                                <div className="flex gap-2">
                                    {Array.from({ length: switchModel / 2 }).map((_, i) => {
                                        const portNum = (i * 2) + 1;
                                        // Logic to find port in array
                                        const portsPerSwitch = switchModel + uplinkCount;
                                        const baseIndex = stackIndex * portsPerSwitch;
                                        const portIndex = baseIndex + (portNum - 1);
                                        const portData = ports[portIndex];
                                        if(!portData) return null;
                                        
                                        const isSelected = selectedPortIds.has(portData.id);
                                        const isTrunk = portData.mode === 'trunk';
                                        const isActive = portData.accessVlan || portData.description;
                                        const isIncluded = portData.includeInConfig;

                                        return (
                                            <div key={portNum} className="group relative" onClick={(e) => toggleSelection(portData.id, e)}>
                                                <div className={`w-8 h-6 rounded-sm border-t-2 ${!isIncluded ? 'opacity-30' : ''} ${isSelected ? 'ring-2 ring-yellow-400 ring-offset-1 ring-offset-slate-800' : ''} ${isTrunk ? 'bg-orange-500 border-orange-300' : isActive ? 'bg-green-500 border-green-300' : 'bg-slate-600 border-slate-500'} shadow-md transition-all hover:brightness-110 cursor-pointer relative`}>
                                                    {portData.voiceVlan && <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-purple-400 rounded-full border border-slate-800"></div>}
                                                    {portData.portSecurity && <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-red-500 rounded-full border border-slate-800"></div>}
                                                </div>
                                                <div className="text-[9px] text-slate-400 text-center font-mono mt-0.5">{portNum}</div>
                                                {/* Tooltip */}
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 bg-black text-white text-xs rounded p-2 z-10 pointer-events-none">
                                                    <div className="font-bold">{portData.name}</div>
                                                    <div>Mode: {portData.mode}</div>
                                                    {portData.mode === 'access' && <div>VLAN: {portData.accessVlan || '1'}</div>}
                                                    {portData.portSecurity && <div className="text-red-300">Security: On (Max {portData.secMax})</div>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                {/* Bottom Row: Even Ports */}
                                <div className="flex gap-2">
                                    {Array.from({ length: switchModel / 2 }).map((_, i) => {
                                        const portNum = (i * 2) + 2;
                                        const portsPerSwitch = switchModel + uplinkCount;
                                        const baseIndex = stackIndex * portsPerSwitch;
                                        const portIndex = baseIndex + (portNum - 1);
                                        const portData = ports[portIndex];
                                        if(!portData) return null;

                                        const isSelected = selectedPortIds.has(portData.id);
                                        const isTrunk = portData.mode === 'trunk';
                                        const isActive = portData.accessVlan || portData.description;
                                        const isIncluded = portData.includeInConfig;

                                        return (
                                            <div key={portNum} className="group relative" onClick={(e) => toggleSelection(portData.id, e)}>
                                                <div className="text-[9px] text-slate-400 text-center font-mono mb-0.5">{portNum}</div>
                                                <div className={`w-8 h-6 rounded-sm border-b-2 ${!isIncluded ? 'opacity-30' : ''} ${isSelected ? 'ring-2 ring-yellow-400 ring-offset-1 ring-offset-slate-800' : ''} ${isTrunk ? 'bg-orange-500 border-orange-300' : isActive ? 'bg-green-500 border-green-300' : 'bg-slate-600 border-slate-500'} shadow-md transition-all hover:brightness-110 cursor-pointer relative`}>
                                                    {portData.voiceVlan && <div className="absolute -top-1 -right-1 w-2 h-2 bg-purple-400 rounded-full border border-slate-800"></div>}
                                                    {portData.portSecurity && <div className="absolute -top-1 -left-1 w-2 h-2 bg-red-500 rounded-full border border-slate-800"></div>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {uplinkCount > 0 && <div className="w-px h-16 bg-slate-600 mx-1"></div>}

                            {/* Uplink Ports Block */}
                            {uplinkCount > 0 && (
                                <div className="flex gap-2 bg-slate-900 p-2 rounded border border-slate-700">
                                    {Array.from({ length: uplinkCount }).map((_, i) => {
                                        const portNum = switchModel + i + 1;
                                        const portsPerSwitch = switchModel + uplinkCount;
                                        const baseIndex = stackIndex * portsPerSwitch;
                                        const portIndex = baseIndex + (portNum - 1);
                                        const portData = ports[portIndex];

                                        if(!portData) return null;

                                        const isSelected = selectedPortIds.has(portData.id);
                                        const isTrunk = portData.mode === 'trunk';
                                        const isActive = portData.accessVlan || portData.description;
                                        const isIncluded = portData.includeInConfig;

                                        return (
                                            <div key={portNum} className="group relative flex flex-col items-center justify-center" onClick={(e) => toggleSelection(portData.id, e)}>
                                                <div className={`w-6 h-6 rounded-md border-2 ${!isIncluded ? 'opacity-30' : ''} ${isSelected ? 'ring-2 ring-yellow-400 ring-offset-1 ring-offset-slate-800' : ''} ${isTrunk ? 'bg-orange-900 border-orange-500' : isActive ? 'bg-green-900 border-green-500' : 'bg-slate-800 border-slate-500'} shadow-inner cursor-pointer flex items-center justify-center`}>
                                                    <div className="w-2 h-1 bg-black rounded-full opacity-50"></div>
                                                </div>
                                                <div className="text-[8px] text-slate-400 font-mono mt-1">{portNum}</div>
                                                
                                                {/* Tooltip for Uplink */}
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-32 bg-black text-white text-xs rounded p-2 z-10 pointer-events-none">
                                                    <div className="font-bold text-orange-300">SFP/Uplink</div>
                                                    <div>{portData.name}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* EDITOR & PREVIEW SPLIT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* LEFT: CONFIG TABLE */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[800px] relative">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                        <h2 className="font-semibold text-slate-700 flex items-center gap-2">
                            <Activity size={18} />
                            Port Configuration
                        </h2>
                        <span className="text-xs text-slate-400">Total Ports: {ports.length}</span>
                    </div>
                    
                    {availableVlans.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 text-xs animate-in fade-in">
                                <span className="text-slate-400 flex items-center gap-1"><Filter size={12}/> VLANs:</span>
                                <div className="flex flex-wrap gap-2">
                                    {availableVlans.map(vlanObj => {
                                        let styleClass = "bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-700 border-slate-200";
                                        let title = `VLAN ${vlanObj.id} (Detected & Used)`;
                                        
                                        if (vlanObj.status === 'unused') {
                                            styleClass = "bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200";
                                            title = `VLAN ${vlanObj.id} (Defined but NOT used)`;
                                        } else if (vlanObj.status === 'manual') {
                                            styleClass = "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200";
                                            title = `VLAN ${vlanObj.id} (Manual/New)`;
                                        }

                                        return (
                                            <button 
                                                key={vlanObj.id}
                                                onClick={() => selectPortsByVlan(vlanObj.id)}
                                                className={`border px-2 py-0.5 rounded-full transition-colors font-mono cursor-pointer flex items-center gap-1 ${styleClass}`}
                                                title={title}
                                            >
                                                {vlanObj.status === 'manual' && <PlusCircle size={8} className="text-indigo-400" />}
                                                {vlanObj.status === 'unused' && <AlertCircle size={8} className="text-orange-400" />}
                                                {vlanObj.id}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            
                            {/* Legend */}
                            <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
                                <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-slate-200 border border-slate-300"></div>
                                    <span>Genutzt (Config)</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-indigo-100 border border-indigo-200"></div>
                                    <span>Neu / Manuell</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-orange-100 border border-orange-200"></div>
                                    <span>Ungenutzt</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* BULK EDIT TOOLBAR */}
                {selectedCount > 0 && (
                    <div className="bg-blue-900 text-white p-3 shadow-md flex flex-col gap-3 z-20 border-b border-blue-800 animate-in slide-in-from-top-2">
                        {/* Top Bar: Main Actions */}
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2 border-r border-blue-700 pr-4 mr-1">
                                <span className="bg-blue-600 text-xs font-bold px-2 py-1 rounded-full">{selectedCount}</span>
                                <span className="text-sm font-semibold whitespace-nowrap">Selected</span>
                                <button onClick={() => setSelectedPortIds(new Set())} className="text-blue-300 hover:text-white"><X size={14}/></button>
                            </div>

                            <select className="bg-blue-800 border-blue-700 rounded text-xs p-1.5 focus:ring-1 focus:ring-blue-400" value={bulkMode} onChange={(e) => setBulkMode(e.target.value)}>
                                <option value="">Mode (No Change)</option>
                                <option value="access">Access</option>
                                <option value="trunk">Trunk</option>
                            </select>

                            <input 
                                type="text" 
                                placeholder="VLAN..." 
                                className="bg-blue-800 border-blue-700 rounded text-xs p-1.5 w-16 placeholder-blue-400 focus:ring-1 focus:ring-blue-400" 
                                value={bulkAccessVlan} 
                                onChange={(e) => isNumeric(e.target.value) && setBulkAccessVlan(e.target.value)}
                            />

                            <select className="bg-blue-800 border-blue-700 rounded text-xs p-1.5 focus:ring-1 focus:ring-blue-400" value={bulkVoiceVlan} onChange={(e) => setBulkVoiceVlan(e.target.value)}>
                                <option value="">Voice (No Change)</option>
                                <option value="enable">Enable Global</option>
                                <option value="disable">Disable Voice</option>
                            </select>

                            <select className="bg-blue-800 border-blue-700 rounded text-xs p-1.5 focus:ring-1 focus:ring-blue-400" value={bulkPortfast} onChange={(e) => setBulkPortfast(e.target.value)}>
                                <option value="no_change">Fast (No Change)</option>
                                <option value="on">Enable PortFast</option>
                                <option value="off">Disable PortFast</option>
                            </select>

                            <select className="bg-blue-800 border-blue-700 rounded text-xs p-1.5 focus:ring-1 focus:ring-blue-400" value={bulkInclude} onChange={(e) => setBulkInclude(e.target.value)}>
                                <option value="no_change">Cfg (No Change)</option>
                                <option value="include">Include</option>
                                <option value="exclude">Exclude</option>
                            </select>

                            <select className="bg-blue-800 border-blue-700 rounded text-xs p-1.5 focus:ring-1 focus:ring-blue-400" value={bulkNoShut} onChange={(e) => setBulkNoShut(e.target.value)}>
                                <option value="no_change">Power (No Change)</option>
                                <option value="on">No Shutdown</option>
                                <option value="off">Shutdown</option>
                            </select>

                            <div className="flex-1"></div>
                            
                            <button onClick={() => setShowSecurityOptions(!showSecurityOptions)} className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded transition ${showSecurityOptions ? 'bg-indigo-600 text-white' : 'bg-blue-800 text-blue-200 hover:bg-blue-700'}`}>
                                <Lock size={12}/> Advanced Sec {showSecurityOptions ? '▼' : '▶'}
                            </button>

                            <button onClick={applyBulkEdit} className="bg-green-600 hover:bg-green-500 text-white text-xs font-bold py-1.5 px-4 rounded transition shadow-lg flex items-center gap-2">
                                <Edit3 size={14} /> Apply
                            </button>
                        </div>

                        {/* Security Options Sub-Bar */}
                        {showSecurityOptions && (
                            <div className="flex flex-wrap items-center gap-3 bg-blue-800/50 p-2 rounded border border-blue-700/50 animate-in fade-in">
                                <span className="text-xs font-bold text-blue-200 uppercase tracking-wide flex items-center gap-1"><Shield size={12}/> Port Security:</span>
                                
                                <select className="bg-blue-900 border-blue-700 rounded text-xs p-1.5 focus:ring-1 focus:ring-blue-400" value={bulkSecurity} onChange={(e) => setBulkSecurity(e.target.value)}>
                                    <option value="no_change">Enable/Disable</option>
                                    <option value="on">Enable Security</option>
                                    <option value="off">Disable Security</option>
                                </select>

                                <select className="bg-blue-900 border-blue-700 rounded text-xs p-1.5 focus:ring-1 focus:ring-blue-400" value={bulkSecSticky} onChange={(e) => setBulkSecSticky(e.target.value)}>
                                    <option value="no_change">MAC Mode</option>
                                    <option value="off">Dynamic (RAM)</option>
                                    <option value="on">Sticky (Config)</option>
                                </select>

                                <input 
                                    type="text" 
                                    placeholder="Max MACs (e.g. 2)" 
                                    className="bg-blue-900 border-blue-700 rounded text-xs p-1.5 w-32 placeholder-blue-400 focus:ring-1 focus:ring-blue-400" 
                                    value={bulkSecMax} 
                                    onChange={(e) => isNumeric(e.target.value) && setBulkSecMax(e.target.value)}
                                />

                                <select className="bg-blue-900 border-blue-700 rounded text-xs p-1.5 focus:ring-1 focus:ring-blue-400" value={bulkSecViolation} onChange={(e) => setBulkSecViolation(e.target.value)}>
                                    <option value="">Violation Mode</option>
                                    <option value="shutdown">Shutdown</option>
                                    <option value="restrict">Restrict</option>
                                    <option value="protect">Protect</option>
                                </select>

                                <div className="h-4 w-px bg-blue-600 mx-1"></div>

                                <input 
                                    type="text" 
                                    placeholder="Aging (min)" 
                                    className="bg-blue-900 border-blue-700 rounded text-xs p-1.5 w-24 placeholder-blue-400 focus:ring-1 focus:ring-blue-400" 
                                    value={bulkSecAgingTime} 
                                    onChange={(e) => isNumeric(e.target.value) && setBulkSecAgingTime(e.target.value)}
                                />
                                <select className="bg-blue-900 border-blue-700 rounded text-xs p-1.5 focus:ring-1 focus:ring-blue-400" value={bulkSecAgingType} onChange={(e) => setBulkSecAgingType(e.target.value)}>
                                    <option value="">Aging Type</option>
                                    <option value="inactivity">Inactivity</option>
                                    <option value="absolute">Absolute</option>
                                </select>
                            </div>
                        )}
                    </div>
                )}
                
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="p-2 w-8 text-center bg-slate-100">
                                    <input 
                                        type="checkbox" 
                                        className="w-4 h-4 rounded border-gray-300" 
                                        checked={selectedPortIds.size === ports.length && ports.length > 0}
                                        onChange={toggleSelectAll}
                                    />
                                </th>
                                <th className="p-2 font-medium w-28 bg-slate-50">Port</th>
                                <th className="p-2 font-medium w-36 bg-slate-50">Description</th>
                                <th className="p-2 font-medium w-44 bg-slate-50">Mode</th>
                                <th className="p-2 font-medium w-24 bg-slate-50">VLAN</th>
                                <th className="p-2 font-medium w-24 text-center bg-slate-50" title="PortFast">Fast</th>
                                <th className="p-2 font-medium w-24 text-center bg-slate-50" title="Port Security">Sec</th>
                                <th className="p-2 font-medium bg-slate-50">Extra (Voice/Native)</th>
                                <th className="p-2 font-medium bg-slate-50 w-16 text-center" title="Include in Config">Cfg</th>
                                <th className="p-2 font-medium bg-slate-50 w-16 text-center" title="No Shutdown">Pwr</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {ports.map((port) => (
                                <tr key={port.id} id={`row-${port.id}`} className={`${!port.includeInConfig ? 'opacity-40 grayscale bg-slate-50' : ''} ${selectedPortIds.has(port.id) ? 'bg-yellow-50 hover:bg-yellow-100' : 'hover:bg-blue-50'} transition-all group`}>
                                    <td className="p-2 text-center">
                                        <input 
                                            type="checkbox" 
                                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                                            checked={selectedPortIds.has(port.id)}
                                            onChange={(e) => toggleSelection(port.id, e)}
                                        />
                                    </td>
                                    <td className="p-2 font-mono text-xs font-bold text-slate-600 whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <span>{port.name}</span>
                                            {port.isUplink && (
                                                <span className="w-max mt-1 px-1.5 py-0.5 bg-orange-100 text-orange-700 text-[9px] rounded uppercase leading-none">
                                                    SFP
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-2">
                                        <input 
                                            type="text" 
                                            placeholder="Description..." 
                                            className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none transition-colors text-slate-700"
                                            value={port.description}
                                            onChange={(e) => updatePort(port.id, 'description', e.target.value)}
                                            onFocus={() => scrollToPreviewPort(port.id)}
                                            disabled={!port.includeInConfig}
                                        />
                                    </td>
                                    <td className="p-2">
                                        <select 
                                            className="w-full bg-slate-100 border-none rounded h-8 pl-2 pr-8 text-xs font-medium text-slate-700 cursor-pointer hover:bg-slate-200"
                                            value={port.mode}
                                            onChange={(e) => updatePort(port.id, 'mode', e.target.value)}
                                            onFocus={() => scrollToPreviewPort(port.id)}
                                            disabled={!port.includeInConfig}
                                        >
                                            <option value="access">Access</option>
                                            <option value="trunk">Trunk</option>
                                        </select>
                                    </td>
                                    <td className="p-2">
                                        {port.mode === 'access' ? (
                                            <input 
                                                type="text" 
                                                placeholder="1"
                                                className="w-full p-1 border border-slate-200 rounded text-center"
                                                value={port.accessVlan}
                                                onChange={(e) => updatePort(port.id, 'accessVlan', e.target.value)}
                                                onFocus={() => scrollToPreviewPort(port.id)}
                                                disabled={!port.includeInConfig}
                                            />
                                        ) : (
                                            <input 
                                                type="text" 
                                                placeholder="All"
                                                className="w-full p-1 border border-slate-200 rounded text-xs"
                                                value={port.trunkVlans}
                                                onChange={(e) => updatePort(port.id, 'trunkVlans', e.target.value)}
                                                onFocus={() => scrollToPreviewPort(port.id)}
                                                disabled={!port.includeInConfig}
                                            />
                                        )}
                                    </td>
                                    <td className="p-2 text-center">
                                        <input 
                                            type="checkbox" 
                                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300" 
                                            checked={port.portfast} 
                                            onChange={(e) => updatePort(port.id, 'portfast', e.target.checked)} 
                                            onFocus={() => scrollToPreviewPort(port.id)}
                                            disabled={!port.includeInConfig}
                                        />
                                    </td>
                                    <td className="p-2 text-center">
                                         {port.mode === 'access' && (
                                            <input 
                                                type="checkbox" 
                                                className="w-4 h-4 text-red-600 rounded focus:ring-red-500 border-gray-300" 
                                                checked={port.portSecurity} 
                                                onChange={(e) => updatePort(port.id, 'portSecurity', e.target.checked)} 
                                                onFocus={() => scrollToPreviewPort(port.id)}
                                                disabled={!port.includeInConfig}
                                            />
                                         )}
                                    </td>
                                    <td className="p-2">
                                        {port.mode === 'access' ? (
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="checkbox" 
                                                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 border-gray-300" 
                                                    title="Enable Voice VLAN" 
                                                    checked={!!port.voiceVlan} 
                                                    onChange={() => toggleVoiceVlan(port.id, port.voiceVlan)} 
                                                    onFocus={() => scrollToPreviewPort(port.id)}
                                                    disabled={!port.includeInConfig}
                                                />
                                                {port.voiceVlan ? (
                                                     <input 
                                                        type="text" 
                                                        className="w-10 p-1 text-xs border border-purple-200 bg-purple-50 rounded text-center text-purple-700 font-medium" 
                                                        value={port.voiceVlan} 
                                                        onChange={(e) => updatePort(port.id, 'voiceVlan', e.target.value)} 
                                                        onFocus={() => scrollToPreviewPort(port.id)}
                                                        disabled={!port.includeInConfig}
                                                    />
                                                ) : (
                                                    <span className="text-[10px] text-slate-300 italic">No Voice</span>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1">
                                                <span className="text-[10px] text-slate-400">Native:</span>
                                                <input 
                                                    type="text" 
                                                    className="w-12 p-1 text-xs border border-slate-200 rounded" 
                                                    value={port.nativeVlan} 
                                                    onChange={(e) => updatePort(port.id, 'nativeVlan', e.target.value)} 
                                                    onFocus={() => scrollToPreviewPort(port.id)}
                                                    disabled={!port.includeInConfig}
                                                />
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-2 text-center">
                                         <button 
                                            onClick={() => toggleInclude(port.id)}
                                            className={`p-1.5 rounded-full transition-colors ${port.includeInConfig ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-slate-200 text-slate-400 hover:bg-slate-300'}`}
                                            title={port.includeInConfig ? "Included in config" : "Excluded from config"}
                                         >
                                            <Power size={14} />
                                         </button>
                                    </td>
                                    <td className="p-2 text-center">
                                        <button
                                            onClick={() => toggleNoShut(port.id)}
                                            className={`p-1.5 rounded-full transition-colors ${port.noShutdown ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}
                                            title={port.noShutdown ? "Port is UP (no shutdown)" : "Port is DOWN (shutdown)"}
                                            disabled={!port.includeInConfig}
                                        >
                                            <Power size={14} />
                                        </button>
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
                    <div className="bg-slate-800 p-3 border-b border-slate-700 flex flex-col gap-3">
                        <div className="flex justify-between items-center text-slate-200 font-mono text-sm">
                            <div className="flex items-center gap-2">
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
                        
                        <div className="flex flex-wrap gap-4 text-xs text-slate-400 pt-1 border-t border-slate-700">
                             <label className="flex items-center gap-2 cursor-pointer hover:text-slate-200">
                                <input 
                                    type="checkbox" 
                                    className="rounded bg-slate-700 border-slate-600 text-green-500 focus:ring-green-500/50"
                                    checked={includeWrMem}
                                    onChange={(e) => setIncludeWrMem(e.target.checked)}
                                />
                                <span>Auto-Save (wr mem)</span>
                             </label>
                             <label className="flex items-center gap-2 text-slate-400 text-xs cursor-pointer hover:text-slate-200 mr-2">
                                <input 
                                    type="checkbox" 
                                    className="rounded bg-slate-700 border-slate-600 text-green-500 focus:ring-green-500/50"
                                    checked={useModernPortfast}
                                    onChange={(e) => setUseModernPortfast(e.target.checked)}
                                />
                                <span>Modern Portfast (edge)</span>
                             </label>
                             <label className="flex items-center gap-2 cursor-pointer hover:text-slate-200">
                                <input 
                                    type="checkbox" 
                                    className="rounded bg-slate-700 border-slate-600 text-green-500 focus:ring-green-500/50"
                                    checked={includeNoShutdown}
                                    onChange={(e) => setIncludeNoShutdown(e.target.checked)}
                                />
                                <span>Enable Ports (no shut)</span>
                             </label>
                        </div>
                    </div>
                    
                    {/* SCROLLABLE PREVIEW CONTAINER */}
                    <div className="flex-1 bg-slate-900 text-green-400 font-mono text-xs p-4 overflow-y-auto whitespace-pre">
                        <div>! Generated Switchport Config</div>
                        {ports.map(port => {
                            if (!port.includeInConfig) return null;
                            return (
                                <div key={port.id} id={`preview-config-${port.id}`} className="transition-colors duration-500 p-1 rounded">
                                    {getPortConfigString(port)}
                                </div>
                            );
                        })}
                        <div className="mt-4">end</div>
                        {includeWrMem && <div>wr mem</div>}
                    </div>
                </div>

                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
                    <h3 className="text-blue-800 font-bold mb-2 text-sm flex items-center gap-2">
                        <Shield size={14}/> 
                        Neue Funktionen
                    </h3>
                    <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                        <li><strong>Alt-Klick (Visualizer):</strong> Springe zur Zeile in der Tabelle (ohne Scrollen bei normalem Klick).</li>
                        <li><strong>Click-to-Scroll (Tabelle):</strong> Klicke in ein Tabellenfeld, um die Vorschau automatisch an die richtige Stelle scrollen zu lassen.</li>
                        <li><strong>Detected VLANs:</strong> Klicke auf erkannte VLANs, um alle zugehörigen Ports auszuwählen.</li>
                    </ul>
                </div>
            </div>
            
            {/* Toast Notification */}
            {toast.show && (
                <div className="fixed bottom-4 right-4 bg-slate-800 text-white px-4 py-2 rounded shadow-lg animate-bounce text-sm flex items-center gap-2 z-50">
                    <CheckSquare size={16} className="text-green-400"/>
                    {toast.message}
                </div>
            )}
        </div>
      </main>
    </div>
  );
}
