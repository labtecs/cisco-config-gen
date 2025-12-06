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
    let configData = '';
    let errorSent = false;

    console.log(`[SSH] Connecting to ${ip}:${port}...`);

    conn.on('ready', () => {
        console.log('[SSH] Connection established. Starting shell...');

        conn.shell((err, stream) => {
            if (err) {
                // Use toString() for the most robust error handling
                const shellErrorMessage = err ? err.toString() : 'An unknown shell error occurred.';
                console.error('[SSH] Shell error:', shellErrorMessage);
                if (!errorSent) {
                    errorSent = true;
                    return res.status(500).json({ error: shellErrorMessage });
                }
                return;
            }

            // Commands to fetch config without pagination
            stream.end('terminal length 0\nshow running-config\nexit\n');

            stream.on('data', (data) => {
                configData += data.toString();
            });

            stream.on('close', () => {
                console.log('[SSH] Stream closed.');
                conn.end();

                if (!errorSent) {
                    res.json({ success: true, config: configData });
                }
            });
        });
    }).on('error', (err) => {
        // Use toString() for the most robust error handling
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