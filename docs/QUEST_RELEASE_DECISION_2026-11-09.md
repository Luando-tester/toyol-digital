# Keputusan keluaran Toyol — 9 November 2026

**Keluaran: v0.9 QUEST-READY (limited). Bukan income-ready.**

## Bukti yang benar-benar diperiksa

1. Radar GitHub Actions telah mencatat sekurang-kurangnya tiga run dengan `event=schedule` dan keputusan `success`. Contoh: [run #42543601402](https://github.com/ilhamraduanbis-source/toyol-digital/actions/runs/42543601402).
2. Model rasmi Qwen2.5-Coder 3B Q4_K_M dipromosikan sebagai enjin harian, dimuat turun tanpa API berbayar, dan disahkan SHA256 menggunakan `724fb256bec1ff062b2f65e4569e871ad2e95ab2a3989723d1769c54294730b7`. [Run #42566050523](https://github.com/ilhamraduanbis-source/toyol-digital/actions/runs/42566050523) berjaya.
3. Ujian fungsi bebas di dalam Docker tanpa rangkaian: **2/3 lulus** (deduplicate dan slug), pagination gagal. Ini latihan terkawal; bukan prestasi bounty luar yang diterima.
4. Dalam run sama, jambatan quest AI menyemak **5 isu luar sebenar**, semuanya ditolak sebelum penghasilan patch:
   - `ProKelly/mychart#1` — tanda tuntutan/cubaan terdahulu.
   - `tscircuit/pcb-viewer#163` — persaingan terlalu tinggi (84 komen ketika disemak).
   - `coollabsio/coolify#8266` — repositori melebihi had kerja Toyol dan bukan bukti escrow yang cukup.
   - `speakers-in-tech/conference-data#11` — persaingan terlalu tinggi (55 komen).
   - `speakers-in-tech/conference-data#10` — persaingan terlalu tinggi (61 komen).
5. Carian tambahan mengesan isu yang mempunyai ganjaran tidak dapat disahkan atau sudah diselesaikan: `anooeg100-gif/digital-store#1` meminta typo di README yang tiada, `streamr-labs/streamr#43` sudah ada PR #108, dan `ClankerNation/OpenAgents#140` meminta pendedahan arahan sistem; isu seperti itu **tidak boleh diterima** sebagai quest.
6. **Patch bounty luar: 0. PR luar: 0. Kerja diterima: 0. Pendapatan disahkan: RM0.** Bukti ini bukan bukti sistem memperoleh wang.

## Keputusan pembangunan

- **Bekukan penambahan kemahiran** sehingga ada satu masalah luaran yang jelas, dibenarkan oleh syarat platform, berpotensi dibayar dan boleh diuji.
- Gunakan Qwen 3B sebagai model harian untuk **penilaian dan draf**, bukan penghantaran, tuntutan, pendaftaran atau urusan pembayaran automatik.
- Penapis kelayakan diteruskan. Jika isu sudah diselesaikan, pesaing sudah mengusahakannya, atau tiada bukti dana/payout, Toyol wajib menolak. Jangan mencipta kerja palsu demi mengisi laporan.
- **Kejayaan teknikal seterusnya:** satu patch asli untuk isu luaran yang belum diselesaikan, dengan bukti ujian sebenar yang relevan.
- **Kejayaan komersial seterusnya:** penerimaan bertulis oleh pemilik/pemberi ganjaran, kemudian rekod ganjaran credited, kemudian pengeluaran MYR yang terbukti.
- Saluran payout dan KYC penerima memerlukan penglibatan manusia. Tiada ejen yang dibenarkan memalsukan pengesahan identiti.

## Keputusan semakan 16 November 2026

Tarikh ini ialah **tarikh membuat keputusan**, bukan janji wang akan masuk. Periksa bukti sejak hari ini. Jika masih tiada patch luar yang sah untuk diberi kepada penaja, **hentikan peluasan bounty hunting** dan nilaikan semula model perniagaan; jangan ulang latihan atau tambah skill tanpa permintaan yang terbukti. Jadual GitHub adalah cubaan terbaik dan tidak menjamin setiap run berlaku tepat pada waktunya.

**Pemisahan projek:** hanya `toyol-digital`; tidak menyentuh MYReady Work A/Work B.
