// ============================================================
// CHECKMATE 101 - CLIENT SIDE ENGINE (VS 3 BOTS)
// ============================================================
import { buatDeck, kocokDeck, cekCheckmate, kalkulasiSkorDetail } from './cards.js';

// State Permainan Lokal
let gameState = {
  roomCode: '9999',
  round: 1,
  status: 'playing', // 'playing' | 'ended'
  deck: [],
  turnIndex: 0, // 0: Aaa (Kamu), 1: Bbb, 2: Ccc, 3: Ddd
  turnOrder: ['Aaa', 'Bbb', 'Ccc', 'Ddd'],
  players: {
    'Aaa': { name: 'Aaa', hand: [], discards: [], stats: { w: 0, l: 0, a: 0 } },
    'Bbb': { name: 'Bbb', hand: [], discards: [], stats: { w: 0, l: 0, a: 0 } },
    'Ccc': { name: 'Ccc', hand: [], discards: [], stats: { w: 0, l: 0, a: 0 } },
    'Ddd': { name: 'Ddd', hand: [], discards: [], stats: { w: 0, l: 0, a: 0 } }
  },
  lastGame: { win: '-', lose: '-' },
  kartuTerpilihId: null,
  fase: 'ambil' // 'ambil' atau 'buang'
};

// Inisialisasi Game saat halaman dimuat
function initGame() {
  const deck = kocokDeck(buatDeck());
  
  // Jika game sebelumnya sudah selesai, naikkan round saat Main Lagi
  if (gameState.status === 'ended') {
    gameState.round += 1;
  }
  
  gameState.turnOrder.forEach(name => {
    gameState.players[name].hand = deck.splice(0, 4);
    gameState.players[name].discards = [];
  });
  
  gameState.deck = deck;
  gameState.status = 'playing';
  gameState.kartuTerpilihId = null;
  gameState.fase = 'ambil';

  // Sembunyikan OpenCardArea dan Overlay Menang saat game baru dimulai
  document.getElementById('endGameCenter').classList.add('hidden');
  document.getElementById('btnMainLagi').classList.add('hidden');
  document.getElementById('btnKeluar').classList.add('hidden');

  ['A', 'B', 'C', 'D'].forEach(pos => {
    const openArea = document.getElementById(`openArea${pos}`);
    if (openArea) openArea.innerHTML = ''; // Kosongkan kartu terbuka
  });

  render();
  cekGiliranBot();
}

// ============================================================
// RENDER UI UTAMA
// ============================================================
function render() {
  const currentPlayer = gameState.turnOrder[gameState.turnIndex];
  const isMyTurn = (currentPlayer === 'Aaa');
  const myHand = gameState.players['Aaa'].hand;

  // 1. Panel Atas
  document.getElementById('roomCode').textContent = gameState.roomCode;
  document.getElementById('roundNum').textContent = gameState.round;
  document.getElementById('currentTurnName').textContent = currentPlayer;
  document.getElementById('deckCount').textContent = gameState.deck.length;
  document.getElementById('deckSisa').textContent = gameState.deck.length;

  let totalTerbuang = 0;
  let statsHtml = '';
  gameState.turnOrder.forEach(name => {
    const p = gameState.players[name];
    totalTerbuang += p.discards.length;
    statsHtml += `<li>${name} | W: ${p.stats.w} L: ${p.stats.l}</li>`;
  });
  document.getElementById('playerStats').innerHTML = statsHtml;
  document.getElementById('discardCount').textContent = totalTerbuang;

  // Update Statistik W, L, A ke HTML Top Panel
  const mapKey = { 'Aaa': 'A', 'Bbb': 'B', 'Ccc': 'C', 'Ddd': 'D' };
  gameState.turnOrder.forEach(name => {
    const key = mapKey[name];
    const stat = gameState.players[name].stats;
    
    const elW = document.getElementById(`w-${key}`);
    const elL = document.getElementById(`l-${key}`);
    const elA = document.getElementById(`a-${key}`);
    
    if (elW) elW.textContent = `W: ${stat.w}`;
    if (elL) elL.textContent = `L: ${stat.l}`;
    if (elA) elA.textContent = `A: ${stat.a}`;
  });

  // Update Last Game Info
  const elLastGame = document.getElementById('lastGameInfo');
  if (elLastGame) {
    const lastWin = gameState.lastGame?.win || '-';
    const lastAman = gameState.lastGame?.aman || '-';
    const lastLose = gameState.lastGame?.lose || '-';
    elLastGame.innerHTML = `Win: ${lastWin}<br>Aman: ${lastAman}<br>Lose: ${lastLose}`;
  }

  // 2. Indikator Giliran Nama Pemain
  ['A', 'B', 'C', 'D'].forEach(pos => {
    const nameMap = { 'A': 'Aaa', 'B': 'Bbb', 'C': 'Ccc', 'D': 'Ddd' };
    const pName = nameMap[pos];
    const elName = document.getElementById(`name${pos}`);
    if (elName) {
      elName.textContent = pName;
      elName.className = `seat-name ${currentPlayer === pName ? 'active-turn' : 'inactive'}`;
    }
  });

  // 3. Tangan Lawan (B, C, D) & Tumpukan Kartu Belakang
  ['B', 'C', 'D'].forEach(pos => {
    const nameMap = { 'B': 'Bbb', 'C': 'Ccc', 'D': 'Ddd' };
    const pName = nameMap[pos];
    const count = gameState.players[pName].hand.length;
    const handElId = pos === 'B' ? 'handBbb' : pos === 'C' ? 'handCcc' : 'handDdd';
    
    const handContainer = document.getElementById(handElId);
    if (handContainer) {
      handContainer.innerHTML = Array(count).fill(`<img src="img/back.png" class="card-img">`).join('');
    }
  });

// 4. Tumpukan Buangan (Discard Grids per arah) & Tombol Ambil
  // Aturan: Kamu (Aaa) hanya boleh mengambil dari tumpukan pemain sebelummu (Ddd / Kiri)
  const mappingPosisiBuang = { 'A': 'Aaa', 'B': 'Bbb', 'C': 'Ccc', 'D': 'Ddd' };
  
  ['A', 'B', 'C', 'D'].forEach(pos => {
    const pName = mappingPosisiBuang[pos];
    const discards = gameState.players[pName].discards;
    const discardGrid = document.querySelector(`.pile-discard-${pos} .discard-grid`);
    
    // Aturan ketat: Giliran saya + Fase Ambil + Posisi D (Kiri) + Ada kartunya
    const bolehAmbilDiscard = isMyTurn && gameState.fase === 'ambil' && myHand.length === 4 && pos === 'D' && discards.length > 0;
    
    if (discardGrid) {
      discardGrid.innerHTML = discards.map((k, index) => {
        // HANYA kartu terakhir (teratas) yang mendapat kelas 'active-discard'
        const isLatest = index === discards.length - 1;
        const activeClass = (isLatest && bolehAmbilDiscard) ? 'active-discard' : '';
        return `<img src="img/${k.file}" class="card-img ${activeClass}">`;
      }).join('');
    }

    const btnAmbil = document.querySelector(`.pile-discard-${pos} .btn-ambil`);
    const pileContainer = document.querySelector(`.pile-discard-${pos}`);
    
    if (btnAmbil && pileContainer) {
      // Kosongkan inline-style agar kontrol diserahkan kembali ke CSS (Hover effect)
      btnAmbil.style.display = ''; 
      pileContainer.classList.toggle('active-draw', bolehAmbilDiscard);
      btnAmbil.onclick = bolehAmbilDiscard ? () => ambilKartuDariDiscard(pName) : null;
    }
  });

  // 5. Deck Tengah
  const bolehAmbilDeck = isMyTurn && gameState.fase === 'ambil' && myHand.length === 4 && gameState.deck.length > 0;
  const deckPile = document.getElementById('deckPile');
  const btnAmbilDeck = document.getElementById('btnAmbilDeck');
  
  if (btnAmbilDeck && deckPile) {
    btnAmbilDeck.style.display = ''; // Kosongkan inline-style agar hover jalan
    deckPile.classList.toggle('active-draw', bolehAmbilDeck);
    btnAmbilDeck.onclick = bolehAmbilDeck ? ambilKartuDariDeck : null;
  }

  // 6. Tangan Sendiri (Aaa) & Panel Skor
  renderTanganSaya(myHand, isMyTeurtBaru => {
    // callback ketika kartu dipilih/dibuang
  });
}

// ============================================================
// RENDER TANGAN & PANEL SKOR KAMU
// ============================================================
function renderTanganSaya(hand, isMyTurn) {
  const myHandEl = document.getElementById('myHand');
  myHandEl.innerHTML = '';
  
  if (hand.length === 4) gameState.fase = 'ambil';
  if (hand.length === 5) gameState.fase = 'buang';

  const bolehBuang = isMyTurn && gameState.fase === 'buang';

  hand.forEach((kartu, index) => {
    const wrap = document.createElement('div');
    wrap.className = `card-wrap ${bolehBuang ? 'pilihable' : ''} ${kartu.id === gameState.kartuTerpilihId ? 'selected' : ''}`;
    wrap.style.position = 'relative';

    const img = document.createElement('img');
    img.src = `img/${kartu.file}`;
    img.className = 'card-img';

    const btnBuang = document.createElement('button');
    btnBuang.className = 'action-btn btn-buang';
    btnBuang.textContent = 'Buang';

    if (bolehBuang) {
      img.onclick = () => {
        gameState.kartuTerpilihId = gameState.kartuTerpilihId === kartu.id ? null : kartu.id;
        render();
      };
      btnBuang.onclick = (e) => {
        e.stopPropagation();
        buangKartuSaya(index);
      };
    }

    wrap.appendChild(img);
    wrap.appendChild(btnBuang);
    myHandEl.appendChild(wrap);
  });

  // Perhitungan Skor Live
  const hasilSkor = kalkulasiSkorDetail(hand);
  
  document.getElementById('scoreCards').innerHTML = hasilSkor.rincian.map(k => 
    `<span style="color: ${k.warna}; font-weight: bold;">${k.label || k.nama}</span>`
  ).join(' | ');

  document.getElementById('scoreCalc').innerHTML = hasilSkor.rincian.map(k => {
    const op = k.operator ? `${k.operator} ` : '';
    return `<span style="color: ${k.warna};">${op}${k.nilaiAbsolut}</span>`;
  }).join(' ');

  const totalEl = document.getElementById('scoreTotal');
  totalEl.textContent = hasilSkor.total;
  totalEl.style.color = hasilSkor.total < 0 ? 'var(--btn-red)' : 'var(--ink-dark)';
}

// ============================================================
// AKSI PEMAIN (AMBIL & BUANG)
// ============================================================
function ambilKartuDariDeck() {
  if (gameState.deck.length === 0) return cekDeckHabis();
  const kartu = gameState.deck.pop();
  gameState.players['Aaa'].hand.push(kartu);
  gameState.fase = 'buang';
  render();
}

function ambilKartuDariDiscard(targetPlayerName) {
  const discards = gameState.players[targetPlayerName].discards;
  if (discards.length === 0) return;
  const kartu = discards.pop();
  gameState.players['Aaa'].hand.push(kartu);
  gameState.fase = 'buang';
  render();
}

function buangKartuSaya(index) {
  gameState.kartuTerpilihId = null;
  const hand = gameState.players['Aaa'].hand;
  const [dibuang] = hand.splice(index, 1);
  gameState.players['Aaa'].discards.push(dibuang);

  // Cek Checkmate
  if (cekCheckmate(hand)) {
    selesaikanGame('Aaa', 'checkmate');
  } else if (gameState.deck.length === 0) {
    cekDeckHabis();
  } else {
    gameState.fase = 'ambil';
    pindahGiliranBerikutnya();
  }
}

// ============================================================
// LOGIKA BOT BERGERAK OTOMATIS
// ============================================================
function cekGiliranBot() {
  const currentPlayer = gameState.turnOrder[gameState.turnIndex];
  if (currentPlayer !== 'Aaa' && gameState.status === 'playing') {
    // Beri jeda 1.5 detik agar terasa natural seperti bot sedang berpikir
    setTimeout(() => {
      jalankanAksiBot(currentPlayer);
    }, 1500);
  }
}

function jalankanAksiBot(botName) {
  if (gameState.status !== 'playing') return;
  
  const botHand = gameState.players[botName].hand;

  // 1. Bot Ambil Kartu (Prioritas dari deck jika ada)
  if (gameState.deck.length > 0) {
    botHand.push(gameState.deck.pop());
  } else {
    cekDeckHabis();
    return;
  }

  render();

  // 2. Bot Berpikir untuk Membuang 1 Kartu setelah 1 detik
  setTimeout(() => {
    if (gameState.status !== 'playing') return;

    // AI Sederhana: Buang kartu bernilai paling kecil atau acak dari 5 kartu tangannya
    const randomIndex = Math.floor(Math.random() * botHand.length);
    const [dibuang] = botHand.splice(randomIndex, 1);
    gameState.players[botName].discards.push(dibuang);

    // Cek apakah bot menang Checkmate
    if (cekCheckmate(botHand)) {
      selesaikanGame(botName, 'checkmate');
    } else if (gameState.deck.length === 0) {
      cekDeckHabis();
    } else {
      pindahGiliranBerikutnya();
    }
  }, 1000);
}

function pindahGiliranBerikutnya() {
  gameState.turnIndex = (gameState.turnIndex + 1) % gameState.turnOrder.length;
  gameState.fase = 'ambil';
  render();
  cekGiliranBot();
}

// ============================================================
// GAME OVER & SHOWDOWN
// ============================================================
function cekDeckHabis() {
  // Cari pemain dengan skor tertinggi jika deck habis
  let pemenang = 'Aaa';
  let skorTertinggi = -999;

  gameState.turnOrder.forEach(name => {
    const skor = kalkulasiSkorDetail(gameState.players[name].hand).total;
    if (skor > skorTertinggi) {
      skorTertinggi = skor;
      pemenang = name;
    }
  });

  selesaikanGame(pemenang, 'deck-habis');
}

function selesaikanGame(namaPemenang, alasan) {
  gameState.status = 'ended';

  // Hitung skor akhir semua pemain
  const skorPemain = gameState.turnOrder.map(name => {
    return {
      name: name,
      skor: kalkulasiSkorDetail(gameState.players[name].hand).total
    };
  });

  // Urutkan dari skor terkecil ke terbesar
  skorPemain.sort((a, b) => a.skor - b.skor);

  const namaKalah = skorPemain[0].name; // Poin terkecil mutlak kalah (L)
  const pemainAman = skorPemain.slice(1).filter(p => p.name !== namaPemenang).map(p => p.name); // 2 pemain di tengah berstatus Aman (A)

  // Update Statistik W, L, A
  gameState.players[namaPemenang].stats.w += 1;
  gameState.players[namaKalah].stats.l += 1;
  pemainAman.forEach(nama => {
    gameState.players[nama].stats.a += 1;
  });

  gameState.lastGame = {
    win: namaPemenang,
    aman: pemainAman.join(', '),
    lose: namaKalah
  };

  renderShowdown(namaPemenang, alasan);
}

function renderShowdown(pemenang, alasan) {
  document.getElementById('endGameCenter').classList.remove('hidden');
  document.getElementById('winnerName').textContent = pemenang;

  document.getElementById('btnMainLagi').classList.remove('hidden');
  document.getElementById('btnKeluar').classList.remove('hidden');

  // Buka semua kartu pemain di OpenArea tengah meja HANYA saat game berakhir
  const mappingPosisi = { 'A': 'Aaa', 'B': 'Bbb', 'C': 'Ccc', 'D': 'Ddd' };
  
  Object.keys(mappingPosisi).forEach(pos => {
    const pName = mappingPosisi[pos];
    const hand = gameState.players[pName].hand;
    const elOpenArea = document.getElementById(`openArea${pos}`);
    if (elOpenArea) {
      elOpenArea.innerHTML = hand.map(k => `<img src="img/${k.file}" class="card-img">`).join('');
    }
  });
}

// Tombol Main Lagi & Keluar di Overlay
document.getElementById('btnMainLagi').onclick = () => {
  document.getElementById('endGameCenter').classList.add('hidden');
  document.getElementById('btnMainLagi').classList.add('hidden');
  document.getElementById('btnKeluar').classList.add('hidden');
  initGame();
};

document.getElementById('btnKeluar').onclick = () => {
  window.location.href = 'index.html'; // Kembali ke lobby/menu
};

// Jalankan game saat skrip dimuat
initGame();