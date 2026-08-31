const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const { buatDeck, kocokDeck, cekCheckmate, hitungSkor } = require('./cards');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

process.on('uncaughtException', (err) => {
  console.error('[uncaughtException] Server tetap jalan, tapi ada error:', err);
});
process.on('unhandledRejection', (err) => {
  console.error('[unhandledRejection] Server tetap jalan, tapi ada error:', err);
});

app.use(express.static(path.join(__dirname, 'public')));

// Semua room aktif disimpan di memori server.
const rooms = {};

const MAKS_PEMAIN = 4;
const MIN_PEMAIN = 2;

function buatKodeRoom() {
  let kode;
  do {
    kode = Math.floor(1000 + Math.random() * 9000).toString();
  } while (rooms[kode]);
  return kode;
}

function ringkasanRoom(kode) {
  const room = rooms[kode];
  if (!room) return null;
  return { kode, players: room.players, hostId: room.hostId };
}

function pastikanStat(room, playerId) {
  if (!room.stats[playerId]) {
    room.stats[playerId] = { menang: 0, kalah: 0 };
  }
}

// Mulai ronde baru: kocok deck, bagi 4 kartu/pemain, buka 1 kartu buang.
// Dipakai baik buat "Mulai Main" pertama kali maupun "Ronde Berikutnya".
function mulaiRondeBaru(kode) {
  const room = rooms[kode];
  if (!room) return;

  const deck = kocokDeck(buatDeck());
  const hands = {};
  room.players.forEach((p) => {
    hands[p.id] = deck.splice(0, 4);
  });
  const discard = [deck.pop()];

  room.roundNumber = (room.roundNumber || 0) + 1;
  room.game = {
    deck,
    discard,
    hands,
    turnOrder: room.players.map((p) => p.id),
    turnIndex: 0,
    status: 'bermain',
  };
}

// Catat menang/kalah 1 ronde: satu pemenang, sisanya dianggap kalah.
function catatHasilRonde(room, idPemenang, namaPemenang) {
  room.players.forEach((p) => {
    pastikanStat(room, p.id);
    if (p.id === idPemenang) room.stats[p.id].menang += 1;
    else room.stats[p.id].kalah += 1;
  });
  room.lastGame = {
    menang: namaPemenang,
    kalah: room.players.filter((p) => p.id !== idPemenang).map((p) => p.nama),
  };
}

// Kirim state permainan: data umum (giliran, tumpukan buang, sisa deck, jumlah
// kartu tiap pemain) ke semua orang, plus tangan pribadi ke masing-masing.
function kirimGameState(kode) {
  const room = rooms[kode];
  if (!room || !room.game) return;
  const game = room.game;

  const giliranId = game.turnOrder[game.turnIndex];

  const tabelUmum = {
    giliranId,
    discardTop: game.discard[game.discard.length - 1] || null,
    sisaDeck: game.deck.length,
    kartuTerbuang: game.discard.length,
    roundNumber: room.roundNumber || 1,
    lastGame: room.lastGame || null,
    pemain: room.players.map((p) => {
      pastikanStat(room, p.id);
      return {
        id: p.id,
        nama: p.nama,
        jumlahKartu: game.hands[p.id] ? game.hands[p.id].length : 0,
        menang: room.stats[p.id].menang,
        kalah: room.stats[p.id].kalah,
      };
    }),
  };

  room.players.forEach((p) => {
    const s = io.sockets.sockets.get(p.id);
    if (!s) {
      console.log(`[kirimGameState] socket ${p.id} (${p.nama}) TIDAK ketemu - kemungkinan udah disconnect`);
      return;
    }
    s.emit('game-state', {
      ...tabelUmum,
      tanganSaya: game.hands[p.id] || [],
    });
  });
}

function selesaikanKarenaDeckHabis(kode) {
  const room = rooms[kode];
  if (!room || !room.game) return;
  const game = room.game;
  game.status = 'selesai';

  let terbaik = null;
  room.players.forEach((p) => {
    const skor = hitungSkor(game.hands[p.id]);
    if (!terbaik || skor > terbaik.skor) {
      terbaik = { id: p.id, nama: p.nama, skor };
    }
  });

  if (terbaik) {
    catatHasilRonde(room, terbaik.id, terbaik.nama);
  }

  kirimGameState(kode);
  io.to(kode).emit('permainan-selesai', {
    alasan: 'deck-habis',
    pemenang: terbaik ? terbaik.nama : '-',
    skor: terbaik ? terbaik.skor : 0,
    semuaTangan: room.players.map((p) => ({ nama: p.nama, hand: game.hands[p.id] })),
  });
}

io.on('connection', (socket) => {
  console.log(`[konek] socket ${socket.id} terhubung`);

  socket.on('buat-room', (nama) => {
    const namaBersih = (nama || 'Pemain').toString().trim().slice(0, 16) || 'Pemain';
    const kode = buatKodeRoom();

    rooms[kode] = {
      hostId: socket.id,
      players: [{ id: socket.id, nama: namaBersih }],
      game: null,
      roundNumber: 0,
      stats: { [socket.id]: { menang: 0, kalah: 0 } },
      lastGame: null,
    };

    socket.join(kode);
    socket.data.kode = kode;

    socket.emit('room-dibuat', ringkasanRoom(kode));
    console.log(`[buat-room] ${namaBersih} bikin room ${kode}`);
  });

  socket.on('gabung-room', ({ kode, nama }) => {
    const kodeBersih = (kode || '').toString().trim();
    const namaBersih = (nama || 'Pemain').toString().trim().slice(0, 16) || 'Pemain';
    const room = rooms[kodeBersih];
    console.log(`[gabung-room] ${namaBersih} coba gabung ke room ${kodeBersih}`);

    if (!room) {
      console.log(`[gabung-room] GAGAL: room ${kodeBersih} tidak ditemukan`);
      socket.emit('gagal-gabung', 'Kode room nggak ditemukan. Coba cek lagi kodenya.');
      return;
    }
    if (room.game) {
      console.log(`[gabung-room] GAGAL: room ${kodeBersih} udah mulai main`);
      socket.emit('gagal-gabung', 'Room ini udah mulai main, nggak bisa gabung di tengah jalan.');
      return;
    }
    if (room.players.length >= MAKS_PEMAIN) {
      console.log(`[gabung-room] GAGAL: room ${kodeBersih} udah penuh`);
      socket.emit('gagal-gabung', `Room udah penuh (maks ${MAKS_PEMAIN} pemain).`);
      return;
    }

    room.players.push({ id: socket.id, nama: namaBersih });
    pastikanStat(room, socket.id);
    socket.join(kodeBersih);
    socket.data.kode = kodeBersih;

    socket.emit('berhasil-gabung', ringkasanRoom(kodeBersih));
    socket.to(kodeBersih).emit('update-pemain', ringkasanRoom(kodeBersih));
    console.log(`[gabung-room] BERHASIL: ${namaBersih} join room ${kodeBersih}, total pemain: ${room.players.length}`);
  });

  socket.on('mulai-main', () => {
    const kode = socket.data.kode;
    console.log(`[mulai-main] diterima dari socket ${socket.id}, kode room: ${kode}`);
    const room = rooms[kode];

    if (!room) {
      console.log(`[mulai-main] GAGAL: room ${kode} tidak ditemukan di server`);
      return;
    }
    if (room.hostId !== socket.id) {
      console.log(`[mulai-main] GAGAL: socket ${socket.id} bukan host room ${kode} (host: ${room.hostId})`);
      return;
    }
    if (room.players.length < MIN_PEMAIN) {
      console.log(`[mulai-main] GAGAL: cuma ${room.players.length} pemain, butuh minimal ${MIN_PEMAIN}`);
      socket.emit('gagal-mulai', `Minimal ${MIN_PEMAIN} pemain buat mulai main.`);
      return;
    }

    try {
      mulaiRondeBaru(kode);
      kirimGameState(kode);
      console.log(`[mulai-main] BERHASIL: room ${kode} mulai main dengan ${room.players.length} pemain`);
    } catch (err) {
      console.error(`[mulai-main] ERROR saat setup game di room ${kode}:`, err);
    }
  });

  socket.on('ronde-berikutnya', () => {
    const kode = socket.data.kode;
    const room = rooms[kode];
    if (!room || room.hostId !== socket.id) return;
    if (room.players.length < MIN_PEMAIN) return;

    try {
      mulaiRondeBaru(kode);
      kirimGameState(kode);
      console.log(`[ronde-berikutnya] BERHASIL: room ${kode} mulai ronde ${room.roundNumber}`);
    } catch (err) {
      console.error(`[ronde-berikutnya] ERROR di room ${kode}:`, err);
    }
  });

  socket.on('ambil-kartu', ({ sumber }) => {
    const kode = socket.data.kode;
    const room = rooms[kode];
    if (!room || !room.game || room.game.status !== 'bermain') return;
    const game = room.game;

    const giliranId = game.turnOrder[game.turnIndex];
    if (socket.id !== giliranId) return;

    const tangan = game.hands[socket.id];
    if (!tangan || tangan.length !== 4) return;

    let kartu;
    if (sumber === 'buang') {
      if (game.discard.length === 0) return;
      kartu = game.discard.pop();
    } else {
      if (game.deck.length === 0) {
        selesaikanKarenaDeckHabis(kode);
        return;
      }
      kartu = game.deck.pop();
    }

    tangan.push(kartu);
    kirimGameState(kode);
  });

  socket.on('buang-kartu', ({ cardId }) => {
    const kode = socket.data.kode;
    const room = rooms[kode];
    if (!room || !room.game || room.game.status !== 'bermain') return;
    const game = room.game;

    const giliranId = game.turnOrder[game.turnIndex];
    if (socket.id !== giliranId) return;

    const tangan = game.hands[socket.id];
    if (!tangan || tangan.length !== 5) return;

    const idx = tangan.findIndex((k) => k.id === cardId);
    if (idx === -1) return;

    const [kartuDibuang] = tangan.splice(idx, 1);
    game.discard.push(kartuDibuang);

    if (cekCheckmate(tangan)) {
      game.status = 'selesai';
      const pemenang = room.players.find((p) => p.id === socket.id);
      catatHasilRonde(room, socket.id, pemenang ? pemenang.nama : '-');
      kirimGameState(kode);
      io.to(kode).emit('permainan-selesai', {
        alasan: 'checkmate',
        pemenang: pemenang ? pemenang.nama : '-',
        semuaTangan: room.players.map((p) => ({ nama: p.nama, hand: game.hands[p.id] })),
      });
      return;
    }

    if (game.deck.length === 0) {
      selesaikanKarenaDeckHabis(kode);
      return;
    }

    game.turnIndex = (game.turnIndex + 1) % game.turnOrder.length;
    kirimGameState(kode);
  });

  socket.on('kembali-ke-lobi', () => {
    const kode = socket.data.kode;
    const room = rooms[kode];
    if (!room) return;
    room.game = null;
    io.to(kode).emit('lobi-lagi', ringkasanRoom(kode));
  });

  socket.on('disconnect', () => {
    console.log(`[disconnect] socket ${socket.id} terputus`);
    const kode = socket.data.kode;
    const room = rooms[kode];
    if (!room) return;

    room.players = room.players.filter((p) => p.id !== socket.id);

    if (room.players.length === 0) {
      delete rooms[kode];
      return;
    }

    if (room.hostId === socket.id) {
      room.hostId = room.players[0].id;
    }

    if (room.game && room.game.status === 'bermain') {
      const game = room.game;
      const posisi = game.turnOrder.indexOf(socket.id);
      if (posisi !== -1) {
        game.turnOrder.splice(posisi, 1);
        if (game.turnOrder.length === 0) {
          room.game = null;
        } else {
          game.turnIndex = game.turnIndex % game.turnOrder.length;
        }
      }
    }

    io.to(kode).emit('update-pemain', ringkasanRoom(kode));
    if (room.game) kirimGameState(kode);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server jalan di port ${PORT}`);
});
