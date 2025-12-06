import { useState, useEffect, useCallback, useMemo } from 'react';
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
 * @param {function} props.setShowConnectionBar - Function to control the SSH connection bar visibility.
 * @param {function} props.onSshSuccess - Callback executed after a successful SSH connection.
 * @returns {object} All state and handlers needed by the UI components.
 */
export function useCiscoGen({ fileContent, setShowConnectionBar, onSshSuccess }) {
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
    const [useRangeCommands, setUseRangeCommands] = useState(true);
    const [includeBaseConfig, setIncludeBaseConfig] = useState(true);
    const [forcePoeReset, setForcePoeReset] = useState(false);

    // Column Visibility
    const [showPoeColumn, setShowPoeColumn] = useState(false);
    const [showSecColumn, setShowSecColumn] = useState(false);
    const [showStateColumn, setShowStateColumn] = useState(false);
    const [showVoiceColumn, setShowVoiceColumn] = useState(true);
    const [showFastColumn, setShowFastColumn] = useState(true);

    // View Mode
    const [viewMode, setViewMode] = useState('multi');
    const [singleEditPortId, setSingleEditPortId] = useState(null);

    // UI States
    const [detectedVlans, setDetectedVlans] = useState([]);
    const [vlanNames, setVlanNames] = useState({});
    const [toast, setToast] = useState({ show: false, message: '' });
    const [confirmClearDesc, setConfirmClearDesc] = useState(false);

    // UI Toggles
    const [showSecurityOptions, setShowSecurityOptions] = useState(false);

    // --- COMPOSING SUB-HOOKS ---
    const { ports, setPorts, generatePortList, updatePort } = usePortState({ switchModel, uplinkCount, stackSize, portNaming, baseInterfaceType, uplinkInterfaceType });
    const { selectedPortIds, toggleSelection, toggleSelectAll, selectPortsByVlan, clearSelection } = useSelection(ports);
    const { bulkState, setBulkState, applyBulkEdit } = useBulkEdit({ setPorts, selectedPortIds, globalVoiceVlan });
    const { generatedConfig } = useConfigGeneration({ ports, includeBaseConfig, includeDescriptions, forcePoeReset, useModernPortfast, includeNoShutdown, includeWrMem, useRangeCommands });
    const { parseRunningConfig } = useConfigParsing({ setHostname, setIosVersion, setUseModernPortfast, setDetectedVlans, setVlanNames, setGlobalVoiceVlan, setPortNaming, setStackSize, setSwitchModel, setUplinkCount, setBaseInterfaceType, setUplinkInterfaceType, setPorts });

    // --- HELPERS ---
    const showToast = (msg) => {
        setToast({ show: true, message: msg });
        setTimeout(() => setToast({ show: false, message: '' }), 3000);
    };

    const resetState = useCallback(() => {
        setHostname('');
        setIosVersion('');
        setDetectedVlans([]);
        setVlanNames({});
        setGlobalVoiceVlan('');
        setPorts([]);
        setTimeout(() => generatePortList(), 0);
    }, [generatePortList, setPorts]);

    // --- EFFECTS ---
    useEffect(() => {
        if (fileContent) {
            parseRunningConfig(fileContent);
        } else {
            resetState();
        }
    }, [fileContent, parseRunningConfig, resetState]);

    useEffect(() => { generatePortList(); }, [generatePortList]);
    useEffect(() => { if (ports.length > 0 && !singleEditPortId) { setSingleEditPortId(ports[0].id); } }, [ports, singleEditPortId]);

    // --- MEMOS ---
    const availableVlans = useMemo(() => {
        const activeOnPorts = new Set();
        const allVlans = new Set(detectedVlans);
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
            const isDetected = detectedVlans.some(d => String(d) === strVlan);
            const isUsed = activeOnPorts.has(strVlan);
            const name = vlanNames[strVlan];

            let status = 'manual';
            if (strVlan === '1') status = 'default';
            else if (isDetected && isUsed) status = 'used';
            else if (isDetected && !isUsed) status = 'unused';

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
    }, [detectedVlans, ports, vlanNames]);

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
                poeMode: 'auto', bulkGroupId: null,
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

    const [isConnecting, setIsConnecting] = useState(false);

    const handleSSHConnect = async (credentials) => {
        setIsConnecting(true);
        console.log("Versuche Verbindung zu:", credentials.ip);

        try {
            const protocol = window.location.protocol;
            const hostname = window.location.hostname;
            const backendUrl = `${protocol}//${hostname}:3001/api/connect`;

            const response = await fetch(backendUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials)
            });

            const data = await response.json();

            if (!response.ok) {
                const errorMessage = data.error || 'Verbindung fehlgeschlagen';
                console.error("SSH Error:", new Error(errorMessage));
                alert(`Fehler: ${errorMessage}\n\nStelle sicher, dass 'node server.js' läuft!`);
                return;
            }

            if (data.success && data.config) {
                showToast(`Verbindung erfolgreich! Config geladen.`);
                onSshSuccess(data.config);
                setShowConnectionBar(false);
            }
        } catch (error) {
            console.error("Unerwarteter SSH Error:", error);
            alert(`Fehler: ${error.message}\n\nStelle sicher, dass 'node server.js' läuft!`);
        } finally {
            setIsConnecting(false);
        }
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
        useRangeCommands, setUseRangeCommands,
        includeBaseConfig, setIncludeBaseConfig,
        forcePoeReset, setForcePoeReset,
        ports,
        viewMode, setViewMode,
        singleEditPortId, setSingleEditPortId,
        showPoeColumn, setShowPoeColumn,
        showSecColumn, setShowSecColumn,
        showStateColumn, setShowStateColumn,
        showVoiceColumn, setShowVoiceColumn,
        showFastColumn, setShowFastColumn,
        toast, confirmClearDesc,
        selectedPortIds, ...setBulkState, ...bulkState,
        showSecurityOptions, setShowSecurityOptions,
        availableVlans, generatedConfig, singlePort,
        isConnecting, handleSSHConnect,
        switchToSingleEditor,
        resetState,

        // Handlers
        updatePort, toggleInclude, toggleGlobalInclude,
        handleClearDescriptions, resetPortToDefault, toggleNoShut, toggleVoiceVlan, clearSelection,
        scrollToPreviewPort, handleVisualizerClick, toggleSelection, toggleSelectAll,
        selectPortsByVlan, applyBulkEdit, copyToClipboard, downloadFile,
        handlePrevPort, handleNextPort
    };
}