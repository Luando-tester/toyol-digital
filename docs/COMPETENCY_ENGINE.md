# Toyol Competency Engine — 9 November 2026

**Status: dasar penilaian kompetensi telah dibina dan diuji. Kompetensi praktikal untuk memenangi bounty belum dibuktikan. Pendapatan RM0.**

## Masalah reka bentuk asal

Sistem asal menganggap jumlah komen yang tinggi, komen `/claim`, dan pull request (PR) pesaing sebagai sebab automatik menolak sesuatu isu. Ini mencampuradukkan **persaingan** dengan **ketidaklayakan**. Komen ramai tidak membuktikan penyelesaian pesaing sudah betul atau diterima.

## Keputusan baharu

| Keputusan | Makna | Tindakan |
|---|---|---|
| `TRY_CONSTRAINED_FIX` | Isu aktif, ada bukti ganjaran asal, tiada petunjuk pesaing yang kuat | Boleh cuba draf kecil yang disemak |
| `COMPETE_WITH_BETTER_EVIDENCE` | Ada dakwaan tuntutan, PR aktif berkaitan, atau perbincangan ramai | **Boleh cuba draf juga**; bukti fungsi, syarat penerimaan dan kelemahan pesaing perlu dinilai sebelum serahan |
| `VERIFY_FIRST` | Ganjaran tidak jelas, isu diberikan kepada pihak lain, syarat kabur, PR terdahulu sudah digabung, atau maklumat tidak cukup | Dapatkan bukti rasmi dahulu; jangan dakwa hasil layak dibayar |
| `REJECT` | Isu tutup/terkunci, projek tidak boleh digunakan, kerja hanya untuk manusia, kos deposit wajib, atau permintaan dedah arahan rahsia | Jangan sertai |

Komen pesaing **bukan** peraturan rasmi. Jika komen pihak luar mengatakan robot dilarang atau deposit wajib, ia mendorong status `VERIFY_FIRST`, bukan semestinya `REJECT`.

## Enam komponen bukti kompetensi

Modul `src/competency.mjs` membina rekod terstruktur tentang:
1. masalah boleh dihasilkan semula,
2. patch asal yang konkrit,
3. sintaks disahkan,
4. ujian fungsi bebas lulus,
5. kriteria penerimaan diperiksa,
6. penyelesaian pesaing dibandingkan menggunakan bukti.

Skor ialah **senarai semak bukti (0–6)**, bukan markah kecerdasan, kebarangkalian menang atau bukti pembayaran. Patch sintaks sahaja dilabel `DRAFT_ONLY_NOT_FUNCTIONALLY_VERIFIED`. Skor lengkap juga masih belum bermaksud kerja diterima.

## Komponen yang sudah disambungkan

- `src/quest-intel.mjs`: membezakan peluang kompetitif daripada halangan sebenar dan merekod penemuan.
- `src/brain-quest.mjs`: model Qwen 3B dibenarkan menyediakan draf bagi isu yang mempunyai persaingan. Fail ujian kekal tidak boleh diubah oleh model dan kerja pihak luar tidak diserahkan.
- `src/worker.mjs`: kemahiran pembetulan berasaskan peraturan menggunakan gerbang keputusan sama.
- `src/status.mjs`: papan quest melaporkan calon kompetitif secara berasingan daripada isu ditolak.
- `test/competency.test.mjs`: kes ujian mencabar PR pesaing, komen banyak, syarat palsu daripada pengulas, deposit, arahan sulit, ganjaran tidak jelas dan mutu bukti.

## Had yang masih perlu dibuktikan

- Model 3B setakat ini lulus **2/3** masalah latihan fungsi terkawal. Itu belum bukti boleh mengalahkan penyelesaian pesaing di GitHub.
- Toyol belum membandingkan **kandungan dan keputusan ujian PR pesaing** secara menyeluruh. Status `COMPETE_WITH_BETTER_EVIDENCE` baru menghalalkan *analisis/draf*, bukan menandakan perbandingan telah selesai.
- Ujian projek luaran masih belum dijalankan dalam persekitaran dipercayai. Pemeriksaan sintaks tidak membuktikan pembetulan fungsi.
- Terma bounty, hak peserta dan saluran payout Malaysia masih perlu disahkan.
- **0 patch luar diterima, 0 bayaran diterima.** Penambahbaikan strategi ini tidak menghasilkan pendapatan dengan sendirinya.

## Petunjuk kejayaan seterusnya

Satu isu yang bersaing tetapi masih terbuka perlu berjaya dilalui dengan bukti lengkap: pembiakan pepijat, patch selamat, ujian fungsi, perbandingan PR pesaing, pematuhan syarat penyertaan, penerimaan maintainer dan akhirnya rekod ganjaran yang disahkan. Jangan melangkau mana-mana gerbang dan jangan menyamakan pertandingan dengan kejayaan.

**MYReady tidak disentuh. Tiada PR luar, tuntutan bounty, pendaftaran akaun atau transaksi kewangan dilakukan.**
