const socket = io();

let hostIdSaatIni = null;
let stateGameSaatIni = null;
let prevHandIds = [];
let prevDiscardFile = null;
let kodeRoomSaatIni = '----';

// ---- Elemen UI Landing/Lobby ----
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

// ---- Elemen UI Meja Baru ----
const topStatList = document.getElementById('topStatList');
const infoRoomNum = document.getElementById('infoRoomNum');
const infoRoundNum = document.getElementById('infoRoundNum');
const infoBuangNum = document.getElementById('infoBuangNum');
const infoSisaNum = document.getElementById('infoSisaNum');
const lastGameInfo = document.getElementById('lastGameInfo');
const giliranInfoName = document.getElementById('giliranInfoName');

const drawPileImg = document.getElementById('drawPileImg');
const discardPileImg = document.getElementById('discardPileImg');
const ambilDeckBadge = document.getElementById('ambilDeckBadge');
const ambilBuangBadge = document.getElementById('ambilBuangBadge');

const myHand = document.getElementById('myHand');
const myNameLabel = document.getElementById('myNameLabel');

const scoreDetailStr = document.getElementById('scoreDetailStr');
const scoreCalcStr = document.getElementById('scoreCalcStr');
const scoreTotalNum = document.getElementById('scoreTotalNum');

const hasilOverlay = document.getElementById('hasilOverlay');
const hasilJudul = document.getElementById('hasilJudul');
const hasilDetail = document.getElementById('hasilDetail');
const revealArea = document.getElementById('revealArea');
const btnRondeBerikutnya = document.getElementById('btnRondeBerikutnya');
const btnKembaliLobby = document.getElementById('btnKembaliLobby');

// ---- Event Listeners Lobby ----
btnTabBuat.addEventListener('click', () => {
  btnTabBuat.classList.add('active'); btnTabGabung.classList.remove('active');
  panelBuat.classList.remove('hidden'); panelGabung.classList.add('hidden');
});
btnTabGabung.addEventListener('click', () => {
  btnTabGabung.classList.add('active'); btnTabBuat.classList.remove('active');
  panelGabung.classList.remove('hidden'); panelBuat.classList.add('hidden');
});
btnBuatRoom.addEventListener('click', () => {
  if (!inputNama.value.trim()) return errorMsg.classList.remove('hidden');
  socket.emit('buat-room', inputNama.value.trim());
});
btnGabungRoom.addEventListener('click', () => {
  if (inputKode.value.trim().length !== 4) return errorMsg.classList.remove('hidden');
  socket.emit('gabung-room', { kode: inputKode.value.trim(), nama: inputNama.value.trim() });
});
btnMulai.addEventListener('click', () => socket.emit('mulai-main'));
btnRondeBerikutnya.addEventListener('click', () => socket.emit('ronde-berikutnya'));
btnKembaliLobby.addEventListener('click', () => socket.emit('kembali-ke-lobi'));

// ---- Aksi Meja ----
ambilDeckBadge.addEventListener('click', () => {
  if (!bolehAmbil()) return;
  socket.emit('ambil-kartu', { sumber: 'deck' });
});

ambilBuangBadge.addEventListener('click', () => {
  if (!bolehAmbil() || !stateGameSaatIni.discardTop) return;
  socket.emit('ambil-kartu', { sumber: 'buang' });
});

function bolehAmbil() {
  if (!stateGameSaatIni) return false;
  return stateGameSaatIni.giliranId === socket.id && stateGameSaatIni.tanganSaya.length === 4;
}

// ---- Socket Events ----
socket.on('room-dibuat', (data) => tampilkanLobby(data));
socket.on('berhasil-gabung', (data) => tampilkanLobby(data));
socket.on('update-pemain', (data) => {
  hostIdSaatIni = data.hostId;
  if (!lobby.classList.contains('hidden')) {
    renderPlayerList(data.players);
    btnMulai.classList.toggle('hidden', socket.id !== hostIdSaatIni);
    waitingMsg.classList.toggle('hidden', socket.id === hostIdSaatIni);
  }
});
socket.on('game-state', (data) => {
  stateGameSaatIni = data;
  tampilkanMeja();
  renderMeja();
});
socket.on('permainan-selesai', tampilkanHasil);

// ---- Fungsi Render UI ----
function tampilkanLobby(data) {
  hostIdSaatIni = data.hostId; kodeRoomSaatIni = data.kode;
  kodeBesar.textContent = data.kode;
  renderPlayerList(data.players);
  landing.classList.add('hidden'); lobby.classList.remove('hidden'); meja.classList.add('hidden');
  btnMulai.classList.toggle('hidden', socket.id !== hostIdSaatIni);
  waitingMsg.classList.toggle('hidden', socket.id === hostIdSaatIni);
}

function renderPlayerList(players) {
  playerList.innerHTML = '';
  players.forEach(p => {
    const li = document.createElement('li');
    li.textContent = p.nama + (p.id === hostIdSaatIni ? ' (HOST)' : '');
    playerList.appendChild(li);
  });
}

function susunKursi(pemain, myId) {
  const idx = pemain.findIndex((p) => p.id === myId);
  const slot = { atas: null, kiri: null, kanan: null };
  if (idx === -1) return slot;
  const lainnya = [...pemain.slice(idx + 1), ...pemain.slice(0, idx)];
  if(lainnya.length >= 1) slot.kiri = lainnya[0];
  if(lainnya.length >= 2) slot.atas = lainnya[1];
  if(lainnya.length >= 3) slot.kanan = lainnya[2];
  return slot;
}

function renderSeatMockup(elId, pemain, giliranId) {
  const el = document.getElementById(elId);
  if (!pemain) {
    el.innerHTML = '';
    el.classList.add('hidden');
    return;
  }
  el.classList.remove('hidden');
  
  // Render kartu berjejer (fanning) untuk lawan sesuai jumlahKartu
  let cardsHtml = '';
  for(let i = 0; i < pemain.jumlahKartu; i++) {
    cardsHtml += `<div class="seat-card-back"></div>`;
  }

  const isTurn = pemain.id === giliranId ? 'active-turn' : '';
  el.innerHTML = `
    ${elId === 'seatAtas' ? `<div class="seat-name ${isTurn}">${pemain.nama}</div>` : ''}
    <div class="fanning-container">${cardsHtml}</div>
    ${elId !== 'seatAtas' ? `<div class="seat-name ${isTurn}">${pemain.nama}</div>` : ''}
  `;
}

function tampilkanMeja() {
  landing.classList.add('hidden'); lobby.classList.add('hidden'); meja.classList.remove('hidden');
  hasilOverlay.classList.add('hidden');
}

function renderMeja() {
  const data = stateGameSaatIni;
  const giliranSaya = data.giliranId === socket.id;
  const pemainGiliran = data.pemain.find(p => p.id === data.giliranId);

  // Update Panel Atas
  infoRoomNum.textContent = kodeRoomSaatIni;
  infoRoundNum.textContent = data.roundNumber || 1;
  infoBuangNum.textContent = data.kartuTerbuang || 0;
  infoSisaNum.textContent = data.sisaDeck || 0;
  giliranInfoName.textContent = pemainGiliran ? pemainGiliran.nama : '-';

  topStatList.innerHTML = '';
  data.pemain.forEach(p => {
    topStatList.innerHTML += `<li>${p.nama} - W:${p.menang} L:${p.kalah}</li>`;
  });

  if (data.lastGame) {
    lastGameInfo.innerHTML = `Win: ${data.lastGame.menang}<br>Lose: ${data.lastGame.kalah.join(', ')}`;
  } else {
    lastGameInfo.innerHTML = '-';
  }

  // Update Kursi
  const kursi = susunKursi(data.pemain, socket.id);
  renderSeatMockup('seatAtas', kursi.atas, data.giliranId);
  renderSeatMockup('seatKiri', kursi.kiri, data.giliranId);
  renderSeatMockup('seatKanan', kursi.kanan, data.giliranId);

  const myPemain = data.pemain.find(p => p.id === socket.id);
  myNameLabel.textContent = myPemain ? myPemain.nama : 'Kamu';
  myNameLabel.classList.toggle('active-turn', giliranSaya);

  // Tumpukan Buang & Deck
  if (data.discardTop) {
    discardPileImg.src = `/img/${data.discardTop.file}`;
    discardPileImg.classList.remove('hidden');
  } else {
    discardPileImg.src = '/img/back.png';
  }

  const bolehTarik = giliranSaya && data.tanganSaya.length === 4;
  ambilDeckBadge.classList.toggle('aktif', bolehTarik);
  ambilBuangBadge.classList.toggle('aktif', bolehTarik && !!data.discardTop);
  
  // Tangan Sendiri
  const bolehBuang = giliranSaya && data.tanganSaya.length === 5;
  myHand.innerHTML = '';
  
  // Render Skor (Mockup Pointing)
  let namaKartuArr = [];
  let poinArr = [];
  let totalPoin = 0;

  data.tanganSaya.forEach((kartu) => {
    const img = document.createElement('img');
    img.src = `/img/${kartu.file}`;
    img.className = 'card-img';
    if (bolehBuang) {
      img.classList.add('selectable');
      img.addEventListener('click', () => {
        socket.emit('buang-kartu', { cardId: kartu.id });
      });
    }
    myHand.appendChild(img);

    // Simulasi hitung skor (sesuaikan dengan logic cards.js kamu)
    let namaLabel = kartu.nama.substring(0, 3); 
    let poin = parseInt(kartu.nilai) || 25; 
    namaKartuArr.push(namaLabel);
    poinArr.push(poin);
    totalPoin += poin;
  });

  scoreDetailStr.innerHTML = namaKartuArr.join(' | ');
  scoreCalcStr.innerHTML = poinArr.join(' + ');
  scoreTotalNum.innerHTML = totalPoin;
}

function tampilkanHasil(data) {
  hasilOverlay.classList.remove('hidden');
  hasilJudul.textContent = data.alasan === 'checkmate' ? 'Checkmate 101!' : 'Deck Habis';
  hasilDetail.textContent = `${data.pemenang} menang.`;
  // (Render revealArea sama seperti sebelumnya)
}