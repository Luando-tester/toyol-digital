# Audit patch quest sebenar — 9 November 2026

**Isu asal:** https://github.com/tscircuit/pcb-viewer/issues/163

**Ujian AI:** https://github.com/ilhamraduanbis-source/toyol-digital/actions/runs/42576681862

**Keputusan:** DRAF TIDAK SAH. Tidak diserahkan. Tidak diterima. Pendapatan RM0.

## Apa yang diminta

Arahan isu meminta penyingkiran prop `disableAutoFocus` dan penggantiannya dengan `focusOnHover={false}`.

## Apa yang model hasilkan

Selepas dua percubaan, Qwen 3B mengubah fail `src/examples/2025/hover-behavior.fixture.tsx`. Patch menukar:

```diff
-  return <HoverBehaviorDemo focusOnHover={false} />
+  return <HoverBehaviorDemo focusOnHover={true} />
```

Perubahan ini **tidak membuang** `disableAutoFocus` dan menukar nilai boolean kepada pilihan yang bertentangan dengan arahan isu. Pembangunan awal Toyol hanya menyemak `git diff --check` dan menganggapnya draf, bukan penyelesaian lengkap. Selepas audit manual, rekod [Learning Ledger](https://github.com/ilhamraduanbis-source/toyol-digital/issues/2) bagi run 8 diperbetulkan kepada `INVALID_DRAFT`.

## Pembetulan sistem

- `src/semantic-check.mjs` kini membaca arahan tepat yang diketahui dan menyemak baris yang dibuang serta ditambah dalam diff.
- Bagi tugasan JSX ini, patch mesti membuang `disableAutoFocus` dan menambah `focusOnHover={false}`. Menukar `focusOnHover={false}` kepada `{true}` mesti ditolak.
- Kegagalan semantik diklasifikasikan sebagai pembetulan yang boleh dicuba lagi dalam **maksimum dua cubaan**, bukan diterima sebagai draf berjaya.
- Skor kompetensi hanya menandakan syarat eksplisit diperiksa jika gerbang semantik benar-benar lulus. Walaupun lulus, ujian projek sebenar dan penerimaan maintainer masih diperlukan.
- Semua hasil test sintetik perlu dibezakan daripada bukti kerja luar dan wang diterima.

**Pengajaran:** daya tahan mesti disertai semakan makna arahan dan keberanian mengakui patch yang salah. Menghasilkan sesuatu selepas dua cubaan bukan kemenangan jika ia bercanggah dengan tugasan.

**Sempadan:** Tiada PR luar, tuntutan bounty atau transaksi kewangan dibuat. MYReady tidak disentuh.
