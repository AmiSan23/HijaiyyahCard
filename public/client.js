// client.js (Terhubung ke checkmate.html)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, onValue, update, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// 1. Konfigurasi Firebase (Ambil dari Project Settings di Firebase Console)
const firebaseConfig = {
  apiKey: "API_KEY_KAMU",
  authDomain: "PROJECT_ID.firebaseapp.com",
  databaseURL: "https://PROJECT_ID-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "PROJECT_ID",
  storageBucket: "PROJECT_ID.appspot.com",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 2. Ambil data identitas pemain dari URL dan LocalStorage
const urlParams = new URLSearchParams(window.location.search);
const roomCode = urlParams.get('room');
const myName = localStorage.getItem('playerName');
const isHost = localStorage.getItem('isHost') === 'true';

// Jika pemain nyasar langsung ke link tanpa nama, tendang balik ke index
if (!roomCode || !myName) {
  window.location.href = 'index.html';
}

// Update UI statis dengan info pemain
document.getElementById('roomCode').textContent = roomCode;
document.getElementById('nameA').textContent = myName; // Asumsi 'A' selalu pemain lokal di UI kamu

// 3. Referensi ke database room ini
const roomRef = ref(db, `rooms/${roomCode}`);

// 4. Logika Host vs Guest
if (isHost) {
  // Jika dia yang buat room, siapkan struktur awal database
  set(roomRef, {
    status: 'waiting', // waiting, playing, ended
    round: 1,
    turn: myName,
    players: {
      [myName]: { score: 0, status: 'online' }
    },
    // Nanti deck dan discard pile dimasukkan ke sini
  });
} else {
  // Jika dia gabung, tambahkan namanya ke daftar pemain
  update(ref(db, `rooms/${roomCode}/players`), {
    [myName]: { score: 0, status: 'online' }
  });
}

// 5. Listener: Membaca perubahan dari Firebase secara Real-time
onValue(roomRef, (snapshot) => {
  const data = snapshot.val();
  if (data) {
    renderGame(data); // Fungsi untuk memperbarui tampilan UI berdasarkan data Firebase
  }
});

function renderGame(data) {
  // Logic untuk mapping data JSON dari Firebase ke ID elemen HTML kamu
  // (Misalnya memutar urutan pemain lawan di seat B, C, D)
  console.log("Data room terupdate:", data);
}