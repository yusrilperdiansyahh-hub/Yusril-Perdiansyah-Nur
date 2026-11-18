import type { DusunCode, HouseholdSource, TerritoryRwMapping } from '../types/census';

export const BOOTSTRAP_ADMIN_EMAIL = 'yusrilperdiansyahh@gmail.com';

export const DUSUN_OPTIONS: { code: DusunCode; label: string }[] = [
  { code: 'D1', label: 'Dusun I (D1)' },
  { code: 'D2', label: 'Dusun II (D2)' },
  { code: 'D3', label: 'Dusun III (D3)' },
  { code: 'D4', label: 'Dusun IV (D4)' },
  { code: 'D5', label: 'Dusun V (D5)' },
];

export const DEFAULT_RW_MAPPINGS: TerritoryRwMapping[] = [
  { rw: '01', dusun: 'D1', jumlah_rt: 4 },
  { rw: '02', dusun: 'D1', jumlah_rt: 4 },
  { rw: '03', dusun: 'D1', jumlah_rt: 5 },
  { rw: '04', dusun: 'D1', jumlah_rt: 4 },
  { rw: '05', dusun: 'D2', jumlah_rt: 5 },
  { rw: '06', dusun: 'D2', jumlah_rt: 4 },
  { rw: '07', dusun: 'D2', jumlah_rt: 5 },
  { rw: '08', dusun: 'D2', jumlah_rt: 4 },
  { rw: '09', dusun: 'D3', jumlah_rt: 5 },
  { rw: '10', dusun: 'D3', jumlah_rt: 4 },
  { rw: '11', dusun: 'D3', jumlah_rt: 5 },
  { rw: '12', dusun: 'D3', jumlah_rt: 4 },
  { rw: '13', dusun: 'D4', jumlah_rt: 5 },
  { rw: '14', dusun: 'D4', jumlah_rt: 4 },
  { rw: '15', dusun: 'D4', jumlah_rt: 5 },
  { rw: '16', dusun: 'D5', jumlah_rt: 5 },
  { rw: '17', dusun: 'D5', jumlah_rt: 4 },
  { rw: '18', dusun: 'D5', jumlah_rt: 5 },
  { rw: '19', dusun: 'D5', jumlah_rt: 4 },
]; // Total = 85 RT

export const HOUSEHOLD_SOURCE_OPTIONS: { code: HouseholdSource; label: string }[] = [
  { code: 'listing_lapangan', label: 'Listing lapangan' },
  { code: 'daftar_kk_rt', label: 'Daftar KK RT' },
  { code: 'data_kependudukan', label: 'Data kependudukan desa' },
  { code: 'temuan_lapangan', label: 'Temuan lapangan' },
];

export const CONSENT_TEXT =
  "Kami dari tim pendataan Desa Cibiru Wetan bekerja sama dengan I'ComDev Institute. Data ini dipakai untuk perencanaan pembangunan desa (RPJMDes). Data pribadi Bapak/Ibu dijaga kerahasiaannya dan hanya ditampilkan dalam bentuk ringkasan. Bapak/Ibu boleh tidak menjawab pertanyaan tertentu dan boleh berhenti kapan saja.";

export interface OptionItem {
  code: string;
  label: string;
}

export const OPTION_LISTS: Record<string, OptionItem[]> = {
  kunjungan: [
    { code: 'ditemui', label: 'Ditemui' },
    { code: 'tidak_ditemui', label: 'Tidak ditemui' },
    { code: 'rumah_kosong', label: 'Rumah kosong/tidak berpenghuni' },
  ],
  ya_tidak: [
    { code: 'ya', label: 'Ya' },
    { code: 'tidak', label: 'Tidak' },
  ],
  ya_tidak_tahu: [
    { code: 'ya', label: 'Ya' },
    { code: 'tidak', label: 'Tidak' },
    { code: 'tidak_tahu', label: 'Tidak tahu' },
  ],
  ya_tidak_tolak: [
    { code: 'ya', label: 'Ya' },
    { code: 'tidak', label: 'Tidak' },
    { code: 'tidak_bersedia', label: 'Tidak bersedia menjawab' },
  ],
  status_rumah: [
    { code: 'milik', label: 'Milik sendiri' },
    { code: 'sewa', label: 'Sewa/kontrak' },
    { code: 'menumpang', label: 'Menumpang/bebas sewa' },
    { code: 'lainnya', label: 'Lainnya' },
  ],
  bukti_tanah: [
    { code: 'shm', label: 'Sertifikat Hak Milik (SHM)' },
    { code: 'girik', label: 'Girik/letter C/AJB' },
    { code: 'tidak_ada', label: 'Tidak ada' },
    { code: 'tidak_tahu', label: 'Tidak tahu' },
  ],
  dinding: [
    { code: 'tembok', label: 'Tembok' },
    { code: 'kayu', label: 'Kayu/papan' },
    { code: 'bambu', label: 'Bambu/bilik' },
    { code: 'lainnya', label: 'Lainnya' },
  ],
  atap: [
    { code: 'genteng', label: 'Genteng' },
    { code: 'seng', label: 'Seng' },
    { code: 'asbes', label: 'Asbes' },
    { code: 'beton', label: 'Beton' },
    { code: 'ijuk', label: 'Ijuk/rumbia' },
    { code: 'lainnya', label: 'Lainnya' },
  ],
  lantai: [
    { code: 'keramik', label: 'Keramik/marmer' },
    { code: 'ubin', label: 'Ubin/tegel' },
    { code: 'semen', label: 'Semen' },
    { code: 'kayu', label: 'Kayu/papan' },
    { code: 'bambu', label: 'Bambu' },
    { code: 'tanah', label: 'Tanah' },
  ],
  sumber_air: [
    { code: 'ledeng', label: 'Ledeng/PAM' },
    { code: 'sumur_bor', label: 'Sumur bor/pompa' },
    { code: 'sumur_lindung', label: 'Sumur terlindung' },
    { code: 'sumur_tak', label: 'Sumur tak terlindung' },
    { code: 'mata_air_lindung', label: 'Mata air terlindung' },
    { code: 'mata_air_tak', label: 'Mata air tak terlindung' },
    { code: 'sungai', label: 'Sungai/danau' },
    { code: 'hujan', label: 'Air hujan' },
  ],
  air_minum: [
    { code: 'kemasan', label: 'Air kemasan/galon isi ulang' },
    { code: 'ledeng', label: 'Ledeng/PAM' },
    { code: 'sumur', label: 'Sumur' },
    { code: 'mata_air', label: 'Mata air' },
    { code: 'lainnya', label: 'Lainnya' },
  ],
  olah_air: [
    { code: 'dimasak', label: 'Dimasak/direbus' },
    { code: 'tidak_dimasak', label: 'Tidak dimasak' },
  ],
  fasilitas_bab: [
    { code: 'sendiri', label: 'Milik sendiri' },
    { code: 'bersama', label: 'Bersama rumah tangga lain' },
    { code: 'umum', label: 'MCK umum' },
    { code: 'tidak_ada', label: 'Tidak ada' },
  ],
  lokasi_wc: [
    { code: 'dalam', label: 'Di dalam rumah' },
    { code: 'luar', label: 'Di luar rumah' },
  ],
  kloset: [
    { code: 'leher_angsa', label: 'Leher angsa' },
    { code: 'plengsengan', label: 'Plengsengan' },
    { code: 'cemplung', label: 'Cemplung/cubluk' },
  ],
  buang_tinja: [
    { code: 'septik', label: 'Tangki septik/IPAL' },
    { code: 'kolam', label: 'Kolam/sawah' },
    { code: 'sungai', label: 'Sungai/laut' },
    { code: 'lubang', label: 'Lubang tanah' },
    { code: 'kebun', label: 'Kebun/pantai/tanah lapang' },
  ],
  penerangan: [
    { code: 'pln_sendiri', label: 'Listrik PLN meteran sendiri' },
    { code: 'pln_menumpang', label: 'Listrik PLN menumpang' },
    { code: 'non_pln', label: 'Listrik non-PLN (genset/surya)' },
    { code: 'tidak_ada', label: 'Tidak ada listrik' },
  ],
  daya: [
    { code: '450', label: '450 VA' },
    { code: '900', label: '900 VA' },
    { code: '1300', label: '1.300 VA' },
    { code: '2200', label: '2.200 VA atau lebih' },
    { code: 'tidak_tahu', label: 'Tidak tahu' },
  ],
  bahan_bakar: [
    { code: 'lpg', label: 'Gas LPG' },
    { code: 'kayu', label: 'Kayu bakar' },
    { code: 'minyak', label: 'Minyak tanah' },
    { code: 'listrik', label: 'Listrik' },
    { code: 'lainnya', label: 'Lainnya' },
  ],
  buang_sampah: [
    { code: 'petugas', label: 'Diangkut petugas' },
    { code: 'bank_sampah', label: 'Bank sampah/didaur ulang' },
    { code: 'dibakar', label: 'Dibakar' },
    { code: 'ditimbun', label: 'Ditimbun/dikubur' },
    { code: 'sungai', label: 'Dibuang ke sungai/laut/selokan' },
    { code: 'sembarang', label: 'Dibuang ke kebun/lahan kosong' },
  ],
  penguasaan: [
    { code: 'milik', label: 'Milik sendiri' },
    { code: 'sewa', label: 'Sewa' },
    { code: 'garap', label: 'Garap/bagi hasil' },
    { code: 'lainnya', label: 'Lainnya' },
  ],
  aset: [
    { code: 'emas', label: 'Emas/logam mulia/perhiasan' },
    { code: 'gudang', label: 'Bangunan gudang/gedung' },
    { code: 'ruko', label: 'Ruko/toko/warung' },
    { code: 'tanah', label: 'Tanah' },
    { code: 'kebun', label: 'Kebun' },
    { code: 'lainnya', label: 'Lainnya' },
    { code: 'tidak_ada', label: 'Tidak ada' },
  ],
  pinjaman: [
    { code: 'bank', label: 'Bank/pegadaian/koperasi' },
    { code: 'kerabat', label: 'Tetangga/kerabat/keluarga' },
    { code: 'pinjol', label: 'Pinjaman online' },
    { code: 'bank_keliling', label: 'Bank keliling/rentenir' },
    { code: 'tidak_pernah', label: 'Tidak pernah meminjam' },
  ],
  bansos: [
    { code: 'pkh', label: 'PKH' },
    { code: 'bpnt', label: 'BPNT/Sembako' },
    { code: 'beras', label: 'Bantuan beras' },
    { code: 'blt_dd', label: 'BLT Dana Desa' },
    { code: 'kks', label: 'KKS' },
    { code: 'pip', label: 'PIP' },
    { code: 'rtlh', label: 'Bantuan rehabilitasi rumah' },
    { code: 'lainnya', label: 'Lainnya' },
  ],
  sinyal: [
    { code: 'kuat', label: 'Kuat' },
    { code: 'lemah', label: 'Lemah/putus-putus' },
    { code: 'tidak_ada', label: 'Tidak ada sinyal' },
  ],
  bencana: [
    { code: 'longsor', label: 'Longsor' },
    { code: 'banjir', label: 'Banjir' },
    { code: 'abrasi', label: 'Abrasi/gelombang pasang' },
    { code: 'gempa', label: 'Gempa' },
    { code: 'kekeringan', label: 'Kekeringan' },
    { code: 'angin', label: 'Angin kencang' },
    { code: 'tidak_ada', label: 'Tidak ada' },
  ],
  dampak: [
    { code: 'rumah', label: 'Rumah rusak' },
    { code: 'lahan', label: 'Lahan/tanaman/ternak rusak' },
    { code: 'kerja', label: 'Kehilangan pekerjaan/penghasilan' },
    { code: 'mengungsi', label: 'Mengungsi' },
    { code: 'lainnya', label: 'Lainnya' },
  ],
  hubungan: [
    { code: 'kk', label: 'Kepala rumah tangga' },
    { code: 'pasangan', label: 'Istri/suami' },
    { code: 'anak', label: 'Anak' },
    { code: 'menantu', label: 'Menantu' },
    { code: 'cucu', label: 'Cucu' },
    { code: 'ortu', label: 'Orang tua/mertua' },
    { code: 'famili', label: 'Famili lain' },
    { code: 'lainnya', label: 'Lainnya' },
  ],
  jk: [
    { code: 'l', label: 'Laki-laki' },
    { code: 'p', label: 'Perempuan' },
  ],
  wn: [
    { code: 'wni', label: 'WNI' },
    { code: 'wna', label: 'WNA' },
  ],
  status_penduduk: [
    { code: 'asli', label: 'Penduduk asli desa' },
    { code: 'pendatang_ktp', label: 'Pendatang, sudah ber-KTP desa ini' },
    { code: 'pendatang_luar', label: 'Pendatang, masih ber-KTP luar desa' },
  ],
  status_kawin: [
    { code: 'belum', label: 'Belum kawin' },
    { code: 'kawin', label: 'Kawin' },
    { code: 'cerai_hidup', label: 'Cerai hidup' },
    { code: 'cerai_mati', label: 'Cerai mati' },
  ],
  partisipasi: [
    { code: 'belum_pernah', label: 'Tidak/belum pernah sekolah' },
    { code: 'masih', label: 'Masih sekolah' },
    { code: 'tidak_lagi', label: 'Tidak sekolah lagi' },
  ],
  jenjang: [
    { code: 'paud', label: 'PAUD/TK/RA' },
    { code: 'sd', label: 'SD/MI/Paket A' },
    { code: 'smp', label: 'SMP/MTs/Paket B' },
    { code: 'sma', label: 'SMA/SMK/MA/Paket C' },
    { code: 'pt', label: 'Perguruan tinggi' },
  ],
  alasan: [
    { code: 'biaya', label: 'Tidak ada biaya' },
    { code: 'bekerja', label: 'Bekerja/membantu orang tua' },
    { code: 'menikah', label: 'Menikah' },
    { code: 'jarak', label: 'Sekolah terlalu jauh' },
    { code: 'disabilitas', label: 'Disabilitas/sakit' },
    { code: 'lainnya', label: 'Lainnya' },
  ],
  ijazah: [
    { code: 'tidak_punya', label: 'Tidak punya ijazah' },
    { code: 'sd', label: 'SD/MI/Paket A' },
    { code: 'smp', label: 'SMP/MTs/Paket B' },
    { code: 'sma', label: 'SMA/SMK/MA/Paket C' },
    { code: 'd1_d3', label: 'D1/D2/D3' },
    { code: 's1', label: 'D4/S1' },
    { code: 's2_s3', label: 'S2/S3' },
  ],
  nonformal: [
    { code: 'diniyah', label: 'Madrasah diniyah' },
    { code: 'pengajian', label: 'Pengajian' },
    { code: 'pesantren', label: 'Pesantren' },
    { code: 'pelatihan', label: 'Pelatihan/kursus' },
    { code: 'tidak_ada', label: 'Tidak ada' },
  ],
  melek: [
    { code: 'baca_tulis', label: 'Bisa membaca dan menulis' },
    { code: 'baca', label: 'Hanya bisa membaca' },
    { code: 'tidak', label: 'Tidak bisa' },
  ],
  agama: [
    { code: 'islam', label: 'Islam' },
    { code: 'kristen', label: 'Kristen' },
    { code: 'katolik', label: 'Katolik' },
    { code: 'hindu', label: 'Hindu' },
    { code: 'buddha', label: 'Buddha' },
    { code: 'konghucu', label: 'Konghucu' },
    { code: 'kepercayaan', label: 'Kepercayaan terhadap Tuhan YME' },
  ],
  quran: [
    { code: 'tidak', label: 'Tidak bisa' },
    { code: 'cukup', label: 'Cukup bisa' },
    { code: 'mahir', label: 'Mahir' },
  ],
  pekerjaan: [
    { code: 'petani_milik', label: 'Petani pemilik lahan' },
    { code: 'petani_garap', label: 'Petani penggarap/bagi hasil' },
    { code: 'buruh_tani', label: 'Buruh tani' },
    { code: 'nelayan', label: 'Nelayan' },
    { code: 'buruh_lepas', label: 'Buruh harian lepas' },
    { code: 'pedagang', label: 'Pedagang/wirausaha' },
    { code: 'karyawan', label: 'Karyawan swasta' },
    { code: 'pns', label: 'PNS/TNI/Polri' },
    { code: 'mengurus_rt', label: 'Mengurus rumah tangga' },
    { code: 'pelajar', label: 'Pelajar/mahasiswa' },
    { code: 'tidak_bekerja', label: 'Tidak bekerja' },
    { code: 'lainnya', label: 'Lainnya' },
  ],
  penghasilan: [
    { code: 'k500', label: '≤ 500.000' },
    { code: 'k1000', label: '500.001 – 1.000.000' },
    { code: 'k1500', label: '1.000.001 – 1.500.000' },
    { code: 'k2000', label: '1.500.001 – 2.000.000' },
    { code: 'k3000', label: '2.000.001 – 3.000.000' },
    { code: 'k4000', label: '3.000.001 – 4.000.000' },
    { code: 'k5000', label: '4.000.001 – 5.000.000' },
    { code: 'l5000', label: '> 5.000.000' },
    { code: 'tidak_bersedia', label: 'Tidak bersedia menjawab' },
  ],
  keterampilan: [
    { code: 'administrasi', label: 'Administrasi/perkantoran' },
    { code: 'bangunan', label: 'Bangunan/pertukangan' },
    { code: 'elektronik', label: 'Elektronik' },
    { code: 'kuliner', label: 'Kuliner' },
    { code: 'mengemudi', label: 'Mengemudi' },
    { code: 'olahraga', label: 'Olahraga' },
    { code: 'pengrajin', label: 'Kerajinan' },
    { code: 'seni', label: 'Seni' },
    { code: 'busana', label: 'Tata busana' },
    { code: 'rias', label: 'Tata rias' },
    { code: 'dagang', label: 'Berdagang' },
    { code: 'multimedia', label: 'Film/fotografi/videografi/desain grafis' },
    { code: 'pertanian', label: 'Pertanian' },
    { code: 'lainnya', label: 'Lainnya' },
    { code: 'tidak_ada', label: 'Tidak ada' },
  ],
  bpjs: [
    { code: 'pbi_apbn', label: 'BPJS PBI (APBN)' },
    { code: 'pbi_apbd', label: 'BPJS PBI daerah (APBD)' },
    { code: 'non_pbi', label: 'BPJS non-PBI (mandiri/pekerja)' },
    { code: 'tidak_punya', label: 'Tidak punya' },
    { code: 'tidak_tahu', label: 'Tidak tahu' },
  ],
  penyakit: [
    { code: 'hipertensi', label: 'Hipertensi' },
    { code: 'jantung', label: 'Jantung' },
    { code: 'stroke', label: 'Stroke' },
    { code: 'diabetes', label: 'Diabetes' },
    { code: 'sendi', label: 'Radang sendi' },
    { code: 'osteoporosis', label: 'Osteoporosis' },
    { code: 'tbc', label: 'TBC' },
    { code: 'asma', label: 'Asma' },
    { code: 'ispa', label: 'ISPA berulang' },
    { code: 'lainnya', label: 'Lainnya' },
    { code: 'tidak_ada', label: 'Tidak ada' },
    { code: 'tidak_bersedia', label: 'Tidak bersedia menjawab' },
  ],
  wg: [
    { code: 'tidak', label: 'Tidak ada kesulitan' },
    { code: 'sedikit', label: 'Sedikit kesulitan' },
    { code: 'banyak', label: 'Banyak kesulitan' },
    { code: 'tidak_bisa', label: 'Sama sekali tidak bisa' },
  ],
  kb: [
    { code: 'iud', label: 'IUD/spiral' },
    { code: 'implan', label: 'Implan/susuk' },
    { code: 'suntik', label: 'Suntik' },
    { code: 'pil', label: 'Pil' },
    { code: 'kondom', label: 'Kondom' },
    { code: 'mow_mop', label: 'Sterilisasi (MOW/MOP)' },
    { code: 'tradisional', label: 'Cara tradisional' },
  ],
  imunisasi: [
    { code: 'lengkap', label: 'Lengkap sesuai usia' },
    { code: 'tidak_lengkap', label: 'Tidak lengkap' },
    { code: 'tidak_tahu', label: 'Tidak tahu/tidak ada buku KIA' },
  ],
  lembaga: [
    { code: 'kelompok_tani', label: 'Kelompok tani/nelayan' },
    { code: 'pkk', label: 'PKK' },
    { code: 'posyandu', label: 'Kader posyandu' },
    { code: 'karang_taruna', label: 'Karang taruna' },
    { code: 'koperasi', label: 'Koperasi/BUMDes' },
    { code: 'majelis_taklim', label: 'Majelis taklim' },
    { code: 'lainnya', label: 'Lainnya' },
    { code: 'tidak_ada', label: 'Tidak ada' },
  ],
  benar_salah: [
    { code: 'benar', label: 'Benar' },
    { code: 'salah', label: 'Salah' },
  ],
  likert: [
    { code: '1', label: '1 Sangat tidak setuju' },
    { code: '2', label: '2' },
    { code: '3', label: '3' },
    { code: '4', label: '4' },
    { code: '5', label: '5 Sangat setuju' },
  ],
  mampu: [
    { code: '1', label: '1 Sangat tidak mampu' },
    { code: '2', label: '2' },
    { code: '3', label: '3' },
    { code: '4', label: '4' },
    { code: '5', label: '5 Sangat mampu' },
  ],
  harmoni: [
    { code: '1', label: '1 Ada ketegangan' },
    { code: '2', label: '2' },
    { code: '3', label: '3' },
    { code: '4', label: '4' },
    { code: '5', label: '5 Sangat harmonis' },
  ],
  lembaga_agama: [
    { code: 'masjid', label: 'Masjid' },
    { code: 'mushola', label: 'Musala' },
    { code: 'pesantren', label: 'Pesantren' },
    { code: 'pengajian', label: 'Kelompok pengajian' },
    { code: 'tarekat', label: 'Tarekat' },
    { code: 'gereja', label: 'Gereja' },
    { code: 'vihara', label: 'Vihara' },
    { code: 'pura', label: 'Pura' },
    { code: 'lainnya', label: 'Lainnya' },
  ],
  ormas: [
    { code: 'nu', label: 'Nahdlatul Ulama' },
    { code: 'persis', label: 'Persis' },
    { code: 'mathlaul_anwar', label: "Mathla'ul Anwar" },
    { code: 'muhammadiyah', label: 'Muhammadiyah' },
    { code: 'si', label: 'Syarikat Islam' },
    { code: 'pui', label: 'PUI' },
    { code: 'lainnya', label: 'Lainnya' },
  ],
  panggilan: [
    { code: 'haji', label: 'Haji' },
    { code: 'kyai', label: 'Kyai' },
    { code: 'ajengan', label: 'Ajengan' },
    { code: 'aceng', label: 'Aceng' },
    { code: 'gus', label: 'Gus' },
    { code: 'buya', label: 'Buya' },
    { code: 'nyai', label: 'Nyai' },
    { code: 'ustadz', label: 'Ustadz' },
    { code: 'abah', label: 'Abah' },
    { code: 'lainnya', label: 'Lainnya' },
  ],
  info_agama: [
    { code: 'pengajian', label: 'Pengajian' },
    { code: 'upacara', label: 'Upacara keagamaan' },
    { code: 'televisi', label: 'Televisi' },
    { code: 'gadget', label: 'Gadget/media sosial' },
    { code: 'lainnya', label: 'Lainnya' },
  ],
  tempat: [
    { code: 'masjid', label: 'Masjid/musala' },
    { code: 'padepokan', label: 'Padepokan' },
    { code: 'paguron', label: 'Paguron' },
    { code: 'rumah', label: 'Rumah warga' },
    { code: 'lainnya', label: 'Lainnya' },
  ],
};

export type FieldType =
  | 'text'
  | 'integer'
  | 'decimal'
  | 'date'
  | 'select_one'
  | 'select_multiple'
  | 'note'
  | 'calculate';

export interface QuestionDef {
  code: string;
  section: string;
  type: FieldType;
  label: string;
  hint?: string;
  listName?: string;
  required?: boolean;
  defaultValue?: number;
  min?: number;
  max?: number;
  exclusiveMin?: number;
  exclusiveMax?: number;
  regex?: string;
  regexMessage?: string;
  exclusiveCodes?: string[];
  exclusiveMessage?: string;
  isPii?: boolean;
  relevant?: (data: Record<string, unknown>) => boolean;
  calculate?: (data: Record<string, unknown>) => number | string | undefined;
}

const num = (v: unknown): number | undefined => {
  if (v === '' || v === null || v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);

export function computeAgeYears(tglLahir: unknown): number | undefined {
  if (typeof tglLahir !== 'string' || !tglLahir) return undefined;
  const birth = new Date(`${tglLahir}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return undefined;
  const now = new Date();
  const diffDays = (now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return -1;
  return Math.floor(diffDays / 365.25);
}

export const MODUL_A_QUESTIONS: QuestionDef[] = [
  // Rumah Tangga
  { code: 'nama_kk', section: 'Rumah Tangga', type: 'text', label: 'Nama kepala rumah tangga', required: true },
  {
    code: 'jumlah_art',
    section: 'Rumah Tangga',
    type: 'integer',
    label: 'Jumlah anggota rumah tangga (yang tinggal dan makan bersama)',
    required: true,
    min: 1,
    max: 30,
  },
  {
    code: 'jumlah_kk',
    section: 'Rumah Tangga',
    type: 'integer',
    label: 'Jumlah Kartu Keluarga dalam rumah ini',
    required: true,
    min: 1,
    max: 10,
  },

  // Perumahan
  { code: 'status_rumah', section: 'Perumahan', type: 'select_one', listName: 'status_rumah', label: 'Status kepemilikan rumah', required: true },
  { code: 'bukti_tanah', section: 'Perumahan', type: 'select_one', listName: 'bukti_tanah', label: 'Bukti penguasaan tanah tempat rumah berdiri', required: true },
  {
    code: 'luas_bangunan',
    section: 'Perumahan',
    type: 'decimal',
    label: 'Luas bangunan rumah (m²)',
    hint: 'Perkiraan panjang × lebar',
    required: true,
    exclusiveMin: 0,
    max: 2000,
  },
  {
    code: 'luas_per_kapita',
    section: 'Perumahan',
    type: 'calculate',
    label: 'Luas bangunan per kapita (m²)',
    calculate: (d) => {
      const luas = num(d.luas_bangunan);
      const art = num(d.jumlah_art);
      if (luas === undefined || art === undefined || art <= 0) return undefined;
      return Math.round((luas / art) * 10) / 10;
    },
  },
  { code: 'dinding', section: 'Perumahan', type: 'select_one', listName: 'dinding', label: 'Bahan dinding terluas', required: true },
  { code: 'atap', section: 'Perumahan', type: 'select_one', listName: 'atap', label: 'Bahan atap terluas', required: true },
  { code: 'lantai', section: 'Perumahan', type: 'select_one', listName: 'lantai', label: 'Bahan lantai terluas', required: true },
  {
    code: 'jendela',
    section: 'Perumahan',
    type: 'integer',
    label: 'Jumlah jendela yang bisa dibuka',
    required: true,
    min: 0,
    max: 50,
  },

  // Air, sanitasi, energi, dan sampah
  { code: 'sumber_air', section: 'Air, Sanitasi, Energi & Sampah', type: 'select_one', listName: 'sumber_air', label: 'Sumber air utama untuk mandi dan mencuci', required: true },
  { code: 'air_minum', section: 'Air, Sanitasi, Energi & Sampah', type: 'select_one', listName: 'air_minum', label: 'Sumber air minum utama', required: true },
  { code: 'olah_air', section: 'Air, Sanitasi, Energi & Sampah', type: 'select_one', listName: 'olah_air', label: 'Cara mengolah air minum', required: true },
  { code: 'fasilitas_bab', section: 'Air, Sanitasi, Energi & Sampah', type: 'select_one', listName: 'fasilitas_bab', label: 'Fasilitas buang air besar', required: true },
  {
    code: 'lokasi_wc',
    section: 'Air, Sanitasi, Energi & Sampah',
    type: 'select_one',
    listName: 'lokasi_wc',
    label: 'Lokasi WC',
    required: true,
    relevant: (d) => d.fasilitas_bab === 'sendiri' || d.fasilitas_bab === 'bersama',
  },
  {
    code: 'kloset',
    section: 'Air, Sanitasi, Energi & Sampah',
    type: 'select_one',
    listName: 'kloset',
    label: 'Jenis kloset',
    required: true,
    relevant: (d) => Boolean(d.fasilitas_bab) && d.fasilitas_bab !== 'tidak_ada',
  },
  {
    code: 'buang_tinja',
    section: 'Air, Sanitasi, Energi & Sampah',
    type: 'select_one',
    listName: 'buang_tinja',
    label: 'Tempat pembuangan akhir tinja',
    required: true,
    relevant: (d) => Boolean(d.fasilitas_bab) && d.fasilitas_bab !== 'tidak_ada',
  },
  { code: 'penerangan', section: 'Air, Sanitasi, Energi & Sampah', type: 'select_one', listName: 'penerangan', label: 'Sumber penerangan utama', required: true },
  {
    code: 'daya',
    section: 'Air, Sanitasi, Energi & Sampah',
    type: 'select_one',
    listName: 'daya',
    label: 'Daya listrik terpasang',
    required: true,
    relevant: (d) => d.penerangan === 'pln_sendiri',
  },
  { code: 'bahan_bakar', section: 'Air, Sanitasi, Energi & Sampah', type: 'select_one', listName: 'bahan_bakar', label: 'Bahan bakar utama untuk memasak', required: true },
  { code: 'tempat_sampah', section: 'Air, Sanitasi, Energi & Sampah', type: 'select_one', listName: 'ya_tidak', label: 'Apakah di rumah tersedia tempat sampah?', required: true },
  { code: 'buang_sampah', section: 'Air, Sanitasi, Energi & Sampah', type: 'select_one', listName: 'buang_sampah', label: 'Cara utama membuang sampah', required: true },

  // Ekonomi rumah tangga
  {
    code: 'keluar_pangan',
    section: 'Ekonomi Rumah Tangga',
    type: 'integer',
    label: 'Pengeluaran makanan sebulan terakhir (Rp)',
    hint: 'Termasuk nilai hasil kebun/ternak sendiri yang dikonsumsi',
    required: true,
    min: 0,
    max: 100000000,
  },
  {
    code: 'keluar_nonpangan',
    section: 'Ekonomi Rumah Tangga',
    type: 'integer',
    label: 'Pengeluaran bukan makanan sebulan terakhir (Rp)',
    hint: 'Listrik, pulsa, transportasi, sekolah, kesehatan, cicilan, dll.',
    required: true,
    min: 0,
    max: 100000000,
  },
  {
    code: 'rawan_pangan',
    section: 'Ekonomi Rumah Tangga',
    type: 'select_one',
    listName: 'ya_tidak',
    label: 'Dalam 12 bulan terakhir, pernahkah rumah tangga ini kekurangan makanan karena tidak ada uang atau sumber daya lain?',
    required: true,
  },
  {
    code: 'catatan_lahan',
    section: 'Ekonomi Rumah Tangga',
    type: 'note',
    label: 'Luas lahan dalam m². Konversi: 1 tumbak/bata = 14 m²; 1 hektare = 10.000 m². Isi 0 jika tidak ada.',
  },
  { code: 'luas_sawah', section: 'Ekonomi Rumah Tangga', type: 'integer', label: 'Luas sawah yang dikuasai (m²)', required: true, min: 0, max: 1000000, defaultValue: 0 },
  {
    code: 'kuasa_sawah',
    section: 'Ekonomi Rumah Tangga',
    type: 'select_one',
    listName: 'penguasaan',
    label: 'Status penguasaan sawah',
    required: true,
    relevant: (d) => (num(d.luas_sawah) ?? 0) > 0,
  },
  { code: 'luas_kebun', section: 'Ekonomi Rumah Tangga', type: 'integer', label: 'Luas kebun/ladang yang dikuasai (m²)', required: true, min: 0, max: 1000000, defaultValue: 0 },
  {
    code: 'kuasa_kebun',
    section: 'Ekonomi Rumah Tangga',
    type: 'select_one',
    listName: 'penguasaan',
    label: 'Status penguasaan kebun/ladang',
    required: true,
    relevant: (d) => (num(d.luas_kebun) ?? 0) > 0,
  },
  { code: 'luas_pekarangan', section: 'Ekonomi Rumah Tangga', type: 'integer', label: 'Luas pekarangan yang dikuasai (m²)', required: true, min: 0, max: 1000000, defaultValue: 0 },
  {
    code: 'kuasa_pekarangan',
    section: 'Ekonomi Rumah Tangga',
    type: 'select_one',
    listName: 'penguasaan',
    label: 'Status penguasaan pekarangan',
    required: true,
    relevant: (d) => (num(d.luas_pekarangan) ?? 0) > 0,
  },
  { code: 'luas_kolam', section: 'Ekonomi Rumah Tangga', type: 'integer', label: 'Luas kolam/tambak yang dikuasai (m²)', required: true, min: 0, max: 1000000, defaultValue: 0 },
  {
    code: 'kuasa_kolam',
    section: 'Ekonomi Rumah Tangga',
    type: 'select_one',
    listName: 'penguasaan',
    label: 'Status penguasaan kolam/tambak',
    required: true,
    relevant: (d) => (num(d.luas_kolam) ?? 0) > 0,
  },
  {
    code: 'aset',
    section: 'Ekonomi Rumah Tangga',
    type: 'select_multiple',
    listName: 'aset',
    label: 'Aset ekonomi keluarga',
    required: true,
    exclusiveCodes: ['tidak_ada'],
    exclusiveMessage: "Opsi 'Tidak ada' tidak boleh dipilih bersama opsi lain",
  },
  { code: 'ternak_sapi', section: 'Ekonomi Rumah Tangga', type: 'integer', label: 'Jumlah sapi/kerbau', required: true, min: 0, max: 10000, defaultValue: 0 },
  { code: 'ternak_kambing', section: 'Ekonomi Rumah Tangga', type: 'integer', label: 'Jumlah kambing/domba', required: true, min: 0, max: 10000, defaultValue: 0 },
  { code: 'ternak_unggas', section: 'Ekonomi Rumah Tangga', type: 'integer', label: 'Jumlah ayam/itik', required: true, min: 0, max: 10000, defaultValue: 0 },
  { code: 'ternak_ikan_kolam', section: 'Ekonomi Rumah Tangga', type: 'integer', label: 'Jumlah kolam ikan (jumlah kolam)', required: true, min: 0, max: 10000, defaultValue: 0 },
  {
    code: 'pinjaman',
    section: 'Ekonomi Rumah Tangga',
    type: 'select_multiple',
    listName: 'pinjaman',
    label: 'Sumber pinjaman dalam 12 bulan terakhir',
    required: true,
    exclusiveCodes: ['tidak_pernah'],
    exclusiveMessage: "Opsi 'Tidak pernah' tidak boleh dipilih bersama opsi lain",
  },
  { code: 'terima_bansos', section: 'Ekonomi Rumah Tangga', type: 'select_one', listName: 'ya_tidak', label: 'Apakah rumah tangga menerima bantuan sosial?', required: true },
  {
    code: 'jenis_bansos',
    section: 'Ekonomi Rumah Tangga',
    type: 'select_multiple',
    listName: 'bansos',
    label: 'Jenis bantuan sosial yang diterima',
    required: true,
    relevant: (d) => d.terima_bansos === 'ya',
  },

  // Kendaraan, media, dan akses digital
  { code: 'televisi', section: 'Kendaraan, Media & Digital', type: 'select_one', listName: 'ya_tidak', label: 'Kepemilikan televisi', required: true },
  { code: 'jumlah_motor', section: 'Kendaraan, Media & Digital', type: 'integer', label: 'Jumlah sepeda motor', required: true, min: 0, max: 20, defaultValue: 0 },
  { code: 'jumlah_mobil', section: 'Kendaraan, Media & Digital', type: 'integer', label: 'Jumlah mobil', required: true, min: 0, max: 20, defaultValue: 0 },
  { code: 'sinyal', section: 'Kendaraan, Media & Digital', type: 'select_one', listName: 'sinyal', label: 'Kualitas sinyal seluler di rumah', required: true },
  { code: 'internet', section: 'Kendaraan, Media & Digital', type: 'select_one', listName: 'ya_tidak', label: 'Apakah rumah tangga punya akses internet (paket data atau WiFi)?', required: true },

  // Kerentanan bencana
  {
    code: 'bencana',
    section: 'Kerentanan Bencana',
    type: 'select_multiple',
    listName: 'bencana',
    label: 'Bencana yang dialami rumah tangga dalam 5 tahun terakhir',
    required: true,
    exclusiveCodes: ['tidak_ada'],
    exclusiveMessage: "Opsi 'Tidak ada' tidak boleh dipilih bersama opsi lain",
  },
  {
    code: 'dampak_bencana',
    section: 'Kerentanan Bencana',
    type: 'select_multiple',
    listName: 'dampak',
    label: 'Dampak bencana',
    required: true,
    relevant: (d) => {
      const b = arr(d.bencana);
      return b.length > 0 && !b.includes('tidak_ada');
    },
  },
];

export const MODUL_B_QUESTIONS: QuestionDef[] = [
  // Identitas anggota
  { code: 'nama', section: 'Identitas Anggota', type: 'text', label: 'Nama lengkap', required: true },
  { code: 'hubungan', section: 'Identitas Anggota', type: 'select_one', listName: 'hubungan', label: 'Hubungan dengan kepala rumah tangga', required: true },
  { code: 'jk', section: 'Identitas Anggota', type: 'select_one', listName: 'jk', label: 'Jenis kelamin', required: true },
  { code: 'tgl_lahir', section: 'Identitas Anggota', type: 'date', label: 'Tanggal lahir', required: true },
  {
    code: 'usia',
    section: 'Identitas Anggota',
    type: 'calculate',
    label: 'Usia (tahun)',
    calculate: (d) => computeAgeYears(d.tgl_lahir),
  },
  {
    code: 'info_usia',
    section: 'Identitas Anggota',
    type: 'note',
    label: 'Usia dihitung otomatis dari tanggal lahir.',
  },
  { code: 'kewarganegaraan', section: 'Identitas Anggota', type: 'select_one', listName: 'wn', label: 'Kewarganegaraan', required: true },

  // Kependudukan dan administrasi
  { code: 'status_penduduk', section: 'Kependudukan & Administrasi', type: 'select_one', listName: 'status_penduduk', label: 'Status kependudukan', required: true },
  {
    code: 'asal_kab',
    section: 'Kependudukan & Administrasi',
    type: 'text',
    label: 'Kabupaten/kota asal',
    required: true,
    relevant: (d) => Boolean(d.status_penduduk) && d.status_penduduk !== 'asli',
  },
  {
    code: 'tahun_tinggal',
    section: 'Kependudukan & Administrasi',
    type: 'integer',
    label: 'Tahun mulai tinggal di desa ini',
    required: true,
    min: 1940,
    max: 2026,
    relevant: (d) => Boolean(d.status_penduduk) && d.status_penduduk !== 'asli',
  },
  {
    code: 'nik',
    section: 'Kependudukan & Administrasi',
    type: 'text',
    label: 'NIK (16 digit)',
    hint: 'Tidak wajib. Isi hanya jika warga bersedia dan desa membutuhkannya untuk sinkronisasi data.',
    regex: '^[0-9]{16}$',
    regexMessage: 'NIK harus 16 digit angka',
    isPii: true,
  },
  {
    code: 'nik_aktif',
    section: 'Kependudukan & Administrasi',
    type: 'select_one',
    listName: 'ya_tidak_tahu',
    label: 'Apakah NIK sudah aktif/terdaftar di Dukcapil?',
    required: true,
    relevant: (d) => typeof d.nik === 'string' && d.nik.trim().length === 16,
  },
  {
    code: 'no_kk',
    section: 'Kependudukan & Administrasi',
    type: 'text',
    label: 'Nomor Kartu Keluarga (16 digit)',
    hint: 'Tidak wajib. Ketentuan sama dengan NIK.',
    regex: '^[0-9]{16}$',
    regexMessage: 'Nomor KK harus 16 digit angka',
    isPii: true,
    relevant: (d) => d.hubungan === 'kk',
  },
  {
    code: 'punya_ktp',
    section: 'Kependudukan & Administrasi',
    type: 'select_one',
    listName: 'ya_tidak',
    label: 'Memiliki KTP-el',
    required: true,
    relevant: (d) => (num(d.usia) ?? -1) >= 17,
  },
  { code: 'akta_lahir', section: 'Kependudukan & Administrasi', type: 'select_one', listName: 'ya_tidak', label: 'Memiliki akta kelahiran', required: true },
  {
    code: 'status_kawin',
    section: 'Kependudukan & Administrasi',
    type: 'select_one',
    listName: 'status_kawin',
    label: 'Status perkawinan',
    required: true,
    relevant: (d) => (num(d.usia) ?? -1) >= 10,
  },
  {
    code: 'buku_nikah',
    section: 'Kependudukan & Administrasi',
    type: 'select_one',
    listName: 'ya_tidak',
    label: 'Memiliki buku nikah/akta perkawinan',
    required: true,
    relevant: (d) => d.status_kawin === 'kawin',
  },
  {
    code: 'tahun_nikah',
    section: 'Kependudukan & Administrasi',
    type: 'integer',
    label: 'Tahun menikah (sesuai buku nikah)',
    min: 1940,
    max: 2026,
    relevant: (d) => d.buku_nikah === 'ya',
  },
  {
    code: 'jumlah_anak',
    section: 'Kependudukan & Administrasi',
    type: 'integer',
    label: 'Jumlah anak yang dimiliki',
    required: true,
    min: 0,
    max: 20,
    relevant: (d) => d.hubungan === 'kk' || d.hubungan === 'pasangan',
  },

  // Pendidikan dan keagamaan (usia >= 5)
  {
    code: 'partisipasi',
    section: 'Pendidikan & Keagamaan',
    type: 'select_one',
    listName: 'partisipasi',
    label: 'Partisipasi sekolah',
    required: true,
    relevant: (d) => (num(d.usia) ?? -1) >= 5,
  },
  {
    code: 'jenjang_sedang',
    section: 'Pendidikan & Keagamaan',
    type: 'select_one',
    listName: 'jenjang',
    label: 'Jenjang yang sedang diikuti',
    required: true,
    relevant: (d) => (num(d.usia) ?? -1) >= 5 && d.partisipasi === 'masih',
  },
  {
    code: 'bantuan_pendidikan',
    section: 'Pendidikan & Keagamaan',
    type: 'select_one',
    listName: 'ya_tidak',
    label: 'Menerima bantuan pendidikan (PIP, beasiswa, dll.)',
    required: true,
    relevant: (d) => (num(d.usia) ?? -1) >= 5 && d.partisipasi === 'masih',
  },
  {
    code: 'alasan_tidak_sekolah',
    section: 'Pendidikan & Keagamaan',
    type: 'select_one',
    listName: 'alasan',
    label: 'Alasan tidak sekolah lagi',
    required: true,
    relevant: (d) => {
      const u = num(d.usia) ?? -1;
      return u >= 5 && d.partisipasi === 'tidak_lagi' && u >= 7 && u <= 18;
    },
  },
  {
    code: 'ijazah',
    section: 'Pendidikan & Keagamaan',
    type: 'select_one',
    listName: 'ijazah',
    label: 'Ijazah tertinggi yang dimiliki',
    required: true,
    relevant: (d) => (num(d.usia) ?? -1) >= 5,
  },
  {
    code: 'nonformal',
    section: 'Pendidikan & Keagamaan',
    type: 'select_multiple',
    listName: 'nonformal',
    label: 'Pendidikan nonformal yang pernah/sedang diikuti',
    required: true,
    exclusiveCodes: ['tidak_ada'],
    exclusiveMessage: "Opsi 'Tidak ada' tidak boleh dipilih bersama opsi lain",
    relevant: (d) => (num(d.usia) ?? -1) >= 5,
  },
  {
    code: 'melek_latin',
    section: 'Pendidikan & Keagamaan',
    type: 'select_one',
    listName: 'melek',
    label: 'Kemampuan membaca dan menulis huruf Latin',
    required: true,
    relevant: (d) => (num(d.usia) ?? -1) >= 7,
  },
  {
    code: 'agama',
    section: 'Pendidikan & Keagamaan',
    type: 'select_one',
    listName: 'agama',
    label: 'Agama',
    required: true,
    relevant: (d) => (num(d.usia) ?? -1) >= 5,
  },
  {
    code: 'baca_quran',
    section: 'Pendidikan & Keagamaan',
    type: 'select_one',
    listName: 'quran',
    label: "Kemampuan membaca dan menulis Al-Qur'an",
    required: true,
    relevant: (d) => (num(d.usia) ?? -1) >= 5 && d.agama === 'islam',
  },

  // Pekerjaan dan penghasilan (usia >= 15)
  {
    code: 'pekerjaan',
    section: 'Pekerjaan & Penghasilan',
    type: 'select_one',
    listName: 'pekerjaan',
    label: 'Pekerjaan utama',
    required: true,
    relevant: (d) => (num(d.usia) ?? -1) >= 15,
  },
  {
    code: 'pekerjaan_lain',
    section: 'Pekerjaan & Penghasilan',
    type: 'text',
    label: 'Sebutkan pekerjaan lainnya',
    required: true,
    relevant: (d) => (num(d.usia) ?? -1) >= 15 && d.pekerjaan === 'lainnya',
  },
  {
    code: 'jenis_usaha',
    section: 'Pekerjaan & Penghasilan',
    type: 'text',
    label: 'Jenis usaha',
    required: true,
    relevant: (d) => (num(d.usia) ?? -1) >= 15 && d.pekerjaan === 'pedagang',
  },
  {
    code: 'penghasilan',
    section: 'Pekerjaan & Penghasilan',
    type: 'select_one',
    listName: 'penghasilan',
    label: 'Penghasilan per bulan dari seluruh pekerjaan (Rp)',
    hint: "Pilih 'Tidak bersedia menjawab' bila warga menolak.",
    required: true,
    relevant: (d) =>
      (num(d.usia) ?? -1) >= 15 &&
      Boolean(d.pekerjaan) &&
      d.pekerjaan !== 'tidak_bekerja' &&
      d.pekerjaan !== 'pelajar' &&
      d.pekerjaan !== 'mengurus_rt',
  },
  {
    code: 'keterampilan',
    section: 'Pekerjaan & Penghasilan',
    type: 'select_multiple',
    listName: 'keterampilan',
    label: 'Keterampilan usaha yang dimiliki',
    required: true,
    exclusiveCodes: ['tidak_ada'],
    exclusiveMessage: "Opsi 'Tidak ada' tidak boleh dipilih bersama opsi lain",
    relevant: (d) => (num(d.usia) ?? -1) >= 15,
  },
  {
    code: 'kerja_ln',
    section: 'Pekerjaan & Penghasilan',
    type: 'select_one',
    listName: 'ya_tidak',
    label: 'Pernah bekerja di luar negeri',
    required: true,
    relevant: (d) => (num(d.usia) ?? -1) >= 15,
  },
  {
    code: 'ln_sebagai',
    section: 'Pekerjaan & Penghasilan',
    type: 'text',
    label: 'Bekerja sebagai',
    required: true,
    relevant: (d) => (num(d.usia) ?? -1) >= 15 && d.kerja_ln === 'ya',
  },
  {
    code: 'ln_negara',
    section: 'Pekerjaan & Penghasilan',
    type: 'text',
    label: 'Di negara',
    required: true,
    relevant: (d) => (num(d.usia) ?? -1) >= 15 && d.kerja_ln === 'ya',
  },

  // Kesehatan dan disabilitas
  { code: 'bpjs', section: 'Kesehatan & Disabilitas', type: 'select_one', listName: 'bpjs', label: 'Status kepesertaan BPJS Kesehatan', required: true },
  {
    code: 'penyakit',
    section: 'Kesehatan & Disabilitas',
    type: 'select_multiple',
    listName: 'penyakit',
    label: 'Penyakit yang pernah didiagnosis dokter/tenaga kesehatan',
    hint: 'Tidak wajib',
    exclusiveCodes: ['tidak_ada', 'tidak_bersedia'],
    exclusiveMessage: "'Tidak ada' atau 'Tidak bersedia menjawab' tidak boleh dipilih bersama opsi lain",
  },
  {
    code: 'wg_intro',
    section: 'Kesehatan & Disabilitas',
    type: 'note',
    label: 'Pertanyaan berikut tentang kesulitan melakukan kegiatan sehari-hari (Washington Group Short Set).',
    relevant: (d) => (num(d.usia) ?? -1) >= 5,
  },
  {
    code: 'wg_lihat',
    section: 'Kesehatan & Disabilitas',
    type: 'select_one',
    listName: 'wg',
    label: 'Apakah mengalami kesulitan melihat, meskipun memakai kacamata?',
    required: true,
    relevant: (d) => (num(d.usia) ?? -1) >= 5,
  },
  {
    code: 'wg_dengar',
    section: 'Kesehatan & Disabilitas',
    type: 'select_one',
    listName: 'wg',
    label: 'Apakah mengalami kesulitan mendengar, meskipun memakai alat bantu dengar?',
    required: true,
    relevant: (d) => (num(d.usia) ?? -1) >= 5,
  },
  {
    code: 'wg_jalan',
    section: 'Kesehatan & Disabilitas',
    type: 'select_one',
    listName: 'wg',
    label: 'Apakah mengalami kesulitan berjalan atau naik tangga?',
    required: true,
    relevant: (d) => (num(d.usia) ?? -1) >= 5,
  },
  {
    code: 'wg_ingat',
    section: 'Kesehatan & Disabilitas',
    type: 'select_one',
    listName: 'wg',
    label: 'Apakah mengalami kesulitan mengingat atau berkonsentrasi?',
    required: true,
    relevant: (d) => (num(d.usia) ?? -1) >= 5,
  },
  {
    code: 'wg_urus_diri',
    section: 'Kesehatan & Disabilitas',
    type: 'select_one',
    listName: 'wg',
    label: 'Apakah mengalami kesulitan mengurus diri sendiri, seperti mandi atau berpakaian?',
    required: true,
    relevant: (d) => (num(d.usia) ?? -1) >= 5,
  },
  {
    code: 'wg_komunikasi',
    section: 'Kesehatan & Disabilitas',
    type: 'select_one',
    listName: 'wg',
    label: 'Apakah mengalami kesulitan berkomunikasi, misalnya memahami atau dipahami orang lain?',
    required: true,
    relevant: (d) => (num(d.usia) ?? -1) >= 5,
  },

  // KB dan kesehatan ibu
  {
    code: 'kb_aktif',
    section: 'KB & Kesehatan Ibu',
    type: 'select_one',
    listName: 'ya_tidak',
    label: 'Saat ini sedang memakai alat/cara KB?',
    required: true,
    relevant: (d) => {
      const u = num(d.usia) ?? -1;
      return d.jk === 'p' && u >= 15 && u <= 49 && d.status_kawin === 'kawin';
    },
  },
  {
    code: 'kb_metode',
    section: 'KB & Kesehatan Ibu',
    type: 'select_one',
    listName: 'kb',
    label: 'Metode KB yang dipakai',
    required: true,
    relevant: (d) => {
      const u = num(d.usia) ?? -1;
      return d.jk === 'p' && u >= 15 && u <= 49 && d.status_kawin === 'kawin' && d.kb_aktif === 'ya';
    },
  },
  {
    code: 'hamil',
    section: 'KB & Kesehatan Ibu',
    type: 'select_one',
    listName: 'ya_tidak',
    label: 'Saat ini sedang hamil?',
    required: true,
    relevant: (d) => {
      const u = num(d.usia) ?? -1;
      return d.jk === 'p' && u >= 15 && u <= 49 && d.status_kawin === 'kawin';
    },
  },
  {
    code: 'periksa_hamil',
    section: 'KB & Kesehatan Ibu',
    type: 'select_one',
    listName: 'ya_tidak',
    label: 'Sudah memeriksakan kehamilan ke tenaga kesehatan?',
    required: true,
    relevant: (d) => {
      const u = num(d.usia) ?? -1;
      return d.jk === 'p' && u >= 15 && u <= 49 && d.status_kawin === 'kawin' && d.hamil === 'ya';
    },
  },

  // Kesehatan balita (usia < 5)
  {
    code: 'posyandu_3bln',
    section: 'Kesehatan Balita',
    type: 'select_one',
    listName: 'ya_tidak',
    label: 'Datang ke posyandu dalam 3 bulan terakhir?',
    required: true,
    relevant: (d) => {
      const u = num(d.usia);
      return u !== undefined && u >= 0 && u < 5;
    },
  },
  {
    code: 'imunisasi',
    section: 'Kesehatan Balita',
    type: 'select_one',
    listName: 'imunisasi',
    label: 'Kelengkapan imunisasi sesuai usia (lihat buku KIA)',
    required: true,
    relevant: (d) => {
      const u = num(d.usia);
      return u !== undefined && u >= 0 && u < 5;
    },
  },
  {
    code: 'berat_badan',
    section: 'Kesehatan Balita',
    type: 'decimal',
    label: 'Berat badan terakhir (kg, dari buku KIA/KMS)',
    hint: 'Kosongkan jika tidak ada catatan',
    exclusiveMin: 1,
    exclusiveMax: 40,
    relevant: (d) => {
      const u = num(d.usia);
      return u !== undefined && u >= 0 && u < 5;
    },
  },
  {
    code: 'tinggi_badan',
    section: 'Kesehatan Balita',
    type: 'decimal',
    label: 'Tinggi/panjang badan terakhir (cm, dari buku KIA/KMS)',
    hint: 'Kosongkan jika tidak ada catatan',
    exclusiveMin: 30,
    exclusiveMax: 130,
    relevant: (d) => {
      const u = num(d.usia);
      return u !== undefined && u >= 0 && u < 5;
    },
  },

  // Partisipasi kelembagaan (usia >= 15)
  {
    code: 'keanggotaan',
    section: 'Partisipasi Kelembagaan',
    type: 'select_multiple',
    listName: 'lembaga',
    label: 'Keanggotaan dalam kelompok/lembaga',
    required: true,
    exclusiveCodes: ['tidak_ada'],
    exclusiveMessage: "Opsi 'Tidak ada' tidak boleh dipilih bersama opsi lain",
    relevant: (d) => (num(d.usia) ?? -1) >= 15,
  },
  {
    code: 'hadir_musyawarah',
    section: 'Partisipasi Kelembagaan',
    type: 'select_one',
    listName: 'ya_tidak',
    label: 'Hadir dalam musyawarah dusun/desa selama 12 bulan terakhir?',
    required: true,
    relevant: (d) => (num(d.usia) ?? -1) >= 15,
  },
  {
    code: 'punya_hp',
    section: 'Partisipasi Kelembagaan',
    type: 'select_one',
    listName: 'ya_tidak',
    label: 'Memiliki telepon seluler (HP)',
    required: true,
    relevant: (d) => (num(d.usia) ?? -1) >= 15,
  },
];

export const MODUL_C_QUESTIONS: QuestionDef[] = [
  {
    code: 'nama_resp_c',
    section: 'Responden Persepsi',
    type: 'text',
    label: 'Nama responden Modul C',
    hint: 'Anggota rumah tangga berusia 17 tahun ke atas',
    required: true,
  },
  // Pengelolaan sampah
  { code: 'k_selokan', section: 'Pengelolaan Sampah', type: 'select_one', listName: 'benar_salah', label: 'Sampah yang dibuang di selokan dapat menyebabkan banjir.', required: true },
  { code: 'k_kesehatan', section: 'Pengelolaan Sampah', type: 'select_one', listName: 'benar_salah', label: 'Sampah yang berserakan memengaruhi kesehatan masyarakat sekitar.', required: true },
  { code: 's_pilah', section: 'Pengelolaan Sampah', type: 'select_one', listName: 'likert', label: 'Saya bersedia memilah sampah organik dan anorganik di rumah jika tersedia fasilitasnya.', required: true },
  { code: 's_plastik', section: 'Pengelolaan Sampah', type: 'select_one', listName: 'likert', label: 'Saya mendukung aturan/larangan plastik sekali pakai di lingkungan saya.', required: true },
  { code: 's_guna_ulang', section: 'Pengelolaan Sampah', type: 'select_one', listName: 'likert', label: 'Saya menggunakan kembali barang bekas agar tidak langsung dibuang.', required: true },
  { code: 's_ajak', section: 'Pengelolaan Sampah', type: 'select_one', listName: 'likert', label: 'Saya mengajak keluarga atau tetangga menjaga kebersihan dan mengelola sampah.', required: true },
  { code: 's_rancang', section: 'Pengelolaan Sampah', type: 'select_one', listName: 'mampu', label: 'Saya dapat merancang langkah-langkah mengelola sampah di rumah atau lingkungan secara sistematis.', required: true },

  // Kehidupan keagamaan
  { code: 'lembaga_agama', section: 'Kehidupan Keagamaan', type: 'select_multiple', listName: 'lembaga_agama', label: 'Lembaga keagamaan yang ada di wilayah Anda', required: true },
  { code: 'ormas_ya', section: 'Kehidupan Keagamaan', type: 'select_one', listName: 'ya_tidak_tolak', label: 'Apakah Anda berafiliasi dengan organisasi kemasyarakatan keagamaan?', required: true },
  {
    code: 'ormas',
    section: 'Kehidupan Keagamaan',
    type: 'select_multiple',
    listName: 'ormas',
    label: 'Organisasi yang diikuti',
    required: true,
    relevant: (d) => d.ormas_ya === 'ya',
  },
  { code: 'tokoh_agama', section: 'Kehidupan Keagamaan', type: 'text', label: 'Tokoh agama yang berpengaruh di wilayah Anda', hint: 'Tidak wajib' },
  { code: 'panggilan_tokoh', section: 'Kehidupan Keagamaan', type: 'select_multiple', listName: 'panggilan', label: 'Panggilan untuk tokoh agama di wilayah ini' },
  { code: 'hubungan_lembaga', section: 'Kehidupan Keagamaan', type: 'select_one', listName: 'harmoni', label: 'Bagaimana hubungan antarlembaga/kelompok keagamaan di wilayah Anda?', required: true },
  { code: 'lintas_agama', section: 'Kehidupan Keagamaan', type: 'select_one', listName: 'ya_tidak', label: 'Apakah ada kegiatan sosial lintas agama atau lintas aliran?', required: true },
  {
    code: 'contoh_lintas',
    section: 'Kehidupan Keagamaan',
    type: 'text',
    label: 'Contoh kegiatannya',
    required: true,
    relevant: (d) => d.lintas_agama === 'ya',
  },
  { code: 'info_agama', section: 'Kehidupan Keagamaan', type: 'select_one', listName: 'info_agama', label: 'Sumber informasi keagamaan yang paling sering', required: true },
  { code: 'media_lokal', section: 'Kehidupan Keagamaan', type: 'select_one', listName: 'ya_tidak', label: 'Adakah media lokal/grup komunikasi yang menginformasikan kegiatan lintas agama?', required: true },
  {
    code: 'nama_media',
    section: 'Kehidupan Keagamaan',
    type: 'text',
    label: 'Nama atau bentuk medianya',
    required: true,
    relevant: (d) => d.media_lokal === 'ya',
  },
  { code: 'tempat_pertemuan', section: 'Kehidupan Keagamaan', type: 'select_one', listName: 'tempat', label: 'Di mana biasanya pertemuan keagamaan diadakan?', required: true },
  { code: 'topik_pertemuan', section: 'Kehidupan Keagamaan', type: 'text', label: 'Topik yang sering dibahas dalam pertemuan tersebut' },
  {
    code: 'catatan_enumerator',
    section: 'Penutup',
    type: 'text',
    label: 'Catatan enumerator',
    hint: 'Kendala, keraguan jawaban, dll.',
  },
];
