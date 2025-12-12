import { useState, useCallback } from 'react';
import { isNumeric } from '../../utils/ciscoHelpers';

/**
 * Manages state and logic for the bulk editing feature.
 * @param {function} setPorts - The state setter for the ports array.
 * @param {Set<string>} selectedPortIds - The set of currently selected port IDs.
 * @param {string} globalVoiceVlan - The globally configured voice VLAN.
 * @returns {object} Bulk edit state and the apply function.
 */
export function useBulkEdit({ setPorts, selectedPortIds, globalVoiceVlan }) {
    const [bulkMode, setBulkMode] = useState('');
    const [bulkAccessVlan, setBulkAccessVlan] = useState('');
    const [bulkVoiceVlan, setBulkVoiceVlan] = useState('');
    const [bulkTrunkVlans, setBulkTrunkVlans] = useState('');
    const [bulkPortfast, setBulkPortfast] = useState('no_change');
    const [bulkInclude, setBulkInclude] = useState('no_change');
    const [bulkNoShut, setBulkNoShut] = useState('no_change');
    const [bulkPoeMode, setBulkPoeMode] = useState('');
    const [bulkSecurity, setBulkSecurity] = useState('no_change');
    const [bulkSecMax, setBulkSecMax] = useState('');
    const [bulkSecViolation, setBulkSecViolation] = useState('');
    const [bulkSecSticky, setBulkSecSticky] = useState('no_change');
    const [bulkSecAgingTime, setBulkSecAgingTime] = useState('');
    const [bulkSecAgingType, setBulkSecAgingType] = useState('');

    const applyBulkEdit = useCallback(() => {
        const bulkId = Date.now();
        let hasChanges = false;

        setPorts(ports => ports.map(p => {
            if (!selectedPortIds.has(p.id)) return p;

            let newPort = { ...p, bulkGroupId: bulkId };
            let portChanged = false;

            if (bulkMode && newPort.mode !== bulkMode) { newPort.mode = bulkMode; portChanged = true; }
            if (bulkAccessVlan && isNumeric(bulkAccessVlan) && newPort.accessVlan !== bulkAccessVlan) { newPort.accessVlan = bulkAccessVlan; portChanged = true; }
            if (bulkTrunkVlans && (newPort.mode === 'trunk' || bulkMode === 'trunk') && newPort.trunkVlans !== bulkTrunkVlans) { newPort.trunkVlans = bulkTrunkVlans; portChanged = true; }
            if (bulkVoiceVlan === 'enable' && newPort.voiceVlan === '') { newPort.voiceVlan = globalVoiceVlan || '1'; portChanged = true; }
            if (bulkVoiceVlan === 'disable' && newPort.voiceVlan !== '') { newPort.voiceVlan = ''; portChanged = true; }
            if (bulkPortfast === 'on' && !newPort.portfast) { newPort.portfast = true; portChanged = true; }
            if (bulkPortfast === 'off' && newPort.portfast) { newPort.portfast = false; portChanged = true; }
            if (bulkInclude === 'include' && !newPort.includeInConfig) { newPort.includeInConfig = true; portChanged = true; }
            if (bulkInclude === 'exclude' && newPort.includeInConfig) { newPort.includeInConfig = false; portChanged = true; }
            if (bulkNoShut === 'on' && !newPort.noShutdown) { newPort.noShutdown = true; portChanged = true; }
            if (bulkNoShut === 'off' && newPort.noShutdown) { newPort.noShutdown = false; portChanged = true; }
            if (bulkPoeMode && newPort.poeMode !== bulkPoeMode) { newPort.poeMode = bulkPoeMode; portChanged = true; }
            if (bulkSecurity === 'on' && !newPort.portSecurity) { newPort.portSecurity = true; portChanged = true; }
            if (bulkSecurity === 'off' && newPort.portSecurity) { newPort.portSecurity = false; portChanged = true; }
            if (bulkSecMax && isNumeric(bulkSecMax) && newPort.secMax !== parseInt(bulkSecMax)) { newPort.secMax = parseInt(bulkSecMax); portChanged = true; }
            if (bulkSecViolation && newPort.secViolation !== bulkSecViolation) { newPort.secViolation = bulkSecViolation; portChanged = true; }
            if (bulkSecSticky === 'on' && !newPort.secSticky) { newPort.secSticky = true; portChanged = true; }
            if (bulkSecSticky === 'off' && newPort.secSticky) { newPort.secSticky = false; portChanged = true; }
            if (bulkSecAgingTime && isNumeric(bulkSecAgingTime) && newPort.secAgingTime !== parseInt(bulkSecAgingTime)) { newPort.secAgingTime = parseInt(bulkSecAgingTime); portChanged = true; }
            if (bulkSecAgingType && newPort.secAgingType !== bulkSecAgingType) { newPort.secAgingType = bulkSecAgingType; portChanged = true; }

            if (portChanged) {
                newPort.isDirty = true;
                hasChanges = true;
            }

            return newPort;
        }));
        
        // Return a boolean indicating if any changes were applied
        return hasChanges;

    }, [setPorts, selectedPortIds, globalVoiceVlan, bulkMode, bulkAccessVlan, bulkTrunkVlans, bulkVoiceVlan, bulkPortfast, bulkInclude, bulkNoShut, bulkPoeMode, bulkSecurity, bulkSecMax, bulkSecViolation, bulkSecSticky, bulkSecAgingTime, bulkSecAgingType]);

    return {
        bulkState: { bulkMode, bulkAccessVlan, bulkVoiceVlan, bulkTrunkVlans, bulkPortfast, bulkInclude, bulkNoShut, bulkPoeMode, bulkSecurity, bulkSecMax, bulkSecViolation, bulkSecSticky, bulkSecAgingTime, bulkSecAgingType },
        setBulkState: { setBulkMode, setBulkAccessVlan, setBulkVoiceVlan, setBulkTrunkVlans, setBulkPortfast, setBulkInclude, setBulkNoShut, setBulkPoeMode, setBulkSecurity, setBulkSecMax, setBulkSecViolation, setBulkSecSticky, setBulkSecAgingTime, setBulkSecAgingType },
        applyBulkEdit
    };
}