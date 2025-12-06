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
        setPorts(ports => ports.map(p => {
            if (!selectedPortIds.has(p.id)) return p;
            let newPort = { ...p, bulkGroupId: bulkId };
            if (bulkMode) newPort.mode = bulkMode;
            if (bulkAccessVlan && isNumeric(bulkAccessVlan)) newPort.accessVlan = bulkAccessVlan;
            if (bulkTrunkVlans && (newPort.mode === 'trunk' || bulkMode === 'trunk')) newPort.trunkVlans = bulkTrunkVlans;
            if (bulkVoiceVlan === 'enable') newPort.voiceVlan = globalVoiceVlan || '1';
            if (bulkVoiceVlan === 'disable') newPort.voiceVlan = '';
            if (bulkPortfast === 'on') newPort.portfast = true;
            if (bulkPortfast === 'off') newPort.portfast = false;
            if (bulkInclude === 'include') newPort.includeInConfig = true;
            if (bulkInclude === 'exclude') newPort.includeInConfig = false;
            if (bulkNoShut === 'on') newPort.noShutdown = true;
            if (bulkNoShut === 'off') newPort.noShutdown = false;
            if (bulkPoeMode) newPort.poeMode = bulkPoeMode;
            if (bulkSecurity === 'on') newPort.portSecurity = true;
            if (bulkSecurity === 'off') newPort.portSecurity = false;
            if (bulkSecMax && isNumeric(bulkSecMax)) newPort.secMax = parseInt(bulkSecMax);
            if (bulkSecViolation) newPort.secViolation = bulkSecViolation;
            if (bulkSecSticky === 'on') newPort.secSticky = true;
            if (bulkSecSticky === 'off') newPort.secSticky = false;
            if (bulkSecAgingTime && isNumeric(bulkSecAgingTime)) newPort.secAgingTime = parseInt(bulkSecAgingTime);
            if (bulkSecAgingType) newPort.secAgingType = bulkSecAgingType;
            return newPort;
        }));
    }, [setPorts, selectedPortIds, globalVoiceVlan, bulkMode, bulkAccessVlan, bulkTrunkVlans, bulkVoiceVlan, bulkPortfast, bulkInclude, bulkNoShut, bulkPoeMode, bulkSecurity, bulkSecMax, bulkSecViolation, bulkSecSticky, bulkSecAgingTime, bulkSecAgingType]);

    return {
        bulkState: { bulkMode, bulkAccessVlan, bulkVoiceVlan, bulkTrunkVlans, bulkPortfast, bulkInclude, bulkNoShut, bulkPoeMode, bulkSecurity, bulkSecMax, bulkSecViolation, bulkSecSticky, bulkSecAgingTime, bulkSecAgingType },
        setBulkState: { setBulkMode, setBulkAccessVlan, setBulkVoiceVlan, setBulkTrunkVlans, setBulkPortfast, setBulkInclude, setBulkNoShut, setBulkPoeMode, setBulkSecurity, setBulkSecMax, setBulkSecViolation, setBulkSecSticky, setBulkSecAgingTime, setBulkSecAgingType },
        applyBulkEdit
    };
}