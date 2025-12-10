/**
 * Zentrale Konfigurationsdatei für die Anwendung.
 * Hier werden Standardwerte definiert, ähnlich einer config.ini.
 */
export const defaultSettings = {
  layout: {
    // Optionen: 'standard' (zentriert, max-width) oder 'full-width' (ganzer Bildschirm)
    mode: 'standard', 
  },
  ui: {
    showSidebar: true,
    theme: 'light' // Vorbereitung für Dark Mode
  }
};