Cisco Switchport Config Generator 🎛️

Ein modernes, webbasiertes Tool zur einfachen Erstellung und Visualisierung von Cisco Switchport-Konfigurationen. Entwickelt, um Netzwerktechnikern das Leben leichter zu machen.

Features:

🎨 Visuelle Darstellung: Interaktive Ansicht von Switch-Stacks (bis zu 8 Member) und Ports.

📝 Config Import: Lade eine show running-config hoch und lass das Tool die aktuelle Port-Konfiguration automatisch erkennen.

🚀 Bulk Edit: Wähle mehrere Ports gleichzeitig aus, um VLANs, Port-Modi oder Beschreibungen massenhaft zu ändern.

📋 Live Preview: Generiert sofort kopierfertigen Cisco IOS Code.

🔒 Sicher: Läuft vollständig im Browser (Client-Side), keine Daten verlassen deinen Computer.

🚀 Quick Start (Docker)

Der einfachste Weg, die Anwendung zu nutzen, ist über Docker.

Repository klonen:

git clone [https://github.com/labtecs/cisco-config-gen.git](https://github.com/labtecs/cisco-config-gen.git)
cd cisco-config-gen


Container starten:

docker-compose up -d --build


Loslegen:
Öffne deinen Browser und gehe auf http://localhost:4949.

🛠️ Manuelle Installation (Node.js)

Falls du kein Docker verwenden möchtest, kannst du die App auch lokal mit Node.js bauen.

Voraussetzungen: Node.js (v16 oder höher).

Abhängigkeiten installieren:

npm install


Entwicklungsserver starten:

npm run dev


Die App läuft dann meist unter http://localhost:5173.

Für Produktion bauen:

npm run build


Der Inhalt des dist-Ordners kann auf jeden statischen Webserver (Nginx, Apache, IIS) kopiert werden.

📂 Projektstruktur

/cisco-config-gen
  ├── public/             # Statische Assets
  ├── src/
  │    ├── App.jsx        # Hauptanwendungslogik (WICHTIG: Großes 'A')
  │    ├── main.jsx       # React Einstiegspunkt
  │    └── index.css      # Globale Styles (Tailwind)
  ├── Dockerfile          # Bauanleitung für das Docker Image
  ├── docker-compose.yml  # Container Orchestrierung
  ├── index.html          # HTML Gerüst
  ├── package.json        # Projekt-Metadaten & Skripte
  ├── postcss.config.js   # CSS Post-Processing Konfig
  ├── tailwind.config.js  # Tailwind CSS Konfig
  └── vite.config.js      # Build-Tool Konfig

Lizenz

Feel free to use and modify!
