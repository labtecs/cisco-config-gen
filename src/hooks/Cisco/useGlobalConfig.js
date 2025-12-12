import { useState, useMemo, useEffect, useCallback } from 'react';
import { parseVlanString } from '../../utils/ciscoHelpers';

/**
 * Parses the raw shell output to extract structured information.
 * @param {string} text - The full output from the SSH shell.
 * @returns {object} An object containing parsed data.
 */
const parseShellOutput = (text) => {
    // Normalize line endings first to ensure regex anchors work consistently
    const normalizedText = text.replace(/\r\n/g, '\n');

    const result = {
        macAddress: null,
        serialNumber: null,
        gateway: null,
        vlans: [],
        runningConfig: normalizedText, // Default to full text for legacy
    };

    // Isolate blocks (Robust: allow 'show' or 'sh')
    const versionBlockMatch = normalizedText.match(/(?:show|sh) version([\s\S]*?)(?:(?:show|sh) vlan brief|(?:show|sh) ip route)/i);
    const vlanBlockMatch = normalizedText.match(/(?:show|sh) vlan brief([\s\S]*?)(?:show|sh) ip route/i);
    const routeBlockMatch = normalizedText.match(/(?:show|sh) ip route([\s\S]*?)(?:show|sh) running-config/i);
    // Fix: Auch 'sh run' oder 'sh running-config' erkennen
    const configMatch = normalizedText.match(/(?:show|sh) running-config/);
    const configIndex = configMatch ? configMatch.index : -1;

    if (configIndex !== -1) {
        result.runningConfig = normalizedText.substring(configIndex);
    }

    // Parse show version
    const versionText = versionBlockMatch ? versionBlockMatch[1] : normalizedText;
    // Regex toleranter gemacht: Case-Insensitive (/i) und optionales "Ethernet"
    const macMatch = versionText.match(/Base (?:Ethernet )?MAC Address\s*:\s*([A-Fa-f0-9:.]+)/i);
    if (macMatch) result.macAddress = macMatch[1];
    const serialMatch = versionText.match(/Processor board ID\s+([A-Za-z0-9]+)/);
    if (serialMatch) result.serialNumber = serialMatch[1];

    // Parse show vlan brief
    if (vlanBlockMatch) {
        // Regex angepasst: Erlaubt 'sh vlan brief', Leerzeichen im Namen und Status 'active' oder 'act/unsup'
        // Fix: Case-Insensitive (/i), erlaubt führende Leerzeichen (^\s*), und Status 'suspended'
        const vlanRegex = /^\s*(\d+)\s+(.+?)\s+(?:active|act\/unsup|suspended)/gmi;
        let match;
        while ((match = vlanRegex.exec(vlanBlockMatch[1])) !== null) {
            result.vlans.push({ id: match[1], name: match[2].trim() });
        }
    }

    // Parse show ip route
    const routeText = routeBlockMatch ? routeBlockMatch[1] : normalizedText;
    const gatewayMatch = routeText.match(/Gateway of last resort is ([\d.]+) to network/);
    if (gatewayMatch) result.gateway = gatewayMatch[1];

    return result;
};

const initialState = {
    hostname: 'Switch',
    enableSecret: '',
    vlans: [{ id: '1', name: 'default' }],
    mgmtVlan: '1',
    mgmtIp: '',
    mgmtMask: '',
    mgmtDescription: 'Management',
    defaultGateway: '',
    spanningTreeMode: 'rapid-pvst',
    passwordEncryption: true,
    ntpServers: '',
    macAddress: '',
    serialNumber: '',
    isGatewayLive: false,
};

/**
 * Manages the state and logic for the Global Config tool.
 */
export function useGlobalConfig({ fileContent }) {
    // --- STATE DEFINITIONS ---
    const [hostname, setHostname] = useState(initialState.hostname);
    const [enableSecret, setEnableSecret] = useState(initialState.enableSecret);
    const [vlans, setVlans] = useState(initialState.vlans);
    const [mgmtVlan, setMgmtVlan] = useState(initialState.mgmtVlan);
    const [mgmtIp, setMgmtIp] = useState(initialState.mgmtIp);
    const [mgmtMask, setMgmtMask] = useState(initialState.mgmtMask);
    const [mgmtDescription, setMgmtDescription] = useState(initialState.mgmtDescription);
    const [defaultGateway, setDefaultGateway] = useState(initialState.defaultGateway);
    const [spanningTreeMode, setSpanningTreeMode] = useState(initialState.spanningTreeMode);
    const [passwordEncryption, setPasswordEncryption] = useState(initialState.passwordEncryption);
    const [ntpServers, setNtpServers] = useState(initialState.ntpServers);
    const [macAddress, setMacAddress] = useState(initialState.macAddress);
    const [serialNumber, setSerialNumber] = useState(initialState.serialNumber);
    const [isGatewayLive, setIsGatewayLive] = useState(initialState.isGatewayLive);
    const [manualData, setManualData] = useState({ version: '', vlan: '', route: '', config: '' });

    const resetState = useCallback(() => {
        setHostname(initialState.hostname);
        setEnableSecret(initialState.enableSecret);
        setVlans(initialState.vlans);
        setMgmtVlan(initialState.mgmtVlan);
        setMgmtIp(initialState.mgmtIp);
        setMgmtMask(initialState.mgmtMask);
        setMgmtDescription(initialState.mgmtDescription);
        setDefaultGateway(initialState.defaultGateway);
        setSpanningTreeMode(initialState.spanningTreeMode);
        setPasswordEncryption(initialState.passwordEncryption);
        setNtpServers(initialState.ntpServers);
        setMacAddress(initialState.macAddress);
        setSerialNumber(initialState.serialNumber);
        setIsGatewayLive(initialState.isGatewayLive);
        setManualData({ version: '', vlan: '', route: '', config: '' });
    }, []);

    const handleManualUpload = useCallback((type, content) => {
        setManualData(prev => ({ ...prev, [type]: content }));
    }, []);

    useEffect(() => {
        // Prüfen, ob wir überhaupt Daten haben (Entweder globaler FileContent oder manuelle Uploads)
        const hasManualData = Object.values(manualData).some(val => val.length > 0);

        if (!fileContent && !hasManualData) {
            resetState();
            return;
        }

        let textToParse = '';

        if (hasManualData) {
            // Wir bauen einen künstlichen SSH-Output, damit der Parser funktioniert.
            // Der Parser verlässt sich auf die Reihenfolge der Befehle als Trenner.
            // Falls 'fileContent' existiert, aber kein SSH-Dump ist (sondern nur Config), nutzen wir es als Fallback für Config.
            const configPart = manualData.config || (fileContent && !fileContent.match(/(?:show|sh) version/i) ? fileContent : '');

            textToParse = `
show version
${manualData.version}
show vlan brief
${manualData.vlan}
show ip route
${manualData.route}
show running-config
${configPart}
            `;
        } else {
            textToParse = fileContent;
        }

        const { macAddress, serialNumber, gateway, vlans: liveVlans, runningConfig } = parseShellOutput(textToParse);

        // Use live data if available
        if (macAddress) setMacAddress(macAddress);
        if (serialNumber) setSerialNumber(serialNumber);
        if (gateway) {
            setDefaultGateway(gateway);
            setIsGatewayLive(true);
        }

        const vlanMap = new Map();
        if (liveVlans.length > 0) {
            liveVlans.forEach(v => vlanMap.set(v.id, v));
        }

        // --- Parse running-config ---
        // WICHTIG: Übernahme der Logik aus dem Port-Generator (CRLF Fix)
        const lines = runningConfig.replace(/\r\n/g, '\n').split('\n');
        let currentVlanContext = null;
        let inMgmtInterface = false;
        const ntp = [];

        lines.forEach(line => {
            const hostnameMatch = line.match(/^hostname\s(.+)/);
            if (hostnameMatch) setHostname(hostnameMatch[1].trim());

            const secretMatch = line.match(/^enable secret\s(.+)/);
            if (secretMatch) setEnableSecret(secretMatch[1].trim());

            // Regex robuster gemacht: Erlaubt Einrückungen (Leerzeichen/Tabs) am Zeilenanfang
            const vlanMatch = line.match(/^\s*vlan\s+(\d+)/i);
            if (vlanMatch) {
                currentVlanContext = vlanMatch[1];
                if (!vlanMap.has(currentVlanContext)) {
                    vlanMap.set(currentVlanContext, { id: currentVlanContext, name: '' });
                }
            }

            // Regex robuster gemacht: Erlaubt beliebige Einrückung vor 'name'
            const nameMatch = line.match(/^\s*name\s+(.+)/i);
            if (nameMatch && currentVlanContext) {
                const vlan = vlanMap.get(currentVlanContext);
                if (vlan) vlan.name = nameMatch[1].trim();
                currentVlanContext = null;
            }

            // Feature: Parse 'vlan configuration 1,2,3' (Newer IOS syntax)
            const vlanConfigMatch = line.match(/^vlan configuration\s+([0-9,-]+)/i);
            if (vlanConfigMatch) {
                const vlanIds = parseVlanString(vlanConfigMatch[1]);
                // Performance: Ignoriere riesige Ranges (z.B. 2-4094), um UI-Freeze zu verhindern
                if (vlanIds.length < 50) {
                    vlanIds.forEach(id => {
                        const strId = String(id);
                        if (!vlanMap.has(strId)) {
                            vlanMap.set(strId, { id: strId, name: 'Configured' });
                        }
                    });
                }
            }

            // Feature: VLANs erkennen, die auf Interfaces genutzt werden (auch wenn 'vlan X' Block fehlt)
            const accessVlanMatch = line.match(/^\s*switchport access vlan\s+(\d+)/i);
            if (accessVlanMatch) {
                const vId = accessVlanMatch[1];
                if (!vlanMap.has(vId)) {
                    vlanMap.set(vId, { id: vId, name: 'Detected' });
                }
            }

            const voiceVlanMatch = line.match(/^\s*switchport voice vlan\s+(\d+)/i);
            if (voiceVlanMatch) {
                const vId = voiceVlanMatch[1];
                if (!vlanMap.has(vId)) {
                    vlanMap.set(vId, { id: vId, name: 'Voice' });
                }
            }

            // Feature: Detect VLANs on Trunks (allowed vlan ...)
            const trunkVlanMatch = line.match(/^\s*switchport trunk allowed vlan\s+(?:add\s+)?([0-9,-]+)/i);
            if (trunkVlanMatch) {
                const vlanIds = parseVlanString(trunkVlanMatch[1]);
                // Performance: Ignoriere riesige Ranges auf Trunks
                if (vlanIds.length < 50) {
                    vlanIds.forEach(id => {
                        const strId = String(id);
                        if (!vlanMap.has(strId)) {
                            vlanMap.set(strId, { id: strId, name: 'Trunk Used' });
                        }
                    });
                }
            }

            // Kontext zurücksetzen, wenn ein neuer Block beginnt (Sicherheit)
            if (line.trim() === '!' || line.match(/^\s*interface/)) {
                currentVlanContext = null;
            }

            const mgmtVlanMatch = line.match(/^interface Vlan(\d+)/i);
            if (mgmtVlanMatch) {
                inMgmtInterface = true;
                const vId = mgmtVlanMatch[1];
                setMgmtVlan(vId);
                // Feature: Management VLAN automatisch zur Liste hinzufügen, falls es fehlt
                if (!vlanMap.has(vId)) {
                    vlanMap.set(vId, { id: vId, name: 'Management' });
                }
            }
            
            if (inMgmtInterface) {
                const mgmtIpMatch = line.match(/^\s*ip address\s([\d.]+)\s([\d.]+)/);
                if (mgmtIpMatch) {
                    setMgmtIp(mgmtIpMatch[1]);
                    setMgmtMask(mgmtIpMatch[2]);
                }
                const mgmtDescMatch = line.match(/^\s*description\s(.+)/);
                if (mgmtDescMatch) setMgmtDescription(mgmtDescMatch[1].trim());
            }

            if (line.trim() === '!') inMgmtInterface = false;

            const gatewayMatch = line.match(/^ip default-gateway\s(.+)/);
            if (gatewayMatch && !gateway) {
                setDefaultGateway(gatewayMatch[1].trim());
                setIsGatewayLive(false);
            }

            const spanningTreeMatch = line.match(/^spanning-tree mode\s(.+)/);
            if (spanningTreeMatch) setSpanningTreeMode(spanningTreeMatch[1].trim());

            const ntpMatch = line.match(/^ntp server\s(.+)/);
            if (ntpMatch) ntp.push(ntpMatch[1].trim());
        });

        const finalVlans = Array.from(vlanMap.values()).sort((a, b) => parseInt(a.id) - parseInt(b.id));
        if (finalVlans.length > 0) {
            setVlans(finalVlans);
        } else {
            setVlans(initialState.vlans); // Fallback to default if nothing found
        }
        
        if (ntp.length > 0) setNtpServers(ntp.join(', '));

    }, [fileContent, resetState, manualData]);

    // --- VLAN HANDLERS ---
    const addVlan = () => setVlans([...vlans, { id: '', name: '' }]);
    const updateVlan = (index, field, value) => {
        const newVlans = [...vlans];
        newVlans[index][field] = value;
        setVlans(newVlans);
    };
    const removeVlan = (index) => setVlans(vlans.filter((_, i) => i !== index));

    // --- CONFIG GENERATION ---
    const generatedConfig = useMemo(() => {
        let output = `! Generated Global Config\n!\n`;
        output += `hostname ${hostname}\n`;
        if (enableSecret) output += `enable secret ${enableSecret}\n`;
        output += `!\n`;
        vlans.forEach(vlan => {
            if (vlan.id && vlan.name) output += `vlan ${vlan.id}\n name ${vlan.name}\n!\n`;
        });
        if (mgmtVlan && mgmtIp && mgmtMask) {
            output += `interface Vlan${mgmtVlan}\n`;
            if (mgmtDescription) output += ` description ${mgmtDescription}\n`;
            output += ` ip address ${mgmtIp} ${mgmtMask}\n no shutdown\n!\n`;
        }
        if (defaultGateway) output += `ip default-gateway ${defaultGateway}\n!\n`;
        if (spanningTreeMode) output += `spanning-tree mode ${spanningTreeMode}\n`;
        if (passwordEncryption) output += `service password-encryption\n`;
        if (ntpServers) {
            ntpServers.split(',').forEach(server => {
                if (server.trim()) output += `ntp server ${server.trim()}\n`;
            });
        }
        output += `!\nend\n`;
        return output;
    }, [hostname, enableSecret, vlans, mgmtVlan, mgmtIp, mgmtMask, mgmtDescription, defaultGateway, spanningTreeMode, passwordEncryption, ntpServers]);

    // --- ACTIONS ---
    const copyToClipboard = async () => {
        if (!navigator.clipboard) return;
        await navigator.clipboard.writeText(generatedConfig);
    };
    const downloadFile = () => {
        const blob = new Blob([generatedConfig], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "global_config.txt";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return {
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
        handleManualUpload, // Exportieren für UI
    };
}