const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Sajikan semua file di folder /public (index.html, style.css, client.js)
app.use(express.static(path.join(__dirname, 'public')));

// Semua room aktif disimpan di memori server.
// Catatan: ini bakal kosong lagi kalau server di-restart (misal Render "tidur" lalu bangun) -
// cukup buat MVP, belum perlu database dulu.
const rooms = {};

const MAKS_PEMAIN = 4;

function buatKodeRoom() {
  let kode;
  do {
    kode = Math.floor(1000 + Math.random() * 9000).toString(); // kode 4 digit
  } while (rooms[kode]);
  return kode;
}

function ringkasanRoom(kode) {
  const room = rooms[kode];
  if (!room) return null;
  return { kode, players: room.players, hostId: room.hostId };
}

io.on('connection', (socket) => {
  // ---- Bikin room baru ----
  socket.on('buat-room', (nama) => {
    const namaBersih = (nama || 'Pemain').toString().trim().slice(0, 16) || 'Pemain';
    const kode = buatKodeRoom();

    rooms[kode] = {
      hostId: socket.id,
      players: [{ id: socket.id, nama: namaBersih }],
    };

    socket.join(kode);
    socket.data.kode = kode;

    socket.emit('room-dibuat', ringkasanRoom(kode));
  });

  // ---- Gabung ke room yang sudah ada ----
  socket.on('gabung-room', ({ kode, nama }) => {
    const kodeBersih = (kode || '').toString().trim();
    const namaBersih = (nama || 'Pemain').toString().trim().slice(0, 16) || 'Pemain';
    const room = rooms[kodeBersih];

    if (!room) {
      socket.emit('gagal-gabung', 'Kode room nggak ditemukan. Coba cek lagi kodenya.');
      return;
    }
    if (room.players.length >= MAKS_PEMAIN) {
      socket.emit('gagal-gabung', `Room udah penuh (maks ${MAKS_PEMAIN} pemain).`);
      return;
    }

    room.players.push({ id: socket.id, nama: namaBersih });
    socket.join(kodeBersih);
    socket.data.kode = kodeBersih;

    socket.emit('berhasil-gabung', ringkasanRoom(kodeBersih));
    socket.to(kodeBersih).emit('update-pemain', ringkasanRoom(kodeBersih));
  });

  // ---- Host mulai permainan ----
  socket.on('mulai-main', () => {
    const kode = socket.data.kode;
    const room = rooms[kode];
    if (room && room.hostId === socket.id) {
      io.to(kode).emit('game-dimulai');
    }
  });

  // ---- Pemain keluar / koneksi putus ----
  socket.on('disconnect', () => {
    const kode = socket.data.kode;
    const room = rooms[kode];
    if (!room) return;

    room.players = room.players.filter((p) => p.id !== socket.id);

    if (room.players.length === 0) {
      delete rooms[kode];
      return;
    }

    // Kalau yang keluar itu host, pindahin status host ke pemain berikutnya
    if (room.hostId === socket.id) {
      room.hostId = room.players[0].id;
    }

    io.to(kode).emit('update-pemain', ringkasanRoom(kode));
  });
});

// Render nentuin port-nya sendiri lewat environment variable - jangan di-hardcode
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server jalan di port ${PORT}`);
});
