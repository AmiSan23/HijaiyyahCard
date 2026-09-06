import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { buatDeck, kocokDeck, cekCheckmate, kalkulasiSkorDetail } from './public/cards.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

const rooms = {};

// Setup Ronde Baru
function mulaiRondeBaru(kode) {
  const room = rooms[kode];
  const deck = kocokDeck(buatDeck());
  const hands = {};
  const discards = {};

  room.players.forEach(p => {
    hands[p.id] = deck.splice(0, 4);
    discards[p.id] = [];
  });

  room.roundNumber = (room.roundNumber || 0) + 1;
  room.game = {
    deck, hands, discards,
    turnOrder: room.players.map(p => p.id),
    turnIndex: 0,
    status: 'bermain'
  };
}

// Kirim Kondisi Meja ke Pemain
function kirimGameState(kode) {
  const room = rooms[kode];
  if (!room || !room.game) return;

  const game = room.game;
  const turnId = game.turnOrder[game.turnIndex];

  const stateUmum = {
    roomCode: kode,
    round: room.roundNumber,
    status: game.status,
    deckCount: game.deck.length,
    turnId: turnId,
    turnOrder: game.turnOrder,
    lastGame: room.lastGame,
    players: {}
  };

  room.players.forEach(p => {
    stateUmum.players[p.id] = {
      name: p.nama,
      handCount: game.hands[p.id].length,
      discards: game.discards[p.id],
      stats: room.stats[p.id],
      isBot: p.isBot
    };
  });

  room.players.filter(p => !p.isBot).forEach(p => {
    io.to(p.id).emit('game-state', {
      ...stateUmum,
      myHand: game.hands[p.id]
    });
  });
}

// AI Bot Server-Side (Pintar)
function cekGiliranBot(kode) {
  const room = rooms[kode];
  if (!room || !room.game || room.game.status !== 'bermain') return;

  const turnId = room.game.turnOrder[room.game.turnIndex];
  const player = room.players.find(p => p.id === turnId);

  if (player && player.isBot) {
    // FASE 1: BERPIKIR UNTUK MENGAMBIL KARTU
    setTimeout(() => {
      if (!rooms[kode] || rooms[kode].game.status !== 'bermain') return;

      const currentHand = room.game.hands[turnId];
      const prevIdx = (room.game.turnIndex - 1 + 4) % 4;
      const prevId = room.game.turnOrder[prevIdx];
      const prevDiscards = room.game.discards[prevId];
      
      let ambilDariDiscard = false;

      // 1a. Analisis Mayoritas Suit di Tangan
      if (prevDiscards.length > 0) {
        const topDiscard = prevDiscards[prevDiscards.length - 1];
        const poinPerSuit = {};
        
        currentHand.forEach(k => {
          poinPerSuit[k.suit] = (poinPerSuit[k.suit] || 0) + k.value;
        });
        
        let mainSuit = null;
        let maxVal = -999;
        for (let s in poinPerSuit) {
          if (poinPerSuit[s] > maxVal) {
            maxVal = poinPerSuit[s];
            mainSuit = s;
          }
        }

        // Jika kartu buangan lawan sesuai dengan suit mayoritas bot, AMBIL!
        if (topDiscard.suit === mainSuit) {
          ambilDariDiscard = true;
        }
      }

      // 1b. Eksekusi Pengambilan
      if (ambilDariDiscard) {
        room.game.hands[turnId].push(prevDiscards.pop());
      } else if (room.game.deck.length > 0) {
        room.game.hands[turnId].push(room.game.deck.pop());
      } else {
        return handleDeckHabis(kode);
      }

      kirimGameState(kode);

      // FASE 2: BERPIKIR UNTUK MEMBUANG KARTU (SIMULASI SKOR TERBAIK)
      setTimeout(() => {
        if (!rooms[kode] || rooms[kode].game.status !== 'bermain') return;

        const hand = room.game.hands[turnId];
        let bestScore = -9999;
        let bestDropIdx = 0;
        let isCheckmate = false;

        // Simulasi buang 1 kartu, hitung skor dari sisa 4 kartu
        for (let i = 0; i < hand.length; i++) {
          const simHand = [...hand];
          simHand.splice(i, 1); // Coba buang kartu indeks ke-i
          
          if (cekCheckmate(simHand)) {
            bestDropIdx = i;
            isCheckmate = true;
            break; // Validasi Checkmate mutlak jadi prioritas
          }

          const skorSim = kalkulasiSkorDetail(simHand).total;
          if (skorSim > bestScore) {
            bestScore = skorSim;
            bestDropIdx = i;
          }
        }

        // Eksekusi Pembuangan Terbaik
        room.game.discards[turnId].push(hand.splice(bestDropIdx, 1)[0]);

        if (isCheckmate) {
          selesaikanGame(kode, turnId, 'checkmate');
        } else if (room.game.deck.length === 0) {
          handleDeckHabis(kode);
        } else {
          room.game.turnIndex = (room.game.turnIndex + 1) % 4;
          kirimGameState(kode);
          cekGiliranBot(kode);
        }
      }, 1000); // Jeda berpikir saat membuang
    }, 1500); // Jeda berpikir saat mengambil
  }
}

// Handler Resolusi Selesai Game
function handleDeckHabis(kode) {
  const room = rooms[kode];
  let best = { id: null, skor: -999 };
  room.players.forEach(p => {
    const s = kalkulasiSkorDetail(room.game.hands[p.id]).total;
    if (s > best.skor) best = { id: p.id, skor: s };
  });
  selesaikanGame(kode, best.id, 'deck-habis');
}

function selesaikanGame(kode, winId, alasan) {
  const room = rooms[kode];
  room.game.status = 'ended';

  const list = room.players.map(p => ({
    id: p.id,
    skor: kalkulasiSkorDetail(room.game.hands[p.id]).total
  }));
  list.sort((a, b) => a.skor - b.skor);

  const loseId = list[0].id;
  const amanIds = list.slice(1).filter(x => x.id !== winId).map(x => x.id);

  room.stats[winId].w += 1;
  room.stats[loseId].l += 1;
  amanIds.forEach(id => room.stats[id].a += 1);

  room.lastGame = {
    win: room.players.find(p => p.id === winId).nama,
    lose: room.players.find(p => p.id === loseId).nama,
    aman: amanIds.map(id => room.players.find(p => p.id === id).nama).join(', ')
  };

  io.to(kode).emit('game-ended', {
    ...room.lastGame,
    allHands: room.game.hands
  });
}

// Koneksi WebSocket Socket.IO
io.on('connection', (socket) => {
  
  // 1. Masuk Ruang Tunggu (Lobby Room)
  socket.on('join-waiting-room', ({ kode, nama, isHost }) => {
    if (!rooms[kode]) {
      rooms[kode] = { hostId: socket.id, players: [], game: null, roundNumber: 0, stats: {} };
    }
    const room = rooms[kode];

    if (room.game && room.game.status === 'bermain') {
      return socket.emit('gagal-join', 'Game di room ini sudah dimulai!');
    }
    if (room.players.length >= 4) {
      return socket.emit('gagal-join', 'Room sudah penuh (4 pemain)!');
    }

    // Jika ini koneksi pertama dan mendeklarasikan host, tetapkan hostId
    if (room.players.length === 0 || isHost) {
      room.hostId = socket.id;
    }

    const existingPlayer = room.players.find(p => p.id === socket.id);
    if (!existingPlayer) {
      room.players.push({ id: socket.id, nama, isBot: false });
      if (!room.stats[socket.id]) room.stats[socket.id] = { w: 0, l: 0, a: 0 };
    }

    socket.join(kode);
    socket.data.kode = kode;

    const hostObj = room.players.find(p => p.id === room.hostId);

    // Broadcast daftar tunggu ke semua orang di room tersebut
    io.to(kode).emit('update-waiting-list', {
      players: room.players.map(p => ({ nama: p.nama, isHost: p.id === room.hostId })),
      hostName: hostObj ? hostObj.nama : 'Host'
    });
  });

  // 2. Host Menekan Tombol Mulai di Ruang Tunggu
  socket.on('host-mulai-game', (kode) => {
    const room = rooms[kode];
    if (!room || room.hostId !== socket.id) return;

    // Isi sisa kursi kosong dengan Bot otomatis
    let botCount = 1;
    while (room.players.length < 4) {
      const bid = `bot_${botCount}_${kode}`;
      room.players.push({ id: bid, nama: `Bot ${botCount}`, isBot: true });
      room.stats[bid] = { w: 0, l: 0, a: 0 };
      botCount++;
    }

    // Mulai ronde pertama
    mulaiRondeBaru(kode);

    // Perintahkan semua client di room untuk pindah ke papan game
    io.to(kode).emit('mulai-masuk-game');
  });

  // 3. Masuk ke Papan Game (checkmate.html memanggil ini lewat join-room)
  // 3. Masuk ke Papan Game (checkmate.html memanggil ini lewat join-room)
  socket.on('join-room', ({ kode, nama }) => {
    const room = rooms[kode];
    if (!room || !room.game) return;

    socket.join(kode);
    socket.data.kode = kode;

    // Sinkronisasi ulang Socket ID karena perpindahan halaman (room.html -> checkmate.html)
    const player = room.players.find(p => p.nama === nama && !p.isBot);
    if (player) {
      const oldId = player.id;
      const newId = socket.id;

      if (oldId !== newId) {
        player.id = newId;

        // Pindahkan data statistik ke ID socket baru
        if (room.stats[oldId]) {
          room.stats[newId] = room.stats[oldId];
          delete room.stats[oldId];
        }
        // Pindahkan kartu tangan ke ID socket baru
        if (room.game.hands[oldId]) {
          room.game.hands[newId] = room.game.hands[oldId];
          delete room.game.hands[oldId];
        }
        // Pindahkan tumpukan buangan ke ID socket baru
        if (room.game.discards[oldId]) {
          room.game.discards[newId] = room.game.discards[oldId];
          delete room.game.discards[oldId];
        }
        // Perbarui urutan giliran (turnOrder)
        const idx = room.game.turnOrder.indexOf(oldId);
        if (idx !== -1) {
          room.game.turnOrder[idx] = newId;
        }
        // Perbarui Host ID jika pemain ini adalah host
        if (room.hostId === oldId) {
          room.hostId = newId;
        }
      }
    }

    // Kirim state awal ke pemain yang baru masuk papan game
    kirimGameState(kode);
    cekGiliranBot(kode);
  });

socket.on('ambil-deck', () => {
    const kode = socket.data.kode; // <-- Tangkap kode room dari socket
    const room = rooms[kode];
    if (!room || room.game.turnOrder[room.game.turnIndex] !== socket.id) return;
    room.game.hands[socket.id].push(room.game.deck.pop());
    kirimGameState(kode);
  });

  socket.on('ambil-discard', (targetId) => {
    const kode = socket.data.kode; // <-- Tangkap kode room dari socket
    const room = rooms[kode];
    if (!room || room.game.turnOrder[room.game.turnIndex] !== socket.id) return;
    room.game.hands[socket.id].push(room.game.discards[targetId].pop());
    kirimGameState(kode);
  });

  socket.on('buang-kartu', (index) => {
    const kode = socket.data.kode; // <-- Tangkap kode room dari socket
    const room = rooms[kode];
    if (!room || room.game.turnOrder[room.game.turnIndex] !== socket.id) return;
    
    const hand = room.game.hands[socket.id];
    room.game.discards[socket.id].push(hand.splice(index, 1)[0]);

    if (cekCheckmate(hand)) {
      selesaikanGame(kode, socket.id, 'checkmate');
    } else if (room.game.deck.length === 0) {
      handleDeckHabis(kode);
    } else {
      room.game.turnIndex = (room.game.turnIndex + 1) % 4;
      kirimGameState(kode);
      cekGiliranBot(kode);
    }
  });

  // 4. Host Klik Tombol "Main Lagi" Setelah Ronde Selesai
  socket.on('mulai-main', () => {
    const kode = socket.data.kode;
    const room = rooms[kode];
    if (!room || room.hostId !== socket.id) return;

    // Mulai ronde baru dan kirim state segar ke semua pemain
    mulaiRondeBaru(kode);
    kirimGameState(kode);
    cekGiliranBot(kode);
  });

}); // <-- 1. Menutup handler socket.on('buang-kartu') atau fungsi di dalamnya

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server jalan di port ${PORT}`));