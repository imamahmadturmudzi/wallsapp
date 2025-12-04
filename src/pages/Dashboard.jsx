import { useState, useEffect } from 'react';
import { db, auth } from '../firebase'; // Import auth
import { collection, onSnapshot, query, orderBy, limit, where } from 'firebase/firestore';
import { Users, UserCheck, Clock, TrendingUp, AlertCircle, Calendar } from 'lucide-react';
import { getDoc, doc } from 'firebase/firestore';

const Dashboard = () => {
  const [totalSiswa, setTotalSiswa] = useState(0);
  const [jurnalLogs, setJurnalLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teacherProfile, setTeacherProfile] = useState({ schoolName: "Memuat...", className: "" });

  useEffect(() => {
    // Tunggu cek login selesai
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (user) {
        // 1. AMBIL PROFIL GURU (Sekolah & Kelas)
        const docRef = doc(db, "teachers", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            setTeacherProfile(docSnap.data());
        }
        
        // A. Hitung Total Siswa (Hanya milik guru ini)
        const qSiswa = query(collection(db, "siswa"), where("teacherId", "==", user.uid));
        const unsubSiswa = onSnapshot(qSiswa, (snapshot) => {
          setTotalSiswa(snapshot.size);
        });

        // B. Ambil Aktivitas Jurnal (Hanya milik guru ini)
        const qJurnal = query(
          collection(db, "jurnal"), 
          where("teacherId", "==", user.uid),
          orderBy("createdAt", "desc"), 
          limit(5)
        );
        
        const unsubJurnal = onSnapshot(qJurnal, (snapshot) => {
          setJurnalLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          setLoading(false);
        });

        return () => {
          unsubSiswa();
          unsubJurnal();
        };
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 11) return "Selamat Pagi";
    if (hour < 15) return "Selamat Siang";
    if (hour < 18) return "Selamat Sore";
    return "Selamat Malam";
  };

  const todayDate = new Date().toLocaleDateString('id-ID', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header UPDATE */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-500 rounded-3xl p-6 text-white shadow-xl shadow-teal-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              {getGreeting()}, {teacherProfile.name || "Wali Kelas"}! 👋
            </h1>
            <p className="text-teal-100 mt-1 opacity-90">{todayDate}</p>
          </div>
          <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl text-sm font-medium border border-white/30 flex flex-col items-end">
             <span className="font-bold text-lg">{teacherProfile.schoolName}</span>
             <span className="text-xs opacity-80">{teacherProfile.className}</span>
          </div>
        </div>
      </div>

      {/* Kartu Statistik */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Siswa */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32">
          <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center text-teal-600">
            <Users size={20} />
          </div>
          <div>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total Siswa</p>
            <h3 className="text-3xl font-bold text-gray-800 mt-1">
              {loading ? "..." : totalSiswa}
            </h3>
          </div>
        </div>

        {/* Hadir Dummy (Bisa diupdate nanti pakai logic Absensi) */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32">
          <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
            <UserCheck size={20} />
          </div>
          <div>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Kehadiran</p>
            <h3 className="text-3xl font-bold text-gray-800 mt-1">-</h3>
            <p className="text-[10px] text-green-600 font-medium">Lihat menu Absen</p>
          </div>
        </div>

        {/* Jurnal */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32">
          <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Jurnal Kelas</p>
            <h3 className="text-3xl font-bold text-gray-800 mt-1">
              {loading ? "..." : jurnalLogs.length}
            </h3>
            <p className="text-[10px] text-purple-600 font-medium">Aktivitas Baru</p>
          </div>
        </div>

        {/* Agenda */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32">
          <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
            <Calendar size={20} />
          </div>
          <div>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Agenda</p>
            <h3 className="text-xl font-bold text-gray-800 mt-2 truncate">Rapat Guru</h3>
            <p className="text-[10px] text-orange-600 font-medium">Cek Jadwal</p>
          </div>
        </div>
      </div>

      {/* Konten Utama */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <TrendingUp size={20} className="text-teal-600"/> Aktivitas Terbaru
            </h2>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-md">Live Update</span>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[300px]">
            {loading ? (
              <div className="p-8 text-center text-gray-400">Sedang memuat data...</div>
            ) : jurnalLogs.length === 0 ? (
              <div className="p-8 text-center text-gray-400 flex flex-col items-center gap-2">
                <AlertCircle size={32} className="opacity-20" />
                <p>Belum ada aktivitas jurnal di kelas Anda.</p>
              </div>
            ) : (
              jurnalLogs.map((item, idx) => (
                <div key={item.id} className={`p-4 flex items-start gap-4 hover:bg-gray-50 transition-colors ${idx !== jurnalLogs.length -1 ? 'border-b border-gray-50' : ''}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 text-white shadow-md
                    ${item.type === 'positif' ? 'bg-green-500 shadow-green-200' : 'bg-red-500 shadow-red-200'}`}>
                    {item.type === 'positif' ? '👍' : '⚠️'}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-gray-800 text-sm md:text-base">{item.studentName}</h4>
                      <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                        {item.displayTime}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1 italic">"{item.note}"</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <AlertCircle size={20} className="text-orange-500"/> Info Kelas
          </h2>
          <div className="bg-gradient-to-br from-orange-50 to-white rounded-2xl p-5 border border-orange-100 shadow-sm">
            <h3 className="font-bold text-orange-800 mb-1">Kode Kelas Anda</h3>
            <p className="text-sm text-orange-700 mb-3">Bagikan ke Orang Tua untuk Login:</p>
            <div className="bg-white p-3 rounded-lg border border-orange-200 text-center font-bold text-2xl tracking-widest text-orange-600">
               {localStorage.getItem('teacherClassCode') || "..."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;