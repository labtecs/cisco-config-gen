import React, { useState } from 'react';
import { Network, ShieldCheck, Box, Settings } from 'lucide-react';

// Tools importieren
import ConfigGen from './components/Tools/ConfigGen';
import AclInspector from './components/Tools/AclInspector';
import GlobalConfig from './components/Tools/GlobalConfig';
import GlobalHeader from "./components/Layout/GlobalHeader.jsx";
import ConnectionBar from './components/Layout/ConnectionBar';
import { useSSH } from './hooks/Cisco/useSSH.js';

/**
 * The main application component.
 * It renders the global navigation and manages the active tool being displayed.
 *
 * @returns {JSX.Element} The rendered App component.
 */
export default function App() {
    // State to track the currently active tool ('generator', 'acl', or 'global')
    const [activeTool, setActiveTool] = useState('generator');
    const [fileContent, setFileContent] = useState('');
    const [dragActive, setDragActive] = useState(false);
    const [showConnectionBar, setShowConnectionBar] = useState(false);

    const handleSshContent = (configText) => {
        console.log("%c[SSH DEBUG] Content Received", "color: orange; font-weight: bold");
        console.log("Length:", configText.length);
        console.log("Preview (First 200):", configText.substring(0, 200));
        console.log("Preview (Last 200):", configText.substring(configText.length - 200));
        setFileContent(configText);
        setShowConnectionBar(false); // Close bar on success
    };

    const { isConnecting, handleSSHConnect } = useSSH(handleSshContent);

    const handleFile = (file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            if (typeof e.target.result === 'string') {
                setFileContent(e.target.result);
            }
        };
        reader.readAsText(file);
    };

    const handleGlobalUpload = (event) => {
        event.preventDefault();
        event.stopPropagation();
        handleFile(event.target.files[0]);
    };

    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleGlobalReset = () => {
        if (window.confirm("Möchtest du wirklich alle geladenen Daten zurücksetzen?")) {
            setFileContent('');
        }
    };

    return (
        // Root container for the entire application
        <div className="min-h-screen bg-slate-100 font-sans flex flex-col"
             onDragEnter={handleDragEnter}
             onDragLeave={handleDragLeave}
             onDragOver={handleDragOver}
             onDrop={handleDrop}
        >
            {/* Global navigation bar, sticky at the top */}
            <nav className="bg-slate-900 text-white border-b border-slate-700 sticky top-0 z-[100]">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex items-center justify-between h-14">

                        {/* Logo and application brand name */}
                        <div className="flex items-center gap-2 font-bold text-lg tracking-tight text-blue-400">
                            <Box className="w-6 h-6" />
                            <span>LabTecs Toolbox</span>
                        </div>

                        {/* Container for navigation buttons to switch between tools */}
                        <div className="flex space-x-1">
                            {/* Button to activate the Switchport Generator tool */}
                            <button
                                onClick={() => setActiveTool('generator')}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-all border-b-2 ${
                                    activeTool === 'generator'
                                        ? 'bg-slate-800 text-white border-blue-500'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800 border-transparent'
                                }`}
                            >
                                <Network size={16} />
                                Switchport Gen
                            </button>

                            {/* Button to activate the Global Config tool */}
                            <button
                                onClick={() => setActiveTool('global')}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-all border-b-2 ${
                                    activeTool === 'global'
                                        ? 'bg-slate-800 text-white border-purple-500'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800 border-transparent'
                                }`}
                            >
                                <Settings size={16} />
                                Global Config
                            </button>

                            {/* Button to activate the ACL Inspector tool */}
                            <button
                                onClick={() => setActiveTool('acl')}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-all border-b-2 ${
                                    activeTool === 'acl'
                                        ? 'bg-slate-800 text-white border-green-500'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800 border-transparent'
                                }`}
                            >
                                <ShieldCheck size={16} />
                                ACL Inspector
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <GlobalHeader
                onUpload={handleGlobalUpload}
                dragActive={dragActive}
                showSshButton={true} // Always show SSH button
                onToggleConnect={() => setShowConnectionBar(!showConnectionBar)}
                isConnectOpen={showConnectionBar}
                onReset={handleGlobalReset}
            />

            {/* CONNECTION BAR - SLIDES IN */}
            {showConnectionBar && (
                <ConnectionBar
                    onConnect={handleSSHConnect}
                    onClose={() => setShowConnectionBar(false)}
                    isLoading={isConnecting}
                />
            )}

            {/* Main content area where the active tool is rendered */}
            <div className="flex-1">
                {/* Conditionally render the component based on the activeTool state */}
                {activeTool === 'generator' && (
                    <div className="animate-in fade-in duration-300">
                        <ConfigGen fileContent={fileContent} />
                    </div>
                )}
                {activeTool === 'global' && (
                    <div className="animate-in fade-in duration-300">
                        <GlobalConfig fileContent={fileContent} />
                    </div>
                )}
                {activeTool === 'acl' && (
                    <div className="animate-in fade-in duration-300">
                        <AclInspector fileContent={fileContent} />
                    </div>
                )}
            </div>
        </div>
    );
}