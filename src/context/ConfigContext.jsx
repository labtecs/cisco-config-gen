import React, { createContext, useContext, useState, useEffect } from 'react';
import { defaultSettings } from '../config/appSettings';

const ConfigContext = createContext();

export const ConfigProvider = ({ children }) => {
  // State mit Lazy Initialization aus localStorage laden
  const [settings, setSettings] = useState(() => {
    try {
      const stored = localStorage.getItem('cisco_app_config');
      return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
    } catch (error) {
      console.error("Fehler beim Laden der Konfiguration:", error);
      return defaultSettings;
    }
  });

  // Speichern bei Änderungen
  useEffect(() => {
    localStorage.setItem('cisco_app_config', JSON.stringify(settings));
  }, [settings]);

  /**
   * Ändert den Layout-Modus
   * @param {'standard'|'full-width'} mode 
   */
  const setLayoutMode = (mode) => {
    setSettings(prev => ({
      ...prev,
      layout: { ...prev.layout, mode }
    }));
  };

  const toggleLayoutMode = () => {
    const newMode = settings.layout.mode === 'standard' ? 'full-width' : 'standard';
    setLayoutMode(newMode);
  };

  const value = {
    settings,
    setLayoutMode,
    toggleLayoutMode
  };

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useAppConfig = () => useContext(ConfigContext);