// ============================================================
// Kartu Hijaiyyah - Cards & Game Logic
// Checkmate 101: 4 suits × 28 huruf
// ============================================================

export const SUITS = [
  { id: 'Ft', nama: 'Fathah',   warna: '#378ADD' },
  { id: 'Ks', nama: 'Kasrah',   warna: '#E0A82E' },
  { id: 'Dm', nama: 'Dhommah',  warna: '#B24A24' },
  { id: 'Sk', nama: 'Sukun',    warna: '#6B6A64' },
];


export const HURUF = [
  { value: 1,  file: '1',     nama: 'Hamzah',      "ft": 'Ã' , "ks": 'Ĩ', "dm": 'Ũ', "sk": '~' },
  { value: 2,  file: '2',     nama: 'Ta Marbutah',  "ft": 'Hta' , "ks": 'Hti', "dm": 'Htu', "sk": 'Ht' },
  { value: 3,  file: '3',     nama: 'Dal',          "ft": 'Da' , "ks": 'Di', "dm": 'Du', "sk": 'D' },
  { value: 4,  file: '4',     nama: 'Dzal',         "ft": 'Dza' , "ks": 'Dzi', "dm": 'Dzu', "sk": 'Dz' },
  { value: 5,  file: '5',     nama: 'Ra',           "ft": 'Ro' , "ks": 'Ri', "dm": 'Ru', "sk": 'R' },
  { value: 6,  file: '6',     nama: 'Zay',          "ft": 'Za' , "ks": 'Zi', "dm": 'Zu', "sk": 'Z' },
  { value: 7,  file: '7',     nama: 'Jim',          "ft": 'Ja' , "ks": 'Ji', "dm": 'Ju', "sk": 'J' },
  { value: 8,  file: '8',     nama: 'Ha',           "ft": 'Ha' , "ks": 'Hi', "dm": 'Hu', "sk": 'H' },
  { value: 9,  file: '9',     nama: 'Wau',          "ft": 'Wa' , "ks": 'Wi', "dm": 'Wu', "sk": 'W' },
  { value: 10, file: '10',    nama: 'Fa',           "ft": 'Fa' , "ks": 'Fi', "dm": 'Fu', "sk": 'F' },
  { value: 11, file: '11',    nama: 'Mim',          "ft": 'Ma' , "ks": 'Mi', "dm": 'Mu', "sk": 'M' },
  { value: 12, file: '12',    nama: 'Kaf',          "ft": 'Ka' , "ks": 'Ki', "dm": 'Ku', "sk": 'K' },
  { value: 13, file: '13',    nama: 'Lam',          "ft": 'La' , "ks": 'Li', "dm": 'Lu', "sk": 'L' },
  { value: 14, file: '14',    nama: 'Tha',          "ft": 'Tho' , "ks": 'Thi', "dm": 'Thu', "sk": 'Th' },
  { value: 15, file: '15',    nama: 'Zha',          "ft": 'Zho' , "ks": 'Zhi', "dm": 'Zhu', "sk": 'Zh' },
  { value: 16, file: '16',    nama: 'Shad',         "ft": 'Sho' , "ks": 'Shi', "dm": 'Shu', "sk": 'Sh' },
  { value: 17, file: '17',    nama: 'Dhad',         "ft": 'Dho' , "ks": 'Dhi', "dm": 'Dhu', "sk": 'Dh' },
  { value: 18, file: '18',    nama: 'Sin',          "ft": 'Sa' , "ks": 'Si', "dm": 'Su', "sk": 'S' },
  { value: 19, file: '19',    nama: 'Syin',         "ft": 'Sya' , "ks": 'Syi', "dm": 'Syu', "sk": 'Sy' },
  { value: 20, file: '20',    nama: 'Ya',           "ft": 'Ya' , "ks": 'Yi', "dm": 'Yu', "sk": 'Y' },
  { value: 21, file: '21',    nama: 'Ba',           "ft": 'Ba' , "ks": 'Bi', "dm": 'Bu', "sk": 'B' },
  { value: 22, file: '22',    nama: 'Nun',          "ft": 'Na' , "ks": 'Ni', "dm": 'Nn', "sk": 'Nn' },
  { value: 23, file: '23',    nama: 'Ta',           "ft": 'Ta' , "ks": 'Ti', "dm": 'Ta', "sk": 'Ta' },
  { value: 24, file: '24',    nama: 'Tsa',          "ft": 'Tsa' , "ks": 'Tsi', "dm": 'Ts', "sk": 'Ts' },
  { value: 25, file: '25',    nama: 'Haa',          "ft": 'Ĥaa', "ks": 'Ĥii', "dm": 'Ĥuu', "sk": 'Ĥ' },
  { value: 26, file: 'Qof',    nama: "Qaf",         "ft": "Qof" , "ks": 'Qi', "dm": 'Qu', "sk": 'Q' },
  { value: 25, file: 'Ghain', nama: 'Ghain',        "ft": 'Gho' , "ks": 'Ghi', "dm": 'Ghu', "sk": 'Gh' },
  { value: 25, file: 'Kho',   nama: 'Kha',          "ft": 'Kho' , "ks": 'Khi', "dm": 'Khu', "sk": 'Kh' },
  { value: 26, file: 'As',   nama: "'Ain",          "ft": "Á" , "ks": 'Í', "dm": 'Ú', "sk": "'" },
];

// ============================================================
// DECK
// ============================================================

export function buatDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const huruf of HURUF) {
      deck.push({
        id:      `${suit.id}_${huruf.file}`,
        suit:    suit.id,
        value:   huruf.value,
        nama:    huruf.nama,
        label:   huruf.label,
        warna:   suit.warna,
        file:    `${suit.id}_${huruf.file}.png`,
      });
    }
  }
  return deck; // 4 × 29 = 116 kartu
}

export function kocokDeck(deck) {
  const hasil = [...deck];
  for (let i = hasil.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [hasil[i], hasil[j]] = [hasil[j], hasil[i]];
  }
  return hasil;
}

// ============================================================
// CHECKMATE DETECTION
// Checkmate = 4 kartu, suit sama, total value = 101
// ============================================================

export function cekCheckmate(hand) {
  if (!hand || hand.length !== 4) return false;
  const suitSama = hand.every(k => k.suit === hand[0].suit);
  if (!suitSama) return false;
  const total = hand.reduce((a, k) => a + k.value, 0);
  return total === 101;
}

// ============================================================
// SCORING
// Majority suit (by total value) → PLUS
// Other suits                       → MINUS
// ============================================================

export function hitungSkor(hand) {
  if (!hand || hand.length === 0) return 0;
  const { total } = kalkulasiSkorDetail(hand);
  return total;
}

export function kalkulasiSkorDetail(hand) {
  if (!hand || hand.length === 0) return { total: 0, rincian: [] };

  // 1. Suit dengan total value terbesar = main suit
  const poinPerSuit = {};
  hand.forEach(k => {
    poinPerSuit[k.suit] = (poinPerSuit[k.suit] || 0) + k.value;
  });

  let mainSuit = hand[0].suit;
  let maxPoin = 0;
  for (const [suit, poin] of Object.entries(poinPerSuit)) {
    if (poin > maxPoin) {
      maxPoin = poin;
      mainSuit = suit;
    }
  }

  // 2. Rincian plus/minus
  let totalSkor = 0;
  const rincian = hand.map(kartu => {
    const isMain = kartu.suit === mainSuit;
    const nilaiFinal = isMain ? kartu.value : -kartu.value;
    totalSkor += nilaiFinal;

    return {
      ...kartu,
      isMain,
      operator: isMain ? '+' : '-',
      nilaiAbsolut: kartu.value,
    };
  });

  return { total: totalSkor, rincian };
}
