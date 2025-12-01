// src/hooks/useCiscoGen.js
import { useState, useEffect, useMemo, useCallback } from 'react';
import { isNumeric, isVlanRange, parseVlanString, expandInterfaceType } from '../utils/ciscoHelpers';

export function useCiscoGen() {
    // --- STATE DEFINITIONS ---
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
    const [includeDescriptions, setIncludeDescriptions] = useState(true);

    // Port Data Structure
    const [ports, setPorts] = useState([]);

    // View Mode
    const [viewMode, setViewMode] = useState('multi');
    const [singleEditPortId, setSingleEditPortId] = useState(null);

    // Column Visibility
    const [showPoeColumn, setShowPoeColumn] = useState(false);
    const [showSecColumn, setShowSecColumn] = useState(false);
    const [showStateColumn, setShowStateColumn] = useState(false);
    const [showVoiceColumn, setShowVoiceColumn] = useState(true);
    const [showFastColumn, setShowFastColumn] = useState(true);

    // UI States
    const [detectedVlans, setDetectedVlans] = useState([]);
    const [vlanNames, setVlanNames] = useState({});
    const [toast, setToast] = useState({ show: false, message: '' });
    const [confirmClearDesc, setConfirmClearDesc] = useState(false);

    // Bulk Edit State
    const [selectedPortIds, setSelectedPortIds] = useState(new Set());
    const [lastSelectedId, setLastSelectedId] = useState(null);

    // Bulk Values
    const [bulkMode, setBulkMode] = useState('');
    const [bulkAccessVlan, setBulkAccessVlan] = useState('');
    const [bulkVoiceVlan, setBulkVoiceVlan] = useState('');
    const [bulkTrunkVlans, setBulkTrunkVlans] = useState('');
    const [bulkPortfast, setBulkPortfast] = useState('no_change');
    const [bulkInclude, setBulkInclude] = useState('no_change');
    const [bulkNoShut, setBulkNoShut] = useState('no_change');
    const [bulkPoeMode, setBulkPoeMode] = useState('');

    // Security Bulk
    const [bulkSecurity, setBulkSecurity] = useState('no_change');
    const [bulkSecMax, setBulkSecMax] = useState('');
    const [bulkSecViolation, setBulkSecViolation] = useState('');
    const [bulkSecSticky, setBulkSecSticky] = useState('no_change');
    const [bulkSecAgingTime, setBulkSecAgingTime] = useState('');
    const [bulkSecAgingType, setBulkSecAgingType] = useState('');

    // UI Toggles
    const [showSecurityOptions, setShowSecurityOptions] = useState(false);

    // --- HELPERS ---
    const showToast = (msg) => {
        setToast({ show: true, message: msg });
        setTimeout(() => setToast({ show: false, message: '' }), 3000);
    };

    const rebuildFromMap = (naming, stack, model, upCount, map, baseType, upType) => {
        let mergedPorts = [];
        for (let s = 1; s <= stack; s++) {
            for (let p = 1; p <= model; p++) {
                let genId = naming === 'simple' ? `0/${p}` : `${s}/0/${p}`;
                if (naming === 'simple' && stack > 1) genId = `${s}/0/${p}`;
                const parsed = map.get(genId);
                const name = parsed ? parsed.name : `${baseType}${genId}`;
                if (parsed) {
                    mergedPorts.push({ ...parsed, name, isUplink: false });
                } else {
                    mergedPorts.push({
                        id: genId, name, description: '', mode: 'access', accessVlan: '', trunkVlans: 'all', nativeVlan: 1,
                        portfast: false, voiceVlan: '', includeInConfig: false, isUplink: false,
                        noShutdown: true, poeMode: 'auto', prependDefault: false, resetOnly: false,
                        portSecurity: false, secMax: 1, secViolation: 'shutdown', secSticky: false, secAgingTime: 0, secAgingType: 'inactivity'
                    });
                }
            }
            for (let u = 1; u <= upCount; u++) {
                let p = model + u;
                let genId = naming === 'simple' ? `0/${p}` : `${s}/0/${p}`;
                if (naming === 'simple' && stack > 1) genId = `${s}/0/${p}`;
                const parsed = map.get(genId);
                const name = parsed ? parsed.name : `${upType}${genId}`;
                if (parsed) {
                    mergedPorts.push({ ...parsed, name, isUplink: true });
                } else {
                    mergedPorts.push({
                        id: genId, name, description: 'Uplink', mode: 'trunk', accessVlan: '', trunkVlans: 'all', nativeVlan: 1,
                        portfast: false, voiceVlan: '',
                        includeInConfig: false,
                        isUplink: true,
                        noShutdown: true, poeMode: 'auto', prependDefault: false, resetOnly: false,
                        portSecurity: false, secMax: 1, secViolation: 'shutdown', secSticky: false, secAgingTime: 0, secAgingType: 'inactivity'
                    });
                }
            }
        }
        setPorts(mergedPorts);
    };

    const createPortObject = (existingMap, stackMember, portNum, isUplink) => {
        const type = isUplink ? uplinkInterfaceType : baseInterfaceType;
        let portId = '';
        let interfaceName = '';
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
        let existing = existingMap.get(portId);
        if (!existing && stackMember === 1) {
            if (portId === `0/${portNum}`) existing = existingMap.get(`1/0/${portNum}`);
            else if (portId === `1/0/${portNum}`) existing = existingMap.get(`0/${portNum}`);
        }
        if (existing) {
            return { ...existing, id: portId, name: interfaceName, isUplink };
        } else {
            return {
                id: portId, name: interfaceName, description: isUplink ? 'Uplink' : '',
                mode: isUplink ? 'trunk' : 'access', accessVlan: '', trunkVlans: 'all', nativeVlan: 1,
                portfast: !isUplink, voiceVlan: '', includeInConfig: !isUplink, isUplink: isUplink,
                noShutdown: true, poeMode: 'auto', prependDefault: false, resetOnly: false,
                portSecurity: false, secMax: 1, secViolation: 'shutdown', secSticky: false, secAgingTime: 0, secAgingType: 'inactivity'
            };
        }
    };

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

    const parseRunningConfig = (text) => {
        const hostnameMatch = text.match(/^hostname\s+([^\s]+)/m);
        if (hostnameMatch && hostnameMatch[1]) setHostname(hostnameMatch[1]); else setHostname('');
        const versionMatch = text.match(/^version\s+(\d+\.?\d*)/m);
        if (versionMatch && versionMatch[1]) {
            const verStr = versionMatch[1];
            setIosVersion(verStr);
            setUseModernPortfast(parseFloat(verStr) >= 15.0);
        } else {
            setIosVersion('');
        }
        if (text.includes('spanning-tree portfast edge')) setUseModernPortfast(true);
        else if (text.includes('spanning-tree portfast')) setUseModernPortfast(false);

        const lines = text.split('\n');
        let newPortsMap = new Map();
        const interfaceRegex = /^(?:interface)\s+([a-zA-Z]+)([0-9\/\.]+)/i;
        let detectedNaming = 'simple';
        let detectedStackSize = 1;
        let detectedMaxPort = 0;
        const typeCounts = {};
        const voiceVlanCounts = {};
        const foundVlans = new Set();
        const detectedVlanNames = {};
        let currentDefVlanId = null;

        lines.forEach(line => {
            const trimmed = line.trim();
            const match = trimmed.match(interfaceRegex);
            if (match) typeCounts[match[1]] = (typeCounts[match[1]] || 0) + 1;

            // --- VLAN PARSING LOGIC START ---
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
            if (sviMatch && sviMatch[1]) foundVlans.add(sviMatch[1]);

            // Das hier ist der wichtige Teil für "Ungenutzte" VLANs (aus der Datenbank)
            const l2Match = trimmed.match(/^vlan\s+(\d+)/i);
            if (l2Match && l2Match[1]) {
                foundVlans.add(l2Match[1]);
                currentDefVlanId = l2Match[1];
            } else if (currentDefVlanId && trimmed.startsWith('name ')) {
                const name = trimmed.substring(5).trim();
                detectedVlanNames[currentDefVlanId] = name;
            }
            if (trimmed.startsWith('interface') || trimmed === '!') currentDefVlanId = null;
            // --- VLAN PARSING LOGIC END ---
        });


        const sortedTypes = Object.entries(typeCounts).sort((a,b) => b[1] - a[1]);
        let detBase = sortedTypes[0]?.[0] || 'GigabitEthernet';
        let detUplink = sortedTypes[1]?.[0] || detBase;

        const finalBaseType = expandInterfaceType(detBase);
        const finalUplinkType = expandInterfaceType(detUplink);
        setBaseInterfaceType(finalBaseType);
        setUplinkInterfaceType(finalUplinkType);
        let maxCount = 0;
        let detectedVoiceVlan = '';
        Object.entries(voiceVlanCounts).forEach(([vlan, count]) => {
            if (count > maxCount) { maxCount = count; detectedVoiceVlan = vlan; }
        });
        if (detectedVoiceVlan) setGlobalVoiceVlan(detectedVoiceVlan);

        // Populate Detected VLANs state
        setDetectedVlans(Array.from(foundVlans).filter(v => v).sort((a,b) => parseInt(a) - parseInt(b)));
        setVlanNames(detectedVlanNames);

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
                    id: id, name: `${expandInterfaceType(match[1])}${numbering}`, description: '', mode: 'access', accessVlan: '', trunkVlans: '', nativeVlan: 1,
                    portfast: false, voiceVlan: '', includeInConfig: false, isUplink: false,
                    noShutdown: true, poeMode: 'auto', prependDefault: false, resetOnly: false,
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
                else if (trimmed === 'shutdown') { currentInterface.noShutdown = false; }
                else if (trimmed.startsWith('power inline')) {
                    if (trimmed.includes('never')) currentInterface.poeMode = 'never';
                    else if (trimmed.includes('static')) currentInterface.poeMode = 'static';
                    else if (trimmed.includes('auto')) currentInterface.poeMode = 'auto';
                    currentInterface.includeInConfig = true;
                }
                else if (trimmed.includes('switchport port-security')) {
                    currentInterface.includeInConfig = true;
                    if (trimmed === 'switchport port-security') { currentInterface.portSecurity = true; }
                    else if (trimmed.includes('maximum')) {
                        const parts = trimmed.split('maximum ');
                        currentInterface.secMax = parseInt(parts[1]);
                    } else if (trimmed.includes('violation')) { currentInterface.secViolation = trimmed.split('violation ')[1]?.trim(); }
                    else if (trimmed.includes('mac-address sticky')) { currentInterface.secSticky = true; }
                    else if (trimmed.includes('aging time')) { currentInterface.secAgingTime = parseInt(trimmed.split('time ')[1]); }
                    else if (trimmed.includes('aging type')) { currentInterface.secAgingType = trimmed.split('type ')[1]?.trim(); }
                }
            }
        });
        if (currentInterface) newPortsMap.set(currentInterface.id, currentInterface);

        let bestFitModel = 48;
        let uplinks = 4;
        if (detectedMaxPort <= 8) { bestFitModel = 8; uplinks = 2; }
        else if (detectedMaxPort <= 12) { bestFitModel = 12; uplinks = 2; }
        else if (detectedMaxPort <= 16) { bestFitModel = 16; uplinks = 2; }
        else if (detectedMaxPort <= 24) { bestFitModel = 24; uplinks = 4; }
        else { bestFitModel = 48; uplinks = 4; }
        setPortNaming(detectedNaming);
        setStackSize(detectedStackSize);
        setSwitchModel(bestFitModel);
        setUplinkCount(uplinks);
        rebuildFromMap(detectedNaming, detectedStackSize, bestFitModel, uplinks, newPortsMap, finalBaseType, finalUplinkType);
    };

    const resetToDefaults = () => {
        if (window.confirm("Möchtest du wirklich alles zurücksetzen? Die Seite wird neu geladen.")) {
            window.location.reload();
        }
    };

    // --- EFFECTS ---
    useEffect(() => { generatePortList(); }, [switchModel, uplinkCount, stackSize, portNaming, baseInterfaceType, uplinkInterfaceType, generatePortList]);
    useEffect(() => { if (ports.length > 0 && !singleEditPortId) { setSingleEditPortId(ports[0].id); } }, [ports, singleEditPortId]);

// --- MEMOS ---
    const availableVlans = useMemo(() => {
        const activeOnPorts = new Set();
        const allVlans = new Set(detectedVlans);
        const complexRanges = new Set(); // NEU: Speicher für Ranges

        ports.forEach(p => {
            // 1. Access Ports (immer einzeln)
            if (p.mode === 'access' && p.accessVlan) {
                activeOnPorts.add(p.accessVlan);
                allVlans.add(p.accessVlan);
            }

            // 2. Trunk Ports
            if (p.mode === 'trunk' && p.trunkVlans) {
                const parsedTrunkVlans = parseVlanString(p.trunkVlans);

                // LOGIK: Ist es eine Riesen-Range? (z.B. > 50 VLANs)
                if (parsedTrunkVlans.length >= 50) {
                    // JA: Wir merken uns den String "2-4094" als eigenes Item
                    complexRanges.add(p.trunkVlans);
                } else {
                    // NEIN: Wir fügen die VLANs einzeln hinzu (wie bisher)
                    parsedTrunkVlans.forEach(v => {
                        activeOnPorts.add(v);
                        allVlans.add(v);
                    });
                }
            }
        });

        if (!allVlans.has('1')) allVlans.add('1');

        // A. Einzelne VLANs sortieren
        const singleVlans = Array.from(allVlans).filter(v => v).sort((a, b) => parseInt(a) - parseInt(b)).map(vlan => {
            const strVlan = String(vlan);
            const isDetected = detectedVlans.some(d => String(d) === strVlan);
            const isUsed = activeOnPorts.has(strVlan);
            const name = vlanNames[strVlan];

            let status = 'manual';
            if (strVlan === '1') status = 'default';
            else if (isDetected && isUsed) status = 'used';
            else if (isDetected && !isUsed) status = 'unused';

            return { id: strVlan, status, name, isRange: false };
        });

        // B. Ranges hinzufügen
        const rangeVlans = Array.from(complexRanges).map(rangeStr => {
            return {
                id: rangeStr, // Der Text auf dem Button, z.B. "2-4094"
                status: 'used', // Ranges auf Trunks sind per Definition "used"
                name: 'Large Trunk Range',
                isRange: true
            };
        });

        // C. Beides kombinieren (Ranges am Ende)
        return [...singleVlans, ...rangeVlans];

    }, [detectedVlans, ports, vlanNames]);

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => parseRunningConfig(event.target.result);
        reader.readAsText(file);
        e.target.value = null;
    };

    const getPortConfigString = (port) => {
        let lines = [];
        if (port.resetOnly) {
            lines.push(`default interface ${port.name}`);
            return lines.join('\n');
        }
        if (port.prependDefault) {
            lines.push(`default interface ${port.name}`);
        }
        lines.push(`interface ${port.name}`);
        if (includeDescriptions && port.description) lines.push(` description ${port.description}`);
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
            if (port.trunkVlans && port.trunkVlans.toLowerCase() !== 'all') lines.push(` switchport trunk allowed vlan ${port.trunkVlans}`);
            if (port.nativeVlan && port.nativeVlan != 1) lines.push(` switchport trunk native vlan ${port.nativeVlan}`);
        }
        if (port.poeMode && port.poeMode !== 'auto') { lines.push(` power inline ${port.poeMode}`); }
        if (port.portfast) { lines.push(useModernPortfast ? ` spanning-tree portfast edge` : ` spanning-tree portfast`); }
        if (includeNoShutdown) {
            if (port.noShutdown) lines.push(` no shutdown`); else lines.push(` shutdown`);
        } else {
            if (!port.noShutdown) lines.push(` shutdown`);
        }
        lines.push(` exit`);
        return lines.join('\n');
    };

    const generatedConfig = useMemo(() => {
        let output = "! Generated Switchport Config\n";
        ports.forEach(port => {
            if (!port.includeInConfig) return;
            output += getPortConfigString(port) + "\n";
        });
        output += "end\n";
        if (includeWrMem) { output += "wr mem\n"; }
        return output;
    }, [ports, includeWrMem, useModernPortfast, includeNoShutdown, includeDescriptions]);

    const updatePort = (id, field, value) => {
        if (['accessVlan', 'voiceVlan', 'nativeVlan'].includes(field)) { if (!isNumeric(value)) return; }
        if (['secMax', 'secAgingTime'].includes(field)) { if (!isNumeric(value)) return; }
        if (field === 'trunkVlans') {
            const lower = value.toLowerCase();
            if (!isVlanRange(value) && !['a', 'al', 'all'].includes(lower)) return;
        }
        setPorts(ports.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const toggleInclude = (id) => { setPorts(ports.map(p => p.id === id ? { ...p, includeInConfig: !p.includeInConfig } : p)); };
    const toggleGlobalInclude = () => {
        const allIncluded = ports.length > 0 && ports.every(p => p.includeInConfig);
        setPorts(ports.map(p => ({ ...p, includeInConfig: !allIncluded })));
    };

    const handleClearDescriptions = () => {
        if (confirmClearDesc) {
            setPorts(ports.map(p => ({ ...p, description: '' })));
            setConfirmClearDesc(false);
            showToast("Alle Beschreibungen gelöscht.");
        } else {
            setConfirmClearDesc(true);
            setTimeout(() => setConfirmClearDesc(false), 3000);
        }
    };

    const resetPortToDefault = (id) => {
        setPorts(ports.map(p => {
            if (p.id !== id) return p;
            return {
                ...p,
                description: '',
                mode: p.isUplink ? 'trunk' : 'access',
                accessVlan: '',
                trunkVlans: 'all',
                nativeVlan: 1,
                portfast: !p.isUplink,
                voiceVlan: '',
                includeInConfig: !p.isUplink,
                noShutdown: true,
                poeMode: 'auto',
                prependDefault: false,
                resetOnly: false,
                portSecurity: false, secMax: 1, secViolation: 'shutdown', secSticky: false, secAgingTime: 0, secAgingType: 'inactivity'
            };
        }));
        showToast("Port UI Reset.");
    };

    const toggleNoShut = (id) => { setPorts(ports.map(p => p.id === id ? { ...p, noShutdown: !p.noShutdown } : p)); };
    const toggleVoiceVlan = (id, currentVal) => {
        const newVal = currentVal ? '' : (globalVoiceVlan || '1');
        updatePort(id, 'voiceVlan', newVal);
    };

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
            el.classList.add('bg-slate-700');
            setTimeout(() => el.classList.remove('bg-slate-700'), 1500);
        }
    };

    const handleVisualizerClick = (id, e) => {
        if (viewMode === 'multi') { toggleSelection(id, e); }
        else { setSingleEditPortId(id); scrollToPreviewPort(id); }
    };

    const toggleSelection = (id, e) => {
        const newSet = new Set(selectedPortIds);
        const isShift = e && (e.shiftKey || (e.nativeEvent && e.nativeEvent.shiftKey));
        const isAlt = e && (e.altKey || (e.nativeEvent && e.nativeEvent.altKey));
        if (isAlt && !newSet.has(id)) { scrollToTablePort(id); }
        if (isShift && lastSelectedId) {
            const startIdx = ports.findIndex(p => p.id === lastSelectedId);
            const endIdx = ports.findIndex(p => p.id === id);
            if (startIdx !== -1 && endIdx !== -1) {
                const min = Math.min(startIdx, endIdx);
                const max = Math.max(startIdx, endIdx);
                for (let i = min; i <= max; i++) newSet.add(ports[i].id);
            }
        } else {
            if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
            setLastSelectedId(id);
        }
        setSelectedPortIds(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedPortIds.size === ports.length) { setSelectedPortIds(new Set()); setLastSelectedId(null); }
        else { setSelectedPortIds(new Set(ports.map(p => p.id))); }
    };

    const selectPortsByVlan = (vlanId) => {
        if (viewMode === 'single') setViewMode('multi');
        const strVlanId = String(vlanId);

        const matchingIds = ports.filter(p => {
            // Case A: Access Port matcht genau dieses VLAN
            if (p.mode === 'access' && String(p.accessVlan) === strVlanId) return true;

            // Case B: Trunk Port hat genau diesen String (für Ranges wie "2-4094")
            if (p.mode === 'trunk' && p.trunkVlans === strVlanId) return true;

            // Case C: Trunk Port beinhaltet dieses einzelne VLAN (für kleine Trunks)
            if (p.mode === 'trunk' && !p.trunkVlans.includes('-')) {
                // Einfacher Check für Einzelwerte in Trunks
                const parts = p.trunkVlans.split(',').map(s => s.trim());
                if (parts.includes(strVlanId)) return true;
            }

            return false;
        }).map(p => p.id);

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
            if (bulkPoeMode) newPort.poeMode = bulkPoeMode;
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

    const copyToClipboard = () => {
        const textArea = document.createElement("textarea");
        textArea.value = generatedConfig;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            const successful = document.execCommand('copy');
            if(successful) showToast("Konfiguration kopiert!");
            else showToast("Kopieren fehlgeschlagen.");
        } catch (err) { showToast("Fehler beim Kopieren."); }
        document.body.removeChild(textArea);
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

    const singlePort = ports.find(p => p.id === singleEditPortId) || ports[0];
    const getPortIndex = (id) => ports.findIndex(p => p.id === id);
    const handlePrevPort = () => {
        const idx = getPortIndex(singleEditPortId);
        if (idx > 0) { setSingleEditPortId(ports[idx - 1].id); scrollToPreviewPort(ports[idx - 1].id); }
    };
    const handleNextPort = () => {
        const idx = getPortIndex(singleEditPortId);
        if (idx < ports.length - 1) { setSingleEditPortId(ports[idx + 1].id); scrollToPreviewPort(ports[idx + 1].id); }
    };

    return {
        // State
        switchModel, setSwitchModel,
        uplinkCount, setUplinkCount,
        stackSize, setStackSize,
        portNaming, setPortNaming,
        baseInterfaceType, setBaseInterfaceType,
        uplinkInterfaceType, setUplinkInterfaceType,
        globalVoiceVlan, setGlobalVoiceVlan,
        hostname, iosVersion,
        includeWrMem, setIncludeWrMem,
        useModernPortfast, setUseModernPortfast,
        includeNoShutdown, setIncludeNoShutdown,
        includeDescriptions, setIncludeDescriptions,
        ports,
        viewMode, setViewMode,
        singleEditPortId, setSingleEditPortId,
        showPoeColumn, setShowPoeColumn,
        showSecColumn, setShowSecColumn,
        showStateColumn, setShowStateColumn,
        showVoiceColumn, setShowVoiceColumn,
        showFastColumn, setShowFastColumn,
        toast, confirmClearDesc,
        selectedPortIds, setSelectedPortIds,
        bulkMode, setBulkMode,
        bulkAccessVlan, setBulkAccessVlan,
        bulkTrunkVlans, setBulkTrunkVlans,
        bulkVoiceVlan, setBulkVoiceVlan,
        bulkPortfast, setBulkPortfast,
        bulkInclude, setBulkInclude,
        bulkNoShut, setBulkNoShut,
        bulkPoeMode, setBulkPoeMode,
        bulkSecurity, setBulkSecurity,
        bulkSecMax, setBulkSecMax,
        bulkSecViolation, setBulkSecViolation,
        bulkSecSticky, setBulkSecSticky,
        bulkSecAgingTime, setBulkSecAgingTime,
        bulkSecAgingType, setBulkSecAgingType,
        showSecurityOptions, setShowSecurityOptions,
        availableVlans, generatedConfig, singlePort,

        // Handlers
        resetToDefaults, handleFileUpload, updatePort, toggleInclude, toggleGlobalInclude,
        handleClearDescriptions, resetPortToDefault, toggleNoShut, toggleVoiceVlan,
        scrollToPreviewPort, handleVisualizerClick, toggleSelection, toggleSelectAll,
        selectPortsByVlan, applyBulkEdit, copyToClipboard, downloadFile,
        handlePrevPort, handleNextPort
    };
}