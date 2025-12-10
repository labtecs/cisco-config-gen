// server.js
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { Client } from 'ssh2';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

app.post('/api/connect', (req, res) => {
    const { ip, port, username, password } = req.body;
    const conn = new Client();
    let errorSent = false;

    console.log(`[SSH] Connecting to ${ip}:${port}...`);

    conn.on('ready', () => {
        console.log('[SSH] Connection established. Executing command...');

        conn.exec('show running-config view full', (err, stream) => {
            if (err) {
                const execErrorMessage = err ? err.toString() : 'An unknown exec error occurred.';
                console.error('[SSH] Exec error:', execErrorMessage);
                if (!errorSent) {
                    errorSent = true;
                    return res.status(500).json({ error: execErrorMessage });
                }
                return;
            }

            let configData = '';
            let errorData = '';

            stream.on('data', (data) => {
                configData += data.toString();
            });

            stream.stderr.on('data', (data) => {
                errorData += data.toString();
            });

            stream.on('close', (code) => {
                console.log(`[SSH] Stream closed with code ${code}.`);
                conn.end();

                if (errorSent) return;

                if (errorData) {
                    console.error('[SSH] Stderr:', errorData);
                    // Don't send error response if we already sent data, some devices write non-fatal warnings to stderr
                    if (configData.length < 100) { // Heuristic: if we got very little data, it's probably a real error
                        errorSent = true;
                        return res.status(500).json({ error: errorData.trim() });
                    }
                }
                
                res.json({ success: true, config: configData });
            });
        });
    }).on('error', (err) => {
        const connErrorMessage = err ? err.toString() : 'An unknown connection error occurred.';
        console.error('[SSH] Connection error:', connErrorMessage);
        if (!errorSent) {
            errorSent = true;
            res.status(500).json({ error: 'Connection failed: ' + connErrorMessage });
        }
    }).connect({
        host: ip,
        port: parseInt(port),
        username: username,
        password: password,
        readyTimeout: 20000, // Increase timeout for slower devices
        // Ciphers often needed for older Cisco Switches:
        algorithms: {
            kex: [
                "diffie-hellman-group1-sha1",
                "diffie-hellman-group14-sha1",
                "ecdh-sha2-nistp256",
                "ecdh-sha2-nistp384",
                "ecdh-sha2-nistp521",
                "diffie-hellman-group-exchange-sha256",
                "diffie-hellman-group14-sha256"
            ],
            cipher: [
                "aes128-ctr", "aes192-ctr", "aes256-ctr",
                "aes128-cbc", "3des-cbc"
            ]
        }
    });
});

app.listen(PORT, () => {
    console.log(`--------------------------------------------------`);
    console.log(`🚀 Cisco Backend Server running on http://localhost:${PORT}`);
    console.log(`--------------------------------------------------`);
});
