import { useState, useMemo, useEffect } from 'react';

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

    useEffect(() => {
        if (fileContent) {
            const lines = fileContent.split('\n');
            const newVlans = [];
            let currentVlan = null;
            const ntp = [];

            lines.forEach(line => {
                const hostnameMatch = line.match(/^hostname\s(.+)/);
                if (hostnameMatch) setHostname(hostnameMatch[1]);

                const secretMatch = line.match(/^enable secret\s(.+)/);
                if (secretMatch) setEnableSecret(secretMatch[1]);

                const vlanMatch = line.match(/^vlan\s(\d+)/);
                if (vlanMatch) {
                    currentVlan = vlanMatch[1];
                    newVlans.push({ id: currentVlan, name: '' });
                }

                const nameMatch = line.match(/^\sname\s(.+)/);
                if (nameMatch && currentVlan) {
                    const vlan = newVlans.find(v => v.id === currentVlan);
                    if (vlan) vlan.name = nameMatch[1];
                    currentVlan = null;
                }

                const mgmtVlanMatch = line.match(/^interface Vlan(\d+)/);
                if (mgmtVlanMatch) setMgmtVlan(mgmtVlanMatch[1]);

                const mgmtIpMatch = line.match(/^\sip address\s([\d.]+)\s([\d.]+)/);
                if (mgmtIpMatch) {
                    setMgmtIp(mgmtIpMatch[1]);
                    setMgmtMask(mgmtIpMatch[2]);
                }

                const mgmtDescMatch = line.match(/^\sdescription\s(.+)/);
                if (mgmtDescMatch) setMgmtDescription(mgmtDescMatch[1]);

                const gatewayMatch = line.match(/^ip default-gateway\s(.+)/);
                if (gatewayMatch) setDefaultGateway(gatewayMatch[1]);

                const spanningTreeMatch = line.match(/^spanning-tree mode\s(.+)/);
                if (spanningTreeMatch) setSpanningTreeMode(spanningTreeMatch[1]);

                const ntpMatch = line.match(/^ntp server\s(.+)/);
                if (ntpMatch) ntp.push(ntpMatch[1]);
            });

            if (newVlans.length > 0) setVlans(newVlans);
            if (ntp.length > 0) setNtpServers(ntp.join(', '));
        }
    }, [fileContent]);

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