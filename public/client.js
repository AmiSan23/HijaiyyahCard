// client.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, onValue, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { buatDeck, kocokDeck, kalkulasiSkorDetail } from './cards.js';

const firebaseConfig = {
  apiKey: "AIzaSyBfwN2QDz-MiwBEpt9tv9KXhDrNAaUE71c",
  authDomain: "hijaiyyahcard.firebaseapp.com",
  projectId: "hijaiyyahcard",
  storageBucket: "hijaiyyahcard.firebasestorage.app",
  messagingSenderId: "927126787805",
  appId: "1:927126787805:web:ace6f351c7918452abed34"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Data Lokal Sementara (Nantinya diambil dari URL/Lobby)
const myName = localStorage.getItem('playerName') || 'Pemain_1';
const roomCode = new URLSearchParams(window.location.search).get('room') || '1234';
const isHost = localStorage.getItem('isHost') === 'true';

// ---- Binding Elemen DOM HTML ----
const elRoomCode = document.getElementById('roomCode');
const elCurrentTurn = document.getElementById('currentTurnName');
const elDeckCount = document.getElementById('deckCount');
const elDeckSisa = document.getElementById('deckSisa');
const elDiscardCount = document.getElementById('discardCount');
const elPlayerStats = document.getElementById('playerStats');

const myHandEl = document.getElementById('myHand');
const nameAEl = document.getElementById('nameA');
const nameBEl = document.getElementById('nameB');
const nameCEl = document.getElementById('nameC');
const nameDEl = document.getElementById('nameD');

// Elemen Panel Skor
const scoreCardsEl = document.getElementById('scoreCards');
const scoreCalcEl = document.getElementById('scoreCalc');
const scoreTotalEl = document.getElementById('scoreTotal');

// Tulis info statis awal
elRoomCode.textContent = roomCode;
nameAEl.textContent = myName;

// Referensi Firebase
const roomRef = ref(db, `rooms/${roomCode}`);

// ---- Logika Host: Setup Game Awal ----
if (isHost && !localStorage.getItem('gameStarted')) {
  const deck = kocokDeck(buatDeck());
  // Simulasi pembagian kartu untuk tester lokal
  const tanganAwal = deck.splice(0, 4); 
  
  set(roomRef, {
    status: 'playing',
    round: 1,
    turnOrder: [myName, 'Pemain_2', 'Pemain_3', 'Pemain_4'], // Contoh statis
    turnIndex: 0,
    deck: deck,
    discardPile: [],
    players: {
      [myName]: { hand: tanganAwal, discards: [], stats: {w:0, l:0} }
    }
  });
  localStorage.setItem('gameStarted', 'true');
}

// ---- Listener Realtime Firebase ----
onValue(roomRef, (snapshot) => {
  const data = snapshot.val();
  if (!data) return;

  renderGame(data);
});

// ---- Fungsi Utama: Render UI berdasarkan Data Firebase ----
function renderGame(data) {
  // 1. Update Panel Atas
  const currentPlayer = data.turnOrder[data.turnIndex];
  elCurrentTurn.textContent = currentPlayer;
  elDeckCount.textContent = data.deck ? data.deck.length : 0;
  elDeckSisa.textContent = data.deck ? data.deck.length : 0;
  
  // Hitung total discards
  let totalTerbuang = data.discardPile ? data.discardPile.length : 0;
  elDiscardCount.textContent = totalTerbuang;

  // 2. Render Tangan Saya (Player A)
  const myData = data.players[myName];
  if (myData && myData.hand) {
    renderMyHandAndScore(myData.hand);
  }

  // 3. Indikator Giliran Hijau
  document.querySelectorAll('.seat-name').forEach(el => el.classList.remove('active-turn', 'inactive'));
  nameAEl.classList.add(currentPlayer === myName ? 'active-turn' : 'inactive');
  // (Nanti tambahkan logika untuk seat B, C, D sesuai nama mereka di data.turnOrder)
}

function renderMyHandAndScore(hand) {
  // Render Kartu Visual
  myHandEl.innerHTML = '';
  hand.forEach((kartu, index) => {
    const img = document.createElement('img');
    img.src = `img/${kartu.file}`;
    img.className = 'card-img';
    // Event listener buang kartu bisa ditempel disini
    img.onclick = () => console.log('Pilih kartu:', kartu.nama);
    myHandEl.appendChild(img);
  });

  // Kalkulasi Skor dengan aturan Plus/Minus
  const hasilSkor = kalkulasiSkorDetail(hand);
  
  // Render Baris 1: Label Kartu dengan Warnanya
  scoreCardsEl.innerHTML = hasilSkor.rincian.map(k => 
    `<span style="color: ${k.warna}; font-weight: bold;">${k.label}</span>`
  ).join(' | ');

  // Render Baris 2: Kalkulasi Angka (26 + 25 - 25)
  let calcString = hasilSkor.rincian.map(k => {
    const op = k.operator ? `${k.operator} ` : '';
    return `<span style="color: ${k.warna};">${op}${k.nilaiAbsolut}</span>`;
  }).join(' ');
  scoreCalcEl.innerHTML = calcString;

  // Render Baris 3: Total Akhir
  scoreTotalEl.textContent = hasilSkor.total;
  
  // Jika minus, beri warna merah pada totalnya
  scoreTotalEl.style.color = hasilSkor.total < 0 ? 'var(--btn-red)' : 'var(--ink-dark)';
}