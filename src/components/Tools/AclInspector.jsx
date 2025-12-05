import React, { useState, useEffect } from 'react';
import { Upload, FileText, Search, ShieldCheck, ShieldAlert, ArrowRight, Activity, ChevronDown, ChevronUp, AlertCircle, Info, Filter, Network, PlayCircle, CheckCircle, XCircle, ArrowLeftRight } from 'lucide-react';

/**
 * Utility functions for IP calculation
 */
const ipToLong = (ip) => {
    if (!ip) return 0;
    if (ip.toLowerCase() === 'any') return 0;
    const parts = ip.split('.');
    if (parts.length !== 4) return 0;
    return ((parseInt(parts[0], 10) << 24) | (parseInt(parts[1], 10) << 16) | (parseInt(parts[2], 10) << 8) | parseInt(parts[3], 10)) >>> 0;
};

const wildcardToCidr = (wildcard) => {
    if (!wildcard) return 32;
    const parts = wildcard.split('.').map(Number);
    let binaryStr = parts.map(p => (255 - p).toString(2).padStart(8, '0')).join('');
    return binaryStr.split('1').length - 1;
};

// Common Service to Port Mapping for Firewalls
const SERVICE_MAP = {
    'www': 80, 'http': 80,
    'https': 443,
    'ftp': 21, 'ftp-data': 20,
    'ssh': 22,
    'telnet': 23,
    'smtp': 25,
    'domain': 53, 'dns': 53,
    'pop3': 110,
    'ntp': 123,
    'imap4': 143,
    'snmp': 161,
    'ldap': 389,
    'ldaps': 636,
    'bootps': 67, 'bootpc': 68,
    'tftp': 69
};

// Check if IP is in subnet defined by network IP and wildcard mask
const isIpInWildcardRange = (checkIp, ruleIp, wildcard) => {
    if (ruleIp.toLowerCase() === 'any') return true;

    const checkLong = ipToLong(checkIp);
    const ruleLong = ipToLong(ruleIp);

    // Detect if wildcard is actually a subnet mask (common in ASA/Firewalls)
    // Heuristic: If wildcard starts with 255, it's likely a mask, not a wildcard
    let maskLong;

    if (!wildcard) {
        maskLong = 0xFFFFFFFF; // Host /32
    } else {
        const wildParts = wildcard.split('.').map(Number);
        if (wildParts[0] === 255) {
            // It's a Subnet Mask (ASA style: 255.255.255.0)
            maskLong = ((wildParts[0] << 24) | (wildParts[1] << 16) | (wildParts[2] << 8) | wildParts[3]) >>> 0;
        } else {
            // It's a Wildcard Mask (IOS style: 0.0.0.255)
            maskLong = ((255 - wildParts[0]) << 24) | ((255 - wildParts[1]) << 16) | ((255 - wildParts[2]) << 8) | (255 - wildParts[3]) >>> 0;
        }
    }

    return (checkLong & maskLong) === (ruleLong & maskLong);
};

// Check Port Match with Service Resolution
const checkPortMatch = (rulePorts, packetPort) => {
    if (!rulePorts) return true; // Rule has no port restriction
    if (!packetPort) return true; // Simulation has no port set, assume match

    const pPort = parseInt(packetPort, 10);
    const parts = rulePorts.split(' ');

    // Helper to resolve port number or name
    const resolve = (val) => {
        if (!isNaN(val)) return parseInt(val, 10);
        return SERVICE_MAP[val.toLowerCase()] || -1;
    };

    const op = parts[0];
    const val1 = resolve(parts[1]);

    // Common Cisco Operators
    if (op === 'eq') return pPort === val1;
    if (op === 'gt') return pPort > val1;
    if (op === 'lt') return pPort < val1;
    if (op === 'range') {
        const val2 = resolve(parts[2]);
        return pPort >= val1 && pPort <= val2;
    }
    if (op === 'neq') return pPort !== val1;

    return true;
};

const ConfigAnalyzer = ({ fileContent }) => {
    const [rawConfig, setRawConfig] = useState('');
    const [acls, setAcls] = useState([]);

    // Filter States
    const [searchQuery, setSearchQuery] = useState('');
    const [actionFilter, setActionFilter] = useState('all');
    const [vlanFilter, setVlanFilter] = useState('');
    const [showMatchesOnly, setShowMatchesOnly] = useState(false);

    // Simulation States
    const [simSrcIp, setSimSrcIp] = useState('');
    const [simDstIp, setSimDstIp] = useState('');
    const [simProto, setSimProto] = useState('ip');
    const [simPort, setSimPort] = useState('');

    const [expandedAcl, setExpandedAcl] = useState(null);
    const [dragActive, setDragActive] = useState(false);

    useEffect(() => {
        if (fileContent) {
            setRawConfig(fileContent);
        }
    }, [fileContent]);

    useEffect(() => {
        if (!rawConfig) {
            setAcls([]);
            return;
        }
        parseConfig(rawConfig);
    }, [rawConfig]);

    const parseConfig = (text) => {
        const lines = text.split('\n');
        const parsedAcls = []; // Array of ACL objects
        const aclMap = {}; // Map name -> index in parsedAcls for fast lookup

        let currentAcl = null; // For IOS block parsing

        // Interface parsing
        const aclInterfaces = {};
        let currentInterface = null;

        // --- REGEX PATTERNS ---
        // IOS Named/Numbered Blocks
        const extendedNamedRegex = /^ip access-list extended (\S+)/;
        const standardNamedRegex = /^ip access-list standard (\S+)/;
        const numberedBlockRegex = /^access-list (\d+) (permit|deny) (.+)/; // Legacy IOS line-by-line number

        // ASA / Firewall Line-by-Line
        // Format: access-list NAME extended permit ...
        const asaLineRegex = /^access-list (\S+) (extended|standard) (permit|deny) (.+)/;

        // Interfaces
        const interfaceRegex = /^interface (\S+)/;
        const iosAccessGroupRegex = /^ip access-group (\S+) (in|out)/; // Inside interface block
        const asaAccessGroupRegex = /^access-group (\S+) (in|out) interface (\S+)/; // Global ASA command

        // Helper to add rule
        const addRule = (aclObj, action, protocol, content, originalLine) => {
            // Parse the content part (after permit/deny)
            // content string usually: "tcp 10.0.0.0 0.0.0.255 host 1.2.3.4 eq 80"

            const parts = content.split(/\s+/);

            // Normalize protocol if missing (standard ACLs often imply IP or just define src)
            // Standard ACL content usually just: "10.0.0.0 0.0.0.255" or "host 1.2.3.4"
            let proto = protocol;
            let cursor = 0;

            // If protocol is not passed (e.g. from numbered), try to detect
            if (!proto) {
                // If first part is a protocol name, use it
                if (['tcp', 'udp', 'ip', 'icmp', 'esp', 'ah', 'gre'].includes(parts[0])) {
                    proto = parts[0];
                    cursor = 1;
                } else if (parts[0].match(/^\d+$/) && parseInt(parts[0]) < 255) {
                    // Protocol number
                    proto = parts[0];
                    cursor = 1;
                } else {
                    proto = 'ip'; // Default for standard ACLs
                }
            } else {
                // Protocol was passed from regex
                // Verify if it's in the content string (ASA regex captures 'extended permit tcp ...' -> content starts with tcp)
                if (content.startsWith(proto)) {
                    cursor = 1; // skip protocol in content parts
                }
            }

            const extractIp = () => {
                if (cursor >= parts.length) return { ip: 'any', wild: null };

                if (parts[cursor] === 'host') {
                    cursor += 2;
                    return { ip: parts[cursor-1], wild: '0.0.0.0' };
                }
                if (parts[cursor] === 'any') {
                    cursor += 1;
                    return { ip: 'any', wild: null };
                }
                if (parts[cursor] === 'object') {
                    cursor += 2;
                    return { ip: 'Object: ' + parts[cursor-1], wild: null }; // Basic Object Group support placeholder
                }

                const ip = parts[cursor];
                cursor += 1;

                let wild = null;
                // Look ahead for mask/wildcard
                if (cursor < parts.length && parts[cursor].match(/^\d+\.\d+\.\d+\.\d+$/)) {
                    wild = parts[cursor];
                    cursor += 1;
                }
                return { ip, wild };
            };

            const srcObj = extractIp();

            // For standard ACLs, there is no destination
            let dstObj = { ip: 'any', wild: null };

            // Try to find destination if protocol suggests it (Extended)
            // If we hit 'eq', 'lt', 'gt' immediately after source, it's likely source ports
            let ports = '';

            // Check for source ports before destination
            if (['eq', 'lt', 'gt', 'neq', 'range'].includes(parts[cursor])) {
                // e.g. ... host 1.1.1.1 eq 80 host 2.2.2.2
                // This is source port. Current UI puts all ports in one field, we can append.
                const op = parts[cursor];
                cursor++;
                const val = parts[cursor];
                cursor++;
                ports += `Src Port: ${op} ${val} `;
            }

            if (cursor < parts.length) {
                // Assume next is destination
                if (parts[cursor] !== 'log' && !parts[cursor].startsWith('time-range')) {
                    dstObj = extractIp();
                }
            }

            // Remaining parts are usually destination ports or logs
            if (cursor < parts.length) {
                const remaining = parts.slice(cursor).join(' ');
                // Filter out log keywords to keep it clean
                if (!remaining.includes('log')) {
                    ports += remaining;
                }
            }

            aclObj.rules.push({
                id: Math.random().toString(36).substr(2, 9),
                action,
                protocol: proto,
                src: srcObj.ip,
                srcWild: srcObj.wild,
                dst: dstObj.ip,
                dstWild: dstObj.wild,
                ports: ports.trim(),
                originalLine
            });
        };

        const getOrCreateAcl = (name, type) => {
            if (aclMap[name] !== undefined) {
                return parsedAcls[aclMap[name]];
            }
            const newAcl = {
                name,
                type: type || 'Detected ACL',
                rules: []
            };
            const idx = parsedAcls.push(newAcl) - 1;
            aclMap[name] = idx;
            return newAcl;
        };

        lines.forEach(line => {
            const trimLine = line.trim();
            if (!trimLine || trimLine.startsWith('!')) return;

            // --- 1. INTERFACE CONTEXT (IOS) ---
            const intMatch = trimLine.match(interfaceRegex);
            if (intMatch) {
                currentInterface = intMatch[1];
                currentAcl = null; // Exit ACL block
                return;
            }

            // IOS Interface Access Group
            if (currentInterface) {
                const groupMatch = trimLine.match(iosAccessGroupRegex);
                if (groupMatch) {
                    const aclName = groupMatch[1];
                    const direction = groupMatch[2];
                    if (!aclInterfaces[aclName]) aclInterfaces[aclName] = [];
                    aclInterfaces[aclName].push(`${currentInterface} (${direction})`);
                }
                // Note: Don't return here, continue parsing
            }

            // --- 2. GLOBAL COMMANDS (ASA) ---
            // ASA Access Group
            const asaGroupMatch = trimLine.match(asaAccessGroupRegex);
            if (asaGroupMatch) {
                const aclName = asaGroupMatch[1];
                const direction = asaGroupMatch[2];
                const iface = asaGroupMatch[3];
                if (!aclInterfaces[aclName]) aclInterfaces[aclName] = [];
                aclInterfaces[aclName].push(`${iface} (${direction})`);
                return;
            }

            // ASA Line-by-Line ACL
            const asaMatch = trimLine.match(asaLineRegex);
            if (asaMatch) {
                currentAcl = null; // Reset block context
                const name = asaMatch[1];
                const type = asaMatch[2] === 'extended' ? 'Firewall/Extended' : 'Firewall/Standard';
                const action = asaMatch[3];
                const content = asaMatch[4];

                const acl = getOrCreateAcl(name, type);
                addRule(acl, action, null, content, trimLine);
                return;
            }

            // --- 3. IOS BLOCK STARTS ---
            const extMatch = trimLine.match(extendedNamedRegex);
            if (extMatch) {
                currentInterface = null;
                currentAcl = getOrCreateAcl(extMatch[1], 'IOS Extended');
                return;
            }

            const stdMatch = trimLine.match(standardNamedRegex);
            if (stdMatch) {
                currentInterface = null;
                currentAcl = getOrCreateAcl(stdMatch[1], 'IOS Standard');
                return;
            }

            // --- 4. RULES ---
            // Numbered ACL (Global line, Legacy IOS)
            const numMatch = trimLine.match(numberedBlockRegex);
            if (numMatch) {
                currentInterface = null;
                const id = numMatch[1];
                const type = parseInt(id) > 99 ? 'IOS Extended Num' : 'IOS Standard Num';
                const acl = getOrCreateAcl(id, type);
                addRule(acl, numMatch[2], null, numMatch[3], trimLine);
                return;
            }

            // Rules inside Named Block (Indent)
            if (currentAcl && (trimLine.startsWith('permit') || trimLine.startsWith('deny'))) {
                // Inside a block, the line is just "permit tcp ..."
                const firstSpace = trimLine.indexOf(' ');
                const action = trimLine.substring(0, firstSpace);
                const content = trimLine.substring(firstSpace + 1);
                addRule(currentAcl, action, null, content, trimLine);
            }
        });

        // Merge interfaces into ACLs
        const enrichedAcls = parsedAcls.map(acl => ({
            ...acl,
            interfaces: aclInterfaces[acl.name] || []
        }));

        setAcls(enrichedAcls);
    };

    // Robust Drag Handlers
    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.currentTarget.contains(e.relatedTarget)) return;
        setDragActive(false);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(true);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => setRawConfig(ev.target.result);
            reader.readAsText(e.dataTransfer.files[0]);
        }
    };

    const swapSimulationIps = () => {
        const temp = simSrcIp;
        setSimSrcIp(simDstIp);
        setSimDstIp(temp);
    };

    // Logic to simulate packet against an ACL
    const simulatePacketOnAcl = (acl) => {
        if (!simSrcIp || !simDstIp) return null;

        // 1. Validate inputs roughly (Allow 'any' as valid input now)
        const isValidIp = (ip) => ip.toLowerCase() === 'any' || ip.match(/^(\d{1,3}\.){3}\d{1,3}$/);
        if (!isValidIp(simSrcIp) || !isValidIp(simDstIp)) return null;

        // 2. Iterate rules
        for (let rule of acl.rules) {
            let protoMatch = false;
            // IOS often treats 'ip' as any protocol in extended ACLs
            if (rule.protocol === 'ip') protoMatch = true;
            else if (rule.protocol === simProto) protoMatch = true;

            if (!protoMatch) continue;

            // Check Src
            const srcMatch = isIpInWildcardRange(simSrcIp, rule.src, rule.srcWild);
            if (!srcMatch) continue;

            // Check Dst
            const dstMatch = isIpInWildcardRange(simDstIp, rule.dst, rule.dstWild);
            if (!dstMatch) continue;

            // Check Port
            const portMatch = checkPortMatch(rule.ports, simPort);
            if (!portMatch) continue;

            // Hit!
            return { result: rule.action, ruleId: rule.id, type: 'explicit' };
        }

        return { result: 'deny', ruleId: 'implicit', type: 'implicit' };
    };

    const isRuleHit = (rule) => {
        if (!searchQuery) return false;
        if (rule.originalLine.toLowerCase().includes(searchQuery.toLowerCase())) return true;
        const isIp = searchQuery.match(/^(\d{1,3}\.){3}\d{1,3}$/);
        if (isIp) {
            const srcMatch = isIpInWildcardRange(searchQuery, rule.src, rule.srcWild);
            const dstMatch = isIpInWildcardRange(searchQuery, rule.dst, rule.dstWild);
            return srcMatch || dstMatch;
        }
        return false;
    };

    const isRuleVisible = (rule) => {
        if (actionFilter !== 'all' && rule.action !== actionFilter) return false;
        if (showMatchesOnly && searchQuery) {
            return isRuleHit(rule);
        }
        return true;
    };

    const getHumanDescription = (rule) => {
        let desc = "";
        desc += rule.action === 'permit' ? 'Erlaubt ' : 'Verweigert ';
        desc += (rule.protocol || 'IP').toUpperCase() + ' Traffic ';

        const formatHost = (ip, wild) => {
            if (ip === 'any') return 'Jeden Host';
            if (ip.startsWith('Object:')) return ip; // Handle Object groups simply
            if (wild === '0.0.0.0' || !wild) return `Host ${ip}`;

            // Heuristic: if mask starts with 255, it's a subnet mask (ASA), else wildcard (IOS)
            const isSubnetMask = wild.startsWith('255');
            const cidr = wildcardToCidr(isSubnetMask ? wild : wild); // This helper expects wildcard but simplified for visual

            // Just show the mask to be accurate
            return `Netz ${ip} (${wild})`;
        };

        desc += `von ${formatHost(rule.src, rule.srcWild)} `;
        desc += `nach ${formatHost(rule.dst, rule.dstWild)}`;

        if (rule.ports) {
            desc += ` (${rule.ports})`;
        }

        return desc;
    };

    const filteredAcls = acls.filter(acl => {
        if (!vlanFilter) return true;
        if (acl.interfaces.length === 0) return false;
        return acl.interfaces.some(iface => iface.toLowerCase().includes(vlanFilter.toLowerCase()));
    });

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
            <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Left Sidebar */}
                <div className="lg:col-span-4 space-y-4">

                    {/* SIMULATION TOOL */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-blue-500">
                        <div className="p-4 bg-slate-50 border-b border-slate-200 font-semibold flex items-center justify-between">
                            <div className="flex items-center text-blue-800">
                                <PlayCircle className="w-4 h-4 mr-2" /> Verbindungs-Check
                            </div>
                        </div>
                        <div className="p-4 space-y-3">
                            <p className="text-xs text-slate-500">Simuliert ein Paket durch alle ACLs.</p>

                            <div className="flex items-end space-x-2">
                                <div className="flex-1">
                                    <label className="text-xs font-semibold text-slate-500 block mb-1">Source IP</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                                        placeholder="IP oder 'any'"
                                        value={simSrcIp}
                                        onChange={(e) => setSimSrcIp(e.target.value)}
                                    />
                                </div>

                                <button
                                    onClick={swapSimulationIps}
                                    className="p-2 mb-[1px] text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    title="Tausche Source & Dest"
                                >
                                    <ArrowLeftRight className="w-4 h-4" />
                                </button>

                                <div className="flex-1">
                                    <label className="text-xs font-semibold text-slate-500 block mb-1">Dest IP</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                                        placeholder="IP oder 'any'"
                                        value={simDstIp}
                                        onChange={(e) => setSimDstIp(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 block mb-1">Protokoll</label>
                                    <select
                                        className="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                        value={simProto}
                                        onChange={(e) => setSimProto(e.target.value)}
                                    >
                                        <option value="ip">IP (Alles)</option>
                                        <option value="tcp">TCP</option>
                                        <option value="udp">UDP</option>
                                        <option value="icmp">ICMP</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 block mb-1">Port (Optional)</label>
                                    <input
                                        type="number"
                                        className="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                                        placeholder="z.B. 80"
                                        value={simPort}
                                        onChange={(e) => setSimPort(e.target.value)}
                                    />
                                </div>
                            </div>

                            {(simSrcIp && simDstIp) ? (
                                <div className="mt-2 p-2 bg-blue-50 text-blue-800 text-xs rounded border border-blue-100 flex items-start">
                                    <Info className="w-3 h-3 mt-0.5 mr-2 flex-shrink-0" />
                                    <span>Ergebnisse werden rechts in den ACL-Headern angezeigt.</span>
                                </div>
                            ) : (
                                <div className="mt-2 text-xs text-slate-400 italic">
                                    Bitte Source & Dest IP eingeben.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Filter Tool */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                        <div className="p-4 bg-slate-100 border-b border-slate-200 font-semibold flex items-center justify-between">
                            <div className="flex items-center">
                                <Activity className="w-4 h-4 mr-2" /> Einfache Suche
                            </div>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-500 mb-1 block">Schnellsuche (IP/Text)</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="z.B. 192.168.1.50"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Aktion</label>
                                    <select
                                        className="w-full p-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                        value={actionFilter}
                                        onChange={(e) => setActionFilter(e.target.value)}
                                    >
                                        <option value="all">Alle</option>
                                        <option value="permit">Nur Permit (Allow)</option>
                                        <option value="deny">Nur Deny (Block)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-500 mb-1 block">VLAN / Interface</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="z.B. outside"
                                        value={vlanFilter}
                                        onChange={(e) => setVlanFilter(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center pt-2">
                                <input
                                    type="checkbox"
                                    id="showMatches"
                                    className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 border-gray-300"
                                    checked={showMatchesOnly}
                                    onChange={(e) => setShowMatchesOnly(e.target.checked)}
                                    disabled={!searchQuery}
                                />
                                <label htmlFor="showMatches" className={`ml-2 text-sm ${!searchQuery ? 'text-slate-400' : 'text-slate-700'}`}>
                                    Nur Treffer anzeigen
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Visualization */}
                <div className="lg:col-span-8 space-y-6">
                    {filteredAcls.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-white rounded-xl border border-dashed border-slate-300 min-h-[400px]">
                            <ShieldAlert className="w-16 h-16 mb-4 opacity-20" />
                            <p className="text-lg">Keine ACLs geladen</p>
                            <p className="text-sm">Bitte IOS oder ASA Config hochladen.</p>
                        </div>
                    ) : (
                        filteredAcls.map((acl, idx) => {
                            const simResult = simulatePacketOnAcl(acl);

                            return (
                                <div key={idx} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
                                    {/* Simulation Result Banner - Overlays header if simulation active */}
                                    {simResult && (
                                        <div className={`px-4 py-2 border-b flex items-center justify-between ${
                                            simResult.result === 'permit'
                                                ? 'bg-green-50 border-green-200 text-green-800'
                                                : 'bg-red-50 border-red-200 text-red-800'
                                        }`}>
                                            <div className="flex items-center font-bold text-sm">
                                                {simResult.result === 'permit' ? <CheckCircle className="w-4 h-4 mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                                                Simulation: {simResult.result.toUpperCase()}
                                                <span className="font-normal ml-1">
                                        (durch {simResult.type === 'implicit' ? 'Implicit Deny am Ende' : 'Regel-Treffer'})
                                    </span>
                                            </div>
                                            {simResult.result === 'permit' && expandedAcl !== acl.name && (
                                                <button
                                                    onClick={() => setExpandedAcl(acl.name)}
                                                    className="text-xs underline text-green-700 hover:text-green-900"
                                                >
                                                    Zeige Regel
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {/* ACL Header Card */}
                                    <div
                                        className="p-4 bg-white border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                                        onClick={() => setExpandedAcl(expandedAcl === acl.name ? null : acl.name)}
                                    >
                                        <div className="flex flex-col space-y-2 w-full">
                                            <div className="flex items-center justify-between w-full">
                                                <div className="flex items-center space-x-3">
                                                    <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                                                        <ShieldCheck className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-lg text-slate-800">{acl.name}</h3>
                                                        <div className="flex items-center space-x-2">
                                                <span className="text-xs font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full border border-slate-200">
                                                    {acl.type}
                                                </span>
                                                            <span className="text-xs text-slate-400">{acl.rules.length} Regeln</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                {expandedAcl === acl.name ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
                                            </div>

                                            {acl.interfaces.length > 0 && (
                                                <div className="flex flex-wrap gap-2 pt-1 pl-12">
                                                    {acl.interfaces.map((iface, i) => (
                                                        <span key={i} className="text-xs flex items-center px-2 py-1 bg-indigo-50 text-indigo-700 rounded border border-indigo-100">
                                                <Network className="w-3 h-3 mr-1" />
                                                            {iface}
                                            </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Rules Table */}
                                    {expandedAcl === acl.name && (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                                                <tr>
                                                    <th className="p-3 w-20">Aktion</th>
                                                    <th className="p-3 w-20">Proto</th>
                                                    <th className="p-3">Quelle</th>
                                                    <th className="p-3 w-8"></th>
                                                    <th className="p-3">Ziel</th>
                                                    <th className="p-3">Details / Match</th>
                                                </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                {acl.rules.map((rule) => {
                                                    const isHit = isRuleHit(rule);
                                                    const isVisible = isRuleVisible(rule);
                                                    const isSimMatch = simResult && simResult.ruleId === rule.id;

                                                    if (!isVisible) return null;

                                                    return (
                                                        <tr key={rule.id} className={`transition-colors ${
                                                            isSimMatch ? 'bg-blue-50 border-l-4 border-blue-500' :
                                                                isHit ? 'bg-yellow-50 border-l-4 border-yellow-400' :
                                                                    'hover:bg-slate-50'
                                                        }`}>
                                                            <td className="p-3">
                                                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${
                                                            rule.action === 'permit'
                                                                ? 'bg-green-100 text-green-700'
                                                                : 'bg-red-100 text-red-700'
                                                        }`}>
                                                            {rule.action === 'permit' ? 'PERMIT' : 'DENY'}
                                                        </span>
                                                            </td>
                                                            <td className="p-3 uppercase text-slate-600 font-mono text-xs">{rule.protocol}</td>
                                                            <td className="p-3 font-mono text-slate-700">
                                                                {rule.src === 'any' ? <span className="text-slate-400 italic">Any</span> : rule.src}
                                                                {rule.srcWild && rule.srcWild !== '0.0.0.0' && (
                                                                    <span className="text-slate-400 text-xs block">
                                                                {rule.srcWild.startsWith('255') ? 'mask' : 'wildcard'}: {rule.srcWild}
                                                            </span>
                                                                )}
                                                            </td>
                                                            <td className="p-3 text-slate-300">
                                                                <ArrowRight className="w-4 h-4" />
                                                            </td>
                                                            <td className="p-3 font-mono text-slate-700">
                                                                {rule.dst === 'any' ? <span className="text-slate-400 italic">Any</span> : rule.dst}
                                                                {rule.dstWild && rule.dstWild !== '0.0.0.0' && (
                                                                    <span className="text-slate-400 text-xs block">
                                                                {rule.dstWild.startsWith('255') ? 'mask' : 'wildcard'}: {rule.dstWild}
                                                            </span>
                                                                )}
                                                                {rule.ports && (
                                                                    <span className="block mt-1 text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded w-fit">
                                                                {rule.ports}
                                                            </span>
                                                                )}
                                                            </td>
                                                            <td className="p-3">
                                                                <div className="text-xs text-slate-500">
                                                                    {getHumanDescription(rule)}
                                                                </div>
                                                                {isSimMatch && (
                                                                    <div className="mt-1 text-xs font-bold text-blue-700 flex items-center">
                                                                        <CheckCircle className="w-3 h-3 mr-1"/> Regel trifft Simulation
                                                                    </div>
                                                                )}
                                                                {isHit && !isSimMatch && (
                                                                    <div className="mt-1 text-xs font-bold text-yellow-700 flex items-center">
                                                                        <AlertCircle className="w-3 h-3 mr-1"/> Such-Treffer
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                {/* Implicit Deny Logic Display */}
                                                {actionFilter !== 'permit' && (
                                                    <tr className={`${simResult && simResult.type === 'implicit' ? 'bg-red-50 border-l-4 border-red-500' : 'bg-slate-50/50'} italic text-slate-400`}>
                                                        <td className="p-3">
                                                            <span className="px-2 py-1 bg-gray-200 text-gray-500 rounded text-xs font-bold">DENY</span>
                                                        </td>
                                                        <td className="p-3 text-xs">IP</td>
                                                        <td className="p-3 text-xs">Any</td>
                                                        <td className="p-3"></td>
                                                        <td className="p-3 text-xs">Any</td>
                                                        <td className="p-3 text-xs">
                                                            {simResult && simResult.type === 'implicit' ?
                                                                <span className="text-red-600 font-bold not-italic">Traffic hier blockiert (Implicit Deny)</span> :
                                                                'Implizites Deny am Ende jeder ACL'
                                                            }
                                                        </td>
                                                    </tr>
                                                )}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )})
                    )}
                </div>

            </main>
        </div>
    );
};

export default ConfigAnalyzer;