const net = require('net');

const port = 3000; // Port ที่ต้องการรอ
const retryInterval = 1000; // เช็คทุกๆ 1 วินาที

function checkPort() {
  const socket = new net.Socket();

  socket.setTimeout(1000); // Timeout การเชื่อมต่อ

  socket.on('connect', () => {
    console.log(`✅ Port ${port} is open! Starting ngrok...`);
    socket.destroy();
    process.exit(0); // ส่งค่า Success เพื่อให้คำสั่งถัดไป (&&) ทำงาน
  });

  socket.on('timeout', () => {
    socket.destroy();
    console.log(`Waiting for port ${port}...`);
    setTimeout(checkPort, retryInterval);
  });

  socket.on('error', (err) => {
    socket.destroy();
    console.log(`Waiting for port ${port}...`);
    setTimeout(checkPort, retryInterval);
  });

  socket.connect(port, '127.0.0.1');
}

console.log(`⏳ Checking connectivity on port ${port}...`);
checkPort();