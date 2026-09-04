// lobby.js
const inputNama = document.getElementById('inputNama');
const inputKode = document.getElementById('inputKode');
const btnBuat = document.getElementById('btnBuat');
const btnGabung = document.getElementById('btnGabung');
const errorMsg = document.getElementById('errorMsg');
const gameMode = document.getElementById('gameMode');

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.style.display = 'block';
}

// Buat Room Baru
btnBuat.addEventListener('click', () => {
  const nama = inputNama.value.trim();
  if (!nama) return showError('Isi nama kamu dulu!');

  // Bikin kode acak 4 digit
  const roomCode = Math.floor(1000 + Math.random() * 9000).toString();
  
  // Simpan data diri ke memori browser
  localStorage.setItem('playerName', nama);
  localStorage.setItem('isHost', 'true');

  // Lempar ke halaman game sesuai mode yang dipilih
  const mode = gameMode.value; // "checkmate"
  window.location.href = `${mode}.html?room=${roomCode}`;
});

// Gabung Room yang Ada
btnGabung.addEventListener('click', () => {
  const nama = inputNama.value.trim();
  const kode = inputKode.value.trim();

  if (!nama) return showError('Isi nama kamu dulu!');
  if (kode.length !== 4) return showError('Kode room harus 4 digit!');

  localStorage.setItem('playerName', nama);
  localStorage.setItem('isHost', 'false');

  const mode = gameMode.value; 
  window.location.href = `${mode}.html?room=${kode}`;
});