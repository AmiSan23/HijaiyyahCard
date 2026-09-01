// Definisi lengkap kartu. Nama file gambar mengikuti pola:
// {KodeSuit}_{file}.png  ->  contoh: Ft_1.png, Dm_Ghain.png, Sk_As.png, back.png

const SUITS = [
  { id: 'Ft', nama: 'Fathah', warna: '#378ADD' },
  { id: 'Ks', nama: 'Kasrah', warna: '#E0A82E' },
  { id: 'Dm', nama: 'Dhommah', warna: '#B24A24' },
  { id: 'Sk', nama: 'Sukun', warna: '#6B6A64' },
];

// 29 huruf per suit, sesuai urutan & nilai yang sudah difinalkan.
// Ha ringan kebagian angka polos "25" (didesain kayak kartu 10 di remi),
// sementara Ghain/Kho/Qof yang juga bernilai 25 dibedakan pakai nama huruf.
const HURUF = [
  { value: 1, file: '1', nama: 'Hamzah' },
  { value: 2, file: '2', nama: 'Ta Marbutah' },
  { value: 3, file: '3', nama: 'Dal' },
  { value: 4, file: '4', nama: 'Dzal' },
  { value: 5, file: '5', nama: 'Ra' },
  { value: 6, file: '6', nama: 'Zay' },
  { value: 7, file: '7', nama: 'Jim' },
  { value: 8, file: '8', nama: 'Ha' },
  { value: 9, file: '9', nama: 'Wau' },
  { value: 10, file: '10', nama: 'Fa' },
  { value: 11, file: '11', nama: 'Mim' },
  { value: 12, file: '12', nama: 'Kaf' },
  { value: 13, file: '13', nama: 'Lam' },
  { value: 14, file: '14', nama: 'Tha' },
  { value: 15, file: '15', nama: 'Zha' },
  { value: 16, file: '16', nama: 'Shad' },
  { value: 17, file: '17', nama: 'Dhad' },
  { value: 18, file: '18', nama: 'Sin' },
  { value: 19, file: '19', nama: 'Syin' },
  { value: 20, file: '20', nama: 'Ya' },
  { value: 21, file: '21', nama: 'Ba' },
  { value: 22, file: '22', nama: 'Nun' },
  { value: 23, file: '23', nama: 'Ta' },
  { value: 24, file: '24', nama: 'Tsa' },
  { value: 25, file: '25', nama: 'Haa' },
  { value: 25, file: 'Ghain', nama: 'Ghain' },
  { value: 25, file: 'Qof', nama: 'Qaf' },
  { value: 25, file: 'Kho', nama: 'Kha' },
  { value: 26, file: 'As', nama: "'Ain" },
];

function buatDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const huruf of HURUF) {
      deck.push({
        id: `${suit.id}_${huruf.file}`,
        suit: suit.id,
        value: huruf.value,
        nama: huruf.nama,
        file: `${suit.id}_${huruf.file}.png`,
      });
    }
  }
  return deck; // 4 x 29 = 116 kartu
}

function kocokDeck(deck) {
  const hasil = [...deck];
  for (let i = hasil.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [hasil[i], hasil[j]] = [hasil[j], hasil[i]];
  }
  return hasil;
}

// Checkmate 101: 4 kartu, satu suit/harakat yang sama, total nilai = 101
// (satu-satunya cara: 'Ain(26) + 3 dari 4 kartu bernilai 25)
function cekCheckmate(hand) {
  if (!hand || hand.length !== 4) return false;
  const suitSama = hand.every((k) => k.suit === hand[0].suit);
  if (!suitSama) return false;
  const total = hand.reduce((a, k) => a + k.value, 0);
  return total === 101;
}

// Skor buat panel langsung & fallback pas deck habis: jumlah polos 4 kartu,
// TIDAK butuh se-harakat lagi (beda dari Checkmate 101 yang tetap wajib se-harakat + pas 101).
function hitungSkor(hand) {
  if (!hand || hand.length === 0) return 0;
  return hand.reduce((a, k) => a + k.value, 0);
}

module.exports = { SUITS, HURUF, buatDeck, kocokDeck, cekCheckmate, hitungSkor };
