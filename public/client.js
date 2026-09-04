import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue, update, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { buatDeck, kocokDeck, cekCheckmate, kalkulasiSkorDetail } from './cards.js';

// ---- 1. FIREBASE INIT ----
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

// ---- 2. IDENTITY ----
const myName = localStorage.getItem('playerName');
const isHost = localStorage.getItem('isHost') === 'true';
const urlParams = new URLSearchParams(window.location.search);
const roomCode = urlParams.get('room');

if (!roomCode || !myName) window.location.href = 'index.html';

const roomRef = ref(db, `rooms/${roomCode}`);

// ---- 3. STATE ----
let localState = null;
let selectedCardIndex = null; // kartu yang diklik untuk dibuang

// ---- 4. DOM REFS ----
const elRoomCode = document.getElementById('roomCode');
const elRoundNum = document.getElementById('roundNum');
const elPlayerStats = document.getElementById('playerStats');
const elDiscardCount = document.getElementById('discardCount');
const elDeckCount = document.getElementById('deckCount');
const elDeckSisa = document.getElementById('deckSisa');
const elCurrentTurn = document.getElementById('currentTurnName');
const elLastGameInfo = document.getElementById('lastGameInfo');
const endGameCenter = document.getElementById('endGameCenter');
const winnerName = document.getElementById('winnerName');
const endScores = document.getElementById('endScores');
const btnMainLagi = document.getElementById('btnMainLagi');
const btnKeluar = document.getElementById('btnKeluar');
const btnAmbilDeck = document.getElementById('btnAmbilDeck');
const deckPile = document.getElementById('deckPile');
const scoreCardsEl = document.getElementById('scoreCards');
const scoreCalcEl = document.getElementById('scoreCalc');
const scoreTotalEl = document.getElementById('scoreTotal');

// ---- 5. FIREBASE LISTENER ----
update(ref(db, `rooms/${roomCode}/players/${myName}`), { status: 'online' });

onValue(roomRef, (snapshot) => {
  const data = snapshot.val();
  if (!data) return;
  localState = data;

  // Auto-start: host mulai game saat 4 pemain sudah masuk
  if (isHost && data.status === 'waiting') {
    const playerNames = Object.keys(data.players || {});
    if (playerNames.length >= 2) {
      mulaiGame(playerNames);
    }
  }

  if (data.status === 'playing' || data.status === 'ended') {
    renderGame(data);
  }
});

// ---- 6. MULAI GAME (HOST ONLY) ----
async function mulaiGame(playerNames) {
  if (!localState) return;

  const deck = kocokDeck(buatDeck());
  const playersData = {};

  playerNames.forEach(name => {
    playersData[name] = {
      ...(localState.players[name] || {}),
      hand: deck.splice(0, 4),
      discards: [],
      stats: localState.players[name]?.stats || { w: 0, l: 0 }
    };
  });

  await update(roomRef, {
    status: 'playing',
    round: (localState.round || 0) + 1,
    turnOrder: playerNames,
    turnIndex: 0,
    deck: deck,
    players: playersData
  });
}

// ---- 7. RENDER UTAMA ----
function renderGame(data) {
  if (!data || !data.turnOrder) return;

  const turnOrder = data.turnOrder;
  const turnIndex = data.turnIndex || 0;
  const giliranSaatIni = turnOrder[turnIndex];
  const giliranSaya = giliranSaatIni === myName;

  // Tangan & discards saya
  const tanganSaya = data.players[myName]?.hand || [];
  const discardsSaya = data.players[myName]?.discards || [];

  // Mapping kursi: saya selalu di posisi A (bawah), lalu berlawanan jarum jam
  const myIndex = turnOrder.indexOf(myName);
  const mappingPos = {};
  ['A', 'B', 'C', 'D'].forEach((pos, i) => {
    mappingPos[pos] = turnOrder[(myIndex + i) % 4];
  });
  // mappingPos = { A: myName, B: kanan, C: atas, D: kiri }

  // Mapping posisi ke discard wrapper ID
  const posToDiscardId = { A: 'A', B: 'B', C: 'C2', D: 'D2' };
  const posToHandId = { B: 'Bbb', C: 'Ccc', D: 'Ddd' };
  const posToNameId = { A: 'nameA', B: 'nameB', C: 'nameC', D: 'nameD' };
  const posToOpenId = { A: 'openAreaA', B: 'openAreaB', C: 'openAreaC', D: 'openAreaD' };

  // ---- Panel Info Atas ----
  elRoomCode.textContent = roomCode;
  elRoundNum.textContent = data.round || 1;
  elDeckCount.textContent = data.deck ? data.deck.length : 0;
  elDeckSisa.textContent = data.deck ? data.deck.length : 0;
  elCurrentTurn.textContent = giliranSaatIni;

  // Last game
  if (data.lastGame) {
    elLastGameInfo.innerHTML = `Win: ${data.lastGame.win || '-'}<br>Lose: ${data.lastGame.lose || '-'}`;
  } else {
    elLastGameInfo.textContent = '-';
  }

  // Player stats list
  elPlayerStats.innerHTML = '';
  let totalDiscards = 0;
  turnOrder.forEach(nama => {
    const stat = data.players[nama]?.stats || { w: 0, l: 0 };
    elPlayerStats.innerHTML += `<li>${nama} | W: ${stat.w} L: ${stat.l}</li>`;
    totalDiscards += (data.players[nama]?.discards?.length || 0);
  });
  elDiscardCount.textContent = totalDiscards;

  // ---- Render Setiap Kursi ----
  Object.keys(mappingPos).forEach(pos => {
    const namaPemain = mappingPos[pos];
    const playerData = data.players[namaPemain];

    // Nama kursi
    const elName = document.getElementById(posToNameId[pos]);
    if (elName) {
      elName.textContent = namaPemain;
      elName.className = `seat-name ${giliranSaatIni === namaPemain ? 'active-turn' : ''}`;
    }

    // Tangan lawan (kartu belakang)
    if (pos !== 'A') {
      const elHandLawan = document.getElementById(posToHandId[pos]);
      if (elHandLawan) {
        const jmlKartu = playerData?.hand?.length || 0;
        elHandLawan.innerHTML = Array(jmlKartu).fill(
          `<img src="img/back.png" class="card-img" alt="kartu">`
        ).join('');
      }
    }

    // Discard pile untuk pemain ini
    const discardId = posToDiscardId[pos];
    const discardWrapper = document.getElementById(`discardWrapper${discardId}`);
    const discardGrid = document.getElementById(`discardGrid${discardId}`);
    const btnAmbilDiscard = document.getElementById(`btnAmbilDiscard${discardId}`);

    if (discardGrid && discardWrapper) {
      const tumpukan = playerData?.discards || [];
      discardGrid.innerHTML = tumpukan.map(k =>
        `<img src="img/${k.file}" class="card-img" alt="buangan">`
      ).join('');

      // Tentukan apakah saya boleh ambil dari tumpukan ini
      // Aturan: boleh ambil dari tumpukan pemain SEBELUM saya di turn order
      const prevIndex = (turnIndex - 1 + turnOrder.length) % turnOrder.length;
      const prevPlayer = turnOrder[prevIndex];
      const bolehAmbil = giliranSaya
        && tanganSaya.length === 4
        && namaPemain === prevPlayer
        && tumpukan.length > 0;

      discardWrapper.classList.toggle('active-draw', bolehAmbil);
      btnAmbilDiscard.style.display = bolehAmbil ? 'block' : 'none';
      btnAmbilDiscard.onclick = bolehAmbil
        ? () => ambilKartuDari('discard', namaPemain)
        : null;
    }
  });

  // ---- Render Tangan Saya ----
  renderMyHand(tanganSaya, giliranSaya, data);

  // ---- Render Deck ----
  const bolehAmbilDeck = giliranSaya && tanganSaya.length === 4 && data.deck && data.deck.length > 0;
  deckPile.classList.toggle('active-draw', bolehAmbilDeck);
  btnAmbilDeck.style.display = bolehAmbilDeck ? 'block' : 'none';
  btnAmbilDeck.onclick = bolehAmbilDeck ? () => ambilKartuDari('deck') : null;

  // ---- Render Skor Live ----
  renderSkorLive(tanganSaya);

  // ---- Render Showdown (jika ended) ----
  if (data.status === 'ended') {
    renderShowdown(data, mappingPos, posToOpenId);
  } else {
    endGameCenter.classList.add('hidden');
  }
}

// ---- 8. RENDER TANGAN SENDIRI ----
function renderMyHand(hand, giliranSaya, data) {
  const myHandEl = document.getElementById('myHand');
  myHandEl.innerHTML = '';

  // Boleh buang kalau: giliran saya + tangan sudah 5 kartu
  const bolehBuang = giliranSaya && hand.length === 5;

  hand.forEach((kartu, idx) => {
    const wrap = document.createElement('div');
    wrap.className = 'card-wrap';
    if (bolehBuang) wrap.classList.add('pilihable');
    if (idx === selectedCardIndex) wrap.classList.add('selected');

    const img = document.createElement('img');
    img.src = `img/${kartu.file}`;
    img.className = 'card-img';
    img.alt = kartu.nama;

    const btnBuang = document.createElement('button');
    btnBuang.className = 'action-btn btn-buang';
    btnBuang.textContent = 'Buang';
    btnBuang.style.display = 'none';

    if (bolehBuang) {
      img.style.cursor = 'pointer';
      img.onclick = () => {
        selectedCardIndex = selectedCardIndex === idx ? null : idx;
        renderMyHand(hand, giliranSaya, data);
      };
      btnBuang.style.display = idx === selectedCardIndex ? 'block' : 'none';
      btnBuang.onclick = (e) => {
        e.stopPropagation();
        buangKartu(idx);
        selectedCardIndex = null;
      };
    }

    wrap.appendChild(img);
    wrap.appendChild(btnBuang);
    myHandEl.appendChild(wrap);
  });
}

// ---- 9. RENDER SKOR LIVE ----
function renderSkorLive(hand) {
  if (!hand || hand.length === 0) {
    scoreCardsEl.textContent = '-';
    scoreCalcEl.textContent = '-';
    scoreTotalEl.textContent = '0';
    return;
  }

  const hasil = kalkulasiSkorDetail(hand);

  scoreCardsEl.innerHTML = hasil.rincian.map(k =>
    `<span style="color:${k.isMain ? k.warna : 'var(--btn-red)'}; font-weight:bold;">${k.label}</span>`
  ).join(' | ');

  scoreCalcEl.innerHTML = hasil.rincian.map((k, i) => {
    const op = i === 0 ? '' : (k.isMain ? '+' : '-');
    return `<span style="color:${k.isMain ? k.warna : 'var(--btn-red)'}">${op}${k.nilaiAbsolut}</span>`;
  }).join(' ');

  scoreTotalEl.textContent = hasil.total;
  scoreTotalEl.style.color = hasil.total < 0 ? 'var(--btn-red)' : 'var(--ink-dark)';
}

// ---- 10. AKSI: AMBIL KARTU ----
async function ambilKartuDari(sumber, namaLawan = null) {
  if (!localState) return;

  // Kunci UI saat proses
  const snapshot = await get(roomRef);
  const data = snapshot.val();
  if (!data) return;

  const updates = {};
  let kartuTerambil;

  if (sumber === 'deck') {
    if (!data.deck || data.deck.length === 0) return;
    kartuTerambil = data.deck.pop();
    updates[`rooms/${roomCode}/deck`] = data.deck;
  } else if (sumber === 'discard') {
    const tumpukan = data.players[namaLawan]?.discards;
    if (!tumpukan || tumpukan.length === 0) return;
    kartuTerambil = tumpukan.pop();
    updates[`rooms/${roomCode}/players/${namaLawan}/discards`] = tumpukan;
  }

  const tanganBaru = [...(data.players[myName]?.hand || []), kartuTerambil];
  updates[`rooms/${roomCode}/players/${myName}/hand`] = tanganBaru;

  await update(ref(db), updates);
}

// ---- 11. AKSI: BUANG KARTU ----
async function buangKartu(indexKartu) {
  if (!localState) return;

  const snapshot = await get(roomRef);
  const data = snapshot.val();
  if (!data) return;

  const tanganLama = [...(data.players[myName]?.hand || [])];
  if (indexKartu < 0 || indexKartu >= tanganLama.length) return;

  const [kartuDibuang] = tanganLama.splice(indexKartu, 1);
  const discardsBaru = [...(data.players[myName]?.discards || []), kartuDibuang];

  const updates = {
    [`rooms/${roomCode}/players/${myName}/hand`]: tanganLama,
    [`rooms/${roomCode}/players/${myName}/discards`]: discardsBaru
  };

  // Cek checkmate (4 kartu, suit sama, total = 101)
  if (cekCheckmate(tanganLama)) {
    const lastWinner = myName;
    const lastLoser = data.turnOrder.filter(n => n !== myName);

    updates[`rooms/${roomCode}/status`] = 'ended';
    updates[`rooms/${roomCode}/lastGame/win`] = lastWinner;
    updates[`rooms/${roomCode}/lastGame/lose`] = lastLoser.join(', ');

    // Update stats W/L
    data.turnOrder.forEach(nama => {
      const currentStats = data.players[nama]?.stats || { w: 0, l: 0 };
      updates[`rooms/${roomCode}/players/${nama}/stats`] = {
        w: currentStats.w + (nama === myName ? 1 : 0),
        l: currentStats.l + (nama !== myName ? 1 : 0)
      };
    });
  } else if (!data.deck || data.deck.length === 0) {
    // Deck habis → showdown
    updates[`rooms/${roomCode}/status`] = 'ended';

    // Hitung skor semua pemain, tentukan pemenang
    let skorTertinggi = -9999;
    let pemenang = null;
    data.turnOrder.forEach(nama => {
      const hand = data.players[nama]?.hand || [];
      const skor = kalkulasiSkorDetail(hand).total;
      if (skor > skorTertinggi) {
        skorTertinggi = skor;
        pemenang = nama;
      }
    });

    updates[`rooms/${roomCode}/lastGame/win`] = pemenang;
    updates[`rooms/${roomCode}/lastGame/lose`] = data.turnOrder.filter(n => n !== pemenang).join(', ');

    data.turnOrder.forEach(nama => {
      const currentStats = data.players[nama]?.stats || { w: 0, l: 0 };
      updates[`rooms/${roomCode}/players/${nama}/stats`] = {
        w: currentStats.w + (nama === pemenang ? 1 : 0),
        l: currentStats.l + (nama !== pemenang ? 1 : 0)
      };
    });
  } else {
    // Pindah giliran ke pemain berikutnya
    const nextIndex = (data.turnIndex + 1) % data.turnOrder.length;
    updates[`rooms/${roomCode}/turnIndex`] = nextIndex;
  }

  await update(ref(db), updates);
}

// ---- 12. SHOWDOWN ----
function renderShowdown(data, mappingPos, posToOpenId) {
  endGameCenter.classList.remove('hidden');
  winnerName.textContent = data.lastGame?.win || 'DRAW';

  // Buka semua kartu
  Object.keys(mappingPos).forEach(pos => {
    const namaPemain = mappingPos[pos];
    const hand = data.players[namaPemain]?.hand || [];
    const openArea = document.getElementById(posToOpenId[pos]);
    if (openArea) {
      openArea.innerHTML = hand.map(k =>
        `<img src="img/${k.file}" class="card-img" alt="${k.nama}">`
      ).join('');
    }

    // Skor akhir
    if (pos === 'A') {
      const skor = kalkulasiSkorDetail(hand).total;
      scoreTotalEl.textContent = skor;
    }
  });

  // Tampilkan skor semua pemain
  const allScores = data.turnOrder.map(nama => {
    const hand = data.players[nama]?.hand || [];
    return { nama, skor: kalkulasiSkorDetail(hand).total };
  }).sort((a, b) => b.skor - a.skor);

  endScores.innerHTML = allScores.map(s =>
    `<div style="font-size:1.1rem; margin:4px 0;">${s.nama}: <b>${s.skor}</b></div>`
  ).join('');

  // Tombol Main Lagi (hanya host)
  btnMainLagi.classList.toggle('hidden', !isHost);
  btnKeluar.classList.remove('hidden');
}

// ---- 13. EVENT LISTENERS ----
btnMainLagi.onclick = () => {
  if (!localState || !localState.turnOrder) return;
  mulaiGame(localState.turnOrder);
  endGameCenter.classList.add('hidden');
};

btnKeluar.onclick = () => {
  window.location.href = 'index.html';
};
