const socket = io();

let hostIdSaatIni = null;
let stateGameSaatIni = null;
let prevHandIds = [];
let prevDiscardFile = null;

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

// ---- Elemen meja ----
const giliranInfo = document.getElementById('giliranInfo');
const sisaDeckInfo = document.getElementById('sisaDeckInfo');
const drawPileImg = document.getElementById('drawPileImg');
const discardPileImg = document.getElementById('discardPileImg');
const ambilDeckBadge = document.getElementById('ambilDeckBadge');
const ambilBuangBadge = document.getElementById('ambilBuangBadge');
const myHand = document.getElementById('myHand');
const myNameLabel = document.getElementById('myNameLabel');
const aksiHint = document.getElementById('aksiHint');

const hasilOverlay = document.getElementById('hasilOverlay');
const hasilJudul = document.getElementById('hasilJudul');
const hasilDetail = document.getElementById('hasilDetail');
const revealArea = document.getElementById('revealArea');
const btnKembaliLobby = document.getElementById('btnKembaliLobby');

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

btnMulai.addEventListener('click', () => {
  socket.emit('mulai-main');
});

btnKembaliLobby.addEventListener('click', () => {
  socket.emit('kembali-ke-lobi');
});

// ---- Aksi meja: ambil kartu ----
drawPileImg.addEventListener('click', () => {
  if (!bolehAmbil()) return;
  socket.emit('ambil-kartu', { sumber: 'deck' });
});

discardPileImg.addEventListener('click', () => {
  if (!bolehAmbil() || !stateGameSaatIni.discardTop) return;
  socket.emit('ambil-kartu', { sumber: 'buang' });
});

function bolehAmbil() {
  if (!stateGameSaatIni) return false;
  const giliranSaya = stateGameSaatIni.giliranId === socket.id;
  const belumAmbil = stateGameSaatIni.tanganSaya.length === 4;
  return giliranSaya && belumAmbil;
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
  hasilOverlay.classList.add('hidden');
  prevHandIds = [];
  prevDiscardFile = null;
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
  kodeBesar.textContent = data.kode;
  renderPlayerList(data.players);
  aturTombolMulai();

  landing.classList.add('hidden');
  lobby.classList.remove('hidden');
  meja.classList.add('hidden');
}

const WARNA_HARAKAT = ['#378ADD', '#E0A82E', '#B24A24', '#6B6A64'];

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

// ---- Fungsi bantu: susun kursi (aku selalu di bawah) ----
function susunKursi(pemain, myId) {
  const idx = pemain.findIndex((p) => p.id === myId);
  const slot = { atas: null, kiri: null, kanan: null };
  if (idx === -1) return slot;

  const lainnya = [...pemain.slice(idx + 1), ...pemain.slice(0, idx)];
  const label = ['atas', 'kiri', 'kanan'];
  lainnya.forEach((p, i) => {
    if (i < 3) slot[label[i]] = p;
  });
  return slot;
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function renderSeat(elId, pemain, giliranId) {
  const el = document.getElementById(elId);
  if (!pemain) {
    el.innerHTML = '';
    el.classList.add('hidden');
    return;
  }
  el.classList.remove('hidden');
  el.classList.toggle('giliran', pemain.id === giliranId);
  el.innerHTML = `
    <img src="/img/back.png" class="seat-stack" alt="Tumpukan ${escapeHtml(pemain.nama)}" />
    <span class="seat-nama">${escapeHtml(pemain.nama)}</span>
    <span class="seat-jumlah">${pemain.jumlahKartu} kartu</span>
  `;
}

// ---- Fungsi bantu: meja ----
function tampilkanMeja() {
  landing.classList.add('hidden');
  lobby.classList.add('hidden');
  meja.classList.remove('hidden');
}

function renderMeja() {
  const data = stateGameSaatIni;
  const giliranSaya = data.giliranId === socket.id;

  const kursi = susunKursi(data.pemain, socket.id);
  renderSeat('seatAtas', kursi.atas, data.giliranId);
  renderSeat('seatKiri', kursi.kiri, data.giliranId);
  renderSeat('seatKanan', kursi.kanan, data.giliranId);

  const namaSaya = (data.pemain.find((p) => p.id === socket.id) || {}).nama || 'Kamu';
  const pemainGiliran = data.pemain.find((p) => p.id === data.giliranId);

  giliranInfo.textContent = giliranSaya ? 'Giliran kamu!' : `Giliran: ${pemainGiliran ? pemainGiliran.nama : '-'}`;
  sisaDeckInfo.textContent = `Sisa kartu di deck: ${data.sisaDeck}`;
  myNameLabel.textContent = namaSaya;
  myNameLabel.classList.toggle('giliran', giliranSaya);

  // Tumpukan buang + animasi "pop" kalau kartu teratasnya berubah
  const discardFile = data.discardTop ? data.discardTop.file : 'back.png';
  discardPileImg.src = `/img/${discardFile}`;
  if (discardFile !== prevDiscardFile) {
    discardPileImg.classList.remove('pop');
    void discardPileImg.offsetWidth;
    discardPileImg.classList.add('pop');
    prevDiscardFile = discardFile;
  }

  const bolehTarik = giliranSaya && data.tanganSaya.length === 4;
  drawPileImg.classList.toggle('aktif', bolehTarik);
  discardPileImg.classList.toggle('aktif', bolehTarik && !!data.discardTop);
  ambilDeckBadge.classList.toggle('aktif', bolehTarik);
  ambilBuangBadge.classList.toggle('aktif', bolehTarik && !!data.discardTop);

  // Tangan sendiri + animasi kartu baru masuk
  const bolehBuang = giliranSaya && data.tanganSaya.length === 5;
  const idSekarang = data.tanganSaya.map((k) => k.id);

  myHand.innerHTML = '';
  data.tanganSaya.forEach((kartu) => {
    const img = document.createElement('img');
    img.src = `/img/${kartu.file}`;
    img.alt = kartu.nama;
    img.className = 'card-img';
    if (!prevHandIds.includes(kartu.id)) img.classList.add('masuk');
    if (bolehBuang) {
      img.classList.add('selectable');
      img.addEventListener('click', () => {
        img.classList.add('keluar');
        socket.emit('buang-kartu', { cardId: kartu.id });
      });
    }
    myHand.appendChild(img);
  });
  prevHandIds = idSekarang;

  if (giliranSaya && data.tanganSaya.length === 4) {
    aksiHint.textContent = 'Ambil 1 kartu dari tumpukan tertutup atau tumpukan buang.';
  } else if (giliranSaya && data.tanganSaya.length === 5) {
    aksiHint.textContent = 'Pilih 1 kartu buat dibuang.';
  } else {
    aksiHint.textContent = 'Menunggu giliran...';
  }
}

function tampilkanHasil(data) {
  if (data.alasan === 'checkmate') {
    hasilJudul.textContent = 'Checkmate 101';
    hasilDetail.textContent = `${data.pemenang} menang dengan 4 kartu se-harakat totalnya 101.`;
  } else {
    hasilJudul.textContent = 'Deck Habis';
    hasilDetail.textContent = `${data.pemenang} menang dengan skor tertinggi (${data.skor}).`;
  }

  revealArea.innerHTML = '';
  (data.semuaTangan || []).forEach((p, i) => {
    const row = document.createElement('div');
    row.className = 'reveal-row';

    const nama = document.createElement('span');
    nama.className = 'reveal-nama';
    nama.textContent = p.nama;

    const cards = document.createElement('div');
    cards.className = 'reveal-cards';
    (p.hand || []).forEach((kartu, j) => {
      const img = document.createElement('img');
      img.src = `/img/${kartu.file}`;
      img.className = 'reveal-card';
      img.style.animationDelay = `${(i * 4 + j) * 0.05}s`;
      cards.appendChild(img);
    });

    row.appendChild(nama);
    row.appendChild(cards);
    revealArea.appendChild(row);
  });

  hasilOverlay.classList.remove('hidden');
}
