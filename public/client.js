const socket = io();

let hostIdSaatIni = null;
let stateGameSaatIni = null; // hasil event 'game-state' terakhir

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
const playersBar = document.getElementById('playersBar');
const myHand = document.getElementById('myHand');
const aksiHint = document.getElementById('aksiHint');

const hasilOverlay = document.getElementById('hasilOverlay');
const hasilJudul = document.getElementById('hasilJudul');
const hasilDetail = document.getElementById('hasilDetail');
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
  location.reload();
});

// ---- Aksi meja: ambil kartu ----
drawPileImg.addEventListener('click', () => {
  if (!bolehAmbil()) return;
  socket.emit('ambil-kartu', { sumber: 'deck' });
});

discardPileImg.addEventListener('click', () => {
  if (!bolehAmbil()) return;
  if (!stateGameSaatIni || !stateGameSaatIni.discardTop) return;
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
  if (lobby.classList.contains('hidden')) return; // lagi di meja, bukan lobby
  renderPlayerList(data.players);
  aturTombolMulai();
});

socket.on('gagal-gabung', (pesan) => tampilkanError(pesan));
socket.on('gagal-mulai', (pesan) => alert(pesan));

// ---- Respon server: state permainan ----
socket.on('game-state', (data) => {
  stateGameSaatIni = data;
  tampilkanMeja();
  renderMeja();
});

socket.on('permainan-selesai', (data) => {
  tampilkanHasil(data);
});

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

// ---- Fungsi bantu: meja ----
function tampilkanMeja() {
  landing.classList.add('hidden');
  lobby.classList.add('hidden');
  meja.classList.remove('hidden');
}

function renderMeja() {
  const data = stateGameSaatIni;
  const giliranSaya = data.giliranId === socket.id;
  const pemainGiliran = data.pemain.find((p) => p.id === data.giliranId);

  giliranInfo.textContent = giliranSaya
    ? 'Giliran kamu!'
    : `Giliran: ${pemainGiliran ? pemainGiliran.nama : '-'}`;
  sisaDeckInfo.textContent = `Sisa kartu di deck: ${data.sisaDeck}`;

  // Tumpukan buang
  if (data.discardTop) {
    discardPileImg.src = `/img/${data.discardTop.file}`;
  } else {
    discardPileImg.src = '/img/back.png';
  }

  const bolehTarik = giliranSaya && data.tanganSaya.length === 4;
  drawPileImg.classList.toggle('nonaktif', !bolehTarik);
  discardPileImg.classList.toggle('nonaktif', !bolehTarik || !data.discardTop);

  // Badge semua pemain
  playersBar.innerHTML = '';
  data.pemain.forEach((p) => {
    const badge = document.createElement('div');
    badge.className = 'player-badge';
    if (p.id === data.giliranId) badge.classList.add('giliran');
    badge.textContent = `${p.nama} (${p.jumlahKartu})`;
    playersBar.appendChild(badge);
  });

  // Tangan sendiri
  const bolehBuang = giliranSaya && data.tanganSaya.length === 5;
  myHand.innerHTML = '';
  data.tanganSaya.forEach((kartu) => {
    const img = document.createElement('img');
    img.src = `/img/${kartu.file}`;
    img.alt = kartu.nama;
    img.className = 'card-img';
    if (bolehBuang) {
      img.classList.add('selectable');
      img.addEventListener('click', () => {
        socket.emit('buang-kartu', { cardId: kartu.id });
      });
    }
    myHand.appendChild(img);
  });

  if (giliranSaya && data.tanganSaya.length === 4) {
    aksiHint.textContent = 'Giliran kamu — ambil 1 kartu dari tumpukan tertutup atau tumpukan buang.';
  } else if (giliranSaya && data.tanganSaya.length === 5) {
    aksiHint.textContent = 'Pilih 1 kartu di tanganmu buat dibuang.';
  } else {
    aksiHint.textContent = 'Menunggu giliran...';
  }
}

function tampilkanHasil(data) {
  if (data.alasan === 'checkmate') {
    hasilJudul.textContent = 'Checkmate 101! 🎉';
    hasilDetail.textContent = `${data.pemenang} menang dengan 4 kartu se-harakat totalnya 101.`;
  } else {
    hasilJudul.textContent = 'Deck Habis';
    hasilDetail.textContent = `${data.pemenang} menang dengan skor tertinggi (${data.skor}).`;
  }
  hasilOverlay.classList.remove('hidden');
}
