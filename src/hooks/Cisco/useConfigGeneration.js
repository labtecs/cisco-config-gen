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
    portChannels,
    includeBaseConfig,
    includeDescriptions,
    forcePoeReset,
    useModernPortfast,
    includeNoShutdown,
    includeWrMem,
    useRangeCommands,
    showOnlyChanges // <-- New prop
}) {
    const getPortConfigString = useCallback((port) => {
        let lines = [];
        if (port.resetOnly) {
            lines.push(`default interface ${port.name}`);
            return lines.join('\n');
        }
        if (port.prependDefault) {
            lines.push(`default interface ${port.name}`);
        }

        lines.push(`interface ${port.name}`);

        if (includeDescriptions && port.description) {
            lines.push(` description ${port.description}`);
        }

        // --- Port-Channel Member Logic ---
        if (port.channelGroupId) {
            lines.push(` channel-group ${port.channelGroupId} mode active`);
            if (includeNoShutdown) {
                if (port.noShutdown) lines.push(` no shutdown`); else lines.push(` shutdown`);
            }
            lines.push(` exit`);
            return lines.join('\n');
        }
        
        // --- Regular Port Logic ---
        if (includeBaseConfig) {
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

        if (port.poeMode === 'never') {
            lines.push(` power inline never`);
        } else if (port.poeMode === 'static') {
            lines.push(` power inline static`);
        } else if (port.poeMode === 'auto' && forcePoeReset) {
            lines.push(` no power inline never`);
        }

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

        if (includeBaseConfig && port.portfast) {
            lines.push(useModernPortfast ? ` spanning-tree portfast edge` : ` spanning-tree portfast`);
        }

        if (includeNoShutdown) {
            if (port.noShutdown) lines.push(` no shutdown`); else lines.push(` shutdown`);
        } else {
            if (!port.noShutdown) lines.push(` shutdown`);
        }

        lines.push(` exit`);
        return lines.join('\n');
    }, [includeBaseConfig, includeDescriptions, forcePoeReset, useModernPortfast, includeNoShutdown]);

    const createInterfaceRangeString = (interfaces) => {
        if (!interfaces || interfaces.length === 0) return { ranges: [], singles: [] };

        const groups = interfaces.reduce((acc, name) => {
            const match = name.match(/^([a-zA-Z]+)(\d+\/\d+\/|\d+\/)/);
            if (match) {
                const prefix = match[1] + match[2];
                const portNum = parseInt(name.substring(prefix.length));
                if (!acc[prefix]) acc[prefix] = [];
                acc[prefix].push(portNum);
            } else {
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

            let start = ports[0];
            for (let i = 1; i <= ports.length; i++) {
                if (i === ports.length || ports[i] !== ports[i - 1] + 1) {
                    const end = ports[i - 1];
                    const interfaceType = prefix.match(/^[a-zA-Z]+/)[0];
                    const slotInfo = prefix.substring(interfaceType.length);
                    if (start === end) {
                        rangeCommands.push(`interface ${expandInterfaceType(interfaceType)}${slotInfo}${start}`);
                    } else {
                        rangeCommands.push(`interface range ${expandInterfaceType(interfaceType)} ${slotInfo}${start} - ${end}`);
                    }
                    if (i < ports.length) start = ports[i];
                }
            }
        }

        return { ranges: rangeCommands, singles: groups['single'] || [] };
    };

    const generatedConfig = useMemo(() => {
        let output = showOnlyChanges 
            ? "! Showing Only Changed Interfaces\n"
            : "! Generated Switchport Config\n";

        // 1. Generate Port-Channel Interface Configs
        // Note: Port-channel changes are not tracked with isDirty yet. For now, they are always included.
        if (portChannels && portChannels.length > 0) {
            portChannels.forEach(pc => {
                output += `!\ninterface ${pc.name}\n`;
                if (includeDescriptions && pc.description) {
                    output += ` description ${pc.description}\n`;
                }
                if (pc.mode === 'access') {
                    output += ` switchport mode access\n`;
                    if (pc.accessVlan) output += ` switchport access vlan ${pc.accessVlan}\n`;
                } else { // Default to trunk
                    output += ` switchport mode trunk\n`;
                    if (pc.trunkVlans && pc.trunkVlans.toLowerCase() !== 'all') {
                        output += ` switchport trunk allowed vlan ${pc.trunkVlans}\n`;
                    }
                    if (pc.nativeVlan && pc.nativeVlan != 1) {
                        output += ` switchport trunk native vlan ${pc.nativeVlan}\n`;
                    }
                }
                output += ` exit\n`;
            });
            output += '!\n';
        }

        // 2. Generate Physical Interface Configs
        let portsToProcess = ports.filter(p => p.includeInConfig);

        // <-- START of new logic
        if (showOnlyChanges) {
            portsToProcess = portsToProcess.filter(p => p.isDirty);
        }
        // <-- END of new logic

        if (portsToProcess.length === 0 && (!portChannels || portChannels.length === 0)) {
            return "! No configuration to generate.\nend\n";
        }

        if (!useRangeCommands) {
            const singlePortConfigs = portsToProcess.map(port => getPortConfigString(port));
            singlePortConfigs.sort((a, b) => {
                const aName = a.match(/^interface\s(.+)/m)?.[1];
                const bName = b.match(/^interface\s(.+)/m)?.[1];
                return naturalSort(aName, bName);
            });
            output += singlePortConfigs.join("\n\n") + "\n\n";
        } else {
            const getConfigSignature = (port) => {
                const {
                    id, name, bulkGroupId, isUplink, includeInConfig, isDirty, // Exclude isDirty from signature
                    ...configProps
                } = port;
                if (port.channelGroupId) {
                    return `channel-member-${port.channelGroupId}-${port.description}-${port.noShutdown}`;
                }
                return JSON.stringify(Object.entries(configProps).sort());
            };

            const configGroups = new Map();
            portsToProcess.forEach(port => {
                const signature = getConfigSignature(port);
                if (!configGroups.has(signature)) {
                    configGroups.set(signature, []);
                }
                configGroups.get(signature).push(port);
            });

            const singlePortConfigs = [];
            configGroups.forEach(portGroup => {
                const representativePort = portGroup[0];
                const configBody = getPortConfigString(representativePort).split('\n').slice(1, -1).join('\n');
                const interfaceNames = portGroup.map(p => p.name);
                const { ranges, singles } = createInterfaceRangeString(interfaceNames);

                ranges.forEach(rangeCmd => {
                    output += `${rangeCmd}\n${configBody}\n exit\n\n`;
                });

                singles.forEach(singleName => {
                    const singlePort = portGroup.find(p => p.name === singleName);
                    if (singlePort) {
                        singlePortConfigs.push(getPortConfigString(singlePort));
                    }
                });
            });

            singlePortConfigs.sort((a, b) => {
                const aName = a.match(/^interface\s(.+)/m)?.[1];
                const bName = b.match(/^interface\s(.+)/m)?.[1];
                return naturalSort(aName, bName);
            });
            if (singlePortConfigs.length > 0) {
                output += singlePortConfigs.join("\n\n") + "\n\n";
            }
        }

        output = output.trim() + "\n\nend\n";
        if (includeWrMem) { output += "wr mem\n"; }
        return output;
    }, [ports, portChannels, includeWrMem, getPortConfigString, useRangeCommands, includeDescriptions, showOnlyChanges]);

    return { generatedConfig };
}