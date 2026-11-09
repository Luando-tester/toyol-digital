# Resilient Toyol — Sistem Daya Tahan v1

**Dipasang pada 9 November 2026 dalam `toyol-digital`.**

## Prinsip

**Daya tahan bukan kedegilan.** Toyol mesti melawan masalah teknikal dan ketidakpastian yang boleh diatasi, bukan melanggar syarat pemilik projek, mengejar tugas yang sudah selesai atau membakar masa tanpa had. Kehadiran pesaing **tidak** menjadi sebab automatik berhenti.

## Mekanisme sebenar

| Situasi | Respons Toyol | Had |
|---|---|---|
| Pesaing menghantar PR atau komen tuntutan | `COMPETE_WITH_BETTER_EVIDENCE`, boleh buat draf sendiri dan menilai persaingan | Tidak mendakwa pesaing salah tanpa membandingkan ujian |
| Model meneka kod yang tidak wujud | Cuba semula dengan diagnostik, merujuk sumber asal yang tidak diubah | Maksimum **2 cubaan bagi setiap isu** |
| Cadangan patch mempunyai sintaks rosak | Pulihkan fail asal, berikan mesej kegagalan, cuba alternatif | Maksimum **2 cubaan** |
| Model tidak tahu jawapan | Boleh satu cubaan pemulihan; jika masih tidak cukup bukti, berhenti pada isu tersebut | Tidak mereka-reka penyelesaian |
| GitHub API gagal sementara / had kadar | Rekod sebagai `TRANSIENT_INFRA`; tidak menghentam API berulang kali | Cuba semula dalam jadual berikutnya |
| Lima sasaran pertama semuanya sukar | Putarkan kelompok isu supaya sasaran seterusnya turut dinilai | Maksimum **5 isu unik bagi satu run** |
| Isu ditutup, projek diarkib, arahan mendedahkan rahsia, deposit wajib | `HARD_STOP` / `VERIFY_FIRST` | Tiada tindakan yang melanggar syarat |

## Di mana ia dihubungkan

- `src/resilience.mjs`: pengelasan kegagalan, percubaan pembaikan berhad, pemulihan fail asal dan ringkasan audit.
- `src/brain-quest.mjs`: enjin Qwen 3B mengaplikasi pemulihan kod, merekod setiap cubaan serta memutarkan kelompok sasaran antara run.
- `src/competency.mjs`: menilai kekuatan bukti, risiko, kekangan serta persaingan. Ini berasingan daripada fungsi cubaan semula.
- `out/brain/quest-evidence.json`: keputusan setiap run, kategori kegagalan dan sejarah cubaan tempatan. GitHub Actions mengekalkan fail sebagai artifact 7 hari.

## Ukuran yang perlu kekal jujur

Ujian integrasi Mock tidak membuktikan Qwen 3B sendiri berjaya menyelesaikan quest berbayar selepas gagal. *Competency* yang kita mahukan ialah pembiakan masalah, patch yang tepat, ujian fungsi bebas, semakan penerimaan dan perbandingan bukti dengan pesaing sebenar.

**Setakat keluaran ini:** model 3B pernah menyelesaikan **2/3** masalah latihan terkawal. **0** tugasan luar diterima, **RM0** pendapatan disahkan. Resilience Engine belum dibuktikan meningkatkan kadar kemenangan komersial. Tiada PR atau tuntutan dihantar secara automatik ke projek luar.

## Cara menentukan kejayaan daya tahan

Dalam laporan akan datang, asingkan:
1. `attempts` — jumlah percubaan,
2. `recoveries` — cubaan kedua,
3. `completed` — patch tempatan lulus pengesahan statik sahaja,
4. `independent_tests` — ujian fungsi sebenar (jika ada),
5. `accepted` — kerja diiktiraf pemilik,
6. `paid` — transaksi penerimaan wang yang disahkan.

Tidak boleh menggelar percubaan kedua sebagai kemenangan, dan tidak boleh menggelar patch tempatan sebagai pendapatan.

**Sempadan projek:** Toyol sahaja. MYReady Work A dan B tidak disentuh. Kos tunai RM0 dan tiada tindakan kewangan.
