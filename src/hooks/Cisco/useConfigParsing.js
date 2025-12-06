import { useCallback } from 'react';
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

        const lines = text.split('\n');
        let newPortsMap = new Map();
        const interfaceRegex = /^interface\s+([a-zA-Z]+)([0-9/.]+)/i;
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
            if (match && !match[1].toLowerCase().includes('vlan')) {
                typeCounts[match[1]] = (typeCounts[match[1]] || 0) + 1;
            }

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

            const l2Match = trimmed.match(/^vlan\s+(\d+)/i);
            if (l2Match && l2Match[1]) {
                foundVlans.add(l2Match[1]);
                currentDefVlanId = l2Match[1];
            } else if (currentDefVlanId && trimmed.startsWith('name ')) {
                detectedVlanNames[currentDefVlanId] = trimmed.substring(5).trim();
            }
            if (trimmed.startsWith('interface') || trimmed === '!') currentDefVlanId = null;
        });

        const sortedTypes = Object.entries(typeCounts).sort(([,a],[,b]) => b - a);
        let detBase = sortedTypes[0]?.[0] || 'GigabitEthernet';
        let detUplink = sortedTypes[1]?.[0] || detBase;

        const finalBaseType = expandInterfaceType(detBase);
        const finalUplinkType = expandInterfaceType(detUplink);

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
                    portfast: false, voiceVlan: '', includeInConfig: false, isUplink: false, bulkGroupId: null,
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

        const newPorts = [];
        for (let s = 1; s <= detectedStackSize; s++) {
            for (let p = 1; p <= bestFitModel; p++) {
                let genId = detectedNaming === 'simple' ? `0/${p}` : `${s}/0/${p}`;
                if (detectedNaming === 'simple' && detectedStackSize > 1) genId = `${s}/0/${p}`;
                const parsed = newPortsMap.get(genId);
                const name = parsed ? parsed.name : `${finalBaseType}${genId}`;
                if (parsed) {
                    newPorts.push({ ...parsed, name, isUplink: false });
                } else {
                    newPorts.push({
                        id: genId, name, description: '', mode: 'access', accessVlan: '', trunkVlans: 'all', nativeVlan: 1,
                        portfast: false, voiceVlan: '', includeInConfig: false, isUplink: false, bulkGroupId: null,
                        noShutdown: true, poeMode: 'auto', prependDefault: false, resetOnly: false,
                        portSecurity: false, secMax: 1, secViolation: 'shutdown', secSticky: false, secAgingTime: 0, secAgingType: 'inactivity'
                    });
                }
            }
            for (let u = 1; u <= uplinks; u++) {
                let p = bestFitModel + u;
                let genId = detectedNaming === 'simple' ? `0/${p}` : `${s}/0/${p}`;
                if (detectedNaming === 'simple' && detectedStackSize > 1) genId = `${s}/0/${p}`;
                const parsed = newPortsMap.get(genId);
                const name = parsed ? parsed.name : `${finalUplinkType}${genId}`;
                if (parsed) {
                    newPorts.push({ ...parsed, name, isUplink: true });
                } else {
                    newPorts.push({
                        id: genId, name, description: 'Uplink', mode: 'trunk', accessVlan: '', trunkVlans: 'all', nativeVlan: 1,
                        portfast: false, voiceVlan: '', bulkGroupId: null,
                        includeInConfig: false,
                        isUplink: true,
                        noShutdown: true, poeMode: 'auto', prependDefault: false, resetOnly: false,
                        portSecurity: false, secMax: 1, secViolation: 'shutdown', secSticky: false, secAgingTime: 0, secAgingType: 'inactivity'
                    });
                }
            }
        }

        return {
            hostname: hostnameMatch?.[1] || '',
            iosVersion: versionMatch?.[1] || '',
            useModernPortfast,
            detectedVlans: Array.from(foundVlans).filter(v => v).sort((a,b) => parseInt(a) - parseInt(b)),
            vlanNames: detectedVlanNames,
            globalVoiceVlan: detectedVoiceVlan,
            portNaming: detectedNaming,
            stackSize: detectedStackSize,
            switchModel: bestFitModel,
            uplinkCount: uplinks,
            baseInterfaceType: finalBaseType,
            uplinkInterfaceType: finalUplinkType,
            ports: newPorts,
        };
    }, []);

    return { parseRunningConfig };
}