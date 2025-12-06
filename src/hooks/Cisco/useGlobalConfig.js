import { useState, useMemo } from 'react';

/**
 * Manages the state and logic for the Global Config tool.
 */
export function useGlobalConfig() {
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

    // --- VLAN HANDLERS ---
    const addVlan = () => {
        setVlans([...vlans, { id: '', name: '' }]);
    };

    const updateVlan = (index, field, value) => {
        const newVlans = [...vlans];
        newVlans[index][field] = value;
        setVlans(newVlans);
    };

    const removeVlan = (index) => {
        const newVlans = vlans.filter((_, i) => i !== index);
        setVlans(newVlans);
    };

    // --- CONFIG GENERATION ---
    const generatedConfig = useMemo(() => {
        let output = `! Generated Global Config\n!\n`;

        // General
        output += `hostname ${hostname}\n`;
        if (enableSecret) {
            output += `enable secret ${enableSecret}\n`;
        }
        output += `!\n`;

        // VLANs
        vlans.forEach(vlan => {
            if (vlan.id && vlan.name) {
                output += `vlan ${vlan.id}\n name ${vlan.name}\n!\n`;
            }
        });

        // Management SVI
        if (mgmtVlan && mgmtIp && mgmtMask) {
            output += `interface Vlan${mgmtVlan}\n`;
            if (mgmtDescription) {
                output += ` description ${mgmtDescription}\n`;
            }
            output += ` ip address ${mgmtIp} ${mgmtMask}\n`;
            output += ` no shutdown\n!\n`;
        }

        // Routing
        if (defaultGateway) {
            output += `ip default-gateway ${defaultGateway}\n!\n`;
        }

        // Services
        if (spanningTreeMode) {
            output += `spanning-tree mode ${spanningTreeMode}\n`;
        }
        if (passwordEncryption) {
            output += `service password-encryption\n`;
        }
        if (ntpServers) {
            ntpServers.split(',').forEach(server => {
                if (server.trim()) {
                    output += `ntp server ${server.trim()}\n`;
                }
            });
        }
        output += `!\nend\n`;

        return output;
    }, [hostname, enableSecret, vlans, mgmtVlan, mgmtIp, mgmtMask, mgmtDescription, defaultGateway, spanningTreeMode, passwordEncryption, ntpServers]);

    // --- ACTIONS ---
    const copyToClipboard = async () => {
        if (!navigator.clipboard) {
            console.error("Clipboard API not available.");
            return;
        }
        try {
            await navigator.clipboard.writeText(generatedConfig);
        } catch (err) {
            console.error("Failed to copy config:", err);
        }
    };

    const downloadFile = () => {
        const blob = new Blob([generatedConfig], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const element = document.createElement("a");
        element.href = url;
        element.download = "global_config.txt";
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
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
    };
}