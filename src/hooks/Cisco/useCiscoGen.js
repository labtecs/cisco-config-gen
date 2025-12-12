import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { usePortState } from './usePortState';
import { useSelection } from './useSelection';
import { useBulkEdit } from './useBulkEdit';
import { useConfigGeneration } from './useConfigGeneration';
import { useConfigParsing } from './useConfigParsing';
import { parseVlanString } from '../../utils/ciscoHelpers';

/**
 * The main hook that orchestrates all logic for the Cisco Config Generator.
 * It composes smaller, specialized hooks for managing state and logic.
 * @param {object} props - Props for the hook.
 * @param {string} props.fileContent - The content of an uploaded running-config.
 * @returns {object} All state and handlers needed by the UI components.
 */
export function useCiscoGen({ fileContent }) {
    // --- STATE DEFINITIONS ---
    const [stackMembers, setStackMembers] = useState([
        { model: 48, uplinkCount: 4, baseInterfaceType: 'GigabitEthernet', uplinkInterfaceType: 'TenGigabitEthernet' }
    ]);
    const [portNaming, setPortNaming] = useState('stack');
    const [portLayout, setPortLayout] = useState('two-row');
    const [globalVoiceVlan, setGlobalVoiceVlan] = useState('');
    const [hostname, setHostname] = useState('');
    const [iosVersion, setIosVersion] = useState('');

    // Generator Options
    const [includeWrMem, setIncludeWrMem] = useState(true);
    const [useModernPortfast, setUseModernPortfast] = useState(true);
    const [includeNoShutdown, setIncludeNoShutdown] = useState(true);
    const [includeDescriptions, setIncludeDescriptions] = useState(true);
    const [useRangeCommands, setUseRangeCommands] = useState(true);
    const [includeBaseConfig, setIncludeBaseConfig] = useState(true);
    const [forcePoeReset, setForcePoeReset] = useState(false);
    const [showOnlyChanges, setShowOnlyChanges] = useState(false); // <-- New State

    // Column Visibility
    const [showPoeColumn, setShowPoeColumn] = useState(false);
    const [showSecColumn, setShowSecColumn] = useState(false);
    const [showStateColumn, setShowStateColumn] = useState(false);
    const [showVoiceColumn, setShowVoiceColumn] = useState(true);
    const [showFastColumn, setShowFastColumn] = useState(true);
    const [showChannelGroupColumn, setShowChannelGroupColumn] = useState(false);

    // View Mode
    const [viewMode, setViewMode] = useState('multi');
    const [singleEditPortId, setSingleEditPortId] = useState(null);

    // UI States
    const [declaredVlans, setDeclaredVlans] = useState([]);
    const [vlanNames, setVlanNames] = useState({});
    const [toast, setToast] = useState({ show: false, message: '' });
    const [confirmClearDesc, setConfirmClearDesc] = useState(false);
    const [portChannels, setPortChannels] = useState([]);

    // UI Toggles
    const [showSecurityOptions, setShowSecurityOptions] = useState(false);

    // --- COMPOSING SUB-HOOKS ---
    const { ports, setPorts, generatePortList, updatePort } = usePortState({ stackMembers, portNaming });
    const { selectedPortIds, toggleSelection, toggleSelectAll, selectPortsByVlan, clearSelection } = useSelection(ports);
    const { bulkState, setBulkState, applyBulkEdit } = useBulkEdit({ setPorts, selectedPortIds, globalVoiceVlan });
    const { generatedConfig } = useConfigGeneration({ ports, portChannels, includeBaseConfig, includeDescriptions, forcePoeReset, useModernPortfast, includeNoShutdown, includeWrMem, useRangeCommands, showOnlyChanges }); // Pass new state
    const { parseRunningConfig } = useConfigParsing();
    const isParsingRef = useRef(false);

    // --- PORT-CHANNEL LOGIC (IF MANUALLY CREATED) ---
    useEffect(() => {
        const activeGroupIds = [...new Set(ports.map(p => p.channelGroupId).filter(id => id))];
        
        setPortChannels(currentChannels => {
            const filteredChannels = currentChannels.filter(pc => activeGroupIds.includes(pc.id));
            const existingIds = new Set(filteredChannels.map(pc => pc.id));

            activeGroupIds.forEach(id => {
                if (!existingIds.has(id)) {
                    filteredChannels.push({
                        id: id,
                        name: `Port-channel${id}`,
                        description: '',
                        mode: 'trunk',
                        trunkVlans: 'all',
                        nativeVlan: 1,
                    });
                }
            });

            return filteredChannels.sort((a, b) => parseInt(a.id) - parseInt(b.id));
        });
    }, [ports]);

    const updatePortChannel = (id, field, value) => {
        setPortChannels(current => current.map(pc => pc.id === id ? { ...pc, [field]: value } : pc));
    };

    // --- HELPERS ---
    const showToast = (msg) => {
        setToast({ show: true, message: msg });
        setTimeout(() => setToast({ show: false, message: '' }), 3000);
    };

    const resetState = useCallback(() => {
        setHostname('');
        setIosVersion('');
        setDeclaredVlans([]);
        setVlanNames({});
        setGlobalVoiceVlan('');
        setPorts([]);
        setPortChannels([]);
        setShowOnlyChanges(false); // Reset the new state
        setStackMembers([
            { model: 48, uplinkCount: 4, baseInterfaceType: 'GigabitEthernet', uplinkInterfaceType: 'TenGigabitEthernet' }
        ]);
    }, [setPorts]);

    // --- MAIN EFFECT FOR FILE PARSING ---
    useEffect(() => {
        if (fileContent) {
            isParsingRef.current = true;
            const parsedData = parseRunningConfig(fileContent);
            setHostname(parsedData.hostname);
            setIosVersion(parsedData.iosVersion);
            setUseModernPortfast(parsedData.useModernPortfast);
            setDeclaredVlans(parsedData.declaredVlans);
            setVlanNames(parsedData.vlanNames);
            setGlobalVoiceVlan(parsedData.globalVoiceVlan);
            setPortNaming(parsedData.portNaming);
            setStackMembers(parsedData.stackMembers);
            // Parsed ports are clean by definition
            const cleanPorts = parsedData.ports.map(p => ({ ...p, isDirty: false }));
            setPorts(cleanPorts);
            setPortChannels(parsedData.portChannels || []);

            setTimeout(() => { isParsingRef.current = false; }, 500);
        } else {
            resetState();
        }
    }, [fileContent, parseRunningConfig, resetState, setPorts]);

    useEffect(() => {
        if (isParsingRef.current) {
            isParsingRef.current = false;
            return;
        }
        generatePortList();
    }, [generatePortList]);
    useEffect(() => { if (ports.length > 0 && !singleEditPortId) { setSingleEditPortId(ports[0].id); } }, [ports, singleEditPortId]);

    const availableVlans = useMemo(() => {
        // ... (omitted for brevity, no changes needed here)
        const activeOnPorts = new Set();
        const allVlans = new Set(declaredVlans);
        const complexRanges = new Set();

        ports.forEach(p => {
            if (p.mode === 'access' && p.accessVlan) {
                activeOnPorts.add(p.accessVlan);
                allVlans.add(p.accessVlan);
            }

            if (p.mode === 'trunk' && p.trunkVlans) {
                const parsedTrunkVlans = parseVlanString(p.trunkVlans);
                if (parsedTrunkVlans.length >= 50) {
                    complexRanges.add(p.trunkVlans);
                } else {
                    parsedTrunkVlans.forEach(v => {
                        activeOnPorts.add(v);
                        allVlans.add(v);
                    });
                }
            }
        });

        if (!allVlans.has('1')) allVlans.add('1');

        const singleVlans = Array.from(allVlans).filter(v => v).sort((a, b) => parseInt(a) - parseInt(b)).map(vlan => {
            const strVlan = String(vlan);
            const isDeclared = declaredVlans.some(d => String(d) === strVlan);
            const isUsed = activeOnPorts.has(strVlan);
            const name = vlanNames[strVlan];

            let status = 'manual';
            if (strVlan === '1') status = 'default';
            else if (isDeclared && isUsed) status = 'used';
            else if (isDeclared && !isUsed) status = 'unused';

            return { id: strVlan, status, name, isRange: false };
        });

        const rangeVlans = Array.from(complexRanges).map(rangeStr => {
            return {
                id: rangeStr,
                status: 'used',
                name: 'Large Trunk Range',
                isRange: true
            };
        });

        return [...singleVlans, ...rangeVlans];
    }, [declaredVlans, ports, vlanNames]);

    const toggleInclude = (id) => { setPorts(ports.map(p => p.id === id ? { ...p, includeInConfig: !p.includeInConfig, isDirty: true } : p)); };
    const toggleGlobalInclude = () => {
        const allIncluded = ports.length > 0 && ports.every(p => p.includeInConfig);
        setPorts(ports.map(p => ({ ...p, includeInConfig: !allIncluded, isDirty: true })));
    };

    const handleClearDescriptions = () => {
        if (confirmClearDesc) {
            setPorts(ports.map(p => ({ ...p, description: '', isDirty: true })));
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
                poeMode: 'auto', bulkGroupId: null,
                prependDefault: false,
                resetOnly: false,
                portSecurity: false, secMax: 1, secViolation: 'shutdown', secSticky: false, secAgingTime: 0, secAgingType: 'inactivity',
                isDirty: true // Mark as dirty on reset
            };
        }));
        showToast("Port UI Reset.");
    };

    const toggleNoShut = (id) => { setPorts(ports.map(p => p.id === id ? { ...p, noShutdown: !p.noShutdown, isDirty: true } : p)); };
    const toggleVoiceVlan = (id, currentVal) => {
        const newVal = currentVal ? '' : (globalVoiceVlan || '1');
        updatePort(id, 'voiceVlan', newVal); // updatePort already marks as dirty
    };

    // ... (rest of the handlers and logic)

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

    const switchToSingleEditor = (id) => {
        setSingleEditPortId(id);
        setViewMode('single');
        scrollToPreviewPort(id);
    };

    const copyToClipboard = async () => {
        if (!navigator.clipboard) {
            showToast("Clipboard API nicht verfügbar.");
            return;
        }
        try {
            await navigator.clipboard.writeText(generatedConfig);
            showToast("Konfiguration kopiert!");
        } catch (err) {
            showToast("Fehler beim Kopieren.");
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
        stackMembers, setStackMembers,
        portNaming, setPortNaming,
        portLayout, setPortLayout,
        globalVoiceVlan, setGlobalVoiceVlan,
        hostname, iosVersion,
        includeWrMem, setIncludeWrMem,
        useModernPortfast, setUseModernPortfast,
        includeNoShutdown, setIncludeNoShutdown,
        includeDescriptions, setIncludeDescriptions,
        useRangeCommands, setUseRangeCommands,
        includeBaseConfig, setIncludeBaseConfig,
        forcePoeReset, setForcePoeReset,
        showOnlyChanges, setShowOnlyChanges, // <-- Expose new state
        ports,
        viewMode, setViewMode,
        singleEditPortId, setSingleEditPortId,
        showPoeColumn, setShowPoeColumn,
        showSecColumn, setShowSecColumn,
        showStateColumn, setShowStateColumn,
        showVoiceColumn, setShowVoiceColumn,
        showFastColumn, setShowFastColumn,
        showChannelGroupColumn, setShowChannelGroupColumn,
        toast, confirmClearDesc,
        selectedPortIds, ...setBulkState, ...bulkState,
        showSecurityOptions, setShowSecurityOptions,
        availableVlans, generatedConfig, singlePort,
        portChannels,
        switchToSingleEditor,
        resetState,

        // Handlers
        updatePort, toggleInclude, toggleGlobalInclude,
        handleClearDescriptions, resetPortToDefault, toggleNoShut, toggleVoiceVlan, clearSelection,
        scrollToPreviewPort, handleVisualizerClick, toggleSelection, toggleSelectAll,
        selectPortsByVlan, applyBulkEdit, copyToClipboard, downloadFile,
        handlePrevPort, handleNextPort,
        updatePortChannel,
    };
}