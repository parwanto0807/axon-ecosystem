const MikroNode = require('mikronode-ng');

// KONFIGURASI - SILAKAN UBAH JIKA BERBEDA
const host = '192.168.3.1';
const user = 'axon';
const pass = 'axon123'; // Ganti dengan password yang Anda buat di Winbox
const port = 8728;

console.log(`--- MIKROTIK STANDALONE TEST ---`);
console.log(`Menghubungkan ke ${host}:${port} sebagai '${user}'...`);

const connection = new MikroNode.Connection(host, user, pass, {
    port: port,
    timeout: 10
});

connection.on('error', (err) => {
    console.error('❌ CONNECTION ERROR:', err);
});

connection.on('trap', (err) => {
    console.error('❌ MIKROTIK TRAP (AUTH FAILED):', err);
});

console.log('Sedang mencoba login...');
connection.connect((conn) => {
    console.log('✅ LOGIN BERHASIL!');
    const device = conn.getApi();
    const channel = device.openChannel();

    channel.write('/system/identity/print', (res) => {
        console.log('🚀 IDENTITY RESPONSE:', res);
        channel.close();
        conn.close();
        console.log('--- TEST SELESAI ---');
        process.exit(0);
    });
});

// Failsafe timeout
setTimeout(() => {
    console.log('⏰ Test dihentikan karena tidak ada respon selama 15 detik.');
    process.exit(1);
}, 15000);
