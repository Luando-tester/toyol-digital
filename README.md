# 🧟 Toyol Digital

**Status v0.4: radar, pelaksana terhad dan log status berterusan. BELUM menghasilkan pendapatan.**

Toyol menyemak [suapan terbuka Jobbi](https://jobbi.org/gigs.json) secara berkala, mengasingkan tugasan untuk agen digital yang mengiklankan ganjaran USD/USDC, dan menyenarai pendek sehingga lapan calon. Ia menapis petunjuk deposit, staking, referral, yuran dan posting media sosial.

Jika ada calon, Toyol membuka atau mengemas kini satu **GitHub Issue** supaya hasil tidak hilang. Bahagian **Quest Progress** pada Issue #1 menyatakan pencetus sebenar, bilangan calon khusus, sebab penolakan dan pendapatan yang disahkan. Semua penyenaraian ialah *petunjuk sahaja* dan perlu disahkan di sumber asal.

## Operasi

- **Tugas automatik**: [Toyol Radar (RM0)](../../actions/workflows/toyol.yml), dijadualkan pada minit 23 dan 53 setiap jam (UTC), kira-kira setiap 30 minit. Pemicu cron masih perlu dibuktikan dengan rekod sebenar; push run sahaja bukan bukti jadual berjalan, tertakluk pada kelewatan GitHub Actions.
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

## Tahap 2: pelaksana kerja kod terhad (v0.3)

Toyol kini menjalankan `src/worker.mjs` selepas setiap imbasan radar. Ia boleh **mencuba pembaikan kod kecil yang dinyatakan secara tepat**, contohnya menamakan semula satu identifier (`Rename oldProp to newProp`) dalam projek sumber terbuka yang mempunyai isu bounty sebenar. Ia:

1. Membaca feed radar tanpa membuat panggilan Jobbi kedua.
2. Memahami tiga kelas arahan yang spesifik: nama semula identifier, penggantian prop JSX boolean tertentu, dan pembetulan typo dokumentasi. Bukan tugasan terbuka yang memerlukan pertimbangan AI.
3. Memeriksa isu asal masih terbuka, belum diberikan kepada pihak lain, tidak ramai pesaing, tidak mempunyai tanda tuntutan dalam komen, tidak mempunyai pull request pesaing yang dipautkan, dan mempunyai label ganjaran.
4. Memuat turun kod awam ke komputer sementara GitHub; **tidak melaksanakan kod asing**.
5. Menghasilkan pembetulan kecil dalam fail sumber yang dibenarkan dan memeriksa `git diff --check`.
6. Jika berjaya, menyimpan `solution.patch` serta `manifest.json` sebagai artifact pada halaman GitHub Actions. Untuk setiap imbasan, fail `scan-result.json` merekod bilangan calon dan sebab penolakan.

Jika tiada tugas sesuai, ia melaporkan tiada penyelesaian, bukannya mereka-reka kerja atau pendapatan. **Patch automatik belum sama dengan kerja yang benar-benar diuji menyeluruh, diserahkan, diterima atau dibayar.** Tiada penghantaran PR ke repo orang lain, sebarang tuntutan bounty, pendaftaran, token atau pemindahan dana.

Untuk melihat keputusan sebenar: Actions → Toyol Radar and Stage 2 (RM0) → run terbaru → Job summary dan Artifacts (jika ada).

## Audit operasi (8 November 2026)

- Semua ujian terakhir: **19/19 lulus** dalam GitHub Actions.
- Sumber tunggal masih suapan Jobbi, dengan saringan baharu untuk membuang tajuk kosong atau tidak boleh ditindak.
- Pelaksanaan workflow terakhir yang disahkan ialah **push**, bukan **schedule**. GitHub boleh melambatkan atau menggugurkan cron, maka kebolehpercayaan jadual **belum terbukti**.
- Imbasan terakhir: satu calon berkaitan pembetulan kod tetapi ditolak kerana isu sudah bersaing. **0 patch untuk tugasan luar, 0 penerimaan, RM0 diterima.**
- Jadual telah didaftarkan semula melalui perubahan cron. Pantau dalam Actions sama ada run dengan event **schedule** muncul. Jangan anggap aktif hanya kerana ujian **push** hijau.

## Apa yang belum ada

Toyol **belum berjaya menyelesaikan tugasan luar yang diterima sebagai kerja siap**, belum mempunyai saluran bayaran, dan belum menghasilkan pendapatan. Tahap 2 sekarang hanya menyokong tiga pembetulan kecil yang ditentukan oleh pola teks serta penolakan tugas bersaing; ia tidak menggunakan model AI berbayar; ia tidak menganggap patch sebagai tugasan selesai. Untuk benar-benar berpendapatan, perlu dipilih kelas kerja kecil yang membenarkan automasi, dengan kos sebenar sifar dan kaedah payout sah di Malaysia. Hanya selepas kitaran pembayaran pertama terbukti barulah wajar mengautomasikan pengulangan tugasan itu.

Jika imbasan gagal, lihat log pada Actions. GitHub Actions mungkin lewat atau menghentikan jadual selepas tempoh repositori awam tidak aktif. Sekiranya terma pelan percuma berubah, hentikan pelaksanaan dan jangan beralih kepada pelan berbayar tanpa kebenaran.
