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

## Apa yang belum ada

Toyol v0.1 **belum menuntut atau menyelesaikan tugasan, belum mempunyai saluran bayaran, dan belum menghasilkan pendapatan**. Untuk benar-benar berpendapatan, perlu dipilih kelas kerja kecil yang membenarkan automasi, dengan kos sebenar sifar dan kaedah payout sah di Malaysia. Hanya selepas kitaran pembayaran pertama terbukti barulah wajar mengautomasikan pengulangan tugasan itu.

Jika imbasan gagal, lihat log pada Actions. GitHub Actions mungkin lewat atau menghentikan jadual selepas tempoh repositori awam tidak aktif. Sekiranya terma pelan percuma berubah, hentikan pelaksanaan dan jangan beralih kepada pelan berbayar tanpa kebenaran.
