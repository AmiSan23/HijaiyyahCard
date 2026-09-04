import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, get, set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

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

const inputNama = document.getElementById('inputNama');
const inputKode = document.getElementById('inputKode');
const btnBuat = document.getElementById('btnBuat');
const btnGabung = document.getElementById('btnGabung');
const errorMsg = document.getElementById('errorMsg');
const gameMode = document.getElementById('gameMode');

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.classList.remove('hidden');
}

btnBuat.addEventListener('click', async () => {
  const nama = inputNama.value.trim();
  if (!nama) return showError('Isi nama kamu dulu!');

  btnBuat.disabled = true;
  btnBuat.textContent = 'Membuat...';

  const roomCode = Math.floor(1000 + Math.random() * 9000).toString();
  const roomRef = ref(db, `rooms/${roomCode}`);
  
  // Inisialisasi struktur room di Firebase
  await set(roomRef, {
    status: 'waiting',
    host: nama,
    mode: gameMode.value,
    players: {
      [nama]: { score: 0, status: 'online' }
    }
  });

  localStorage.setItem('playerName', nama);
  localStorage.setItem('isHost', 'true');
  window.location.href = `${gameMode.value}.html?room=${roomCode}`;
});

btnGabung.addEventListener('click', async () => {
  const nama = inputNama.value.trim();
  const kode = inputKode.value.trim();

  if (!nama) return showError('Isi nama kamu dulu!');
  if (kode.length !== 4) return showError('Kode room harus 4 digit!');

  btnGabung.disabled = true;
  btnGabung.textContent = 'Mengecek...';

  const roomRef = ref(db, `rooms/${kode}`);
  const snapshot = await get(roomRef);

  if (!snapshot.exists()) {
    btnGabung.disabled = false;
    btnGabung.textContent = 'Gabung';
    return showError('Room tidak ditemukan!');
  }

  const roomData = snapshot.val();
  if (roomData.status !== 'waiting') {
    btnGabung.disabled = false;
    btnGabung.textContent = 'Gabung';
    return showError('Game sudah dimulai atau selesai!');
  }

  const playerCount = Object.keys(roomData.players || {}).length;
  if (playerCount >= 4) {
    btnGabung.disabled = false;
    btnGabung.textContent = 'Gabung';
    return showError('Room sudah penuh (Maksimal 4 pemain)!');
  }

  localStorage.setItem('playerName', nama);
  localStorage.setItem('isHost', 'false');
  window.location.href = `${roomData.mode}.html?room=${kode}`;
});