import { io } from "https://cdn.socket.io/4.7.4/socket.io.esm.min.js";
import { kalkulasiSkorDetail } from './cards.js';

const socket = io();
const myName = localStorage.getItem('playerName') || 'Pemain';
const isHost = localStorage.getItem('isHost') === 'true';
const roomCode = new URLSearchParams(window.location.search).get('room');

if (!roomCode) window.location.href = 'index.html';

let myId = null;
let serverState = null;
let kartuTerpilihId = null;
let modeBuang = false;

// 1. Hubungkan ke Server
// 1. Hubungkan ke Server
socket.on('connect', () => {
  myId = socket.id;
  socket.emit('join-room', { kode: roomCode, nama: myName });
});

socket.on('gagal-join', (msg) => {
  alert(msg);
  window.location.href = 'index.html';
});

// 2. Ruang Tunggu (Waiting Room)
socket.on('waiting-room', (data) => {
  document.getElementById('roomCode').textContent = roomCode;
  
  // Tampilkan tombol mulai hanya untuk Host jika belum dimulai
  if (data.isHost) {
    const btnMulai = document.getElementById('btnMulaiHost');
    btnMulai.classList.remove('hidden');
    btnMulai.onclick = () => {
      btnMulai.classList.add('hidden');
      socket.emit('mulai-main');
    };
  }
});

// 3. Render State Permainan
socket.on('game-state', (state) => {
  serverState = state;
  document.getElementById('endGameCenter').classList.add('hidden');
  document.getElementById('btnMainLagi').classList.add('hidden');
  
  // Bersihkan OpenCardArea jika baru mulai
  ['A', 'B', 'C', 'D'].forEach(pos => {
    const openArea = document.getElementById(`openArea${pos}`);
    if (openArea) openArea.innerHTML = '';
  });

  renderMeja();
});

function renderMeja() {
  const st = serverState;
  if (!st || !st.turnOrder) return;

  const isMyTurn = st.turnId === myId;
  modeBuang = isMyTurn && st.myHand.length === 5;
  const modeAmbil = isMyTurn && st.myHand.length === 4;

  // Render informasi Room Code dari server
  document.getElementById('roomCode').textContent = st.roomCode; // <-- Tambahkan baris ini
  document.getElementById('roundNum').textContent = st.round;
  document.getElementById('deckCount').textContent = st.deckCount;
  document.getElementById('deckSisa').textContent = st.deckCount;
  
  if (st.lastGame) {
    document.getElementById('lastGameInfo').innerHTML = 
      `Win: ${st.lastGame.win}<br>Aman: ${st.lastGame.aman}<br>Lose: ${st.lastGame.lose}`;
  }

  // Tentukan Posisi Meja berdasarkan urutan turnOrder dari Server
  const myIndex = st.turnOrder.indexOf(myId);
  // Jika kamu belum masuk turnOrder (misal penonton/belum sinkron), default index 0
  const validIndex = myIndex !== -1 ? myIndex : 0;

  const posisi = {
    'A': st.turnOrder[validIndex],                          // Bawah (Kamu)
    'B': st.turnOrder[(validIndex + 1) % 4],                // Kanan
    'C': st.turnOrder[(validIndex + 2) % 4],                // Atas
    'D': st.turnOrder[(validIndex + 3) % 4]                 // Kiri
  };

  let statsHtml = '';
  let totalDiscard = 0;

  // Render Setiap Posisi Berdasarkan Server Data
  Object.keys(posisi).forEach(pos => {
    const pid = posisi[pos];
    const pData = st.players[pid];
    if (!pData) return;

    // Statistik Top Panel (Menampilkan nama asli pemain dari server)
    totalDiscard += pData.discards.length;
    statsHtml += `<li>${pData.name} | <span id="w-${pos}">W: ${pData.stats.w}</span> | <span id="l-${pos}">L: ${pData.stats.l}</span> | <span id="a-${pos}">A: ${pData.stats.a}</span></li>`;

    // Indikator Giliran Nama di Kursi Meja
    const elName = document.getElementById(`name${pos}`);
    if (elName) {
      elName.textContent = pData.name;
      elName.className = `seat-name ${st.turnId === pid ? 'active-turn' : 'inactive'}`;
      if (st.turnId === pid) {
        const elTurnName = document.getElementById('currentTurnName');
        if (elTurnName) elTurnName.textContent = pData.name;
      }
    }

    // Render Tangan Lawan Belakang (B, C, D)
    if (pos !== 'A') {
      const targetId = pos === 'B' ? 'handBbb' : pos === 'C' ? 'handCcc' : 'handDdd';
      const handContainer = document.getElementById(targetId);
      if (handContainer) {
        handContainer.innerHTML = Array(pData.handCount).fill(`<img src="img/back.png" class="card-img">`).join('');
      }
    }

    // Render Discards
    const discardGrid = document.querySelector(`.pile-discard-${pos} .discard-grid`);
    const bolehAmbilDiscard = modeAmbil && pos === 'D' && pData.discards.length > 0;

    if (discardGrid) {
      discardGrid.innerHTML = pData.discards.map((k, idx) => {
        const isLatest = idx === pData.discards.length - 1;
        const activeClass = (isLatest && bolehAmbilDiscard) ? 'active-discard' : '';
        return `<img src="img/${k.file}" class="card-img ${activeClass}">`;
      }).join('');
    }

    const btnAmbilDiscard = document.querySelector(`.pile-discard-${pos} .btn-ambil`);
    const pileDiscard = document.querySelector(`.pile-discard-${pos}`);
    if (btnAmbilDiscard && pileDiscard) {
      btnAmbilDiscard.style.display = '';
      pileDiscard.classList.toggle('active-draw', bolehAmbilDiscard);
      btnAmbilDiscard.onclick = bolehAmbilDiscard ? () => socket.emit('ambil-discard', pid) : null;
    }
  });

  const elPlayerStats = document.getElementById('playerStats');
  if (elPlayerStats) elPlayerStats.innerHTML = statsHtml;
  
  const elDiscardCount = document.getElementById('discardCount');
  if (elDiscardCount) elDiscardCount.textContent = totalDiscard;

  // Deck Tengah
  const btnAmbilDeck = document.getElementById('btnAmbilDeck');
  const deckPile = document.getElementById('deckPile');
  const bolehAmbilDeck = modeAmbil && st.deckCount > 0;
  
  if (deckPile) {
    deckPile.classList.toggle('active-draw', bolehAmbilDeck);
    // Seluruh kotak deck bisa langsung diklik saat gilirannya mengambil kartu
    deckPile.style.cursor = bolehAmbilDeck ? 'pointer' : 'default';
    deckPile.onclick = bolehAmbilDeck ? () => socket.emit('ambil-deck') : null;
  }
  
  if (btnAmbilDeck) {
    btnAmbilDeck.style.display = bolehAmbilDeck ? 'block' : 'none';
    btnAmbilDeck.onclick = bolehAmbilDeck ? (e) => {
      e.stopPropagation();
      socket.emit('ambil-deck');
    } : null;
  }

  if (st.myHand) {
    renderTanganSaya(st.myHand);
  }
}

function renderTanganSaya(hand) {
  const myHandEl = document.getElementById('myHand');
  myHandEl.innerHTML = '';

  hand.forEach((kartu, index) => {
    const wrap = document.createElement('div');
    wrap.className = `card-wrap ${modeBuang ? 'pilihable' : ''} ${kartu.id === kartuTerpilihId ? 'selected' : ''}`;
    
    const img = document.createElement('img');
    img.src = `img/${kartu.file}`;
    img.className = 'card-img';

    const btnBuang = document.createElement('button');
    btnBuang.className = 'action-btn btn-buang';
    btnBuang.textContent = 'Buang';

    if (modeBuang) {
      img.onclick = () => {
        kartuTerpilihId = kartuTerpilihId === kartu.id ? null : kartu.id;
        renderMeja();
      };
      btnBuang.onclick = (e) => {
        e.stopPropagation();
        kartuTerpilihId = null;
        socket.emit('buang-kartu', index);
      };
    }

    wrap.appendChild(img);
    wrap.appendChild(btnBuang);
    myHandEl.appendChild(wrap);
  });

  // Kalkulasi UI Skor Personal
  const hasil = kalkulasiSkorDetail(hand);
  document.getElementById('scoreCards').innerHTML = hasil.rincian.map(k => `<span style="color: ${k.warna}; font-weight: bold;">${k.label || k.nama}</span>`).join(' | ');
  document.getElementById('scoreCalc').innerHTML = hasil.rincian.map(k => `<span style="color: ${k.warna};">${k.operator ? `${k.operator} ` : ''}${k.nilaiAbsolut}</span>`).join(' ');
  const tot = document.getElementById('scoreTotal');
  tot.textContent = hasil.total;
  tot.style.color = hasil.total < 0 ? 'var(--btn-red)' : 'var(--ink-dark)';
}

// 4. Resolusi Akhir Permainan
socket.on('game-ended', (data) => {
  document.getElementById('endGameCenter').classList.remove('hidden');
  document.getElementById('winnerName').textContent = data.win;
  
  if (isHost) {
    const btnLagi = document.getElementById('btnMainLagi');
    btnLagi.classList.remove('hidden');
    btnLagi.onclick = () => socket.emit('mulai-main');
  }
  
  document.getElementById('btnKeluar').classList.remove('hidden');
  document.getElementById('btnKeluar').onclick = () => window.location.href = 'index.html';

  // Buka kartu pemain di tengah
  const myIndex = serverState.turnOrder.indexOf(myId);
  const posisi = {
    'A': myId, 'B': serverState.turnOrder[(myIndex + 1) % 4],
    'C': serverState.turnOrder[(myIndex + 2) % 4], 'D': serverState.turnOrder[(myIndex + 3) % 4]
  };

  Object.keys(posisi).forEach(pos => {
    const pId = posisi[pos];
    const hand = data.allHands[pId];
    const openArea = document.getElementById(`openArea${pos}`);
    if (openArea && hand) openArea.innerHTML = hand.map(k => `<img src="img/${k.file}" class="card-img">`).join('');
  });
});