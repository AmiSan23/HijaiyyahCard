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

btnMulai.addEventListener('click', () => {
  const nama = inputNama.value.trim() || 'Aaa';
  localStorage.setItem('playerName', nama);
  localStorage.setItem('gameMode', gameMode.value);
  localStorage.setItem('lawanMode', lawanMode.value);

  if (lawanMode.value === 'bot') {
    // Langsung masuk ke game vs 3 bot yang sudah kita buat
    window.location.href = `checkmate.html?room=9999`;
  } else {
    showError('Fitur Multiplayer Online segera hadir!');
  }
});

btnGabung.addEventListener('click', () => {
  const nama = inputNama.value.trim() || 'Aaa';
  const kode = inputKode.value.trim();

  if (kode.length !== 4) {
    return showError('Kode room harus 4 digit!');
  }

  localStorage.setItem('playerName', nama);
  localStorage.setItem('gameMode', gameMode.value);
  localStorage.setItem('lawanMode', 'online');
  
  // Nanti diarahkan ke room online
  showError('Koneksi online belum diaktifkan.');
});