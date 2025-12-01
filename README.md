# 🧰 LabTecs Cisco Toolbox

**Version:** v3.7
**Tech Stack:** React (Vite), Node.js (Express), TailwindCSS, Docker

Die **Cisco Toolbox** ist eine moderne Web-Applikation für Netzwerk-Engineers. Sie vereint leistungsstarke Tools zur Automatisierung und Analyse von Cisco-Konfigurationen in einer einzigen, benutzerfreundlichen Oberfläche.

---

## 🚀 Features

Die Toolbox besteht aus zwei Hauptmodulen:

### 1. 🔌 Switchport Generator
Ein visuelles Tool zum schnellen Erstellen und Bearbeiten von Switch-Konfigurationen.
* **Switch Visualizer:** Grafische Darstellung von 8, 12, 24 oder 48-Port Switches (inkl. Stacks).
* **SSH Import:** Verbinde dich direkt mit einem Switch und lade die `running-config` live.
* **Running-Config Parser:** Lädt bestehende Config-Files und erkennt VLANs, Descriptions und Modi automatisch.
* **Multi-Port Editor:** Bearbeite Hunderte von Ports gleichzeitig (VLANs, PoE, Voice, Security).
* **Smart VLAN Filtering:** Erkennt automatisch genutzte und ungenutzte VLANs. Trunk-Ranges (z.B. `2-4094`) werden intelligent gruppiert.

### 2. 🛡️ ACL Inspector
Ein Analyse-Tool für Firewall-Regelwerke und Access-Listen.
* **Multi-Support:** Unterstützt Cisco IOS (Standard/Extended) und Cisco ASA Syntax.
* **Traffic Simulation:** Gib Source-IP, Destination-IP und Port ein – das Tool prüft, ob das Paket durchkommt ("Permit" oder "Deny").
* **Regel-Visualisierung:** Farbliche Hervorhebung von Treffern und Simulationen.
* **Objekt-Auflösung:** Erkennt Wildcard-Masken und Subnetzmasken automatisch.

---

## 🛠️ Installation & Start

Du hast zwei Möglichkeiten, das Projekt zu starten: Als Docker-Container (empfohlen) oder im Entwicklungs-Modus.

### Option A: Docker (Empfohlen für Nutzung)
Das Projekt ist vollständig dockerisiert. Frontend und Backend starten mit einem Befehl.

1.  Repository klonen:
    ```bash
    git clone [https://github.com/labtecs/cisco-config-gen.git](https://github.com/labtecs/cisco-config-gen.git)
    cd cisco-config-gen
    ```

2.  Container starten:
    ```bash
    docker-compose up --build -d
    ```

3.  App öffnen:
    👉 **http://localhost:4949**

*(Das Backend läuft im Hintergrund auf Port 3001 und kommuniziert automatisch mit dem Frontend).*

---

### Option B: Manuell (Für Entwicklung)
Wenn du am Code arbeiten möchtest, starte Frontend und Backend in separaten Terminals.

#### Voraussetzungen
* Node.js (v18 oder neuer) installiert.

#### 1. Backend starten (SSH Service)
Dieser Server wird benötigt, um SSH-Verbindungen zu Switches aufzubauen.

```bash
# Im Hauptverzeichnis
npm install
node server.js