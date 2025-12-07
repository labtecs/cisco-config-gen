import { useState, useCallback } from 'react';
import { isNumeric, isVlanRange } from '../../utils/ciscoHelpers';

/**
 * Manages the state and logic for the port list itself.
 * @param {object} initialState - Contains initial values for stackMembers, etc.
 * @returns {object} State and handlers for port management.
 */
export function usePortState({ stackMembers, portNaming }) {
    const [ports, setPorts] = useState([]);

    const createPortObject = useCallback((existingMap, stackMember, portNum, module, isUplink, memberConfig) => {
        const { baseInterfaceType, uplinkInterfaceType } = memberConfig;
        const type = isUplink ? uplinkInterfaceType : baseInterfaceType;
        let portId;
        let interfaceName;

        if (portNaming === 'simple' && stackMembers.length === 1) {
            portId = `${module}/${portNum}`;
            interfaceName = `${type}${module}/${portNum}`;
        } else {
            portId = `${stackMember}/${module}/${portNum}`;
            interfaceName = `${type}${stackMember}/${module}/${portNum}`;
        }

        let existing = existingMap.get(portId);
        if (existing) {
            return { ...existing, id: portId, name: interfaceName, isUplink, bulkGroupId: null };
        } else {
            return {
                id: portId, name: interfaceName, description: isUplink ? 'Uplink' : '',
                mode: isUplink ? 'trunk' : 'access', accessVlan: '', trunkVlans: 'all', nativeVlan: 1,
                portfast: !isUplink, voiceVlan: '', includeInConfig: false, isUplink: isUplink,
                noShutdown: true, poeMode: 'auto', prependDefault: false, resetOnly: false, bulkGroupId: null,
                portSecurity: false, secMax: 1, secViolation: 'shutdown', secSticky: false, secAgingTime: 0, secAgingType: 'inactivity',
                channelGroupId: ''
            };
        }
    }, [portNaming, stackMembers.length]);

    const generatePortList = useCallback(() => {
        setPorts(currentPorts => {
            const currentPortsMap = new Map(currentPorts.map(p => [p.id, p]));
            let newPorts = [];
            stackMembers.forEach((member, index) => {
                const stackMemberNum = index + 1;
                // Base ports
                for (let portNum = 1; portNum <= member.model; portNum++) {
                    newPorts.push(createPortObject(currentPortsMap, stackMemberNum, portNum, 0, false, member));
                }
                // Uplink ports
                for (let u = 1; u <= member.uplinkCount; u++) {
                    newPorts.push(createPortObject(currentPortsMap, stackMemberNum, u, 1, true, member));
                }
            });
            return newPorts;
        });
    }, [stackMembers, createPortObject]);

    const updatePort = useCallback((id, field, value) => {
        // --- VALIDATION ---
        if (['accessVlan', 'voiceVlan', 'nativeVlan', 'channelGroupId'].includes(field)) {
            if (!isNumeric(value)) return;
        }
        if (['secMax', 'secAgingTime'].includes(field)) {
            if (!isNumeric(value)) return;
        }
        if (field === 'trunkVlans') {
            const lower = value.toLowerCase();
            if (!isVlanRange(value) && !['a', 'al', 'all'].includes(lower)) return;
        }

        setPorts(current => current.map(p => p.id === id ? { ...p, [field]: value, bulkGroupId: null } : p));
    }, []);

    return { ports, setPorts, generatePortList, updatePort };
}