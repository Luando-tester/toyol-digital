# Toyol Digital — Gerbang Pembayaran Sebenar

**Tarikh semakan: 8 November 2026. Status: BELUM DIBUKA / PENDAPATAN RM0.**

Dokumen ini memisahkan kerja yang diiklankan, kerja diterima, ganjaran settled di dompet, dan wang yang benar-benar boleh dikeluarkan. Ia bukan arahan membuat pembelian atau deposit.

## A. Bounty kod GitHub

- Algora, BountyHub dan IssueHunt kebanyakannya memerlukan pull request, semakan pemilik projek dan penerimaan hasil. Iklan ganjaran dalam Jobbi tidak menjamin tuntutan atau pembayaran.
- Audit Jobbi semasa: 657 item, 273 lulus saringan asas, 49 pautan isu GitHub yang disokong, hanya **1 sepadan dengan 3 kemahiran Toyol**, dan isu itu telah dipertandingkan.
- Untuk menghasilkan pendapatan dalam laluan ini, perlu tugasan yang belum dituntut, kod yang betul, ujian yang boleh diulang, izin automasi di projek asal, PR yang diterima, dan saluran pembayaran boleh digunakan di Malaysia.
- Pelaksana kod Toyol hanya boleh menyediakan patch dan bukti dalaman. Ia tidak mengirim PR ke pihak ketiga dan tidak menuntut wang.

## B. Laluan khusus ejen AI: BasedAgents (calon, belum diaktifkan)

Laman rasmi:
- https://registry.basedagents.ai/docs/agents
- https://registry.basedagents.ai/
- https://basedagents.ai/docs/getting-started

Aliran rasmi: daftar ejen menggunakan identiti Ed25519 dan proof-of-work, tetapkan dompet USDC rangkaian Base, cari tugas escrowed, tuntut, serahkan hasil bertandatangan, tunggu penerimaan. Dokumentasi menyatakan tugas tanpa semakan selepas 7 hari boleh diterima secara automatik, tertakluk pada pertikaian dan terma.

**Gerbang yang belum dipenuhi:**

1. Tidak ada dompet penerima USDC Base yang disediakan dan dikawal oleh pemilik projek untuk Toyol.
2. Tidak ada kunci identiti ejen yang disimpan secara selamat di GitHub Actions Secrets atau pengurus rahsia berizin.
3. Tidak ada satu tugas aktif yang telah dibuktikan serasi dengan enjin pembetulan kod terhad Toyol.
4. Tidak ada bukti penyelesaian dihantar, diterima, pembayaran USDC dilepaskan, atau cara menukarnya kepada wang tunai di Malaysia tanpa kos pendahuluan.

Dokumentasi BasedAgents menunjukkan pendaftaran menggunakan proof-of-work, bukan yuran langganan. Tetapi hal ini bukan jaminan bahawa setiap tuntutan atau pengeluaran RM boleh dilaksanakan dengan sifar kos rangkaian atau tanpa langkah tambahan. Semak sebelum mendaftar.

## Sekatan keselamatan wajib

- Jangan masukkan private key, seed phrase, token API atau kata laluan dalam repo awam, issue, log, artifact atau chat.
- Jangan menjana atau mengawal dompet kewangan pengguna tanpa kebenaran khusus.
- Jangan membuat claim jika syarat perkhidmatan memerlukan penyumbang manusia atau audit manusia.
- Jangan berbelanja, mendanai bounty orang lain, staking, membuka langganan atau mencipta transaksi.
- Jangan lapor ganjaran sebagai pendapatan sebelum status pembayaran dibuktikan.
- Jangan menyentuh MYReady atau repositori lain.

**Keputusan gerbang:** Laluan ke pembayaran telah dikenal pasti daripada dokumentasi rasmi, tetapi belum dibuka. Fokus pembangunan seterusnya sepatutnya mencari jenis tugasan yang benar-benar mampu diselesaikan sebelum meminta akses pembayaran pengguna.
