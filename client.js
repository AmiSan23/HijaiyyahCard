const socket = io();

// Warna dot pemain, cycling 4 warna harakat - cuma dekorasi visual di lobby
const WARNA_HARAKAT = ['#378ADD', '#E0A82E', '#B24A24', '#6B6A64'];

let hostIdSaatIni = null;

// ---- Ambil elemen-elemen penting ----
const landing = document.getElementById('landing');
const lobby = document.getElementById('lobby');

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

// ---- Ganti tab Buat Room / Gabung Room ----
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

// ---- Aksi utama ----
btnBuatRoom.addEventListener('click', () => {
  const nama = inputNama.value.trim();
  if (!nama) {
    tampilkanError('Isi nama kamu dulu ya.');
    return;
  }
  socket.emit('buat-room', nama);
});

btnGabungRoom.addEventListener('click', () => {
  const nama = inputNama.value.trim();
  const kode = inputKode.value.trim();
  if (!nama) {
    tampilkanError('Isi nama kamu dulu ya.');
    return;
  }
  if (kode.length !== 4) {
    tampilkanError('Kode room harus 4 digit.');
    return;
  }
  socket.emit('gabung-room', { kode, nama });
});

btnMulai.addEventListener('click', () => {
  socket.emit('mulai-main');
});

// ---- Respon dari server ----
socket.on('room-dibuat', (data) => {
  tampilkanLobby(data);
});

socket.on('berhasil-gabung', (data) => {
  tampilkanLobby(data);
});

socket.on('update-pemain', (data) => {
  hostIdSaatIni = data.hostId;
  renderPlayerList(data.players);
  aturTombolMulai();
});

socket.on('gagal-gabung', (pesan) => {
  tampilkanError(pesan);
});

socket.on('game-dimulai', () => {
  // Placeholder buat sekarang - logic kartu beneran nyusul di tahap berikutnya
  alert('Game dimulai! (Tampilan meja kartu masih dalam pengembangan)');
});

// ---- Fungsi bantu ----
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
