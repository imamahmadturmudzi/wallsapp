import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { Mail, Lock, Key, UserCheck, ShieldCheck, ArrowRight, BookOpen, User, Users, School, AlertCircle, Wallet, ArrowLeft, LayoutGrid, FileText, Terminal } from 'lucide-react';

const LoginPage = () => {
  const navigate = useNavigate();
  
  // Scope Utama: 'select', 'walasapp', 'simku', 'backdoor'
  const [appScope, setAppScope] = useState('select');
  const [walasMode, setWalasMode] = useState('login_guru'); 
  const [simkuMode, setSimkuMode] = useState('login_keuangan');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Pencatat Klik Rahasia ala Android Developer Options
  const [backdoorClicks, setBackdoorClicks] = useState(0);

  // Form State Umum
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [secretKey, setSecretKey] = useState('');
  
  // Form Ortu
  const [kodeSiswa, setKodeSiswa] = useState('');
  const [classCode, setClassCode] = useState('');

  const resetFormState = () => {
    setError('');
    setEmail('');
    setPassword('');
    setAccessCode('');
    setKodeSiswa('');
    setClassCode('');
    setSecretKey('');
    setBackdoorClicks(0); // Reset pencatat klik
  };

  // FUNGSI MENGHITUNG KLIK RAHASIA
  const handleHeaderClick = () => {
    // Jalur rahasia hanya bisa dipicu jika posisi sedang di halaman pemilihan utama
    if (appScope !== 'select') return;

    setBackdoorClicks((prev) => {
      const nextCount = prev + 1;
      if (nextCount >= 4) {
        setAppScope('backdoor');
        resetFormState();
        return 0;
      }
      return nextCount;
    });
  };

  // FUNGSI JALUR BELAKANG INVERSI ADMIN (BACKDOOR - SAAS BUILDER)
  const handleBackdoorAdmin = async (e) => {
    e.preventDefault();
    if (secretKey !== 'WALAS-SIMS-2026') {
      setError("Kunci otorisasi rahasia tidak valid!");
      return;
    }
    setLoading(true);
    setError('');
    
    try {
      // 1. Buat Akun Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // 2. GENERATE ID & TOKEN UNTUK SEKOLAH BARU (SaaS)
      const newSchoolId = "SCH-" + Math.random().toString(36).substring(2, 8).toUpperCase();
      const kodeJoin = "JOIN-" + Math.floor(1000 + Math.random() * 9000); // Cth: JOIN-4812

      // 3. Buat "Kamar" Sekolah Baru di Koleksi 'schools'
      await setDoc(doc(db, "schools", newSchoolId), {
        schoolId: newSchoolId,
        namaSekolah: "Institusi Baru (Belum Diatur)",
        logoUrl: "",
        adminUid: user.uid,
        kodeVerifikasiGuru: kodeJoin,
        createdAt: new Date().getTime()
      });
      
      // 4. Suntikkan Akun ke Koleksi 'teachers' dan Ikat ke Sekolah Baru
      await setDoc(doc(db, "teachers", user.uid), {
        name: "Super Admin Pusat",
        email: email,
        role: "admin",
        schoolId: newSchoolId, // TERTAMBAT KE SEKOLAH BARU
        className: "",
        activatedAt: new Date().getTime()
      });

      // 5. Berikan Informasi Kunci ke Admin
      alert(`INISIALISASI SAAS BERHASIL!\n\nID Sekolah: ${newSchoolId}\nKode Registrasi Guru: ${kodeJoin}\n\nSimpan kode registrasi ini untuk dibagikan kepada staf pengajar Anda.`);
      
      setAppScope('select');
      resetFormState();
    } catch (err) {
      // Jika error karena email sudah terdaftar, beritahu cara upgrade-nya
      if (err.code === 'auth/email-already-in-use') {
        setError("Email ini sudah terdaftar sebagai Guru/Staf biasa. Untuk menaikkan pangkatnya, mohon hapus akun di Firebase Console terlebih dahulu, atau gunakan email lain.");
      } else {
        setError(err.message || "Gagal mengeksekusi jalur belakang SaaS.");
      }
    }
    setLoading(false);
  };

  const handleLoginStaff = async (e, targetApp) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const docRef = doc(db, "teachers", user.uid);
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        const userRole = snap.data().role;
        if (targetApp === 'simku' && !['admin', 'bendahara', 'kaur_tu'].includes(userRole)) {
          throw new Error("Akses ditolak. Akun Anda tidak memiliki otoritas pada modul keuangan SIM-KU.");
        }
      }
      navigate(targetApp === 'simku' ? '/simku' : '/');
    } catch (err) {
      setError(err.message || "Kredensial tidak valid atau otorisasi hak akses ditolak.");
    }
    setLoading(false);
  };

  const handleAktivasiGuru = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // 1. CARI SEKOLAH BERDASARKAN KODE REGISTRASI (accessCode)
      const qSekolah = query(collection(db, "schools"), where("kodeVerifikasiGuru", "==", accessCode.trim().toUpperCase()));
      const snapSekolah = await getDocs(qSekolah);

      if (snapSekolah.empty) {
        throw new Error("Kode Registrasi Sekolah tidak valid! Silakan minta kode yang benar dari Admin Anda.");
      }

      // 2. Ambil Data Sekolah yang Cocok
      const dataSekolah = snapSekolah.docs[0].data();
      const targetSchoolId = dataSekolah.schoolId;

      // 3. Daftarkan Akun ke Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 4. Suntikkan Profil Guru ke Firestore & Ikat ke Sekolah Tersebut
      await setDoc(doc(db, "teachers", user.uid), {
        name: "Pendidik Baru", // Nama default, bisa diubah guru di menu Pengaturan
        email: email,
        role: "guru_mapel", // Default masuk sebagai Guru Mapel
        schoolId: targetSchoolId, // TERTAMBAT OTOMATIS KE SEKOLAH ADMIN
        className: "",
        activatedAt: new Date().getTime()
      });

      alert(`Pendaftaran Berhasil!\nAnda kini terhubung dengan ekosistem: ${dataSekolah.namaSekolah}\n\nSilakan lengkapi profil Anda di menu Pengaturan.`);
      setAppScope('select');
      resetFormState();
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError("Email ini sudah terdaftar di sistem. Silakan langsung otorisasi masuk.");
      } else {
        setError(err.message || "Gagal melakukan registrasi. Pastikan kata sandi minimal 6 karakter.");
      }
    }
    setLoading(false);
  };

  const handleLoginOrtu = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const qKelas = query(collection(db, "teachers"), where("classCode", "==", classCode.toUpperCase()));
      const snapKelas = await getDocs(qKelas);

      if (snapKelas.empty) {
        throw new Error("Kode Rombongan Belajar (Kelas) tidak valid.");
      }

      const teacherData = snapKelas.docs[0].data();
      const teacherId = snapKelas.docs[0].id;

      const qSiswa = query(collection(db, "siswa"), 
        where("teacherId", "==", teacherId), 
        where("nisn", "==", kodeSiswa)
      );
      const snapSiswa = await getDocs(qSiswa);

      if (snapSiswa.empty) {
        throw new Error("Kode Siswa/NISN tidak ditemukan pada rombongan belajar tersebut.");
      }

      const studentData = { id: snapSiswa.docs[0].id, ...snapSiswa.docs[0].data() };
      
      localStorage.setItem("isOrtuLoggedin", "true");
      localStorage.setItem("ortu_studentData", JSON.stringify({
        ...studentData,
        className: teacherData.className 
      }));
      
      navigate('/rapor');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleResetPassword = async (e, successMode, backScope) => {
    e.preventDefault();
    if (!email) {
      setError("Silakan lengkapi alamat email Anda pada kolom yang tersedia.");
      return;
    }
    setLoading(true);
    setError('');
    try {
      await sendPasswordResetEmail(auth, email);
      alert("Tautan pemulihan akses telah dikirimkan ke email Anda.");
      setAppScope(backScope);
      if(backScope === 'walasapp') setWalasMode(successMode);
      else setSimkuMode(successMode);
    } catch (err) {
      setError("Gagal memproses permintaan. Pastikan format email sudah sesuai.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans text-gray-800 selection:bg-gray-200 selection:text-gray-900">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-gray-200 overflow-hidden transition-all">
        
        {/* HEADER UTAMA (KETUK 4 KALI DI SINI UNTUK MEMBUKA JALUR RAHASIA) */}
        <div 
          onClick={handleHeaderClick}
          className="px-8 pt-10 pb-6 text-center border-b border-gray-100 relative cursor-pointer select-none"
          title="Mekanik proteksi sistem terpadu"
        >
          {appScope !== 'select' && (
            <button 
              onClick={(e) => { e.stopPropagation(); setAppScope('select'); resetFormState(); }}
              className="absolute left-6 top-10 p-2 text-gray-400 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <div className="mb-5 flex justify-center">
             <img src="/logo192.png" alt="Logo WalasApp" className="w-20 h-20 drop-shadow-md rounded-2xl" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">WalasApp</h1>
          <p className="text-gray-500 font-medium text-sm mt-1.5">
            {appScope === 'select' && "Pusat Hub Layanan Digital Terpadu"}
            {appScope === 'walasapp' && "Sistem Manajemen Rapor Akademik"}
            {appScope === 'simku' && "Sistem Informasi Manajemen Keuangan"}
            {appScope === 'backdoor' && "Inisialisasi Sistem Otoritas Pusat"}
          </p>
        </div>

        <div className="p-8">

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg text-xs font-medium mb-6 flex items-start gap-2.5">
              <AlertCircle size={16} className="shrink-0 mt-0.5" /> 
              <span>{error}</span>
            </div>
          )}

          {/* ======================================================== */}
          {/* LAYER 0: SELECTION SCREEN                                */}
          {/* ======================================================== */}
          {appScope === 'select' && (
            <div className="space-y-4 animate-fade-in">
              <p className="text-center text-xs font-bold text-gray-400 uppercase tracking-wider mb-5">Pilih Portal Otorisasi</p>
              
              <button onClick={() => { setAppScope('walasapp'); setWalasMode('login_guru'); resetFormState(); }} className="w-full text-left p-4 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-all flex items-center justify-between group shadow-sm hover:border-gray-300">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center text-gray-600 group-hover:bg-white"><BookOpen size={20} /></div>
                  <div>
                    <h3 className="font-bold text-sm text-gray-800">SIM-GO</h3>
                    <p className="text-[11px] text-gray-500 font-medium mt-0.5">Penilaian Academic, Rapor & Data Induk</p>
                  </div>
                </div>
                <ArrowRight size={16} className="text-gray-300 group-hover:text-gray-700 transition-colors" />
              </button>

              <button onClick={() => { setAppScope('simku'); setSimkuMode('login_keuangan'); resetFormState(); }} className="w-full text-left p-4 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-all flex items-center justify-between group shadow-sm hover:border-gray-300">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center text-gray-600 group-hover:bg-white"><Wallet size={20} /></div>
                  <div>
                    <h3 className="font-bold text-sm text-gray-800">SIM-KU (dalam pengembangan)</h3>
                    <p className="text-[11px] text-gray-500 font-medium mt-0.5">Manajemen Buku Kas, Anggaran & Iuran</p>
                  </div>
                </div>
                <ArrowRight size={16} className="text-gray-300 group-hover:text-gray-700 transition-colors" />
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* LAYER 1: WALASAPP AUTH CONTROLLER                        */}
          {/* ======================================================== */}
          {appScope === 'walasapp' && (
            <div className="space-y-5">
              {(walasMode === 'login_guru' || walasMode === 'login_ortu') && (
                <div className="flex gap-2 p-1.5 bg-gray-50 rounded-xl border border-gray-200 mb-6">
                  <button type="button" onClick={() => { setWalasMode('login_guru'); setError(''); }} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex justify-center items-center gap-2 ${walasMode === 'login_guru' ? 'bg-white text-gray-800 shadow-sm border border-gray-200/50' : 'text-gray-500 hover:text-gray-700'}`}><User size={14} /> Pendidik</button>
                  <button type="button" onClick={() => { setWalasMode('login_ortu'); setError(''); }} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex justify-center items-center gap-2 ${walasMode === 'login_ortu' ? 'bg-white text-gray-800 shadow-sm border border-gray-200/50' : 'text-gray-500 hover:text-gray-700'}`}><Users size={14} /> Orang Tua</button>
                </div>
              )}

              {walasMode === 'login_guru' && (
                <form onSubmit={(e) => handleLoginStaff(e, 'walasapp')} className="space-y-5 animate-slide-up">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Alamat Email Staf</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3 text-gray-400" size={18} />
                      <input type="email" placeholder="email@sekolah.com" value={email} onChange={e=>setEmail(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-500 text-sm font-medium" required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5 flex justify-between">Kata Sandi<button type="button" onClick={() => { setWalasMode('lupa_password'); setError(''); }} className="text-gray-500 hover:text-gray-800 transition-colors lowercase font-semibold">lupa sandi?</button></label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3 text-gray-400" size={18} />
                      <input type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-500 text-sm font-medium" required />
                    </div>
                  </div>
                  <button disabled={loading} className="w-full bg-gray-900 text-white font-medium text-sm py-3 rounded-lg hover:bg-black flex justify-center items-center gap-2">{loading ? "Memverifikasi..." : "Otorisasi Masuk"} <ArrowRight size={16} /></button>
                  <div className="text-center pt-4 border-t border-gray-100 mt-6">
                    <p className="text-xs text-gray-500 font-medium">Staf baru belum memiliki akun aktif?</p>
                    <button type="button" onClick={() => { setWalasMode('aktivasi_guru'); setError(''); }} className="text-xs text-gray-800 font-bold hover:underline mt-1.5">Registrasi Akun Pegawai</button>
                  </div>
                </form>
              )}

              {walasMode === 'aktivasi_guru' && (
                <form onSubmit={handleAktivasiGuru} className="space-y-5 animate-slide-up">
                  <div className="bg-gray-50 border border-gray-200 p-3.5 rounded-lg"><p className="text-[11px] text-gray-600 font-medium leading-relaxed">Lengkapi data sesuai dengan konfigurasi acak yang diberikan oleh Administrator Kepegawaian.</p></div>
                  <div><label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Email Terdaftar</label><div className="relative"><Mail className="absolute left-3.5 top-3 text-gray-400" size={18}/><input type="email" placeholder="Sesuai data kepegawaian" value={email} onChange={e=>setEmail(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg outline-none" required /></div></div>
                  <div><label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Kode Kredensial Pusat</label><div className="relative"><Key className="absolute left-3.5 top-3 text-gray-400" size={18}/><input type="text" placeholder="6 Karakter" value={accessCode} onChange={e=>setAccessCode(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none font-mono font-bold tracking-widest uppercase text-gray-800" required /></div></div>
                  <div><label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Buat Kata Sandi Akun</label><div className="relative"><Lock className="absolute left-3.5 top-3 text-gray-400" size={18}/><input type="password" placeholder="Minimal 6 karakter" value={password} onChange={e=>setPassword(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg outline-none text-sm" required /></div></div>
                  <button disabled={loading} className="w-full bg-gray-800 text-white font-medium text-sm py-3 rounded-lg hover:bg-gray-900 flex justify-center items-center gap-2">{loading ? "Menyinkronkan..." : "Aktivasi Dokumen"} <UserCheck size={16} /></button>
                </form>
              )}

              {walasMode === 'login_ortu' && (
                <form onSubmit={handleLoginOrtu} className="space-y-5 animate-slide-up">
                  <div className="bg-gray-50 border border-gray-200 p-3.5 rounded-lg"><p className="text-[11px] text-gray-600 font-medium leading-relaxed">Akses dokumen hasil belajar menggunakan token unik kelas dari Wali Kelas Anda.</p></div>
                  <div><label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Kode Rombel (Kelas)</label><div className="relative"><School className="absolute left-3.5 top-3 text-gray-400" size={18}/><input type="text" placeholder="Cth: X7B9K" value={classCode} onChange={e=>setClassCode(e.target.value.toUpperCase())} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none text-sm font-bold tracking-widest uppercase" required /></div></div>
                  <div><label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Kode Autentikasi Siswa</label><div className="relative"><User className="absolute left-3.5 top-3 text-gray-400" size={18}/><input type="text" placeholder="Nomor NISN / Sandi Pokok" value={kodeSiswa} onChange={e=>setKodeSiswa(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg outline-none text-sm font-mono font-medium" required /></div></div>
                  <button disabled={loading} className="w-full bg-gray-800 text-white font-medium text-sm py-3 rounded-lg hover:bg-gray-900 flex justify-center items-center gap-2">{loading ? "Membuka Berkas..." : "Buka Dokumen Rapor"} <BookOpen size={16} /></button>
                </form>
              )}

              {walasMode === 'lupa_password' && (
                <form onSubmit={(e) => handleResetPassword(e, 'login_guru', 'walasapp')} className="space-y-5 animate-slide-up">
                  <div className="bg-gray-50 border border-gray-200 p-3.5 rounded-lg"><p className="text-[11px] text-gray-600 font-medium leading-relaxed">Tautan pemulihan otorisasi akan dikirimkan ke alamat email utama yang terdaftar.</p></div>
                  <div><label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Alamat Email Guru</label><div className="relative"><Mail className="absolute left-3.5 top-3 text-gray-400" size={18}/><input type="email" placeholder="nama@sekolah.com" value={email} onChange={e=>setEmail(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg outline-none" required /></div></div>
                  <button disabled={loading} className="w-full bg-gray-800 text-white font-medium text-sm py-3 rounded-lg hover:bg-gray-900">{loading ? "Mengirim..." : "Kirim Tautan Pemulihan"}</button>
                </form>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* LAYER 2: SIM-KU AUTH CONTROLLER                          */}
          {/* ======================================================== */}
          {appScope === 'simku' && (
            <div className="space-y-5">
              <div className="bg-gray-50 border border-gray-200 p-3.5 rounded-lg mb-2"><p className="text-[11px] text-gray-600 font-medium leading-relaxed flex items-center gap-2"><AlertCircle size={14} className="text-gray-500 shrink-0"/>Konsol khusus Bendahara Madrasah dan Kepala Urusan Tata Usaha.</p></div>
              {simkuMode === 'login_keuangan' && (
                <form onSubmit={(e) => handleLoginStaff(e, 'simku')} className="space-y-5 animate-slide-up">
                  <div><label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Email Operator Keuangan</label><div className="relative"><Mail className="absolute left-3.5 top-3 text-gray-400" size={18}/><input type="email" placeholder="bendahara@sekolah.com" value={email} onChange={e=>setEmail(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg outline-none text-sm font-medium text-gray-800" required /></div></div>
                  <div><label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5 flex justify-between">Kunci Sandi Keuangan<button type="button" onClick={() => { setSimkuMode('lupa_password_keuangan'); setError(''); }} className="text-gray-500 hover:text-gray-800 transition-colors lowercase font-semibold">lupa sandi?</button></label><div className="relative"><Lock className="absolute left-3.5 top-3 text-gray-400" size={18}/><input type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg outline-none text-sm font-medium text-gray-800" required /></div></div>
                  <button disabled={loading} className="w-full bg-gray-900 text-white font-medium text-sm py-3 rounded-lg hover:bg-black flex justify-center items-center gap-2">{loading ? "Mengautentikasi..." : "Buka Konsol Keuangan"} <ArrowRight size={16} /></button>
                </form>
              )}
              {simkuMode === 'lupa_password_keuangan' && (
                <form onSubmit={(e) => handleResetPassword(e, 'login_keuangan', 'simku')} className="space-y-5 animate-slide-up">
                  <div className="bg-gray-50 border border-gray-200 p-3.5 rounded-lg"><p className="text-[11px] text-gray-600 font-medium leading-relaxed">Masukkan alamat email bendahara/TU Anda untuk meminta instruksi pengaturan ulang kata sandi.</p></div>
                  <div><label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Email Penanggung Jawab</label><div className="relative"><Mail className="absolute left-3.5 top-3 text-gray-400" size={18}/><input type="email" placeholder="bendahara@sekolah.com" value={email} onChange={e=>setEmail(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg outline-none" required /></div></div>
                  <button disabled={loading} className="w-full bg-gray-800 text-white font-medium text-sm py-3 rounded-lg hover:bg-gray-900">{loading ? "Memproses..." : "Kirim Instruksi Sandi"}</button>
                </form>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* LAYER 3: INTERFACES FOR BACKDOOR INVERSION               */}
          {/* ======================================================== */}
          {appScope === 'backdoor' && (
            <form onSubmit={handleBackdoorAdmin} className="space-y-5 animate-slide-up">
              <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-lg text-xs font-semibold">
                Peringatan: Area enkripsi internal. Digunakan hanya untuk mendaftarkan akun Super Admin utama sistem.
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Email Admin Baru</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 text-gray-400" size={18} />
                  <input type="email" placeholder="admin@sekolah.sch.id" value={email} onChange={e=>setEmail(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg outline-none text-sm text-gray-800" required />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Kata Sandi Admin</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 text-gray-400" size={18} />
                  <input type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg outline-none text-sm text-gray-800" required />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-red-600 uppercase mb-1.5 ml-0.5">Kunci Otorisasi Rahasia</label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-3 text-red-400" size={18} />
                  <input type="password" placeholder="Masukkan Secret Key" value={secretKey} onChange={e=>setSecretKey(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-red-50/30 border border-red-200 rounded-lg outline-none text-sm font-mono tracking-widest font-bold text-red-700" required />
                </div>
              </div>
              <button disabled={loading} className="w-full bg-red-600 text-white font-medium text-sm py-3 rounded-lg hover:bg-red-700 flex justify-center items-center gap-2">
                {loading ? "Menyuntikkan Otoritas..." : "Inisialisasi Super Admin"}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};

export default LoginPage;