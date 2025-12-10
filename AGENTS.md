# Project Context: Cisco Config Generator

## Tech Stack
- **Frontend:** React (Vite), Tailwind CSS, Lucide React Icons.
- **Backend:** Node.js (Express), ssh2 (für SSH-Verbindungen).
- **State Management:** Custom Hooks Pattern. `useCiscoGen.js` ist der Haupt-Controller, der spezialisierte Hooks (wie `usePortState`, `useConfigParsing`) orchestriert.

## Architecture
- **Logic vs UI:** Strikte Trennung.
  - UI-Komponenten liegen in `src/components/`. Sie sollten so wenig komplexe Logik wie möglich enthalten.
  - Business-Logik liegt in `src/hooks/Cisco/`.
- **Parsing (`useConfigParsing.js`):**
  - Muss robust gegenüber verschiedenen Cisco-Formaten sein (z. B. Leerzeichen in `Gi 1/0/1`).
  - Muss "Implicit VLANs" erkennen (VLANs, die genutzt, aber nicht global definiert sind).
  - Erkennt automatisch, ob es sich um einen Stack (`1/0/1`) oder Standalone (`0/1`) handelt.
- **Visualizer (`SwitchVisualizer.jsx`):**
  - Rendert die physische Ansicht.
  - **Wichtig:** Benötigt zwingend die Prop `portNaming` ('stack' oder 'simple'), um Ports korrekt zuzuordnen.

## Key Conventions & Rules
1.  **Port Naming & IDs:**
    - **Stack:** Format `S/M/P` (z. B. `1/0/1`).
    - **Simple/Standalone:** Format `M/P` (z. B. `0/1`).
    - Die ID ist der primäre Schlüssel. Der Parser und der State müssen dieses Format konsistent beibehalten.
2.  **React Performance & Stability:**
    - **Hooks:** Funktionen, die an `useEffect` übergeben werden, MÜSSEN mit `useCallback` stabilisiert werden.
    - **Return Values:** Objekte, die von Hooks zurückgegeben werden, MÜSSEN mit `useMemo` stabilisiert werden, um Endlosschleifen ("Maximum update depth exceeded") zu verhindern.
    - **Circular Dependencies:** Vermeide Situationen, in denen `useEffect A` den State ändert, der `useEffect B` triggert, welcher wiederum `useEffect A` triggert.
3.  **Data Flow:**
    - `useCiscoGen` hält den "Single Source of Truth".
    - Änderungen fließen von dort nach unten in die Komponenten.

## File Structure
- `src/hooks/Cisco/`: Alle Logik-Hooks.
- `src/components/Tools/ConfigGen.jsx`: Die Haupt-Page-Komponente.
- `src/utils/ciscoHelpers.js`: Reine Hilfsfunktionen (Regex, String-Manipulation).