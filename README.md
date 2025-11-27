Cisco Switchport Config Generator

Ein modernes, webbasiertes Tool zur einfachen Erstellung, Visualisierung und Massenbearbeitung von Cisco Switchport-Konfigurationen. Entwickelt, um Netzwerktechnikern das Leben leichter zu machen und Konfigurationsfehler zu vermeiden.

Live Demo: (Hier könnte dein Link stehen, falls öffentlich)

Features

Visuelle Darstellung: Interaktive, grafische Ansicht von Switch-Stacks (bis zu 8 Member) und Ports. Klicke direkt auf die Ports, um sie auszuwählen!

Config Import: Lade eine bestehende "show running-config" hoch. Das Tool parst die Datei und visualisiert deine aktuelle Port-Konfiguration automatisch.

Bulk Edit (Massenbearbeitung): Wähle mehrere Ports gleichzeitig aus (via Checkbox, Shift-Klick oder Klick auf die Grafik), um VLANs, Port-Modi, Voice-VLANs oder Beschreibungen für alle gleichzeitig zu ändern.

Live Preview: Generiert in Echtzeit kopierfertigen, sauberen Cisco IOS Code.

Sicher & Offline-fähig: Die Anwendung läuft vollständig in deinem Browser (Client-Side). Keine sensiblen Konfigurationsdaten verlassen deinen Computer.

Installation & Nutzung

Methode 1: Docker (Empfohlen)

Der einfachste Weg, die Anwendung zu hosten, ist über Docker.

Repository klonen:

git clone [https://github.com/labtecs/cisco-config-gen.git](https://github.com/labtecs/cisco-config-gen.git)
cd cisco-config-gen


Container starten:

docker-compose up -d --build


Loslegen:
Öffne deinen Browser und gehe auf http://localhost:4949.

Methode 2: Portainer (GUI)

Falls du Portainer verwendest, kannst du den Stack direkt aus dem Git-Repository deployen.

Erstelle einen neuen Stack.

Wähle Repository als Build-Methode.

Repository URL: https://www.google.com/search?q=https://github.com/labtecs/cisco-config-gen.git

Compose path: docker-compose.yml

Klicke auf Deploy the stack.

Methode 3: Manuell (Node.js)

Für Entwicklung oder manuelles Hosting ohne Docker.

Voraussetzungen: Node.js (v16 oder höher).

Abhängigkeiten installieren:

npm install


Entwicklungsserver starten:

npm run dev


(App läuft meist unter http://localhost:5173)

Für Produktion bauen:

npm run build

Lizenz

Dieses Projekt ist Open Source. Feel free to fork, modify and distribute!
