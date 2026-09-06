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
  socket.on('join-room', ({ kode, nama, isHost }) => {
    if (!rooms[kode]) {
      rooms[kode] = { hostId: socket.id, players: [], game: null, roundNumber: 0, stats: {} };
    }
    const room = rooms[kode];
    
    // Tolak jika game sudah jalan atau ruang penuh
    if (room.game && room.game.status === 'bermain') return socket.emit('gagal-join', 'Game sedang berlangsung');
    if (room.players.length >= 4) return socket.emit('gagal-join', 'Ruangan Penuh');

    room.players.push({ id: socket.id, nama, isBot: false });
    if (!room.stats[socket.id]) room.stats[socket.id] = { w: 0, l: 0, a: 0 };
    
    socket.join(kode);
    socket.data.kode = kode;

    io.to(kode).emit('waiting-room', {
      players: room.players,
      isHost: room.hostId === socket.id
    });
  });

  // Fitur Host: Mulai Game & Otomatis Tambah Bot
  socket.on('mulai-main', () => {
    const room = rooms[socket.data.kode];
    if (!room || room.hostId !== socket.id) return;

    let botCount = 1;
    while (room.players.length < 4) {
      const bid = `bot_${botCount}_${socket.data.kode}`;
      room.players.push({ id: bid, nama: `Bot ${botCount}`, isBot: true });
      room.stats[bid] = { w: 0, l: 0, a: 0 };
      botCount++;
    }

    mulaiRondeBaru(socket.data.kode);
    kirimGameState(socket.data.kode);
    cekGiliranBot(socket.data.kode);
  });

  socket.on('ambil-deck', () => {
    const room = rooms[socket.data.kode];
    if (!room || room.game.turnOrder[room.game.turnIndex] !== socket.id) return;
    room.game.hands[socket.id].push(room.game.deck.pop());
    kirimGameState(socket.data.kode);
  });

  socket.on('ambil-discard', (targetId) => {
    const room = rooms[socket.data.kode];
    if (!room || room.game.turnOrder[room.game.turnIndex] !== socket.id) return;
    room.game.hands[socket.id].push(room.game.discards[targetId].pop());
    kirimGameState(socket.data.kode);
  });

  socket.on('buang-kartu', (index) => {
    const room = rooms[socket.data.kode];
    if (!room || room.game.turnOrder[room.game.turnIndex] !== socket.id) return;
    
    const hand = room.game.hands[socket.id];
    room.game.discards[socket.id].push(hand.splice(index, 1)[0]);

    if (cekCheckmate(hand)) {
      selesaikanGame(socket.data.kode, socket.id, 'checkmate');
    } else if (room.game.deck.length === 0) {
      handleDeckHabis(socket.data.kode);
    } else {
      room.game.turnIndex = (room.game.turnIndex + 1) % 4;
      kirimGameState(socket.data.kode);
      cekGiliranBot(socket.data.kode);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server jalan di port ${PORT}`));