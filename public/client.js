const socket = io();

let hostIdSaatIni = null;
let stateGameSaatIni = null;
let kodeRoomSaatIni = '----';
let kartuTerpilihId = null;

const WARNA_HARAKAT = ['#378ADD', '#E0A82E', '#B24A24', '#6B6A64'];

// ---- Elemen landing & lobby ----
const landing = document.getElementById('landing');
const lobby = document.getElementById('lobby');
const meja = document.getElementById('meja');

const inputNama = document.getElementById('inputNama');
const inputKode = document.getElementById('inputKode');

const btnTabBuat = document.getElementById('btnTabBuat');
const btnTabGabung = document.getElementById('btnTabGabung');
const panelBuat = document.getElementById('panelBuat');
const panelGabung = document.getElementById('panelGabung');

const btnBuatRoom = document.getElementById('btnBuatRoom');
const btnGabungRoom = document.getElementById('btnGabungRoom');
const errorMsg = document.getElementById('errorMsg');

const kodeBesar = document.getElementById('kodeBesar');
const playerList = document.getElementById('playerList');
const btnMulai = document.getElementById('btnMulai');
const waitingMsg = document.getElementById('waitingMsg');

// ---- Elemen panel atas ----
const infoRoomChip = document.getElementById('infoRoomChip');
const infoRoundChip = document.getElementById('infoRoundChip');
const infoBuangChip = document.getElementById('infoBuangChip');
const infoSisaChip = document.getElementById('infoSisaChip');
const playerStats = document.getElementById('playerStats');
const lastGameInfo = document.getElementById('lastGameInfo');
const giliranInfo = document.getElementById('giliranInfo');
const btnRondeBerikutnya = document.getElementById('btnRondeBerikutnya');
const btnKembaliLobby = document.getElementById('btnKembaliLobby');

// ---- Elemen lantai ----
const deckPile = document.getElementById('deckPile');
const drawPileImg = document.getElementById('drawPileImg');
const deckSisaText = document.getElementById('deckSisaText');
const btnAmbilDeck = document.getElementById('btnAmbilDeck');
const endGameCenter = document.getElementById('endGameCenter');
const winnerName = document.getElementById('winnerName');
const winnerDetail = document.getElementById('winnerDetail');

const myHand = document.getElementById('myHand');
const myNameLabel = document.getElementById('myNameLabel');
const scoreCards = document.getElementById('scoreCards');
const scoreTotal = document.getElementById('scoreTotal');

// Konfigurasi 4 sudut: sudut mana mewakili kursi mana (searah jarum jam:
// kiri->atas-kiri, atas->atas-kanan, kanan->bawah-kanan, aku->bawah-kiri).
const SUDUT = ['TL', 'TR', 'BL', 'BR'];

// ---- Tab Buat Room / Gabung Room ----
btnTabBuat.addEventListener('click', () => {
  btnTabBuat.classList.add('active');
  btnTabGabung.classList.remove('active');
  panelBuat.classList.remove('hidden');
  panelGabung.classList.add('hidden');
  sembunyikanError();
});

btnTabGabung.addEventListener('click', () => {
  btnTabGabung.classList.add('active');
  btnTabBuat.classList.remove('active');
  panelGabung.classList.remove('hidden');
  panelBuat.classList.add('hidden');
  sembunyikanError();
});

// ---- Aksi lobby ----
btnBuatRoom.addEventListener('click', () => {
  const nama = inputNama.value.trim();
  if (!nama) return tampilkanError('Isi nama kamu dulu ya.');
  socket.emit('buat-room', nama);
});

btnGabungRoom.addEventListener('click', () => {
  const nama = inputNama.value.trim();
  const kode = inputKode.value.trim();
  if (!nama) return tampilkanError('Isi nama kamu dulu ya.');
  if (kode.length !== 4) return tampilkanError('Kode room harus 4 digit.');
  socket.emit('gabung-room', { kode, nama });
});

btnMulai.addEventListener('click', () => socket.emit('mulai-main'));
btnRondeBerikutnya.addEventListener('click', () => socket.emit('ronde-berikutnya'));
btnKembaliLobby.addEventListener('click', () => socket.emit('kembali-ke-lobi'));

// ---- Aksi meja: ambil dari deck ----
function klikAmbilDeck() {
  if (!bolehAmbil()) return;
  socket.emit('ambil-kartu', { sumber: 'deck' });
}
deckPile.addEventListener('click', klikAmbilDeck);
btnAmbilDeck.addEventListener('click', (e) => { e.stopPropagation(); klikAmbilDeck(); });

function bolehAmbil() {
  if (!stateGameSaatIni) return false;
  return stateGameSaatIni.giliranId === socket.id && stateGameSaatIni.tanganSaya.length === 4;
}

// ---- Respon server: room & lobby ----
socket.on('room-dibuat', (data) => tampilkanLobby(data));
socket.on('berhasil-gabung', (data) => tampilkanLobby(data));

socket.on('update-pemain', (data) => {
  hostIdSaatIni = data.hostId;
  if (lobby.classList.contains('hidden')) return;
  renderPlayerList(data.players);
  aturTombolMulai();
});

socket.on('gagal-gabung', (pesan) => tampilkanError(pesan));
socket.on('gagal-mulai', (pesan) => alert(pesan));

socket.on('lobi-lagi', (data) => {
  kartuTerpilihId = null;
  tampilkanLobby(data);
});

// ---- Respon server: state permainan ----
socket.on('game-state', (data) => {
  stateGameSaatIni = data;
  tampilkanMeja();
  renderMeja();
});

socket.on('permainan-selesai', (data) => tampilkanHasil(data));

// ---- Fungsi bantu: lobby ----
function tampilkanError(pesan) {
  errorMsg.textContent = pesan;
  errorMsg.classList.remove('hidden');
}

function sembunyikanError() {
  errorMsg.classList.add('hidden');
  errorMsg.textContent = '';
}

function tampilkanLobby(data) {
  hostIdSaatIni = data.hostId;
  kodeRoomSaatIni = data.kode;
  kodeBesar.textContent = data.kode;
  renderPlayerList(data.players);
  aturTombolMulai();

  landing.classList.add('hidden');
  lobby.classList.remove('hidden');
  meja.classList.add('hidden');
  endGameCenter.classList.add('hidden');
  btnRondeBerikutnya.classList.add('hidden');
  btnKembaliLobby.classList.add('hidden');
}

function renderPlayerList(players) {
  playerList.innerHTML = '';
  players.forEach((p, i) => {
    const li = document.createElement('li');
    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.style.background = WARNA_HARAKAT[i % WARNA_HARAKAT.length];
    const nama = document.createElement('span');
    nama.textContent = p.nama;
    li.appendChild(dot);
    li.appendChild(nama);
    if (p.id === hostIdSaatIni) {
      const tag = document.createElement('span');
      tag.className = 'host-tag';
      tag.textContent = 'HOST';
      li.appendChild(tag);
    }
    playerList.appendChild(li);
  });
}

function aturTombolMulai() {
  const akuHost = socket.id === hostIdSaatIni;
  btnMulai.classList.toggle('hidden', !akuHost);
  waitingMsg.classList.toggle('hidden', akuHost);
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

// ---- Susun kursi: aku selalu "bawah", sisanya rotasi mulai dari setelah aku ----
function susunKursi(pemain, myId) {
  const idx = pemain.findIndex((p) => p.id === myId);
  const slot = { atas: null, kiri: null, kanan: null, aku: null };
  if (idx === -1) return slot;
  slot.aku = pemain[idx];
  const lainnya = [...pemain.slice(idx + 1), ...pemain.slice(0, idx)];
  const label = ['atas', 'kiri', 'kanan'];
  lainnya.forEach((p, i) => { if (i < 3) slot[label[i]] = p; });
  return slot;
}

function renderSeat(elId, pemain, giliranId) {
  const el = document.getElementById(elId);
  if (!pemain) { el.innerHTML = ''; el.classList.add('hidden'); return; }
  el.classList.remove('hidden');
  el.classList.toggle('giliran', pemain.id === giliranId);
  const kartuBack = Array.from({ length: pemain.jumlahKartu })
    .map(() => `<img src="/img/back.png" class="seat-stack" alt="Kartu ${escapeHtml(pemain.nama)}" />`)
    .join('');
  el.innerHTML = `
    <div class="seat-cards">${kartuBack}</div>
    <span class="seat-nama">${escapeHtml(pemain.nama)}</span>
    <span class="seat-jumlah">${pemain.jumlahKartu} kartu</span>
  `;
}

function renderCorner(kode, pemain, data) {
  const nama = document.getElementById(`corner${kode}Nama`);
  const grid = document.getElementById(`corner${kode}Grid`);
  const btn = document.getElementById(`corner${kode}Ambil`);

  if (!pemain) {
    nama.textContent = '';
    grid.innerHTML = '';
    btn.classList.remove('aktif');
    btn.onclick = null;
    return;
  }

  const tumpukan = (data.discards && data.discards[pemain.id]) || [];
  nama.textContent = pemain.nama;

  grid.innerHTML = '';
  tumpukan.slice(-20).forEach((kartu) => {
    const img = document.createElement('img');
    img.src = `/img/${kartu.file}`;
    img.alt = kartu.nama;
    grid.appendChild(img);
  });

  const bolehTarik = bolehAmbil() && tumpukan.length > 0;
  btn.classList.toggle('aktif', bolehTarik);
  btn.onclick = () => {
    if (!bolehAmbil() || tumpukan.length === 0) return;
    socket.emit('ambil-kartu', { sumber: 'buang', dariPemain: pemain.id });
  };
}

// ---- Fungsi bantu: meja ----
function tampilkanMeja() {
  landing.classList.add('hidden');
  lobby.classList.add('hidden');
  meja.classList.remove('hidden');
  endGameCenter.classList.add('hidden');
  btnRondeBerikutnya.classList.add('hidden');
  btnKembaliLobby.classList.add('hidden');
  kartuTerpilihId = null;
}

function renderMeja() {
  const data = stateGameSaatIni;
  const giliranSaya = data.giliranId === socket.id;
  const pemainGiliran = data.pemain.find((p) => p.id === data.giliranId);
  const kursi = susunKursi(data.pemain, socket.id);

  // Panel atas
  infoRoomChip.textContent = kodeRoomSaatIni;
  infoRoundChip.textContent = data.roundNumber || 1;
  infoBuangChip.textContent = data.kartuTerbuang || 0;
  infoSisaChip.textContent = data.sisaDeck;
  giliranInfo.textContent = giliranSaya ? 'Kamu' : (pemainGiliran ? pemainGiliran.nama : '-');

  playerStats.innerHTML = '';
  data.pemain.forEach((p) => {
    const li = document.createElement('li');
    li.innerHTML = `${escapeHtml(p.nama)} | W: ${p.menang} L: ${p.kalah}`;
    playerStats.appendChild(li);
  });

  lastGameInfo.textContent = data.lastGame
    ? `Menang: ${data.lastGame.menang} · Kalah: ${data.lastGame.kalah.join(', ')}`
    : '-';

  // Kursi lawan
  renderSeat('seatAtas', kursi.atas, data.giliranId);
  renderSeat('seatKiri', kursi.kiri, data.giliranId);
  renderSeat('seatKanan', kursi.kanan, data.giliranId);

  // 4 sudut tumpukan buang: kiri->TL, atas->TR, kanan->BR, aku->BL
  renderCorner('TL', kursi.kiri, data);
  renderCorner('TR', kursi.atas, data);
  renderCorner('BR', kursi.kanan, data);
  renderCorner('BL', kursi.aku, data);

  // Deck tengah
  deckSisaText.textContent = data.sisaDeck;
  const bolehTarikDeck = bolehAmbil() && data.sisaDeck > 0;
  deckPile.classList.toggle('aktif', bolehTarikDeck);
  btnAmbilDeck.classList.toggle('aktif', bolehTarikDeck);

  // Nama & giliran aku
  myNameLabel.textContent = kursi.aku ? kursi.aku.nama : 'Kamu';
  myNameLabel.classList.toggle('giliran', giliranSaya);

  // Tangan sendiri (pilih kartu -> tombol Buang muncul)
  const bolehPilih = giliranSaya && data.tanganSaya.length === 5;
  if (!bolehPilih) kartuTerpilihId = null;

  myHand.innerHTML = '';
  data.tanganSaya.forEach((kartu) => {
    const wrap = document.createElement('div');
    wrap.className = 'card-wrap';
    if (bolehPilih) wrap.classList.add('pilihable');
    if (kartu.id === kartuTerpilihId) wrap.classList.add('selected');

    const img = document.createElement('img');
    img.src = `/img/${kartu.file}`;
    img.alt = kartu.nama;
    img.className = 'card-img';

    const btnBuang = document.createElement('button');
    btnBuang.className = 'btn-buang';
    btnBuang.textContent = 'Buang';
    btnBuang.onclick = (e) => {
      e.stopPropagation();
      socket.emit('buang-kartu', { cardId: kartu.id });
      kartuTerpilihId = null;
    };

    if (bolehPilih) {
      img.addEventListener('click', () => {
        kartuTerpilihId = kartuTerpilihId === kartu.id ? null : kartu.id;
        renderMeja();
      });
    }

    wrap.appendChild(img);
    wrap.appendChild(btnBuang);
    myHand.appendChild(wrap);
  });

  // Panel skor (jumlah polos, live)
  scoreCards.textContent = data.tanganSaya.map((k) => k.nama).join(' | ') || '-';
  scoreTotal.textContent = data.tanganSaya.reduce((a, k) => a + k.value, 0);
}

function tampilkanHasil(data) {
  // Kosongkan meja (deck & semua tumpukan buang) - diganti tampilan WIN
  endGameCenter.classList.remove('hidden');
  winnerName.textContent = data.pemenang;
  winnerDetail.textContent = data.alasan === 'checkmate'
    ? 'Checkmate 101 — 4 kartu se-harakat totalnya 101'
    : 'Deck habis — menang skor tertinggi';

  ['TL', 'TR', 'BL', 'BR'].forEach((kode) => {
    document.getElementById(`corner${kode}Grid`).innerHTML = '';
    document.getElementById(`corner${kode}Ambil`).classList.remove('aktif');
  });
  deckPile.classList.remove('aktif');

  const skorMap = {};
  (data.semuaSkor || []).forEach((s) => { skorMap[s.id] = s.skor; });

  const kursi = stateGameSaatIni ? susunKursi(stateGameSaatIni.pemain, socket.id) : null;
  const posisiById = {};
  if (kursi) {
    if (kursi.atas) posisiById[kursi.atas.id] = 'seatAtas';
    if (kursi.kiri) posisiById[kursi.kiri.id] = 'seatKiri';
    if (kursi.kanan) posisiById[kursi.kanan.id] = 'seatKanan';
  }

  (data.semuaTangan || []).forEach((p) => {
    const elId = posisiById[p.id];
    if (!elId) return; // ini "aku" sendiri - tangan aku udah kelihatan asli di myHand
    const el = document.getElementById(elId);
    const cardsWrap = el.querySelector('.seat-cards');
    if (cardsWrap) {
      cardsWrap.innerHTML = p.hand
        .map((k) => `<img src="/img/${k.file}" class="seat-stack reveal" alt="${escapeHtml(k.nama)}" />`)
        .join('');
    }
    let skorEl = el.querySelector('.seat-skor');
    if (!skorEl) {
      skorEl = document.createElement('span');
      skorEl.className = 'seat-jumlah seat-skor';
      el.appendChild(skorEl);
    }
    skorEl.textContent = `Skor: ${skorMap[p.id] !== undefined ? skorMap[p.id] : '-'}`;
  });

  const skorAku = skorMap[socket.id];
  scoreCards.textContent = 'Ronde selesai';
  scoreTotal.textContent = skorAku !== undefined ? skorAku : scoreTotal.textContent;

  btnRondeBerikutnya.classList.remove('hidden');
  btnKembaliLobby.classList.remove('hidden');
}
