const inputNama = document.getElementById('inputNama');
const lawanMode = document.getElementById('lawanMode');
const btnMulai = document.getElementById('btnMulai');
const inputKode = document.getElementById('inputKode');
const btnGabung = document.getElementById('btnGabung');
const errorMsg = document.getElementById('errorMsg');
const gameMode = document.getElementById('gameMode');

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.classList.remove('hidden');
}

function generateRoomCode() {
  return Math.floor(1000 + Math.random() * 9000).toString(); 
}

btnMulai.addEventListener('click', () => {
  const nama = inputNama.value.trim();
  if (!nama) return showError('Nama kamu wajib diisi!');

  localStorage.setItem('playerName', nama);
  localStorage.setItem('gameMode', gameMode.value);
  localStorage.setItem('isHost', 'true'); 

  if (lawanMode.value === 'bot') {
    window.location.href = `checkmate.html?room=9999`;
  } else {
    const newRoomCode = generateRoomCode();
    // Host masuk ke ruang tunggu dulu
    window.location.href = `room.html?room=${newRoomCode}`;
  }
});

btnGabung.addEventListener('click', () => {
  const nama = inputNama.value.trim();
  const kode = inputKode.value.trim();

  if (!nama) return showError('Nama kamu wajib diisi!');
  if (kode.length !== 4 || isNaN(kode)) return showError('Kode room harus 4 digit angka!');

  localStorage.setItem('playerName', nama);
  localStorage.setItem('gameMode', gameMode.value);
  localStorage.setItem('isHost', 'false'); 
  
  // Masuk ke ruang tunggu berdasar kode
  window.location.href = `room.html?room=${kode}`;
});