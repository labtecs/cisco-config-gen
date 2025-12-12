import { useState, useMemo, useEffect } from 'react';

/**
 * Parses the raw shell output to extract structured information.
 * @param {string} text - The full output from the SSH shell.
 * @returns {object} An object containing parsed data.
 */
const parseShellOutput = (text) => {
    const result = {
        macAddress: null,
        serialNumber: null,
        gateway: null,
        runningConfig: text, // Default to full text for legacy
    };

    // Find the running-config block first to isolate it
    const configIndex = text.indexOf('show running-config');
    if (configIndex !== -1) {
        result.runningConfig = text.substring(configIndex);
    }

    // Parse show version output
    const versionBlockMatch = text.match(/show version([\s\S]*?)show ip route/);
    const versionText = versionBlockMatch ? versionBlockMatch[1] : text;
    
    const macMatch = versionText.match(/Base Ethernet MAC Address\s+:\s+([A-Fa-f0-9:.]+)/);
    if (macMatch) result.macAddress = macMatch[1];

    // Processor board ID is a reliable source for the main serial number
    const serialMatch = versionText.match(/Processor board ID\s+([A-Za-z0-9]+)/);
    if (serialMatch) result.serialNumber = serialMatch[1];

    // Parse show ip route output
    const routeBlockMatch = text.match(/show ip route([\s\S]*?)show running-config/);
    const routeText = routeBlockMatch ? routeBlockMatch[1] : text;

    const gatewayMatch = routeText.match(/Gateway of last resort is ([\d.]+) to network/);
    if (gatewayMatch) result.gateway = gatewayMatch[1];

    return result;
};


/**
 * Manages the state and logic for the Global Config tool.
 */
export function useGlobalConfig({ fileContent }) {
    // --- STATE DEFINITIONS ---
    const [hostname, setHostname] = useState('Switch');
    const [enableSecret, setEnableSecret] = useState('');
    const [vlans, setVlans] = useState([{ id: '1', name: 'default' }]);
    const [mgmtVlan, setMgmtVlan] = useState('1');
    const [mgmtIp, setMgmtIp] = useState('');
    const [mgmtMask, setMgmtMask] = useState('');
    const [mgmtDescription, setMgmtDescription] = useState('Management');
    const [defaultGateway, setDefaultGateway] = useState('');
    const [spanningTreeMode, setSpanningTreeMode] = useState('rapid-pvst');
    const [passwordEncryption, setPasswordEncryption] = useState(true);
    const [ntpServers, setNtpServers] = useState('');

    // New state
    const [macAddress, setMacAddress] = useState('');
    const [serialNumber, setSerialNumber] = useState('');
    const [isGatewayLive, setIsGatewayLive] = useState(false);

    useEffect(() => {
        if (!fileContent) return;

        // --- RESET STATE ---
        // Wichtig: Alte Werte löschen, bevor neue Daten verarbeitet werden.
        setMacAddress('');
        setSerialNumber('');
        setIsGatewayLive(false);
        setDefaultGateway(''); // Reset, falls im neuen File keines gefunden wird

        const { macAddress, serialNumber, gateway, runningConfig } = parseShellOutput(fileContent);

        if (macAddress) setMacAddress(macAddress);
        if (serialNumber) setSerialNumber(serialNumber);
        if (gateway) {
            setDefaultGateway(gateway);
            setIsGatewayLive(true);
        }

        // --- Parse running-config (as before, but on the isolated section) ---
        const lines = runningConfig.split('\n');
        const newVlans = [];
        let currentVlanContext = null;
        let inMgmtInterface = false;
        const ntp = [];

        lines.forEach(line => {
            const hostnameMatch = line.match(/^hostname\s(.+)/);
            if (hostnameMatch) setHostname(hostnameMatch[1].trim());

            const secretMatch = line.match(/^enable secret\s(.+)/);
            if (secretMatch) setEnableSecret(secretMatch[1].trim());

            const vlanMatch = line.match(/^vlan\s(\d+)/);
            if (vlanMatch) {
                currentVlanContext = vlanMatch[1];
                if (!newVlans.some(v => v.id === currentVlanContext)) {
                    newVlans.push({ id: currentVlanContext, name: '' });
                }
            }

            const nameMatch = line.match(/^\sname\s(.+)/);
            if (nameMatch && currentVlanContext) {
                const vlan = newVlans.find(v => v.id === currentVlanContext);
                if (vlan) vlan.name = nameMatch[1].trim();
                currentVlanContext = null;
            }

            const mgmtVlanMatch = line.match(/^interface Vlan(\d+)/);
            if (mgmtVlanMatch) {
                inMgmtInterface = true;
                setMgmtVlan(mgmtVlanMatch[1]);
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

            // Only set gateway from config if not found in routing table
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

        if (newVlans.length > 0) setVlans(newVlans);
        if (ntp.length > 0) setNtpServers(ntp.join(', '));

    }, [fileContent]);

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
        // New data
        macAddress,
        serialNumber,
        isGatewayLive,
    };
}