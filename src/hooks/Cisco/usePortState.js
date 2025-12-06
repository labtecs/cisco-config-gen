import { useState, useCallback } from 'react';
import { isNumeric, isVlanRange } from '../../utils/ciscoHelpers';

/**
 * Manages the state and logic for the port list itself.
 * @param {object} initialState - Contains initial values for switchModel, uplinkCount, etc.
 * @returns {object} State and handlers for port management.
 */
export function usePortState({ switchModel, uplinkCount, stackSize, portNaming, baseInterfaceType, uplinkInterfaceType }) {
    const [ports, setPorts] = useState([]);

    const createPortObject = useCallback((existingMap, stackMember, portNum, isUplink) => {
        const type = isUplink ? uplinkInterfaceType : baseInterfaceType;
        let portId;
        let interfaceName;
        if (portNaming === 'simple') {
            portId = `0/${portNum}`;
            interfaceName = `${type}0/${portNum}`;
            if (stackSize > 1) {
                portId = `${stackMember}/0/${portNum}`;
                interfaceName = `${type}${stackMember}/0/${portNum}`;
            }
        } else {
            portId = `${stackMember}/0/${portNum}`;
            interfaceName = `${type}${stackMember}/0/${portNum}`;
        }
        let existing = existingMap.get(portId);
        if (!existing && stackMember === 1) {
            if (portId === `0/${portNum}`) existing = existingMap.get(`1/0/${portNum}`);
            else if (portId === `1/0/${portNum}`) existing = existingMap.get(`0/${portNum}`);
        }
        if (existing) {
            return { ...existing, id: portId, name: interfaceName, isUplink, bulkGroupId: null };
        } else {
            return {
                id: portId, name: interfaceName, description: isUplink ? 'Uplink' : '',
                mode: isUplink ? 'trunk' : 'access', accessVlan: '', trunkVlans: 'all', nativeVlan: 1,
                portfast: !isUplink, voiceVlan: '', includeInConfig: !isUplink, isUplink: isUplink,
                noShutdown: true, poeMode: 'auto', prependDefault: false, resetOnly: false, bulkGroupId: null,
                portSecurity: false, secMax: 1, secViolation: 'shutdown', secSticky: false, secAgingTime: 0, secAgingType: 'inactivity'
            };
        }
    }, [baseInterfaceType, uplinkInterfaceType, portNaming, stackSize]);

    const generatePortList = useCallback(() => {
        setPorts(currentPorts => {
            const currentPortsMap = new Map(currentPorts.map(p => [p.id, p]));
            let newPorts = [];
            for (let stackMember = 1; stackMember <= stackSize; stackMember++) {
                for (let portNum = 1; portNum <= switchModel; portNum++) {
                    newPorts.push(createPortObject(currentPortsMap, stackMember, portNum, false));
                }
                for (let u = 1; u <= uplinkCount; u++) {
                    const portNum = switchModel + u;
                    newPorts.push(createPortObject(currentPortsMap, stackMember, portNum, true));
                }
            }
            return newPorts;
        });
    }, [switchModel, uplinkCount, stackSize, createPortObject]);

    const updatePort = useCallback((id, field, value) => {
        if (['accessVlan', 'voiceVlan', 'nativeVlan'].includes(field)) { if (!isNumeric(value)) return; }
        if (['secMax', 'secAgingTime'].includes(field)) { if (!isNumeric(value)) return; }
        if (field === 'trunkVlans') {
            const lower = value.toLowerCase();
            if (!isVlanRange(value) && !['a', 'al', 'all'].includes(lower)) return;
        }
        setPorts(current => current.map(p => p.id === id ? { ...p, [field]: value, bulkGroupId: null } : p));
    }, []);

    return { ports, setPorts, generatePortList, updatePort };
}