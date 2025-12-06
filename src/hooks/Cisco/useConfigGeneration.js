import { useMemo, useCallback } from 'react';
import { expandInterfaceType } from '../../utils/ciscoHelpers';

// Natural sort comparator for interface names like "GigabitEthernet1/0/2"
const naturalSort = (a, b) => {
    const aParts = a.match(/([a-zA-Z]+)|([0-9]+)/g) || [];
    const bParts = b.match(/([a-zA-Z]+)|([0-9]+)/g) || [];

    for (let i = 0; i < Math.min(aParts.length, bParts.length); i++) {
        const aPart = aParts[i];
        const bPart = bParts[i];

        if (isNaN(aPart) || isNaN(bPart)) {
            if (aPart < bPart) return -1;
            if (aPart > bPart) return 1;
        } else {
            const aNum = parseInt(aPart, 10);
            const bNum = parseInt(bPart, 10);
            if (aNum < bNum) return -1;
            if (aNum > bNum) return 1;
        }
    }

    return a.length - b.length;
};

/**
 * Manages the generation of the final configuration string.
 * @param {object} props - The props for the hook.
 * @returns {object} The generated configuration string.
 */
export function useConfigGeneration({
    ports,
    includeBaseConfig,
    includeDescriptions,
    forcePoeReset,
    useModernPortfast,
    includeNoShutdown,
    includeWrMem,
    useRangeCommands
}) {
    const getPortConfigString = useCallback((port) => {
        let lines = [];
        // Reset Logic
        if (port.resetOnly) {
            lines.push(`default interface ${port.name}`);
            return lines.join('\n');
        }
        if (port.prependDefault) {
            lines.push(`default interface ${port.name}`);
        }

        lines.push(`interface ${port.name}`);

        // 1. BASIS-KONFIGURATION (Nur wenn Checkbox an ist)
        if (includeBaseConfig) {
            if (includeDescriptions && port.description) lines.push(` description ${port.description}`);

            if (port.mode === 'access') {
                lines.push(` switchport mode access`);
                if (port.accessVlan) lines.push(` switchport access vlan ${port.accessVlan}`);
                if (port.voiceVlan) lines.push(` switchport voice vlan ${port.voiceVlan}`);
            } else if (port.mode === 'trunk') {
                lines.push(` switchport mode trunk`);
                if (port.trunkVlans && port.trunkVlans.toLowerCase() !== 'all') lines.push(` switchport trunk allowed vlan ${port.trunkVlans}`);
                if (port.nativeVlan && port.nativeVlan != 1) lines.push(` switchport trunk native vlan ${port.nativeVlan}`);
            }
        }

        // 2. POE KONFIGURATION (Separat behandelt)
        if (port.poeMode === 'never') {
            lines.push(` power inline never`);
        } else if (port.poeMode === 'static') {
            lines.push(` power inline static`);
        } else if (port.poeMode === 'auto') {
            // SPEZIAL-LOGIK: Wenn "Force Reset" an ist
            if (forcePoeReset) {
                lines.push(` no power inline never`);
            }
        }

        // 3. SECURITY (Nur mit Base Config sinnvoll)
        if (includeBaseConfig && port.mode === 'access' && port.portSecurity) {
            lines.push(` switchport port-security`);
            if (port.secMax > 1) lines.push(` switchport port-security maximum ${port.secMax}`);
            if (port.secViolation !== 'shutdown') lines.push(` switchport port-security violation ${port.secViolation}`);
            if (port.secSticky) lines.push(` switchport port-security mac-address sticky`);
            if (port.secAgingTime > 0) {
                lines.push(` switchport port-security aging time ${port.secAgingTime}`);
                lines.push(` switchport port-security aging type ${port.secAgingType}`);
            }
        }

        // 4. PORTFAST (Nur mit Base Config)
        if (includeBaseConfig && port.portfast) {
            lines.push(useModernPortfast ? ` spanning-tree portfast edge` : ` spanning-tree portfast`);
        }

        // 5. SHUTDOWN STATE (Immer wichtig)
        if (includeNoShutdown) {
            if (port.noShutdown) lines.push(` no shutdown`); else lines.push(` shutdown`);
        } else {
            if (!port.noShutdown) lines.push(` shutdown`);
        }

        lines.push(` exit`);
        return lines.join('\n');
    }, [includeBaseConfig, includeDescriptions, forcePoeReset, useModernPortfast, includeNoShutdown]);

    /**
     * Compresses a list of interface names into a Cisco-compatible 'interface range' string.
     * Example: ['GigabitEthernet1/0/1', 'GigabitEthernet1/0/2'] becomes 'interface range GigabitEthernet1/0/1 - 2'
     * @param {string[]} interfaces - An array of full interface names.
     * @returns {{ranges: string[], singles: string[]}} An object containing range commands and single interface names.
     */
    const createInterfaceRangeString = (interfaces) => {
        if (!interfaces || interfaces.length === 0) return { ranges: [], singles: [] };

        // Group interfaces by their type prefix (e.g., "GigabitEthernet1/0/")
        const groups = interfaces.reduce((acc, name) => {
            const match = name.match(/^([a-zA-Z]+)(\d+\/\d+\/|\d+\/)/); // Matches "1/0/" or "0/"
            if (match) {
                const prefix = match[1] + match[2]; // e.g. "GigabitEthernet1/0/"
                const portNum = parseInt(name.substring(prefix.length));
                if (!acc[prefix]) acc[prefix] = [];
                acc[prefix].push(portNum);
            } else {
                // Fallback for interfaces that can't be ranged (e.g., Vlan, Loopback)
                if (!acc['single']) acc['single'] = [];
                acc['single'].push(name);
            }
            return acc;
        }, {});

        const rangeCommands = [];

        for (const prefix in groups) {
            if (prefix === 'single') continue;

            const ports = groups[prefix].sort((a, b) => a - b);
            if (ports.length === 0) continue;

            let rangeStr = '';
            let start = ports[0];

            for (let i = 1; i <= ports.length; i++) {
                if (i === ports.length || ports[i] !== ports[i - 1] + 1) {
                    const end = ports[i - 1];
                    if (rangeStr) rangeStr += ', ';
                    rangeStr += start === end ? `${start}` : `${start} - ${end}`;
                    if (i < ports.length) start = ports[i];
                }
            }
            const interfaceType = prefix.match(/^[a-zA-Z]+/)[0];
            const slotInfo = prefix.substring(interfaceType.length);
            rangeCommands.push(`interface range ${expandInterfaceType(interfaceType)} ${slotInfo}${rangeStr}`);
        }

        return { ranges: rangeCommands, singles: groups['single'] || [] };
    };

    const generatedConfig = useMemo(() => {
        const includedPorts = ports.filter(p => p.includeInConfig);
        if (includedPorts.length === 0) return "! No ports selected for configuration.\nend\n";

        let output = "! Generated Switchport Config\n";

        if (!useRangeCommands) {
            // If not using range commands, generate individual config for each port.
            const singlePortConfigs = includedPorts.map(port => getPortConfigString(port));
            singlePortConfigs.sort((a, b) => {
                const aName = a.match(/^interface\s(.+)/m)?.[1];
                const bName = b.match(/^interface\s(.+)/m)?.[1];
                return naturalSort(aName, bName);
            });
            output += singlePortConfigs.join("\n\n") + "\n\n";
        } else {
            // Helper to create a config signature for a port.
            const getConfigSignature = (port) => {
                const {
                    id, name, bulkGroupId, isUplink, includeInConfig,
                    ...configProps
                } = port;
                return JSON.stringify(Object.entries(configProps).sort()); // Sort for stable signature
            };

            // 1. Group all included ports by their configuration signature.
            const configGroups = new Map();
            includedPorts.forEach(port => {
                const signature = getConfigSignature(port);
                if (!configGroups.has(signature)) {
                    configGroups.set(signature, []);
                }
                configGroups.get(signature).push(port);
            });

            const singlePortConfigs = [];

            // 2. Process each group.
            configGroups.forEach(portGroup => {
                if (portGroup.length > 1) {
                    const representativePort = portGroup[0];
                    const configBody = getPortConfigString(representativePort).split('\n').slice(1, -1).join('\n');
                    const interfaceNames = portGroup.map(p => p.name);
                    const { ranges, singles } = createInterfaceRangeString(interfaceNames);

                    ranges.forEach(rangeCmd => {
                        output += `${rangeCmd}\n${configBody}\n exit\n\n`;
                    });

                    // Non-rangeable ports are treated as singles.
                    singles.forEach(singleName => {
                        const singlePort = portGroup.find(p => p.name === singleName);
                        if (singlePort) {
                            singlePortConfigs.push(getPortConfigString(singlePort));
                        }
                    });
                } else {
                    // Groups of one are just single ports.
                    singlePortConfigs.push(getPortConfigString(portGroup[0]));
                }
            });

            // 3. Process all single ports, sort them for predictable output, and add to the final config.
            singlePortConfigs.sort((a, b) => {
                const aName = a.match(/^interface\s(.+)/m)?.[1];
                const bName = b.match(/^interface\s(.+)/m)?.[1];
                return naturalSort(aName, bName);
            });
            if (singlePortConfigs.length > 0) {
                output += singlePortConfigs.join("\n\n") + "\n\n";
            }
        }

        // Final cleanup and additions
        output = output.trim() + "\n\nend\n";
        if (includeWrMem) { output += "wr mem\n"; }
        return output;
    }, [ports, includeWrMem, getPortConfigString, useRangeCommands]);

    return { generatedConfig };
}