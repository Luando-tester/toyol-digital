# Toyol AI Brain v0.7 — Local model and real quest bridge

**Operasi: CPU GitHub Actions; tiada API berbayar. Status pendapatan sebenar: RM0.**

## Yang sudah dibuktikan melalui GitHub Actions

- Runner GitHub awam memuat turun `llama.cpp` versi `b12202` dan model rasmi `Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF` berkuantisasi Q4_K_M.
- Model dijalankan melalui `llama-server` pada `127.0.0.1`, bukan API luar yang meminta kad kredit.
- Pada [run #42487867606](https://github.com/ilhamraduanbis-source/toyol-digital/actions/runs/42487867606), model benar-benar mencadangkan patch yang membetulkan fungsi `add(a,b)` daripada tolak kepada tambah. Patch diperiksa sintaks dan disimpan sebagai artifact.
- Pada [run #42488160951](https://github.com/ilhamraduanbis-source/toyol-digital/actions/runs/42488160951), model hidup lagi dan `brain-quest.mjs` menyemak lima pautan bounty sebenar daripada Quest Board; tiada calon yang memenuhi gerbang penyertaan. **Tiada kerja luar diselesaikan, tiada PR dihantar, tiada bayaran diperoleh.**

## Struktur

- `src/brain-core.mjs`: membekalkan arahan dan konteks fail kepada model; menerima output JSON berstruktur dengan maksimum dua pengeditan; menolak laluan atau arahan tidak selamat, mencari teks yang unik, memeriksa sintaks fail yang mampu diperiksa.
- `src/brain-smoke.mjs`: ujian model sebenar pada fail contoh dalam repositori ini.
- `src/brain-quest.mjs`: membaca pautan isu asal daripada Quest Board #1; meneliti status isu, komen dan PR pesaing, menyalin repositori awam kepada direktori sementara, memilih konteks sumber, memohon cadangan model, lalu menyimpan patch **tanpa serahan** jika lulus pemeriksaan.
- `.github/workflows/brain-proof.yml`: `workflow_dispatch` dan jadual **03:37 UTC setiap hari**. Jadual itu telah dipasang tetapi pemicu `schedule` belum dibuktikan.
- `out/brain/`: catatan keputusan, patch dan bukti yang dimuat naik sebagai GitHub Actions artifact, disimpan 7 hari.

## Sempadan nyata

1. Model ialah 1.5B parameter dan boleh salah; ia bukan penaakul universal seperti ChatGPT serta tidak mampu menyiapkan apa-apa bounty tanpa had.
2. Model hanya boleh mencadangkan pengeditan kecil kepada fail sumber yang diberikan. Skrip yang dicadangkan atau kod pihak ketiga **tidak dijalankan**. Pemeriksaan statik bukan ujian penuh projek.
3. Prompt sumber luar dianggap data tidak dipercayai. Respons model ditapis dan tidak boleh sendiri menulis ke fail rahsia, GitHub workflows, sistem pembayaran atau projek lain.
4. Tiada tuntutan bounty, PR kepada projek orang lain, posting, akaun, langganan, dompet atau pemindahan wang.
5. **Kos tunai sasaran: RM0.** Runner awam GitHub yang dibenarkan adalah percuma ketika disemak; namun muat turun model lebih kurang 1.12 GB pada setiap run dan masa CPU berpotensi menghadapi had perkhidmatan. Jangan beralih kepada perkhidmatan berbayar tanpa kebenaran.
6. Model dan binary dimuat turun daripada penerbit rasmi melalui HTTPS. Semakan saiz dibuat, tetapi belum ada pengesahan hash/attestation model yang lengkap.
7. Jadual cron tidak terbukti berjalan sehingga log jenis `schedule` benar-benar muncul. Pelaksanaan daripada `push` tidak dianggap bukti.
8. Ganjaran diiklankan **bukan** wang diterima. Syarat penyertaan automasi di platform asal dan saluran payout Malaysia masih belum disahkan.

## Tahap peningkatan seterusnya

Kejayaan yang diiktiraf ialah satu **patch pada masalah luaran sebenar** yang betul dan boleh diuji, diikuti penerimaan pemilik tugas serta pembayaran yang disahkan. Ujian contoh dan bilangan kemahiran tidak menjamin pendapatan. MYReady tidak disentuh.
