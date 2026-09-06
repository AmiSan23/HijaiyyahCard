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

// Fungsi pembuat kode acak 4 digit
function generateRoomCode() {
  return Math.floor(1000 + Math.random() * 9000).toString(); 
}

// Aksi: Buat Room Baru (Host)
btnMulai.addEventListener('click', () => {
  const nama = inputNama.value.trim() || 'Pemain';
  localStorage.setItem('playerName', nama);
  localStorage.setItem('gameMode', gameMode.value);
  localStorage.setItem('lawanMode', lawanMode.value);
  
  // Pembuat room adalah Host
  localStorage.setItem('isHost', 'true'); 

  if (lawanMode.value === 'bot') {
    // Mode Bot: Selalu gunakan room 9999
    window.location.href = `checkmate.html?room=9999`;
  } else {
    // Mode Online: Buat kode 4 digit baru
    const newRoomCode = generateRoomCode();
    window.location.href = `checkmate.html?room=${newRoomCode}`;
  }
});

// Aksi: Gabung Room Teman (Joiner)
btnGabung.addEventListener('click', () => {
  const nama = inputNama.value.trim() || 'Pemain';
  const kode = inputKode.value.trim();

  if (kode.length !== 4 || isNaN(kode)) {
    return showError('Kode room harus 4 digit angka!');
  }

  localStorage.setItem('playerName', nama);
  localStorage.setItem('gameMode', gameMode.value);
  localStorage.setItem('lawanMode', 'online');
  
  // Yang bergabung bukan Host
  localStorage.setItem('isHost', 'false'); 
  
  window.location.href = `checkmate.html?room=${kode}`;
});