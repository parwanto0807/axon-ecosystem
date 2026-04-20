const { RouterOSAPI } = require('node-routeros');

// KONFIGURASI
const host = '192.168.3.1';
const user = 'axon';
const pass = 'axon123'; // SESUAIKAN DENGAN PASS USER 'axon' di WINBOX
const port = 8728;

console.log(`--- MIKROTIK NEW LIB TEST (node-routeros) ---`);
console.log(`Menghubungkan ke ${host}:${port} sebagai '${user}'...`);

const client = new RouterOSAPI({
    host: host,
    user: user,
    password: pass,
    port: port,
    timeout: 10
});

async function run() {
    try {
        await client.connect();
        console.log('✅ LOGIN BERHASIL!');

        const identity = await client.menu('/system/identity').print();
        console.log('🚀 IDENTITY RESPONSE:', identity);

        await client.close();
        console.log('--- TEST SELESAI ---');
        process.exit(0);
    } catch (err) {
        console.error('❌ TEST GAGAL:', err);
        process.exit(1);
    }
}

run();

// Failsafe
setTimeout(() => {
    console.log('⏰ Test dihentikan karena timeout.');
    process.exit(1);
}, 15000);
