// ============================================================
// Kartu Hijaiyyah - Server (Socket.io + EJS)
// Server-rendered: server kirim HTML/state, client update DOM
// ============================================================
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const { buatDeck, kocokDeck, cekCheckmate, kalkulasiSkorDetail } = require('./cards');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ---- EJS Setup ----
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// ---- Error handlers ----
process.on('uncaughtException', (err) => console.error('[uncaughtException]', err.message));
process.on('unhandledRejection', (err) => console.error('[unhandledRejection]', err.message));

// ============================================================
// DATA STRUCTURES
// ============================================================
const rooms = {};
const MAKS_PEMAIN = 4;
const MIN_PEMAIN = 2;

function buatKodeRoom() {
  let kode;
  do { kode = Math.floor(1000 + Math.random() * 9000).toString(); }
  while (rooms[kode]);
  return kode;
}

function pastikanStat(room, playerId) {
  if (!room.stats[playerId]) room.stats[playerId] = { w: 0, l: 0 };
}

function totalKartuTerbuang(room) {
  return Object.values(room.game.discards).reduce((t, arr) => t + arr.length, 0);
}

// ============================================================
// HTML RENDER HELPERS
// ============================================================

function playerListHtml(room) {
  return room.players.map(p => {
    pastikanStat(room, p.id);
    const s = room.stats[p.id];
    return `<li>${p.nama} | W: ${s.w} L: ${s.l}</li>`;
  }).join('');
}

function handOppHtml(jml) {
  if (!jml) return '';
  return Array(jml).fill('<img src="/img/back.png" class="card-img">').join('');
}

function discardGridHtml(discards) {
  if (!discards || discards.length === 0) return '';
  return discards.map(k => `<img src="/img/${k.file}" class="card-img">`).join('');
}

function handSayaHtml(hand, giliranSaya, selectedIdx) {
  if (!hand || hand.length === 0) return '';
  const bolehBuang = giliranSaya && hand.length === 5;
  return hand.map((k, i) => {
    const sel = i === selectedIdx ? 'selected' : '';
    const pick = bolehBuang ? 'pilihable' : '';
    const btnShow = (bolehBuang && i === selectedIdx) ? 'block' : 'none';
    return `<div class="card-wrap ${pick} ${sel}" data-idx="${i}">
      <img src="/img/${k.file}" class="card-img" alt="${k.nama}">
      <button class="action-btn btn-buang" style="display:${btnShow}">Buang</button>
    </div>`;
  }).join('');
}

function skorHtml(hand) {
  if (!hand || hand.length === 0) return { cards: '-', calc: '-', total: 0, color: 'var(--ink-dark)' };
  const sk = kalkulasiSkorDetail(hand);
  const cards = sk.rincian.map(k =>
    `<span style="color:${k.isMain ? k.warna : 'var(--btn-red)'};font-weight:bold">${k.label}</span>`
  ).join(' | ');
  const calc = sk.rincian.map((k, i) => {
    const op = i === 0 ? '' : (k.isMain ? '+' : '-');
    return `<span style="color:${k.isMain ? k.warna : 'var(--btn-red)'}">${op}${k.nilaiAbsolut}</span>`;
  }).join(' ');
  return { cards, calc, total: sk.total, color: sk.total < 0 ? 'var(--btn-red)' : 'var(--ink-dark)' };
}

function buildGameState(room, myId, selectedIdx = null) {
  if (!room || !room.game) return {};
  const game = room.game;
  const turnOrder = game.turnOrder;
  const turnIdx = game.turnIndex;
  const giliranId = turnOrder[turnIdx];
  const giliranSaya = giliranId === myId;
  const tanganSaya = game.hands[myId] || [];
  const discardsSaya = game.discards[myId] || [];

  // Mapping kursi: saya selalu A, berlawanan jarum jam
  const myIdx = turnOrder.indexOf(myId);
  const mapping = {};
  ['A','B','C','D'].forEach((pos, i) => { mapping[pos] = turnOrder[(myIdx + i) % 4]; });

  // Prev player (kiri saya = boleh ambil discard)
  const prevIdx = (turnIdx - 1 + turnOrder.length) % turnOrder.length;
  const prevId = turnOrder[prevIdx];

  // Build seats
  const seats = {};
  ['A','B','C','D'].forEach(pos => {
    const nama = mapping[pos];
    const discards = game.discards[nama] || [];
    const isMyTurn = giliranId === nama;
    const hand = game.hands[nama] || [];
    const jml = hand.length;

    // Boleh ambil?
    const bolehAmbil = giliranSaya && tanganSaya.length === 4 && nama === prevId && discards.length > 0;

    // Showdown: tampilkan kartu semua pemain
    const isEnded = game.status === 'ended';
    const showdownHand = isEnded ? hand : null;

    seats[pos] = {
      nameHtml:    nama,
      activeClass: isMyTurn ? 'active-turn' : '',
      handHtml:    pos === 'A' ? '' : handOppHtml(jml),
      discardHtml: discardGridHtml(showdownHand || discards),
      aktifDraw:   bolehAmbil ? 'active-draw' : '',
      btnDisplay:  bolehAmbil ? 'block' : 'none',
    };
  });

  const deckCount = game.deck ? game.deck.length : 0;
  const bolehAmbilDeck = giliranSaya && tanganSaya.length === 4 && deckCount > 0;
  const lastGameHtml = room.lastGame
    ? `Win: ${room.lastGame.menang}<br>Lose: ${room.lastGame.kalah}`
    : '-';

  const sk = skorHtml(tanganSaya);

  // Showdown overlay
  let showdownHtml = '';
  if (game.status === 'ended') {
    const semuaSkor = turnOrder.map(nama => ({
      nama,
      skor: kalkulasiSkorDetail(game.hands[nama] || []).total
    })).sort((a, b) => b.skor - a.skor);

    const hostId = room.hostId;
    const amIHost = myId === hostId;

    showdownHtml = `<div id="endGameCenter">
      <div class="win-text">WIN<br><span>${room.lastGame?.menang || '-'}</span></div>
      <div style="border-top:1px solid var(--border);padding-top:10px;margin-top:10px">
        ${semuaSkor.map(s => `<div style="font-size:1rem;margin:4px 0">${s.nama}: <b>${s.skor}</b></div>`).join('')}
      </div>
      <button class="btn-primary" id="btnMainLagi" ${amIHost ? '' : 'disabled'}>Main Lagi</button>
      <button class="btn-danger" id="btnKeluar">Keluar</button>
    </div>`;
  }

  return {
    roomCode:        room.kode,
    round:           room.roundNumber || 1,
    deckCount,
    deckSisa:        deckCount,
    discardCount:    totalKartuTerbuang(room),
    playerStatsHtml:  playerListHtml(room),
    currentTurnName: giliranId,
    lastGameHtml,
    seats,
    tanganSayaHtml:  handSayaHtml(tanganSaya, giliranSaya, selectedIdx),
    deckActive:      bolehAmbilDeck ? 'active-draw' : '',
    deckBtnDisplay:  bolehAmbilDeck ? 'block' : 'none',
    scoreCardsHtml:  sk.cards,
    scoreCalcHtml:   sk.calc,
    scoreTotal:      sk.total,
    scoreTotalColor: sk.color,
    showdownHtml,
    myName:          room.players.find(p => p.id === myId)?.nama || '-',
  };
}

function emitGameState(kode, myId, selectedIdx = null) {
  const room = rooms[kode];
  if (!room) return;
  room.players.forEach(p => {
    const sock = io.sockets.sockets.get(p.id);
    if (!sock) return;
    sock.emit('game-state', buildGameState(room, p.id, selectedIdx));
  });
}

// ============================================================
// ROUTES
// ============================================================
app.get('/', (req, res) => { res.render('lobby', { error: null }); });

app.get('/game/:kode', (req, res) => {
  const kode = req.params.kode;
  const room = rooms[kode];
  if (!room) return res.redirect('/?error=Room+tidak+ditemukan');
  res.render('game', {
    kode,
    roomSummary: room,
    urlNama:  req.query.nama  || '',
    urlIsHost: req.query.host === '1',
  });
});

// ============================================================
// GAME LOGIC
// ============================================================

function mulaiRondeBaru(kode) {
  const room = rooms[kode];
  if (!room) return;
  const deck = kocokDeck(buatDeck());
  const hands = {}, discards = {};
  room.players.forEach(p => { hands[p.id] = deck.splice(0, 4); discards[p.id] = []; });
  room.roundNumber = (room.roundNumber || 0) + 1;
  room.game = {
    deck, discards, hands,
    turnOrder: room.players.map(p => p.id),
    turnIndex: 0,
    status: 'bermain',
  };
  room.lastGame = null;
}

function catatHasil(room, idPemenang, namaPemenang) {
  room.players.forEach(p => {
    pastikanStat(room, p.id);
    if (p.id === idPemenang) room.stats[p.id].w++;
    else room.stats[p.id].l++;
  });
  room.lastGame = {
    menang: namaPemenang,
    kalah: room.players.filter(p => p.id !== idPemenang).map(p => p.nama),
  };
}

function selesaikanDeckHabis(kode) {
  const room = rooms[kode];
  if (!room || !room.game) return;
  const game = room.game;
  game.status = 'selesai';

  let terbaik = null, skorTertinggi = -9999;
  room.players.forEach(p => {
    const sk = kalkulasiSkorDetail(game.hands[p.id] || []).total;
    if (sk > skorTertinggi) { skorTertinggi = sk; terbaik = p; }
  });
  if (terbaik) catatHasil(room, terbaik.id, terbaik.nama);
  emitGameState(kode, null);
  io.to(kode).emit('permainan-selesai', { alasan: 'deck-habis', pemenang: terbaik?.nama || '-' });
}

// ============================================================
// SOCKET.IO
// ============================================================
io.on('connection', (socket) => {
  console.log(`[konek] ${socket.id}`);

  // ---- BUAT ROOM ----
  socket.on('buat-room', ({ nama }) => {
    const namaBersih = (nama || 'Pemain').trim().slice(0, 16) || 'Pemain';
    const kode = buatKodeRoom();
    rooms[kode] = {
      kode, hostId: socket.id,
      players: [{ id: socket.id, nama: namaBersih, isHost: true }],
      game: null, roundNumber: 0,
      stats: { [socket.id]: { w: 0, l: 0 } },
      lastGame: null,
    };
    socket.join(kode);
    socket.data = { kode, nama: namaBersih };
    const playersHtml = roomPlayersHtml(rooms[kode]);
    socket.emit('lobby-state', { kode, playersHtml, isHost: true, myName: namaBersih });
    console.log(`[buat-room] ${namaBersih} bikin room ${kode}`);
  });

  // ---- GABUNG ROOM ----
  socket.on('gabung-room', ({ kode, nama }) => {
    const namaBersih = (nama || 'Pemain').trim().slice(0, 16) || 'Pemain';
    const room = rooms[kode];
    if (!room)     return socket.emit('error', 'Room tidak ditemukan.');
    if (room.game) return socket.emit('error', 'Game sudah dimulai.');
    if (room.players.length >= MAKS_PEMAIN) return socket.emit('error', `Room penuh (maks ${MAKS_PEMAIN}).`);

    room.players.push({ id: socket.id, nama: namaBersih, isHost: false });
    pastikanStat(room, socket.id);
    socket.join(kode);
    socket.data = { kode, nama: namaBersih };

    io.to(kode).emit('lobby-update', { playersHtml: roomPlayersHtml(room) });
    socket.emit('lobby-joined', { kode, playersHtml: roomPlayersHtml(room), isHost: false, myName: namaBersih });
  });

  // ---- MULAI GAME ----
  socket.on('mulai-game', () => {
    const { kode } = socket.data;
    const room = rooms[kode];
    if (!room || room.hostId !== socket.id) return;
    if (room.players.length < MIN_PEMAIN) return socket.emit('error', `Minimal ${MIN_PEMAIN} pemain.`);
    mulaiRondeBaru(kode);
    emitGameState(kode, null);
    io.to(kode).emit('game-mulai');
  });

  // ---- AMBIL KARTU ----
  socket.on('ambil-kartu', ({ sumber }) => {
    const { kode } = socket.data;
    const room = rooms[kode];
    if (!room || !room.game || room.game.status !== 'bermain') return;
    const game = room.game;
    if (game.turnOrder[game.turnIndex] !== socket.id) return;
    const tangan = game.hands[socket.id];
    if (!tangan || tangan.length !== 4) return;

    let kartu;
    if (sumber === 'buang') {
      const prevIdx = (game.turnIndex - 1 + game.turnOrder.length) % game.turnOrder.length;
      const prevId = game.turnOrder[prevIdx];
      const tumpukan = game.discards[prevId];
      if (!tumpukan || tumpukan.length === 0) return;
      kartu = tumpukan.pop();
    } else {
      if (game.deck.length === 0) { selesaikanDeckHabis(kode); return; }
      kartu = game.deck.pop();
    }
    tangan.push(kartu);
    emitGameState(kode, socket.id);
  });

  // ---- BUANG KARTU ----
  socket.on('buang-kartu', ({ cardIdx }) => {
    const { kode } = socket.data;
    const room = rooms[kode];
    if (!room || !room.game || room.game.status !== 'bermain') return;
    const game = room.game;
    if (game.turnOrder[game.turnIndex] !== socket.id) return;
    const tangan = game.hands[socket.id];
    if (!tangan || tangan.length !== 5) return;
    if (cardIdx < 0 || cardIdx >= tangan.length) return;

    const [kartu] = tangan.splice(cardIdx, 1);
    game.discards[socket.id].push(kartu);

    if (cekCheckmate(tangan)) {
      game.status = 'selesai';
      const pemenang = room.players.find(p => p.id === socket.id);
      catatHasil(room, socket.id, pemenang?.nama || '-');
      emitGameState(kode, null);
      io.to(kode).emit('permainan-selesai', { alasan: 'checkmate', pemenang: pemenang?.nama || '-' });
      return;
    }
    if (game.deck.length === 0) { selesaikanDeckHabis(kode); return; }
    game.turnIndex = (game.turnIndex + 1) % game.turnOrder.length;
    emitGameState(kode, socket.id);
  });

  // ---- RONDE BERIKUTNYA ----
  socket.on('ronde-berikutnya', () => {
    const { kode } = socket.data;
    const room = rooms[kode];
    if (!room || room.hostId !== socket.id) return;
    if (room.players.length < MIN_PEMAIN) return;
    mulaiRondeBaru(kode);
    emitGameState(kode, null);
  });

  // ---- DISCONNECT ----
  socket.on('disconnect', () => {
    const { kode } = socket.data;
    const room = rooms[kode];
    if (!room) return;

    room.players = room.players.filter(p => p.id !== socket.id);
    delete room.stats[socket.id];

    if (room.players.length === 0) { delete rooms[kode]; return; }

    if (room.hostId === socket.id) {
      room.hostId = room.players[0].id;
      room.players[0].isHost = true;
    }

    if (room.game) {
      const game = room.game;
      const pos = game.turnOrder.indexOf(socket.id);
      if (pos !== -1) {
        game.turnOrder.splice(pos, 1);
        if (game.turnOrder.length === 0) room.game = null;
        else game.turnIndex = game.turnIndex % game.turnOrder.length;
      }
      emitGameState(kode, null);
    }
    io.to(kode).emit('lobby-update', { playersHtml: roomPlayersHtml(room) });
  });
});

// Helper: players list HTML
function roomPlayersHtml(room) {
  return room.players.map(p =>
    `<li>${p.nama} ${p.isHost ? '(Host)' : ''}</li>`
  ).join('');
}

// ============================================================
// START
// ============================================================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server jalan di http://localhost:${PORT}`);
});
