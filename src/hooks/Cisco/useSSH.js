import { useState } from 'react';

export function useSSH(onSuccess) {
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState(null);
    const testmode = false; //Switch to true for testing


    const handleSSHConnect = async (credentials) => {
        setIsConnecting(true);
        setError(null);
        if (testmode === false) {
            try {
                const response = await fetch('http://localhost:3001/api/connect', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(credentials),
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || `HTTP error! status: ${response.status}`);
                }

                if (onSuccess && data.config) {
                    onSuccess(data.config);
                } else {
                    throw new Error('No config data received from server.');
                }
            } catch (e) {
                setError(e.message || 'Failed to connect');
            } finally {
                setIsConnecting(false);
            }
        } else {
            try {
                // This is where you would implement the actual SSH connection logic
                // For now, we'll just simulate a successful connection with a delay
                await new Promise(resolve => setTimeout(resolve, 1500));
                const simulatedConfig = `!
                    ! Last configuration change at 14:22:53 UTC Mon Jul 29 2024
                    !
                    version 15.2
                    service timestamps debug datetime msec
                    service timestamps log datetime msec
                    no service password-encryption
                    !
                    hostname Test-Switch
                    !
                    boot-start-marker
                    boot-end-marker
                    !
                    !
                    !
                    spanning-tree mode rapid-pvst
                    spanning-tree extend system-id
                    !
                    vlan 1
                     name default
                    !
                    vlan 10
                     name Users
                    !
                    vlan 20
                     name Servers
                    !
                    !
                    interface GigabitEthernet0/0
                     description *** UPLINK ***
                     switchport mode trunk
                    !
                    interface GigabitEthernet0/1
                     switchport access vlan 10
                     switchport mode access
                    !
                    interface GigabitEthernet0/2
                     switchport access vlan 20
                     switchport mode access
                    !
                    interface Vlan1
                     no ip address
                     shutdown
                    !
                    ip default-gateway 192.168.1.1
                    !
                    end
                    `;
                if (onSuccess) {
                    onSuccess(simulatedConfig);
                }
            } catch (e) {
                setError(e.message || 'Failed to connect');
            } finally {
                setIsConnecting(false);
            }
        }
    };

    return {
        isConnecting,
        error,
        handleSSHConnect,
    };
}
