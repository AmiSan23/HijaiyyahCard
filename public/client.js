// game.js
// Script ini didesain statis (bisa jalan di GitHub Pages).
// Untuk multiplayer sungguhan, gantilah manipulasi 'gameState' dengan 
// Firebase Realtime Database: firebase.database().ref('rooms/' + roomId).on('value', snap => render(snap.val()))

const gameState = {
  giliran: 'Aaa',
  fase: 'ambil', // 'ambil' (pilih deck/discard) atau 'buang' (pilih kartu di tangan)
  deckSisa: 88,
  kartuTerbuang: [], // Array nama file kartu ex: ['kha_25.png', 'dal_17.png']
  tanganSaya: ['ain_A.png', 'khu_1.png', 'haa_9.png', 'huu_25.png'], // 4 kartu awal
  status: 'playing' // 'playing' atau 'ended'
};

// Elements
const myHandEl = document.getElementById('myHand');
const discardGridEl = document.getElementById('discardGrid');
const deckPileEl = document.getElementById('deckPile');
const discardPileEl = document.querySelector('.pile-discard');
const btnAmbilDeck = document.getElementById('btnAmbilDeck');
const btnAmbilDiscard = document.getElementById('btnAmbilDiscard');
const centerArea = document.getElementById('centerArea');
const endGameCenter = document.getElementById('endGameCenter');
const nameAaa = document.getElementById('nameAaa');

// Inisialisasi awal
function init() {
  // Simulasi tumpukan buangan awal (misal sudah ada 12 kartu)
  for(let i=0; i<12; i++) {
    gameState.kartuTerbuang.push('back.png');
  }
  render();
}

function render() {
  // 1. Render Tangan Saya
  myHandEl.innerHTML = '';
  gameState.tanganSaya.forEach((imgSrc, index) => {
    const cardWrap = document.createElement('div');
    cardWrap.style.position = 'relative'; // Parent untuk nempel tombol buang
    
    const img = document.createElement('img');
    img.src = `img/${imgSrc}`;
    img.className = 'card-img';
    
    const btnBuang = document.createElement('button');
    btnBuang.className = 'action-btn btn-buang';
    btnBuang.textContent = 'Buang';
    
    // Interaksi: Border ungu aktif saat klik kartu sendiri[cite: 4]
    img.onclick = () => {
      if (gameState.fase === 'buang' && gameState.giliran === 'Aaa') {
        // Hapus ungu dari kartu lain
        document.querySelectorAll('.my-cards .card-img').forEach(el => el.classList.remove('selected'));
        document.querySelectorAll('.my-cards .btn-buang').forEach(el => el.style.display = 'none');
        
        // Aktifkan ungu di kartu ini dan munculkan tombol buang[cite: 4]
        img.classList.add('selected');
        btnBuang.style.display = 'block';
      }
    };

    // Tombol buang muncul saat klik kartu aktif, klik tombol = buang kartu[cite: 4]
    btnBuang.onclick = (e) => {
      e.stopPropagation();
      buangKartu(index);
    };

    cardWrap.appendChild(img);
    cardWrap.appendChild(btnBuang);
    myHandEl.appendChild(cardWrap);
  });

  // 2. Render Tumpukan Buangan (Discard Grid)
  discardGridEl.innerHTML = '';
  gameState.kartuTerbuang.forEach((imgSrc) => {
    const img = document.createElement('img');
    img.src = `img/${imgSrc}`;
    img.className = 'card-img';
    discardGridEl.appendChild(img);
  });

  document.getElementById('discardCount').textContent = gameState.kartuTerbuang.length;
  document.getElementById('deckSisa').textContent = gameState.deckSisa;

  // 3. Logika Hijau / Indikator Giliran
  if (gameState.giliran === 'Aaa' && gameState.status === 'playing') {
    nameAaa.classList.add('active-turn');
    nameAaa.classList.remove('inactive');
    
    if (gameState.fase === 'ambil') {
      // Border hijau aktif di tumpukan/buangan saat giliran ambil[cite: 4]
      deckPileEl.classList.add('active-draw');
      discardPileEl.classList.add('active-draw');
    } else {
      // Border hijau nonaktif saat kartu sudah terambil[cite: 4]
      deckPileEl.classList.remove('active-draw');
      discardPileEl.classList.remove('active-draw');
    }
  } else {
    nameAaa.classList.remove('active-turn');
    nameAaa.classList.add('inactive');
    deckPileEl.classList.remove('active-draw');
    discardPileEl.classList.remove('active-draw');
  }

  // 4. Mode Game Over
  if (gameState.status === 'ended') {
    // Semua kartu buangan dan tumpukan hilang dari meja[cite: 4]
    centerArea.classList.add('hidden');
    // Muncul WIN & Main Lagi / Keluar[cite: 4]
    endGameCenter.classList.remove('hidden');
    
    // Asumsi: Semua kartu pemain terbuka, bisa dirender ulang di fungsi ini dengan image asli
  } else {
    centerArea.classList.remove('hidden');
    endGameCenter.classList.add('hidden');
  }
}

// Aksi Ambil Kartu
btnAmbilDeck.onclick = () => {
  if(gameState.fase === 'ambil' && gameState.giliran === 'Aaa') {
    gameState.deckSisa--;
    gameState.tanganSaya.push('back.png'); // Simulasi dapat kartu
    gameState.fase = 'buang';
    render();
  }
};

btnAmbilDiscard.onclick = () => {
  if(gameState.fase === 'ambil' && gameState.giliran === 'Aaa' && gameState.kartuTerbuang.length > 0) {
    const kartu = gameState.kartuTerbuang.pop();
    gameState.tanganSaya.push(kartu);
    gameState.fase = 'buang';
    render();
  }
};

// Aksi Buang Kartu
function buangKartu(index) {
  const kartu = gameState.tanganSaya.splice(index, 1)[0];
  gameState.kartuTerbuang.push(kartu);
  
  // Selesai giliran, pindah ke pemain lain atau cek end game
  // Simulasi game over jika sisa deck 0
  if (gameState.deckSisa <= 80) { // Angka kecil untuk testing cepat
    gameState.status = 'ended';
  } else {
    gameState.fase = 'ambil'; // Reset fase
    // Di aplikasi nyata: gameState.giliran = 'Bbb'; (pindah giliran)
  }
  render();
}

document.getElementById('btnMainLagi').onclick = () => location.reload();
document.getElementById('btnKeluar').onclick = () => alert('Kembali ke Lobby');

init();