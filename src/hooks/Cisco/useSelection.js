import { useState, useCallback } from 'react';

/**
 * Manages the state and logic for port selection.
 * @param {Array<object>} ports - The current list of all ports.
 * @returns {object} State and handlers for selection.
 */
export function useSelection(ports) {
    const [selectedPortIds, setSelectedPortIds] = useState(new Set());
    const [lastSelectedId, setLastSelectedId] = useState(null);

    const toggleSelection = useCallback((id, e) => {
        const isShift = e?.shiftKey || e?.nativeEvent?.shiftKey;

        setSelectedPortIds(currentIds => {
            const newSet = new Set(currentIds);
            if (isShift && lastSelectedId) {
                const startIdx = ports.findIndex(p => p.id === lastSelectedId);
                const endIdx = ports.findIndex(p => p.id === id);
                if (startIdx !== -1 && endIdx !== -1) {
                    const min = Math.min(startIdx, endIdx);
                    const max = Math.max(startIdx, endIdx);
                    for (let i = min; i <= max; i++) newSet.add(ports[i].id);
                }
            } else {
                if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
                setLastSelectedId(id);
            }
            return newSet;
        });
    }, [ports, lastSelectedId]);

    const clearSelection = useCallback(() => {
        setSelectedPortIds(new Set());
        setLastSelectedId(null);
    }, []);

    const toggleSelectAll = useCallback(() => {
        if (selectedPortIds.size === ports.length) {
            clearSelection();
        } else {
            setSelectedPortIds(new Set(ports.map(p => p.id)));
        }
    }, [ports, selectedPortIds.size, clearSelection]);

    const selectPortsByVlan = useCallback((vlanId) => {
        const strVlanId = String(vlanId);
        const matchingIds = ports.filter(p => {
            if (p.mode === 'access' && String(p.accessVlan) === strVlanId) return true;
            if (p.mode === 'trunk' && p.trunkVlans === strVlanId) return true;
            if (p.mode === 'trunk' && !p.trunkVlans.includes('-')) {
                const parts = p.trunkVlans.split(',').map(s => s.trim());
                return parts.includes(strVlanId);
            }
            return false;
        }).map(p => p.id);

        setSelectedPortIds(new Set(matchingIds));
        setLastSelectedId(null);
    }, [ports]);

    return { selectedPortIds, setSelectedPortIds, lastSelectedId, setLastSelectedId, toggleSelection, toggleSelectAll, selectPortsByVlan, clearSelection };
}