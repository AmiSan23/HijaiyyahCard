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

// 28 huruf unik dengan value 1–28
// File naming: angka 1–25 → PNG `Ft_1.png` … `Ft_25.png`
//               26         → PNG `Ft_As.png`    ('Ain)
//               27         → PNG `Ft_Ghain.png`
//               28         → PNG `Ft_Kho.png`
//               29         → PNG `Ft_Qof.png`
export const HURUF = [
  { value: 1,  file: '1',     nama: 'Hamzah',      label: 'Hm'  },
  { value: 2,  file: '2',     nama: 'Ta Marbutah',  label: 'Tm'  },
  { value: 3,  file: '3',     nama: 'Dal',          label: 'Dl'  },
  { value: 4,  file: '4',     nama: 'Dzal',         label: 'Dz'  },
  { value: 5,  file: '5',     nama: 'Ra',           label: 'Ra'  },
  { value: 6,  file: '6',     nama: 'Zay',          label: 'Zy'  },
  { value: 7,  file: '7',     nama: 'Jim',          label: 'Jm'  },
  { value: 8,  file: '8',     nama: 'Ha',           label: 'Ha'  },
  { value: 9,  file: '9',     nama: 'Wau',          label: 'Wu'  },
  { value: 10, file: '10',    nama: 'Fa',           label: 'Fa'  },
  { value: 11, file: '11',    nama: 'Mim',          label: 'Mm'  },
  { value: 12, file: '12',    nama: 'Kaf',          label: 'Kf'  },
  { value: 13, file: '13',    nama: 'Lam',          label: 'Lm'  },
  { value: 14, file: '14',    nama: 'Tha',          label: 'Th'  },
  { value: 15, file: '15',    nama: 'Zha',          label: 'Zh'  },
  { value: 16, file: '16',    nama: 'Shad',         label: 'Sh'  },
  { value: 17, file: '17',    nama: 'Dhad',         label: 'Dh'  },
  { value: 18, file: '18',    nama: 'Sin',          label: 'Sn'  },
  { value: 19, file: '19',    nama: 'Syin',         label: 'Sy'  },
  { value: 20, file: '20',    nama: 'Ya',           label: 'Ya'  },
  { value: 21, file: '21',    nama: 'Ba',           label: 'Ba'  },
  { value: 22, file: '22',    nama: 'Nun',          label: 'Nn'  },
  { value: 23, file: '23',    nama: 'Ta',           label: 'Ta'  },
  { value: 24, file: '24',    nama: 'Tsa',          label: 'Ts'  },
  { value: 25, file: '25',    nama: 'Haa',          label: 'Huu' },
  { value: 26, file: 'As',    nama: "'Ain",         label: "U'"  },
  { value: 27, file: 'Ghain', nama: 'Ghain',        label: 'Gh'  },
  { value: 28, file: 'Kho',   nama: 'Kha',          label: 'Kh'  },
  { value: 29, file: 'Qof',   nama: 'Qaf',          label: 'Qf'  },
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
