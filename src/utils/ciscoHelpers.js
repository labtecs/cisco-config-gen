// src/utils/ciscoHelpers.js

/**
 * Prüft, ob ein Wert nur aus Ziffern besteht.
 */
export const isNumeric = (val) => /^\d*$/.test(val);

/**
 * Prüft auf validen VLAN-Range String (z.B. "10, 20-30")
 */
export const isVlanRange = (val) => /^[0-9,\-\s]*$/.test(val);

/**
 * Wandelt Strings wie "10,12-14" in ein Array [10, 12, 13, 14] um.
 * Ignoriert 'all' oder 'none'.
 */
export const parseVlanString = (str) => {
    if (!str || str.toLowerCase() === 'all' || str.toLowerCase() === 'none') return [];
    const ids = new Set();
    const parts = str.split(',');
    parts.forEach(part => {
        if (part.includes('-')) {
            const [start, end] = part.split('-').map(n => parseInt(n.trim()));
            if (!isNaN(start) && !isNaN(end)) {
                for (let i = start; i <= end; i++) ids.add(i.toString());
            }
        } else {
            const num = parseInt(part.trim());
            if (!isNaN(num)) ids.add(num.toString());
        }
    });
    return Array.from(ids);
};

/**
 * Erweitert Kurzschreibweisen von Interfaces (Gi -> GigabitEthernet).
 */
export const expandInterfaceType = (t) => {
    if (!t) return '';
    if (t.startsWith('Gi')) return 'GigabitEthernet';
    if (t.startsWith('Te')) return 'TenGigabitEthernet';
    if (t.startsWith('Fa')) return 'FastEthernet';
    if (t.startsWith('Two')) return 'TwentyFiveGigE';
    if (t.startsWith('Fo')) return 'FortyGigabitEthernet';
    return t;
};