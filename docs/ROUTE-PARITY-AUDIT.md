# Audit Parity Next.js ke Astro

Tanggal audit: 3 Agustus 2026. Dokumen ini membandingkan source Next production
dengan source dan artifact Astro lokal. Status “lulus” belum berarti production
sudah berpindah; staging DomaiNesia tetap wajib.

## Ringkasan

| Area | Status | Catatan |
| --- | --- | --- |
| Route publik dan tiga locale | Lulus lokal | `id` tanpa prefix, `en`, `zh` |
| Layanan dinamis | Lulus lokal | 27 slug × 3 locale |
| Artikel dinamis | Lulus lokal | listing, kategori, pagination, 21 slug × 3 locale saat audit |
| Login dan public tracking | Lulus lokal | React island, Laravel tetap enforcement |
| Mitra portal | Lulus lokal | Static shell + runtime API; customer portal dipensiunkan |
| Navbar auth-aware | Lulus lokal | Guest nol `/auth/me`; authenticated dideduplikasi |
| SEO dasar | Lulus lokal | canonical, hreflang, sitemap, robots branch test |
| Redirect legacy | Siap di artifact | Harus diuji pada Apache staging |
| Optimasi gambar CMS | Lulus build/browser | 104 image, 46,70 MB → 10,76 MB |
| CMS build trigger | Siap lokal, nonaktif | Debounce Redis + repository dispatch; menunggu deploy staging |
| Tools React | Diblokir maintenance | `pdf-liner` dan `surat-kuasa` belum parity |
| Visual/performance staging | Belum | URL tersedia; menunggu deploy atomic pertama |

## Matriks Route

| Next production | Astro | Perbedaan yang disengaja |
| --- | --- | --- |
| `/` | `/` | Tidak ada |
| `/en`, `/zh` | `/en`, `/zh` | Tidak ada |
| `/tentang-kami` | sama | React island + static CMS data |
| `/layanan` | sama | HTML statis |
| `/layanan/<slug>` | sama | HTML statis + interaction islands |
| `/kontak` | sama | Form WhatsApp tetap client-side |
| `/info-bisnis` | sama | HTML statis |
| `/info-bisnis?category=&page=` | path kategori/page | Apache 301 menormalisasi URL lama |
| `/info-bisnis/<slug>` | sama | HTML artikel statis |
| `/kebijakan-privasi` | sama | HTML statis |
| `/faq` | `/kontak#faq` | Apache 301 + redirect HTML fallback |
| `/tools` | sama | Tetap maintenance/noindex sesuai backend |
| `/tools/<slug>` | sama bila aktif saat build | HTML/URL renderer tersedia |
| `/login` | sama | Static/noindex + auth island |
| `/lacak` | sama | Public tracking berbasis kode; customer portal dipensiunkan |
| `/mitra` | sama | Static/noindex + notary portal island |
| `/mitra/orders/<code>` | `/mitra?order=<code>` | Apache 302 menjaga link lama |
| `/api/admin-redirect` | tidak diperlukan | Navbar/login memakai origin panel Laravel terverifikasi |
| `/api/revalidate` | diganti build trigger | Implementasi lokal nonaktif; aktivasi setelah staging |
| `/storage/*` rewrite | tidak diperlukan | Output memakai CDN/local optimized artifact |

## Redirect Legacy

`.htaccess` mencakup redirect Next lama berikut:

- `/about-us` dan locale-prefixed.
- `/tracking` dan locale-prefixed.
- Typo slug artikel Migrasi KBLI.
- `/blogPost` dan numeric post ID.
- `/auth/*`.
- `/layanan/<numeric-id>`.
- `/cookie` dan `/privacy`.
- `/faq`.
- Query pagination/kategori Info Bisnis.
- Detail mitra lama.

Validator memastikan aturan wajib tetap ada di artifact. Status HTTP dan perilaku
`mod_rewrite` tetap harus diuji pada Apache staging karena `astro preview` tidak
membaca `.htaccess`.

## Parity SEO

- Canonical dan hreflang `id/en/zh/x-default` dirender di HTML.
- Sitemap mengecualikan login, lacak, mitra, FAQ redirect, dan 404.
- `robots.txt` staging memblokir seluruh crawler.
- `robots.txt` production mengizinkan public site, memblokir route privat, dan
  menunjuk `sitemap-index.xml`.
- 404 memakai metadata noindex.
- JSON-LD Home/layanan/artikel mempertahankan URL image absolut setelah optimasi.

## Parity Gambar

Next/Vercel sebelumnya bertindak sebagai image optimizer. Adapter kompatibilitas
`next/image` pada Astro hanya menghasilkan elemen `<img>`, sehingga tanpa langkah
tambahan beberapa source R2 dikirim mentah sampai sekitar 981 KB per gambar.

Build Astro sekarang menjalankan optimizer fail-safe setelah static render:

- Hanya mengunduh HTTPS dari host persis `cdn.awankusuma.com` dan avatar
  testimonial dari `lh3.googleusercontent.com`.
- Maksimal tiga request paralel, timeout 15 detik, dan source maksimal 10 MB.
- Raster dikonversi ke WebP hashed dengan batas lebar berdasarkan jenis media.
- Object R2 asli tidak diubah atau dihapus.
- Semua referensi HTML dan serialized island props diarahkan ke artifact lokal.
- Social metadata dan JSON-LD tetap menggunakan URL absolut production.
- Kegagalan download/transform menggagalkan release sebelum activation.

Hasil build final: 104 source unik, 46,70 MB menjadi 10,76 MB (77% lebih kecil).
Dua di antaranya adalah avatar Google yang pada audit awal diblokir ORB dan kini
ikut dilokalkan saat build.
Featured image contoh turun menjadi sekitar 94,6 KB. Browser smoke pada Home,
Tentang Kami, detail layanan, listing/detail artikel, dan tracking menemukan nol
broken image, nol request image ke CDN setelah hydration, dan nol console error.

## Gap yang Masih Memblokir Cutover

1. Bootstrap symlink document root staging dan GitHub Environment secrets belum
   selesai.
2. Remote Git sudah dikonfigurasi lokal dan workflow SSH atomic tersedia, tetapi
   repository belum di-push serta belum ada deployment pertama.
3. `.htaccess` belum diuji pada LiteSpeed/Apache DomaiNesia.
4. Visual regression dan Core Web Vitals pada origin staging belum diukur.
5. Build trigger CMS belum dapat diuji end-to-end sebelum remote dan staging aktif;
   implementasi source serta test backend sudah tersedia dalam keadaan nonaktif.
6. Tools React belum parity dan production Tools masih maintenance.
7. Cutover/rollback DNS belum diuji melalui rehearsal staging.

## Bukti Validasi Lokal Terakhir

- Vitest: 74 test lulus.
- Astro check: 0 error, 0 warning, 0 hint.
- Static build staging terbaru: 208 halaman.
- Artifact: 705 file setelah optimizer responsive.
- Static validator: seluruh route wajib, internal link, sitemap, robots, dan
  `.htaccess` gate lulus.
- Browser smoke mobile: enam template penting merespons 200 tanpa broken image,
  request gagal, console error, atau request image langsung ke CDN/Google.
