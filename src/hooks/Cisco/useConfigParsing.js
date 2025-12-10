import { useCallback, useMemo } from 'react';
import { expandInterfaceType } from '../../utils/ciscoHelpers';

/**
 * Manages the parsing of a running-config file.
 * @returns {object} The parsing function.
 */
export function useConfigParsing() {
    const parseRunningConfig = useCallback((text) => {
        const hostnameMatch = text.match(/^hostname\s+(\S+)/m);
        const versionMatch = text.match(/^version\s+(\d+\.?\d*)/m);
        const useModernPortfast = text.includes('spanning-tree portfast edge');

        // Normalize line endings to handle SSH output (\r\n) correctly
        const lines = text.replace(/\r\n/g, '\n').split('\n');
        let newPortsMap = new Map();
        const interfaceRegex = /^interface\s+([a-zA-Z-]+)\s*([0-9/.]+)/i;
        let detectedNaming = 'simple';
        const voiceVlanCounts = {};
        const declaredVlans = new Set();
        const detectedVlanNames = {};
        let currentDefVlanId = null;
        let parsedPortChannels = [];
        let currentPortChannel = null;
        const provisionedSwitches = new Map();

        // First pass to find stack members and determine naming convention robustly
        lines.forEach(line => {
            const trimmed = line.trim();
            const match = trimmed.match(interfaceRegex);

            // Determine naming convention
            if (match && !match[1].toLowerCase().includes('vlan') && !match[1].toLowerCase().startsWith('port-channel')) {
                const parts = match[2].split('/');
                if (parts.length === 3) {
                    detectedNaming = 'stack';
                }
            }

            if (trimmed.includes('switchport voice vlan')) {
                const [, vlanPart] = trimmed.split('vlan ');
                const v = vlanPart?.split(/\s+/)[0];
                if (v) { voiceVlanCounts[v] = (voiceVlanCounts[v] || 0) + 1; }
            }

            const sviMatch = trimmed.match(/^interface Vlan\s?(\d+)/i);
            if (sviMatch && sviMatch[1]) declaredVlans.add(sviMatch[1]);

            const l2Match = trimmed.match(/^vlan\s+(\d+)/i);
            if (l2Match && l2Match[1]) {
                declaredVlans.add(l2Match[1]);
                currentDefVlanId = l2Match[1];
            } else if (currentDefVlanId && trimmed.startsWith('name ')) {
                detectedVlanNames[currentDefVlanId] = trimmed.substring(5).trim();
            }
            if (trimmed.startsWith('interface') || trimmed === '!') currentDefVlanId = null;

            const provisionMatch = trimmed.match(/^switch\s+(\d+)\s+provision\s+([a-zA-Z0-9-]+)/i);
            if (provisionMatch) {
                const [, switchNum, model] = provisionMatch;
                let portCount = 24; // Default
                if (model.includes('12')) portCount = 12;
                if (model.includes('24')) portCount = 24;
                if (model.includes('48')) portCount = 48;
                
                let baseType = 'GigabitEthernet';
                if (model.includes('xs')) baseType = 'TenGigabitEthernet';

                provisionedSwitches.set(parseInt(switchNum), {
                    model: portCount,
                    uplinkCount: 4, // This might need to be dynamic based on model
                    baseInterfaceType: baseType,
                    uplinkInterfaceType: 'TenGigabitEthernet' // Default, can be refined
                });
            }
        });

        let maxCount = 0;
        let detectedVoiceVlan = '';
        Object.entries(voiceVlanCounts).forEach(([vlan, count]) => {
            if (count > maxCount) { maxCount = count; detectedVoiceVlan = vlan; }
        });

        let currentInterface = null;
        lines.forEach(line => {
            const trimmed = line.trim();
            const match = trimmed.match(interfaceRegex);

            if (match) {
                if (currentInterface) newPortsMap.set(currentInterface.id, currentInterface);
                if (currentPortChannel) parsedPortChannels.push(currentPortChannel);
                currentInterface = null;
                currentPortChannel = null;

                const type = match[1].toLowerCase();
                const numbering = match[2];

                if (type.startsWith('port-channel')) {
                    currentPortChannel = {
                        id: numbering,
                        name: `Port-channel${numbering}`,
                        description: '',
                        mode: 'trunk',
                        trunkVlans: 'all',
                        nativeVlan: 1,
                    };
                } else if (!type.startsWith('vlan')) { // Process only physical interfaces
                    currentInterface = {
                        id: numbering, name: `${expandInterfaceType(match[1])}${numbering}`, description: '', mode: 'access', accessVlan: '', trunkVlans: '', nativeVlan: 1,
                        portfast: false, voiceVlan: '', includeInConfig: false, isUplink: false, bulkGroupId: null,
                        noShutdown: true, poeMode: 'auto', prependDefault: false, resetOnly: false,
                        portSecurity: false, secMax: 1, secViolation: 'shutdown', secSticky: false, secAgingTime: 0, secAgingType: 'inactivity',
                        channelGroupId: ''
                    };
                }
            } else if (currentInterface) {
                if (trimmed.startsWith('description')) { currentInterface.description = trimmed.replace('description ', ''); currentInterface.includeInConfig = true; }
                else if (trimmed.startsWith('channel-group')) {
                    const cgMatch = trimmed.match(/channel-group\s+(\d+)/);
                    if (cgMatch) { currentInterface.channelGroupId = cgMatch[1]; currentInterface.includeInConfig = true; }
                }
                else if (trimmed.includes('switchport mode trunk')) { currentInterface.mode = 'trunk'; currentInterface.includeInConfig = true; }
                else if (trimmed.includes('switchport access vlan')) { currentInterface.accessVlan = trimmed.split('vlan ')[1]?.split(/\s+/)[0] ?? ''; currentInterface.includeInConfig = true; }
                else if (trimmed.includes('switchport trunk allowed vlan')) { currentInterface.trunkVlans = trimmed.replace('switchport trunk allowed vlan ', '').replace(/^add\s+/, ''); currentInterface.includeInConfig = true; }
                else if (trimmed.includes('spanning-tree portfast')) { currentInterface.portfast = true; currentInterface.includeInConfig = true; }
                else if (trimmed.includes('switchport voice vlan')) { currentInterface.voiceVlan = trimmed.split('vlan ')[1]?.split(/\s+/)[0] ?? ''; currentInterface.includeInConfig = true; }
                else if (trimmed === 'shutdown') { currentInterface.noShutdown = false; }
            } else if (currentPortChannel) {
                if (trimmed.startsWith('description')) { currentPortChannel.description = trimmed.replace('description ', ''); }
                else if (trimmed.includes('switchport mode access')) { currentPortChannel.mode = 'access'; }
                else if (trimmed.includes('switchport mode trunk')) { currentPortChannel.mode = 'trunk'; }
                else if (trimmed.includes('switchport access vlan')) { currentPortChannel.accessVlan = trimmed.split('vlan ')[1]?.split(/\s+/)[0] ?? ''; }
                else if (trimmed.includes('switchport trunk allowed vlan')) { currentPortChannel.trunkVlans = trimmed.replace('switchport trunk allowed vlan ', '').replace(/^add\s+/, ''); }
                else if (trimmed.includes('switchport trunk native vlan')) { currentPortChannel.nativeVlan = trimmed.split('vlan ')[1]?.split(/\s+/)[0] ?? 1; }
            }
        });
        if (currentInterface) newPortsMap.set(currentInterface.id, currentInterface);
        if (currentPortChannel) parsedPortChannels.push(currentPortChannel);

        const finalStackMembers = [];
        if (provisionedSwitches.size > 0) {
            const sortedKeys = Array.from(provisionedSwitches.keys()).sort((a, b) => a - b);
            sortedKeys.forEach(key => finalStackMembers.push(provisionedSwitches.get(key)));
        } else {
            // Auto-detect from parsed ports if no provision found
            let maxBase = 0;
            let maxUplink = 0;
            let detectedBaseType = 'GigabitEthernet';
            let detectedUplinkType = 'TenGigabitEthernet';

            for (const [id, port] of newPortsMap) {
                const parts = id.split('/');
                const type = port.name.replace(/[0-9/.]+$/, '');

                if (detectedNaming === 'simple') {
                    // Expect 0/X for base, 1/X for uplink
                    if (parts.length === 2) {
                        const mod = parseInt(parts[0]);
                        const p = parseInt(parts[1]);
                        if (mod === 0) {
                            if (p > maxBase) maxBase = p;
                            detectedBaseType = type;
                        } else if (mod === 1) {
                            if (p > maxUplink) maxUplink = p;
                            detectedUplinkType = type;
                        }
                    }
                } else {
                    // Stack: S/0/P or S/1/P
                    if (parts.length === 3) {
                        const stack = parseInt(parts[0]);
                        const mod = parseInt(parts[1]);
                        const p = parseInt(parts[2]);
                        if (stack === 1) {
                            if (mod === 0) {
                                if (p > maxBase) maxBase = p;
                                detectedBaseType = type;
                            } else if (mod === 1) {
                                if (p > maxUplink) maxUplink = p;
                                detectedUplinkType = type;
                            }
                        }
                    }
                }
            }

            if (maxBase === 0) maxBase = 48; // Fallback
            if (maxUplink === 0 && maxBase === 48) maxUplink = 4; // Fallback only if we defaulted base

            finalStackMembers.push({ 
                model: maxBase, 
                uplinkCount: maxUplink, 
                baseInterfaceType: detectedBaseType, 
                uplinkInterfaceType: detectedUplinkType 
            });
        }

        const newPorts = [];
        finalStackMembers.forEach((member, index) => {
            const stackNum = index + 1;
            for (let p = 1; p <= member.model; p++) {
                const genId = detectedNaming === 'simple' ? `0/${p}` : `${stackNum}/0/${p}`;
                const parsed = newPortsMap.get(genId);
                const name = parsed ? parsed.name : `${member.baseInterfaceType}${genId}`;
                if (parsed) {
                    newPorts.push({ ...parsed, name, isUplink: false });
                } else {
                    newPorts.push({
                        id: genId, name, description: '', mode: 'access', accessVlan: '', trunkVlans: 'all', nativeVlan: 1,
                        portfast: false, voiceVlan: '', includeInConfig: false, isUplink: false, bulkGroupId: null,
                        noShutdown: true, poeMode: 'auto', prependDefault: false, resetOnly: false,
                        portSecurity: false, secMax: 1, secViolation: 'shutdown', secSticky: false, secAgingTime: 0, secAgingType: 'inactivity',
                        channelGroupId: ''
                    });
                }
            }
            for (let u = 1; u <= member.uplinkCount; u++) {
                const genId = detectedNaming === 'simple' ? `1/${u}` : `${stackNum}/1/${u}`;
                const parsed = newPortsMap.get(genId);
                const name = parsed ? parsed.name : `${member.uplinkInterfaceType}${genId}`;
                if (parsed) {
                    newPorts.push({ ...parsed, name, isUplink: true });
                } else {
                    newPorts.push({
                        id: genId, name, description: 'Uplink', mode: 'trunk', accessVlan: '', trunkVlans: 'all', nativeVlan: 1,
                        portfast: false, voiceVlan: '', includeInConfig: false, isUplink: true, bulkGroupId: null,
                        noShutdown: true, poeMode: 'auto', prependDefault: false, resetOnly: false,
                        portSecurity: false, secMax: 1, secViolation: 'shutdown', secSticky: false, secAgingTime: 0, secAgingType: 'inactivity',
                        channelGroupId: ''
                    });
                }
            }
        });

        return {
            hostname: hostnameMatch?.[1] || '',
            iosVersion: versionMatch?.[1] || '',
            useModernPortfast,
            declaredVlans: Array.from(declaredVlans).filter(v => v).sort((a, b) => parseInt(a) - parseInt(b)),
            vlanNames: detectedVlanNames,
            globalVoiceVlan: detectedVoiceVlan,
            portNaming: detectedNaming,
            stackMembers: finalStackMembers,
            ports: newPorts,
            portChannels: parsedPortChannels,
        };
    }, []);

    return useMemo(() => ({ parseRunningConfig }), [parseRunningConfig]);
}