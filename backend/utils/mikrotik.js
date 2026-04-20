const { RouterOSAPI } = require('node-routeros');

/**
 * Tests connection to a MikroTik router
 */
async function testMikrotikConnection(host, port, user, password) {
    const client = new RouterOSAPI({
        host: host,
        user: user,
        password: password,
        port: port || 8728,
        timeout: 10,
        keepalive: false
    });

    try {
        await client.connect();
        await client.write('/system/identity/print');
        await client.close();
        return true;
    } catch (err) {
        console.error('[MikroTik] Connection Failed:', err.message);
        throw err;
    }
}

/**
 * Executes a command and returns the results
 * @param {string} host 
 * @param {number} port 
 * @param {string} user 
 * @param {string} password 
 * @param {string} command 
 * @param {object} params 
 */
async function executeMikrotikCommand(host, port, user, password, command, params = {}) {
    const client = new RouterOSAPI({
        host: host,
        user: user,
        password: password,
        port: port || 8728,
        timeout: 10,
        keepalive: false
    });

    try {
        // Create a timeout promise (8 seconds)
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`Timeout MikroTik (8s): ${command}`)), 8000)
        );

        const executePromise = (async () => {
            await client.connect();
            const res = await client.write(command, params);
            await client.close();
            return res;
        })();

        // Race between execution and timeout
        return await Promise.race([executePromise, timeoutPromise]);
    } catch (err) {
        try { await client.close(); } catch(e) {}
        console.error(`[MikroTik Utility] Error [${command}]:`, err.message);
        throw err;
    }
}

module.exports = { testMikrotikConnection, executeMikrotikCommand };
