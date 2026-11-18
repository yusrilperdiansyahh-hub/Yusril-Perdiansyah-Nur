# Panduan Publish Gratis Tanpa Kartu Kredit — Sensus Desa Cibiru Wetan 2026

Aplikasi ini sudah disiapkan agar dapat langsung di-publish secara **gratis (tanpa kartu kredit & tanpa setup billing Google Cloud)** dengan dukungan penuh PWA offline (iPhone Safari & Android Chrome) serta proxy `/api/apps-script-proxy` menuju Google Spreadsheet Admin.

---

## Persiapan Awal (Sekali Saja)
1. Di Google AI Studio, klik menu **Download App / Export ZIP** untuk mengunduh seluruh folder proyek ini ke komputer Anda, lalu ekstrak file ZIP tersebut.
2. (Disarankan jika sudah mengisi daftar RT/RW atau petugas di AI Studio):
   - Buka tab **Peta & Ekspor** → klik **Unduh Cadangan Lengkap (JSON)** agar daftar petugas, RT/RW, dan tautan Apps Script Anda bisa langsung dipulihkan di domain baru dalam 1 klik.

---

## Pilihan 1 (Paling Praktis): Deploy ke **Vercel** (Gratis Tanpa Kartu Kredit)

1. Buat akun gratis di [https://vercel.com](https://vercel.com) (bisa masuk dengan akun GitHub / Google / Email).
2. Cara termudah (via GitHub):
   - Unggah folder proyek ke repositori GitHub pribadi (bisa *Private repository*).
   - Di dashboard Vercel, klik **Add New → Project** → pilih repositori tersebut.
   - Framework Preset otomatis terbaca **Vite** (konfigurasi `vercel.json` dan fungsi `/api/apps-script-proxy.ts` sudah otomatis aktif).
   - Klik **Deploy** (tidak memerlukan Environment Variable apa pun).
3. Atau via Vercel CLI di terminal komputer Anda:
   ```bash
   npm install -g vercel
   vercel --prod
   ```
4. Setelah selesai, Anda akan mendapat alamat permanen HTTPS, misalnya:
   `https://sensus-cbw-2026.vercel.app`

---

## Pilihan 2: Deploy ke **Cloudflare Pages** (Gratis Unlimited Bandwidth)

1. Masuk ke [https://dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages → Create → Pages → Connect to Git** (atau *Direct Upload*).
2. Pengaturan Build:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
3. Folder `/functions/api/apps-script-proxy.ts` dan `/public/_headers` sudah otomatis aktif menyediakan proxy Apps Script dan header PWA.

---

## Pilihan 3: Deploy ke **Netlify** (Gratis Tanpa Kartu Kredit)

1. Masuk ke [https://app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project** (dari GitHub/GitLab).
2. File `netlify.toml` dan `/netlify/functions/apps-script-proxy.ts` sudah tersedia sehingga pengaturan build (`npm run build` → `dist`) dan routing `/api/*` otomatis dikenali.

---

## Langkah Wajib Setelah Situs Live di Domain Baru

1. **Buka URL domain baru** (contoh `https://sensus-cbw-2026.vercel.app`).
2. **Masuk sebagai Admin** (`yusrilperdiansyahh@gmail.com`).
   - Jika sebelumnya sudah mengunduh cadangan JSON dari pratinjau AI Studio, buka **Peta & Ekspor → Impor & Gabung Cadangan (JSON)** untuk memindahkan daftar petugas, RT/RW, dan URL Apps Script.
   - Jika mulai bersih, buka tab **Google Drive & Sync**, tempel URL Web App Apps Script (`/exec`), klik **Simpan Pengaturan** → **Uji Koneksi Apps Script**.
3. **Bagikan Konfigurasi dari Domain Baru ke HP Enumerator:**
   - Di tab **Google Drive & Sync**, klik **Salin Link Setup HP (Disarankan untuk iPhone)**.
   - Kirim tautan tersebut ke grup WhatsApp enumerator. Tautan ini otomatis mengarah ke domain permanen baru Anda.
4. **Instal PWA di HP Lapangan:**
   - **Android (Chrome):** Buka link setup → klik tombol **Pasang Aplikasi** (*Add to Home Screen*).
   - **iPhone (Safari):** Buka link setup langsung di **Safari** (bukan peramban dalam WhatsApp) → ketuk ikon **Bagikan (Share) → Tambahkan ke Layar Utama**.
