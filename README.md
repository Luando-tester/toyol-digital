# 🧟 Toyol Digital

**Status v0.1: radar peluang berganjaran. BUKAN mesin yang sudah memperoleh duit.**

Toyol menyemak [suapan terbuka Jobbi](https://jobbi.org/gigs.json) secara berkala, mengasingkan tugasan untuk agen digital yang mengiklankan ganjaran USD/USDC, dan menyenarai pendek sehingga lapan calon. Ia menapis petunjuk deposit, staking, referral, yuran dan posting media sosial.

Jika ada calon, Toyol membuka atau mengemas kini satu **GitHub Issue** supaya hasil tidak hilang. Semua penyenaraian ialah *petunjuk sahaja* dan perlu disahkan di sumber asal.

## Operasi

- **Tugas automatik**: [Toyol Radar (RM0)](../../actions/workflows/toyol.yml), dijadualkan pada minit 17 setiap jam (UTC), tertakluk pada kelewatan GitHub Actions.
- **Hasil imbasan**: Actions → run → Summary. Jika ada calon, semak tab Issues.
- **Ujian**: Node.js terbina dalam, tanpa pakej pihak ketiga: `node --test`.
- **Trigger manual**: Actions → Toyol Radar (RM0) → Run workflow.
- **Kod**: `src/toyol.mjs`; jadual: `.github/workflows/toyol.yml`.

Sumber data ialah [Jobbi](https://jobbi.org/docs/mcp/), indeks read-only, bukan pihak yang menerima tugasan atau membayar. Hanya mengakses feed awamnya setiap jam. Tugasan asal mungkin perlukan akaun, kredit, deposit, perkakasan, atau kelulusan lain yang tidak ditangkap penapis automatik.

## Sempadan Toyol

- **Modal tunai RM0**: tiada langganan, transaksi, staking, iklan atau kredit API berbayar.
- **Tiada tuntutan palsu**: ganjaran diiklankan ≠ tugasan dituntut ≠ kerja selesai ≠ kerja diterima ≠ wang dibayar ≠ wang dikeluarkan.
- **Tiada tindakan kewangan**: tidak cipta dompet, tidak mendaftar bagi pihak pengguna, tidak membuat bayaran atau memindah dana.
- **Tiada spam/penyamaran**: tidak berbalas atau menghantar kerja secara rawak; tidak menjalankan kod daripada kandungan tugasan.
- **Pemisahan penuh**: repositori ini sahaja; MYReady dan projek lain tidak disentuh.
- **Public**: jangan simpan token API, kata laluan, private key atau data peribadi dalam repositori ini.

## Tahap 2: pelaksana kerja kod terhad (v0.2)

Toyol kini menjalankan `src/worker.mjs` selepas radar setiap jam. Ia boleh **mencuba pembaikan kod kecil yang dinyatakan secara tepat**, contohnya menamakan semula satu identifier (`Rename oldProp to newProp`) dalam projek sumber terbuka yang mempunyai isu bounty sebenar. Ia:

1. Membaca feed radar tanpa membuat panggilan Jobbi kedua.
2. Menapis arahan penamaan semula yang jelas sahaja; bukan tugasan bebas yang memerlukan pertimbangan AI.
3. Memeriksa isu asal masih terbuka, belum diberikan kepada pihak lain, tidak ramai pesaing, dan mempunyai label ganjaran.
4. Memuat turun kod awam ke komputer sementara GitHub; **tidak melaksanakan kod asing**.
5. Menghasilkan pembetulan kecil dalam fail sumber yang dibenarkan dan memeriksa `git diff --check`.
6. Jika berjaya, menyimpan `solution.patch` serta `manifest.json` sebagai artifact pada halaman GitHub Actions.

Jika tiada tugas sesuai, ia melaporkan tiada penyelesaian, bukannya mereka-reka kerja atau pendapatan. **Patch automatik belum sama dengan kerja yang benar-benar diuji menyeluruh, diserahkan, diterima atau dibayar.** Tiada penghantaran PR ke repo orang lain, sebarang tuntutan bounty, pendaftaran, token atau pemindahan dana.

Untuk melihat keputusan sebenar: Actions → Toyol Radar and Stage 2 (RM0) → run terbaru → Job summary dan Artifacts (jika ada).

## Apa yang belum ada

Toyol **belum berjaya menyelesaikan tugasan luar yang diterima sebagai kerja siap**, belum mempunyai saluran bayaran, dan belum menghasilkan pendapatan. Tahap 2 sekarang hanya menyokong pembentukan patch automatik bagi kelas kerja kod yang sempit; ia tidak menganggap patch sebagai tugasan selesai. Untuk benar-benar berpendapatan, perlu dipilih kelas kerja kecil yang membenarkan automasi, dengan kos sebenar sifar dan kaedah payout sah di Malaysia. Hanya selepas kitaran pembayaran pertama terbukti barulah wajar mengautomasikan pengulangan tugasan itu.

Jika imbasan gagal, lihat log pada Actions. GitHub Actions mungkin lewat atau menghentikan jadual selepas tempoh repositori awam tidak aktif. Sekiranya terma pelan percuma berubah, hentikan pelaksanaan dan jangan beralih kepada pelan berbayar tanpa kebenaran.
