import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, onSnapshot, query, orderBy, limit, where, getDoc, doc, getDocs } from 'firebase/firestore';
import { Users, UserCheck, Clock, TrendingUp, AlertCircle, Calendar, ShieldCheck, School, BookOpen, User, BookMarked, ClipboardList, Share2, Trash2 } from 'lucide-react';
import LegerNilai from '../components/LegerNilai';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [teacherProfile, setTeacherProfile] = useState({ schoolName: "Memuat...", className: "", role: "wali_kelas" });
  const [totalSiswa, setTotalSiswa] = useState(0);
  const [jurnalLogs, setJurnalLogs] = useState([]);
  const [adminStats, setAdminStats] = useState({ totalGuru: 0, totalSiswa: 0, totalKelas: 0 });
  const [adminGuruList, setAdminGuruList] = useState([]); 
  const [jadwalMengajar, setJadwalMengajar] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // MESIN SAAS DASHBOARD UTAMA
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (user) {
        // 1. Tarik profil guru yang sedang login terlebih dahulu
        const docRef = doc(db, "teachers", user.uid);
        const docSnap = await getDoc(docRef);
        let userRole = 'wali_kelas';
        let profileData = {};
        let currentSchoolId = "";

        if (docSnap.exists()) {
          profileData = docSnap.data();
          userRole = profileData.role || 'wali_kelas';
          currentSchoolId = profileData.schoolId || "";
        }

        // 2. Tarik info sekolah dari kamar schools, bukan metadata lagi
        let liveSchoolName = "Sekolah Belum Diatur";
        if (currentSchoolId) {
          const schoolSnap = await getDoc(doc(db, "schools", currentSchoolId));
          if (schoolSnap.exists()) {
            liveSchoolName = schoolSnap.data().namaSekolah || "Sekolah Belum Diatur";
          }
        }

        // Set profil dasar untuk UI
        profileData.schoolName = liveSchoolName; 
        setTeacherProfile(profileData);

        // ==========================================
        // PARSING DATA BERDASARKAN ROLE (SAAS MODE)
        // ==========================================
        if (userRole === 'admin') {
          try {
            if (currentSchoolId) {
              // GEMBOK SAAS ADMIN: Hanya ambil data yang memiliki schoolId sekolah ini
              const qGuru = query(collection(db, "teachers"), where("schoolId", "==", currentSchoolId));
              const qSiswa = query(collection(db, "siswa"), where("schoolId", "==", currentSchoolId));
              
              const guruSnap = await getDocs(qGuru);
              const siswaSnap = await getDocs(qSiswa);
              
              const guruData = guruSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
              setAdminGuruList(guruData); 

              setAdminStats({
                totalGuru: guruSnap.size,
                totalSiswa: siswaSnap.size,
                totalKelas: guruData.filter(d => d.role === 'wali_kelas' || d.role === 'ganda').length
              });
            }
          } catch (e) {
            console.error("Gagal memuat statistik Admin SaaS:", e);
          }
          setLoading(false);

        } else if (userRole === 'guru_mapel') {
          try {
            if (currentSchoolId) {
              const namaHariIni = currentTime.toLocaleDateString('id-ID', { weekday: 'long' }); 
              
              // GEMBOK SAAS GURU MAPEL: Hanya ambil berkas jadwal milik sekolahnya sendiri
              const qJadwal = query(collection(db, "jadwal"), where("schoolId", "==", currentSchoolId));
              const jadwalSnap = await getDocs(qJadwal);
              
              let myScheduleToday = [];

              jadwalSnap.forEach(doc => {
                const dataKelas = doc.data();
                const jadwalHariIni = dataKelas.jadwal?.[namaHariIni] || [];
                
                jadwalHariIni.forEach(slot => {
                  if (slot.guruId === user.uid) {
                    myScheduleToday.push({
                      className: dataKelas.className,
                      classId: dataKelas.classId || doc.id,
                      ...slot
                    });
                  }
                });
              });

              myScheduleToday.sort((a, b) => a.jamMulai.localeCompare(b.jamMulai));
              setJadwalMengajar(myScheduleToday);
            }
          } catch (e) {
            console.error("Gagal memuat jadwal Guru SaaS:", e);
          }
          setLoading(false);

        } else {
          // GEMBOK SAAS WALI KELAS: Proteksi realtime siswa & jurnal
          // Karena ID Kelas terkunci di UID Wali, ini sudah aman, namun kita tambahkan stempel where schoolId demi konsistensi data
          const qSiswa = query(
            collection(db, "siswa"), 
            where("teacherId", "==", user.uid),
            where("schoolId", "==", currentSchoolId)
          );
          const unsubSiswa = onSnapshot(qSiswa, (snapshot) => setTotalSiswa(snapshot.size));

          const qJurnal = query(
            collection(db, "jurnal"), 
            where("teacherId", "==", user.uid),
            where("schoolId", "==", currentSchoolId), // Pastikan koleksi jurnal Anda nanti menyimpan atribut schoolId saat disubmit guru
            orderBy("createdAt", "desc"), 
            limit(5)
          );
          
          const unsubJurnal = onSnapshot(qJurnal, (snapshot) => {
            setJurnalLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
          }, (err) => {
            console.error("Jurnal onSnapshot error (Kemungkinan indeks Firestore belum dibuat):", err);
            setLoading(false); // Amankan antarmuka dari hang loading
          });

          return () => { unsubSiswa(); unsubJurnal(); };
        }
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, [currentTime.getDate()]); 

  const handleGenerateClassCode = async () => {
    if (!teacherProfile) return;
    
    const inputCode = prompt(
      "Masukkan Kode Kelas (Tanpa spasi, misal: 7AHEBAT):", 
      teacherProfile.classCode || ""
    );
    
    if (inputCode === null || inputCode.trim() === "") return;

    const newCode = inputCode.replace(/\s+/g, '').toUpperCase();
    
    try {
      const { updateDoc, doc } = await import('firebase/firestore'); 
      await updateDoc(doc(db, "teachers", auth.currentUser.uid), {
        classCode: newCode
      });
      setTeacherProfile(prev => ({ ...prev, classCode: newCode })); 
      alert(`Kode Kelas berhasil diatur menjadi: ${newCode}`);
    } catch (error) {
      console.error(error);
      alert("Gagal menyimpan kode kelas.");
    }
  };

  const handleDeleteKelas = async (teacherId, className, teacherName) => {
    const isConfirm = confirm(`Hapus kaitan Kelas ${className} dari Bapak/Ibu ${teacherName}? (Hanya kelasnya yang di-reset)`);
    if (!isConfirm) return;

    try {
      const { updateDoc, doc } = await import('firebase/firestore');
      await updateDoc(doc(db, "teachers", teacherId), {
        className: "",
        classCode: "" 
      });
      
      setAdminGuruList(prev => prev.map(g => g.id === teacherId ? { ...g, className: "", classCode: "" } : g));
      setAdminStats(prev => ({...prev, totalKelas: prev.totalKelas - 1}));
      alert("Kelas berhasil dihapus/direset.");
    } catch (error) {
      console.error(error);
      alert("Gagal menghapus kelas.");
    }
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 11) return "Selamat Pagi";
    if (hour < 15) return "Selamat Siang";
    if (hour < 18) return "Selamat Sore";
    return "Selamat Malam";
  };

  if (loading) {
     return <div className="p-8 text-center text-gray-500 font-medium animate-pulse mt-20">Memuat data Dashboard...</div>;
  }

  // ==========================================
  // WAJAH 1: TAMPILAN SUPER ADMIN
  // ==========================================
  if (teacherProfile.role === 'admin') {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 animate-fade-in font-sans text-gray-800">
        
        {/* HEADER ADMIN (Flat & Clean) */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
           <div>
             <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <ShieldCheck className="text-teal-600" size={24} /> Pusat Kendali Admin
             </h1>
             <p className="text-sm text-gray-500 mt-1">Sistem Informasi Manajemen Sekolah (SIMS)</p>
           </div>
           <div className="flex flex-col sm:flex-row gap-3 text-sm">
             <div className="px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 font-medium">
               {teacherProfile.schoolName || "Instansi Belum Diatur"}
             </div>
             <div className="px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 flex items-center gap-2 text-gray-700">
                <Clock size={16} className="text-gray-400" />
                <span className="font-mono font-medium">{currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</span>
             </div>
           </div>
        </div>

        {/* STATISTIK ADMIN */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 flex items-center gap-5">
            <div className="w-12 h-12 bg-gray-50 text-gray-600 rounded-xl flex items-center justify-center border border-gray-100"><Users size={24} /></div>
            <div><p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Pendidik</p><p className="text-2xl font-bold text-gray-800">{adminStats.totalGuru}</p></div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-200 flex items-center gap-5">
            <div className="w-12 h-12 bg-gray-50 text-gray-600 rounded-xl flex items-center justify-center border border-gray-100"><BookOpen size={24} /></div>
            <div><p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Siswa</p><p className="text-2xl font-bold text-gray-800">{adminStats.totalSiswa}</p></div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-200 flex items-center gap-5">
            <div className="w-12 h-12 bg-gray-50 text-gray-600 rounded-xl flex items-center justify-center border border-gray-100"><School size={24} /></div>
            <div><p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Rombongan Belajar</p><p className="text-2xl font-bold text-gray-800">{adminStats.totalKelas}</p></div>
          </div>
        </div>

        {/* DAFTAR KELAS & TOMBOL HAPUS */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex justify-between items-center">
             <h2 className="text-base font-bold text-gray-800">Manajemen Rombongan Belajar</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 uppercase text-xs border-b border-gray-100">
                  <th className="py-3 px-5 font-semibold">Nama Guru</th>
                  <th className="py-3 px-5 text-center font-semibold">Kelas Ampuan</th>
                  <th className="py-3 px-5 text-center font-semibold">Kode Akses Ortu</th>
                  <th className="py-3 px-5 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {adminGuruList.filter(g => (g.role === 'wali_kelas' || g.role === 'ganda') && g.className).length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center p-8 text-gray-400 italic">Belum ada kelas yang dibuat.</td>
                  </tr>
                ) : (
                  adminGuruList
                    .filter(g => (g.role === 'wali_kelas' || g.role === 'ganda') && g.className)
                    .map(guru => (
                    <tr key={guru.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-5 font-medium text-gray-800">{guru.name}</td>
                      <td className="py-3 px-5 text-center">
                         <span className="bg-gray-100 text-gray-700 font-bold px-2 py-1 rounded text-xs border border-gray-200">{guru.className}</span>
                      </td>
                      <td className="py-3 px-5 text-center font-mono text-gray-500 text-xs">{guru.classCode || '-'}</td>
                      <td className="py-3 px-5 text-right">
                        <button 
                          onClick={() => handleDeleteKelas(guru.id, guru.className, guru.name)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                          title="Hapus Kelas Ini"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // WAJAH 2: TAMPILAN GURU MAPEL
  // ==========================================
  if (teacherProfile.role === 'guru_mapel') {
    return (
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto animate-fade-in font-sans text-gray-800">
        
        <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
           <div>
             <h1 className="text-2xl font-bold text-gray-800">
               {getGreeting()}, {teacherProfile.name}!
             </h1>
             <p className="text-sm text-gray-500 mt-1">{teacherProfile.schoolName} • Guru Mata Pelajaran</p>
           </div>
           <div className="px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 flex items-center gap-2 text-gray-700 text-sm">
              <Clock size={16} className="text-gray-400" />
              <span className="font-mono font-medium">{currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</span>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <Calendar size={18} className="text-gray-400"/> Jadwal Mengajar Hari Ini
            </h2>
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden min-h-[300px]">
              {jadwalMengajar.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-gray-400 h-full mt-10">
                  <UserCheck size={40} className="opacity-20 mb-3" />
                  <p className="font-medium text-sm">Tidak ada jam mengajar hari ini.</p>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {jadwalMengajar.map((slot, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row justify-between sm:items-center p-4 border border-gray-100 rounded-xl hover:border-gray-300 transition-all gap-4 group">
                      <div className="flex items-center gap-4">
                        <div className="text-xs font-mono font-bold text-gray-600 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg">
                          {slot.jamMulai} - {slot.jamSelesai}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{slot.mapel}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Kelas <span className="font-bold text-gray-700">{slot.className}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => navigate('/presensi', { state: { classId: slot.classId, className: slot.className, mapel: slot.mapel } })}
                          className="bg-gray-900 border border-gray-900 text-white px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-black transition-colors"
                        >
                          Input Presensi
                        </button>
                        <button className="bg-white border border-gray-200 text-gray-700 px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors hidden sm:block">
                          Input Nilai
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <BookMarked size={18} className="text-gray-400"/> Akses Cepat
            </h2>
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <p className="text-xs text-gray-500 mb-4 leading-relaxed">Berikan nilai kepada siswa di kelas yang Anda ampu dengan cepat melalui menu penilaian.</p>
              <button className="w-full bg-gray-800 text-white font-medium text-sm py-2.5 rounded-lg hover:bg-gray-900 transition-colors flex justify-center items-center gap-2">
                <BookOpen size={16} /> Input Nilai Mapel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // WAJAH 3: TAMPILAN WALI KELAS
  // ==========================================
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto animate-fade-in font-sans text-gray-800">
      
      {/* HEADER WALI KELAS (Flat & Clean) */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
         <div>
           <h1 className="text-2xl font-bold text-gray-800">
             {getGreeting()}, {teacherProfile.name}!
           </h1>
           <p className="text-sm text-gray-500 mt-1">{teacherProfile.schoolName} • Wali Kelas <span className="font-bold text-gray-700">{teacherProfile.className}</span></p>
         </div>
         <div className="px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 flex items-center gap-2 text-gray-700 text-sm">
            <Clock size={16} className="text-gray-400" />
            <span className="font-mono font-medium">{currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</span>
         </div>
      </div>

      {/* STATISTIK 4 KOTAK */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 flex flex-col justify-between h-28">
          <div className="flex justify-between items-start">
             <p className="text-gray-500 text-xs font-semibold uppercase">Siswa</p>
             <Users size={16} className="text-gray-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800">{totalSiswa}</h3>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 flex flex-col justify-between h-28">
          <div className="flex justify-between items-start">
             <p className="text-gray-500 text-xs font-semibold uppercase">Hadir</p>
             <UserCheck size={16} className="text-gray-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800">-</h3>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 flex flex-col justify-between h-28">
          <div className="flex justify-between items-start">
             <p className="text-gray-500 text-xs font-semibold uppercase">Jurnal</p>
             <BookOpen size={16} className="text-gray-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800">{jurnalLogs.length}</h3>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 flex flex-col justify-between h-28">
          <div className="flex justify-between items-start">
             <p className="text-gray-500 text-xs font-semibold uppercase">Agenda</p>
             <Calendar size={16} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 truncate">Rapat</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* AKTIVITAS TERBARU */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <TrendingUp size={18} className="text-gray-400"/> Aktivitas Terbaru
            </h2>
            <span className="text-[10px] text-gray-500 font-bold bg-gray-100 border border-gray-200 px-2 py-1 rounded">LIVE</span>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden min-h-[250px]">
            {jurnalLogs.length === 0 ? (
              <div className="p-8 text-center text-gray-400 flex flex-col items-center justify-center h-full mt-8">
                <AlertCircle size={32} className="opacity-20 mb-2" />
                <p className="text-sm">Belum ada aktivitas jurnal di kelas.</p>
              </div>
            ) : (
              jurnalLogs.map((item, idx) => (
                <div key={item.id} className={`p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors ${idx !== jurnalLogs.length -1 ? 'border-b border-gray-100' : ''}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold shrink-0 text-sm border
                    ${item.type === 'positif' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                    {item.type === 'positif' ? '👍' : '⚠️'}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <h4 className="font-semibold text-gray-800 text-sm">{item.studentName}</h4>
                      <span className="text-[10px] text-gray-500 bg-gray-50 px-2 py-0.5 border border-gray-100 rounded">
                        {item.displayTime}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">"{item.note}"</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* AKSES ORANG TUA & TUGAS */}
        <div className="space-y-6">
          <div className="space-y-3">
            <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <ShieldCheck size={18} className="text-gray-400"/> Akses Orang Tua
            </h2>
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <p className="text-xs text-gray-500 mb-4 leading-relaxed">Berikan kode ini kepada wali murid untuk memantau nilai dan absensi secara real-time.</p>
              
              <div className="flex flex-col gap-3">
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 flex justify-between items-center">
                  <div>
                    <p className="text-[9px] font-bold text-gray-500 uppercase">KODE KELAS</p>
                    <p className="text-xl font-bold text-gray-800 font-mono tracking-wide">{teacherProfile?.classCode || 'KOSONG'}</p>
                  </div>
                  <button onClick={handleGenerateClassCode} className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg text-[10px] font-bold hover:bg-gray-100 transition-colors">
                    Ubah
                  </button>
                </div>

                <button 
                  disabled={!teacherProfile?.classCode}
                  onClick={() => {
                    const waText = `*AKSES PORTAL ORANG TUA*\n\nHalo Bapak/Ibu Wali Murid Kelas ${teacherProfile?.className},\nSilakan login ke aplikasi menggunakan:\n\n*KODE KELAS:* ${teacherProfile?.classCode}\n*KODE SISWA:* (Tahun Masuk + No Absen)\n\nTerima kasih.`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(waText)}`, '_blank');
                  }}
                  className="w-full bg-gray-800 text-white font-medium text-xs py-2.5 rounded-lg hover:bg-gray-900 flex justify-center items-center gap-2 disabled:opacity-50"
                >
                  <Share2 size={14} /> Bagikan via WhatsApp
                </button>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <ClipboardList size={18} className="text-gray-400"/> Info Mapel
            </h2>
            <div className="bg-white rounded-2xl p-5 border border-gray-200">
              <p className="text-xs text-gray-500 leading-relaxed mb-3">
                Bagikan rekap tugas dari seluruh guru mata pelajaran pekan ini.
              </p>
              <button 
                onClick={() => alert("Rekap tugas sedang diproses...")}
                className="w-full bg-white border border-gray-200 text-gray-700 font-medium text-xs py-2.5 rounded-lg hover:bg-gray-50 flex justify-center items-center gap-2"
              >
                <Share2 size={14} /> Siarkan Tugas
              </button>
            </div>
          </div>
        </div>
      </div>

      <LegerNilai />
    </div>
  );
};

export default Dashboard;