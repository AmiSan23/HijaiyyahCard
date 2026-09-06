import { io } from "https://cdn.socket.io/4.7.4/socket.io.esm.min.js";

const socket = io();
const playerName = localStorage.getItem('playerName') || 'Pemain';
const isHost = localStorage.getItem('isHost') === 'true';
const roomCode = new URLSearchParams(window.location.search).get('room');

if (!roomCode) window.location.href = 'index.html';

document.getElementById('displayCode').textContent = roomCode;

const waitingList = document.getElementById('waitingList');
const btnMulaiGame = document.getElementById('btnMulaiGame');
const infoStatus = document.getElementById('infoStatus');

// Gabung ke room khusus waiting list
socket.emit('join-waiting-room', { kode: roomCode, nama: playerName, isHost });

socket.on('gagal-join', (msg) => {
  alert(msg);
  window.location.href = 'index.html';
});

// Update daftar pemain secara real-time
socket.on('update-waiting-list', (data) => {
  waitingList.innerHTML = data.players.map((p, idx) => 
    `<li class="player-item"><span>${idx + 1}. ${p.nama}</span> <span style="color: var(--ink-light);">${p.isHost ? '(Host)' : ''}</span></li>`
  ).join('');

  if (isHost) {
    if (data.players.length >= 1) {
      btnMulaiGame.classList.remove('hidden');
      infoStatus.textContent = `Pemain terkumpul: ${data.players.length}/4. Kursi kosong akan diisi Bot.`;
    }
  } else {
    infoStatus.textContent = `Menunggu Host (${data.hostName}) memulai permainan...`;
  }
});

// Perintah server untuk pindah ke papan game
socket.on('mulai-masuk-game', () => {
  window.location.href = `checkmate.html?room=${roomCode}`;
});

if (isHost) {
  btnMulaiGame.addEventListener('click', () => {
    socket.emit('host-mulai-game', roomCode);
  });
}