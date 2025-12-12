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
    let responseSent = false;

    console.log(`[SSH] Connecting to ${ip}:${port}...`);

    conn.on('ready', () => {
        console.log('[SSH] Connection established. Starting shell...');

        conn.shell((err, stream) => {
            if (err) {
                console.error('[SSH] Shell error:', err);
                if (!responseSent) {
                    responseSent = true;
                    return res.status(500).json({ error: err.toString() });
                }
                return;
            }

            let fullOutput = '';

            // Collect data
            stream.on('data', (data) => {
                fullOutput += data.toString();
            });

            // Handle stream close (triggered by the 'exit' command we send)
            stream.on('close', () => {
                console.log('[SSH] Shell stream closed.');
                conn.end();
                if (!responseSent) {
                    responseSent = true;
                    res.json({ success: true, config: fullOutput });
                }
            });

            // Send commands sequence
            stream.end(
                'terminal length 0\n' +
                'show version\n' +
                'show vlan brief\n' + // Added command
                'show ip route\n' +
                'show running-config view full\n' +
                'exit\n'
            );
        });

    }).on('error', (err) => {
        const connErrorMessage = err ? err.toString() : 'An unknown connection error occurred.';
        console.error('[SSH] Connection error:', connErrorMessage);
        if (!responseSent) {
            responseSent = true;
            res.status(500).json({ error: 'Connection failed: ' + connErrorMessage });
        }
    }).connect({
        host: ip,
        port: parseInt(port),
        username: username,
        password: password,
        readyTimeout: 60000,
        keepaliveInterval: 10000,
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