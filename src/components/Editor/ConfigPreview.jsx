import React from 'react';
import { Terminal, Copy, Save, Shield, Wrench } from 'lucide-react';

/**
 * Renders the configuration preview panel.
 * This component displays the generated network configuration in a read-only textarea,
 * provides options to customize the output, and allows copying or downloading the config.
 *
 * @param {object} props - The component props.
 * @param {string} props.generatedConfig - The generated configuration string to display.
 * @param {() => void} props.copyToClipboard - Function to copy the configuration to the clipboard.
 * @param {() => void} props.downloadFile - Function to download the configuration as a file.
 * @param {boolean} props.includeWrMem - State for including the 'write memory' command.
 * @param {(value: boolean) => void} props.setIncludeWrMem - State setter for includeWrMem.
 * @param {boolean} props.useModernPortfast - State for using modern 'spanning-tree portfast' syntax.
 * @param {(value: boolean) => void} props.setUseModernPortfast - State setter for useModernPortfast.
 * @param {boolean} props.includeNoShutdown - State for including the 'no shutdown' command.
 * @param {(value: boolean) => void} props.setIncludeNoShutdown - State setter for includeNoShutdown.
 * @param {boolean} props.includeDescriptions - State for including interface descriptions.
 * @param {(value: boolean) => void} props.setIncludeDescriptions - State setter for includeDescriptions.
 * @param {boolean} props.useRangeCommands - State for using 'interface range' commands.
 * @param {(value: boolean) => void} props.setUseRangeCommands - State setter for useRangeCommands.
 * @param {boolean} props.includeBaseConfig - State for including base configuration (VLAN, mode).
 * @param {(value: boolean) => void} props.setIncludeBaseConfig - State setter for includeBaseConfig.
 * @param {boolean} props.forcePoeReset - State for forcing 'no power inline never'.
 * @param {(value: boolean) => void} props.setForcePoeReset - State setter for forcePoeReset.
 * @param {string} props.version - The current application version to display in the feature box.
 * @returns {JSX.Element}
 */
export default function ConfigPreview({
                                          generatedConfig,
                                          copyToClipboard,
                                          downloadFile,
                                          includeWrMem, setIncludeWrMem,
                                          useModernPortfast, setUseModernPortfast,
                                          includeNoShutdown, setIncludeNoShutdown,
                                          includeDescriptions, setIncludeDescriptions,
                                          useRangeCommands, setUseRangeCommands,
                                          includeBaseConfig, setIncludeBaseConfig,
                                          forcePoeReset, setForcePoeReset,
                                          version
                                      }) {
    return (
        // Main container for the config preview section
        <div className="lg:col-span-1 flex flex-col h-[1000px] gap-4">
            {/* The "terminal" window for displaying the configuration */}
            <div className="bg-slate-900 rounded-xl shadow-lg border border-slate-800 flex flex-col flex-1 overflow-hidden">
                {/* Header of the terminal window, containing title, actions, and options */}
                <div className="bg-slate-800 p-3 border-b border-slate-700 flex flex-col gap-3">
                    {/* Title bar with filename and action buttons (Copy, Save) */}
                    <div className="flex justify-between items-center text-slate-200 font-mono text-sm">
                        <div className="flex items-center gap-2">
                            <Terminal size={16} />
                            <span>config-preview.ios</span>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={copyToClipboard} className="p-1.5 hover:bg-slate-700 rounded text-slate-300 transition" title="Copy">
                                <Copy size={16} />
                            </button>
                            <button onClick={downloadFile} className="p-1.5 hover:bg-slate-700 rounded text-slate-300 transition" title="Save as File">
                                <Save size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Standard configuration generation options */}
                    <div className="flex flex-wrap gap-4 text-xs text-slate-400 pt-1 border-t border-slate-700">
                        <label className="flex items-center gap-2 cursor-pointer hover:text-slate-200">
                            <input
                                type="checkbox"
                                className="rounded bg-slate-700 border-slate-600 text-green-500 focus:ring-green-500/50"
                                checked={includeWrMem}
                                onChange={(e) => setIncludeWrMem(e.target.checked)}
                            />
                            <span>Auto-Save (wr mem)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer hover:text-slate-200">
                            <input
                                type="checkbox"
                                className="rounded bg-slate-700 border-slate-600 text-green-500 focus:ring-green-500/50"
                                checked={useModernPortfast}
                                onChange={(e) => setUseModernPortfast(e.target.checked)}
                            />
                            <span>Modern Portfast</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer hover:text-slate-200">
                            <input
                                type="checkbox"
                                className="rounded bg-slate-700 border-slate-600 text-green-500 focus:ring-green-500/50"
                                checked={includeNoShutdown}
                                onChange={(e) => setIncludeNoShutdown(e.target.checked)}
                            />
                            <span>No Shut</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer hover:text-slate-200">
                            <input
                                type="checkbox"
                                className="rounded bg-slate-700 border-slate-600 text-green-500 focus:ring-green-500/50"
                                checked={includeDescriptions}
                                onChange={(e) => setIncludeDescriptions(e.target.checked)}
                            />
                            <span>Description</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer hover:text-slate-200">
                            <input
                                type="checkbox"
                                className="rounded bg-slate-700 border-slate-600 text-green-500 focus:ring-green-500/50"
                                checked={useRangeCommands}
                                onChange={(e) => setUseRangeCommands(e.target.checked)}
                            />
                            <span>Range</span>
                        </label>
                    </div>

                    {/* Maintenance and advanced configuration options */}
                    <div className="flex flex-wrap gap-4 text-xs text-slate-400 pt-2 mt-1 border-t border-slate-700/50">
                        {/* Toggle to include or exclude the base configuration (VLAN, mode) */}
                        <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
                            <input
                                type="checkbox"
                                className="rounded bg-slate-700 border-slate-600 text-blue-500 focus:ring-blue-500/50"
                                checked={includeBaseConfig}
                                onChange={(e) => setIncludeBaseConfig(e.target.checked)}
                            />
                            <span className={!includeBaseConfig ? "text-slate-500 line-through decoration-slate-600" : "text-blue-100 font-medium"}>
                                Base Config (VLAN/Mode)
                            </span>
                        </label>

                        {/* Toggle to force the 'no power inline never' command for PoE reset */}
                        <label className="flex items-center gap-2 cursor-pointer hover:text-yellow-200 text-yellow-500/80 transition-colors">
                            <input
                                type="checkbox"
                                className="rounded bg-slate-700 border-yellow-600 text-yellow-500 focus:ring-yellow-500/50"
                                checked={forcePoeReset}
                                onChange={(e) => setForcePoeReset(e.target.checked)}
                            />
                            <span className={forcePoeReset ? "font-bold text-yellow-400" : ""}>
                                Force 'no power inline never'
                            </span>
                        </label>
                    </div>

                </div>
                {/* Read-only textarea to display the generated configuration */}
                <textarea
                    className="flex-1 bg-slate-900 text-green-400 font-mono text-xs p-4 resize-none focus:outline-none leading-relaxed"
                    readOnly
                    value={generatedConfig}
                />
            </div>

            {/* Informational box highlighting new features */}
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
                <h3 className="text-blue-800 font-bold mb-2 text-sm flex items-center gap-2">
                    <Shield size={14} />
                    Neue Funktionen ({version})
                </h3>
                <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                    <li><strong>Base Config Filter:</strong> Deaktiviere "Base Config", um nur Änderungen (wie PoE) auszugeben.</li>
                    <li><strong>PoE Reset:</strong> Erzwinge "no power inline never" auch im Auto-Modus für Migrationen.</li>
                </ul>
            </div>
        </div>
    );
}