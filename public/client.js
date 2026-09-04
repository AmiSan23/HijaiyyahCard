import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue, update, set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { buatDeck, kocokDeck, cekCheckmate, kalkulasiSkorDetail } from './cards.js';

// ---- 1. INISIALISASI FIREBASE ----
const firebaseConfig = {
  apiKey: "AIzaSyBfwN2QDz-MiwBEpt9tv9KXhDrNAaUE71c",
  authDomain: "hijaiyyahcard.firebaseapp.com",
  databaseURL: "https://hijaiyyahcard-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "hijaiyyahcard",
  storageBucket: "hijaiyyahcard.firebasestorage.app",
  messagingSenderId: "927126787805",
  appId: "1:927126787805:web:ace6f351c7918452abed34"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ---- 2. IDENTITAS LOKAL ----
const myName = localStorage.getItem('playerName');
const isHost = localStorage.getItem('isHost') === 'true';
const urlParams = new URLSearchParams(window.location.search);
const roomCode = urlParams.get('room');

if (!roomCode || !myName) window.location.href = 'index.html'; // Tendang jika nyasar

const roomRef = ref(db, `rooms/${roomCode}`);
let localGameState = null;
let kartuTerpilihId = null; // Menyimpan ID kartu yang sedang diklik untuk dibuang

// ---- 3. BINDING ELEMEN DOM ----
const elRoomCode = document.getElementById('roomCode');
const elRoundNum = document.getElementById('roundNum');
const elPlayerStats = document.getElementById('playerStats');
const elDiscardCount = document.getElementById('discardCount');
const elDeckCount = document.getElementById('deckCount');
const elCurrentTurn = document.getElementById('currentTurnName');
const elDeckSisa = document.getElementById('deckSisa');
const endGameCenter = document.getElementById('endGameCenter');
const winnerName = document.getElementById('winnerName');
const btnMainLagi = document.getElementById('btnMainLagi');
const btnKeluar = document.getElementById('btnKeluar');

// Area Tengah (Deck & Discard Piles)
const deckPile = document.getElementById('deckPile');
const btnAmbilDeck = document.getElementById('btnAmbilDeck');

// Area Skor (Pemain Utama / A)
const scoreCardsEl = document.getElementById('scoreCards');
const scoreCalcEl = document.getElementById('scoreCalc');
const scoreTotalEl = document.getElementById('scoreTotal');

// ---- 4. LISTENER REALTIME FIREBASE ----
// Host & Guest bergabung ke dalam room
update(ref(db, `rooms/${roomCode}/players/${myName}`), { status: 'online' });

onValue(roomRef, (snapshot) => {
  const data = snapshot.val();
  if (!data) return;
  localGameState = data;
  
  // Jika Host dan pemain sudah 4 orang tapi game belum mulai, Auto-Start!
  const playerNames = Object.keys(data.players || {});
  if (isHost && data.status === 'waiting' && playerNames.length === 4) {
    mulaiGame(playerNames);
  }

  if (data.status === 'playing' || data.status === 'ended') {
    renderGame(data);
  }
});

// ---- 5. LOGIKA GAME (HOST ONLY) ----
async function mulaiGame(playerNames) {
  const deck = kocokDeck(buatDeck());
  const playersData = {};
  
  playerNames.forEach(name => {
    playersData[name] = {
      ...localGameState.players[name],
      hand: deck.splice(0, 4),
      discards: []
    };
  });

  await update(roomRef, {
    status: 'playing',
    round: (localGameState.round || 0) + 1,
    turnOrder: playerNames,
    turnIndex: 0,
    deck: deck,
    players: playersData
  });
}

// ---- 6. FUNGSI RENDER UTAMA ----
function renderGame(data) {
  const giliranSaatIni = data.turnOrder[data.turnIndex];
  const giliranSaya = giliranSaatIni === myName;
  const tanganSaya = data.players[myName]?.hand || [];

  // Update Panel Informasi Atas
  elRoomCode.textContent = roomCode;
  elRoundNum.textContent = data.round;
  elDeckCount.textContent = data.deck ? data.deck.length : 0;
  elDeckSisa.textContent = data.deck ? data.deck.length : 0;
  elCurrentTurn.textContent = giliranSaatIni;

  elPlayerStats.innerHTML = '';
  let totalDiscards = 0;
  
  data.turnOrder.forEach(nama => {
    const stat = data.players[nama].stats || {w:0, l:0};
    elPlayerStats.innerHTML += `<li>${nama} | W: ${stat.w} L: ${stat.l}</li>`;
    if (data.players[nama].discards) totalDiscards += data.players[nama].discards.length;
  });
  elDiscardCount.textContent = totalDiscards;

  // Susun Kursi Relatif (Aku selalu di Bawah/A, lalu memutar berlawanan arah jarum jam)
  const myIndex = data.turnOrder.indexOf(myName);
  const mappingKursi = {
    'A': myName, // Aku
    'B': data.turnOrder[(myIndex + 1) % 4], // Kanan
    'C': data.turnOrder[(myIndex + 2) % 4], // Atas
    'D': data.turnOrder[(myIndex + 3) % 4]  // Kiri
  };

  // Render Pemain di Meja
  Object.keys(mappingKursi).forEach(pos => {
    const namaPemain = mappingKursi[pos];
    const elName = document.getElementById(`name${pos}`);
    if (elName) {
      elName.textContent = namaPemain;
      // Indikator Giliran Hijau
      elName.className = `seat-name ${giliranSaatIni === namaPemain ? 'active-turn' : 'inactive'}`;
    }
    
    // Render Tangan Lawan (Belakang Kartu) / Tangan Sendiri
    if (pos === 'A') {
      renderMyHand(tanganSaya, giliranSaya);
    } else {
      const elHandLawan = document.getElementById(`hand${pos === 'B' ? 'Bbb' : pos === 'C' ? 'Ccc' : 'Ddd'}`);
      if (elHandLawan) {
        const jumlahKartuLawan = data.players[namaPemain].hand ? data.players[namaPemain].hand.length : 0;
        elHandLawan.innerHTML = Array(jumlahKartuLawan).fill(`<img src="img/back.png" class="card-img">`).join('');
      }
    }

    // Render Tumpukan Buangan per Pemain
    const tumpukan = data.players[namaPemain]?.discards || [];
    const elDiscardGrid = document.querySelector(`.pile-discard-${pos} .discard-grid`);
    if (elDiscardGrid) {
      elDiscardGrid.innerHTML = tumpukan.map(k => `<img src="img/${k.file}" class="card-img">`).join('');
    }

    // Logika Tombol Ambil Discard (Hanya boleh ambil dari pemain sebelum kita, yaitu 'D' / Kiri)
    const btnAmbilDiscard = document.querySelector(`.pile-discard-${pos} .btn-ambil`);
    if (btnAmbilDiscard) {
      const bolehAmbil = giliranSaya && tanganSaya.length === 4 && pos === 'D' && tumpukan.length > 0;
      btnAmbilDiscard.style.display = bolehAmbil ? 'block' : 'none';
      btnAmbilDiscard.onclick = bolehAmbil ? () => ambilKartu('discard', mappingKursi['D']) : null;
      document.querySelector(`.pile-discard-${pos}`).classList.toggle('active-draw', bolehAmbil);
    }
  });

  // Logika Tombol Ambil Deck
  const bolehAmbilDeck = giliranSaya && tanganSaya.length === 4 && data.deck && data.deck.length > 0;
  btnAmbilDeck.style.display = bolehAmbilDeck ? 'block' : 'none';
  deckPile.classList.toggle('active-draw', bolehAmbilDeck);
  btnAmbilDeck.onclick = bolehAmbilDeck ? () => ambilKartu('deck') : null;

  // Render Skor Live (Panel Bawah Kanan)
  renderSkorLive(tanganSaya);

  // Jika Selesai (Showdown)
  if (data.status === 'ended') {
    renderShowdown(data, mappingKursi);
  }
}

// ---- 7. INTERAKSI TANGAN SENDIRI & SKOR ----
function renderMyHand(hand, giliranSaya) {
  const myHandEl = document.getElementById('myHand');
  myHandEl.innerHTML = '';
  const bolehBuang = giliranSaya && hand.length === 5;

  hand.forEach((kartu, index) => {
    const wrap = document.createElement('div');
    wrap.className = `card-wrap ${bolehBuang ? 'pilihable' : ''} ${kartu.id === kartuTerpilihId ? 'selected' : ''}`;
    wrap.style.position = 'relative';

    const img = document.createElement('img');
    img.src = `img/${kartu.file}`;
    img.className = 'card-img';
    
    const btnBuang = document.createElement('button');
    btnBuang.className = 'action-btn btn-buang';
    btnBuang.textContent = 'Buang';

    if (bolehBuang) {
      img.onclick = () => {
        kartuTerpilihId = kartuTerpilihId === kartu.id ? null : kartu.id;
        renderGame(localGameState); // Refresh UI lokal
      };
      btnBuang.onclick = (e) => {
        e.stopPropagation();
        buangKartu(index);
      };
    }

    wrap.appendChild(img);
    wrap.appendChild(btnBuang);
    myHandEl.appendChild(wrap);
  });
}

function renderSkorLive(hand) {
  const hasilSkor = kalkulasiSkorDetail(hand); // Dari cards.js
  
  // Suntik warna dinamis ke HTML
  scoreCardsEl.innerHTML = hasilSkor.rincian.map(k => 
    `<span style="color: ${k.warna}; font-weight: bold;">${k.label}</span>`
  ).join(' | ');

  scoreCalcEl.innerHTML = hasilSkor.rincian.map(k => {
    const op = k.operator ? `${k.operator} ` : '';
    return `<span style="color: ${k.warna};">${op}${k.nilaiAbsolut}</span>`;
  }).join(' ');

  scoreTotalEl.textContent = hasilSkor.total;
  scoreTotalEl.style.color = hasilSkor.total < 0 ? 'var(--btn-red)' : 'var(--ink-dark)';
}

// ---- 8. FUNGSI AKSI DATABASE ----
async function ambilKartu(sumber, idLawanKiri = null) {
  if (!localGameState) return;
  const data = localGameState;
  
  let kartuTerambil;
  let updates = {};

  if (sumber === 'deck') {
    kartuTerambil = data.deck.pop();
    updates[`rooms/${roomCode}/deck`] = data.deck;
  } else if (sumber === 'discard') {
    kartuTerambil = data.players[idLawanKiri].discards.pop();
    updates[`rooms/${roomCode}/players/${idLawanKiri}/discards`] = data.players[idLawanKiri].discards;
  }

  const tanganBaru = [...data.players[myName].hand, kartuTerambil];
  updates[`rooms/${roomCode}/players/${myName}/hand`] = tanganBaru;
  
  await update(ref(db), updates);
}

async function buangKartu(indexKartu) {
  if (!localGameState) return;
  const data = localGameState;
  kartuTerpilihId = null;

  const tanganBaru = [...data.players[myName].hand];
  const [kartuDibuang] = tanganBaru.splice(indexKartu, 1);
  
  const discardsBaru = [...(data.players[myName].discards || []), kartuDibuang];
  
  let updates = {
    [`rooms/${roomCode}/players/${myName}/hand`]: tanganBaru,
    [`rooms/${roomCode}/players/${myName}/discards`]: discardsBaru
  };

  // Cek Kemenangan
  if (cekCheckmate(tanganBaru) || (!data.deck || data.deck.length === 0)) {
    updates[`rooms/${roomCode}/status`] = 'ended';
    updates[`rooms/${roomCode}/lastGame/win`] = myName;
    // (Bisa tambahkan logika update poin / stats W/L di sini)
  } else {
    // Pindah Giliran
    const nextIndex = (data.turnIndex + 1) % data.turnOrder.length;
    updates[`rooms/${roomCode}/turnIndex`] = nextIndex;
  }

  await update(ref(db), updates);
}

// ---- 9. SHOWDOWN (Game Over) ----
function renderShowdown(data, mappingKursi) {
  endGameCenter.classList.remove('hidden');
  winnerName.textContent = data.lastGame?.win || 'DRAW';
  
  btnMainLagi.classList.toggle('hidden', !isHost); // Hanya host yang bisa mulai lagi
  btnKeluar.classList.remove('hidden');

  // Buka semua kartu lawan di OpenArea (Tengah Meja)
  Object.keys(mappingKursi).forEach(pos => {
    const namaPemain = mappingKursi[pos];
    const hand = data.players[namaPemain]?.hand || [];
    const elOpenArea = document.getElementById(`openArea${pos}`);
    if (elOpenArea) {
      elOpenArea.innerHTML = hand.map(k => `<img src="img/${k.file}" class="card-img">`).join('');
    }
    // Sembunyikan tumpukan kartu belakang (Fanning container)
    const elHandFanning = document.getElementById(`hand${pos === 'B' ? 'Bbb' : pos === 'C' ? 'Ccc' : pos === 'D' ? 'Ddd' : ''}`);
    if (elHandFanning) elHandFanning.style.display = 'none';
  });
}

btnMainLagi.onclick = () => mulaiGame(localGameState.turnOrder);
btnKeluar.onclick = () => window.location.href = 'index.html';