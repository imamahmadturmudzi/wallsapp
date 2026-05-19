import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { UserCheck, Calendar, Save, Clock, AlertCircle, ArrowLeft, BookOpen, School } from 'lucide-react';

const Presensi = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Deteksi apakah masuk lewat Dashboard (auto) atau Menu (manual)
  const sessionData = location.state;

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const today = new Date().toLocaleDateString('en-CA'); 
  const [selectedDate, setSelectedDate] = useState(today);
  const [attendance, setAttendance] = useState({});

  // STATE UNTUK MODE MANUAL
  const [classList, setClassList] = useState([]);
  const [activeClass, setActiveClass] = useState(sessionData?.classId || '');
  const [activeClassName, setActiveClassName] = useState(sessionData?.className || '');
  const [activeMapel, setActiveMapel] = useState(sessionData?.mapel || '');
  const [isSetupComplete, setIsSetupComplete] = useState(!!sessionData);

  // 1. Tarik Daftar Kelas untuk Mode Manual (Saat komponen dimuat)
  useEffect(() => {
    if (!isSetupComplete) {
      const fetchClasses = async () => {
        const qGuru = query(collection(db, "teachers"), where("className", "!=", ""));
        const snap = await getDocs(qGuru);
        const kelasOptions = snap.docs.map(doc => ({
          classId: doc.id,
          className: doc.data().className
        }));
        kelasOptions.sort((a, b) => a.className.localeCompare(b.className));
        setClassList(kelasOptions);
      };
      fetchClasses();
    }
  }, [isSetupComplete]);

  // 2. Tarik Data Siswa & Presensi ketika Setup Selesai (Kelas & Mapel sudah dipilih)
  useEffect(() => {
    if (!isSetupComplete || !activeClass || !activeMapel) return;

    const fetchData = async () => {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) return;

      try {
        // Ambil Siswa
        const qSiswa = query(collection(db, "siswa"), where("teacherId", "==", activeClass));
        const snapSiswa = await getDocs(qSiswa);
        const listSiswa = snapSiswa.docs.map(d => ({ id: d.id, ...d.data() }));
        listSiswa.sort((a, b) => a.name.localeCompare(b.name));
        setStudents(listSiswa);

        // Ambil atau Buat Data Presensi (Berfungsi ganda sebagai fitur EDIT jika tanggal lampau)
        const safeMapel = activeMapel.replace(/\s+/g, '_');
        const docId = `${user.uid}_${activeClass}_${safeMapel}_${selectedDate}`;
        const presensiRef = doc(db, "presensi_mapel", docId);
        const presensiSnap = await getDoc(presensiRef);
        
        if (presensiSnap.exists()) {
           setAttendance(presensiSnap.data().records || {});
        } else {
           const defaultAbsen = {};
           listSiswa.forEach(s => defaultAbsen[s.id] = 'H'); // Default Hadir, bisa diubah
           setAttendance(defaultAbsen);
        }
      } catch (error) {
        console.error("Gagal memuat data presensi mapel:", error);
      }
      setLoading(false);
    };

    fetchData();
  }, [selectedDate, activeClass, activeMapel, isSetupComplete]); 

  const handleStatusChange = (studentId, status) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSavePresensi = async () => {
    setIsSaving(true);
    const user = auth.currentUser;
    try {
      const safeMapel = activeMapel.replace(/\s+/g, '_');
      const docId = `${user.uid}_${activeClass}_${safeMapel}_${selectedDate}`;
      const presensiRef = doc(db, "presensi_mapel", docId);
      
      await setDoc(presensiRef, {
        guruId: user.uid,
        classId: activeClass,
        className: activeClassName,
        mapel: activeMapel,
        date: selectedDate,
        records: attendance,
        updatedAt: new Date().getTime()
      });

      alert(`Data Presensi berhasil disimpan!`);
    } catch (error) {
      alert("Terjadi kesalahan saat menyimpan presensi.");
      console.error(error);
    }
    setIsSaving(false);
  };

  const rekap = { H: 0, S: 0, I: 0, A: 0, D: 0 };
  Object.values(attendance).forEach(status => {
    if (rekap[status] !== undefined) rekap[status]++;
  });

  const handleClassSelection = (e) => {
    const selected = classList.find(c => c.classId === e.target.value);
    setActiveClass(selected?.classId || '');
    setActiveClassName(selected?.className || '');
  };

  // ==========================================
  // RENDER 1: MODE MANUAL (PILIH KELAS & MAPEL)
  // ==========================================
  if (!isSetupComplete) {
    return (
      <div className="min-h-screen p-4 md:p-6 flex items-center justify-center font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-200 max-w-md w-full animate-slide-up space-y-6">
          <div className="text-center">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-xl mx-auto flex items-center justify-center mb-3">
              <Calendar size={28} />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Manajemen Presensi</h2>
            <p className="text-xs text-gray-500 mt-1">Gunakan mode ini untuk menyusul absen lampau atau merevisi data kehadiran siswa.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Pilih Kelas</label>
              <div className="relative">
                <School className="absolute left-3.5 top-3 text-gray-400" size={18} />
                <select value={activeClass} onChange={handleClassSelection} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-gray-500">
                  <option value="">-- Pilih Rombongan Belajar --</option>
                  {classList.map(c => <option key={c.classId} value={c.classId}>{c.className}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Mata Pelajaran (Sesuai Jadwal)</label>
              <div className="relative">
                <BookOpen className="absolute left-3.5 top-3 text-gray-400" size={18} />
                <input 
                  type="text" 
                  value={activeMapel} 
                  onChange={(e) => setActiveMapel(e.target.value)}
                  placeholder="Cth: Matematika"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-gray-500"
                />
              </div>
            </div>
            <button 
              onClick={() => setIsSetupComplete(true)}
              disabled={!activeClass || !activeMapel}
              className="w-full bg-gray-900 text-white py-3 rounded-lg text-sm font-bold hover:bg-black disabled:opacity-50 transition-colors"
            >
              Buka Lembar Kehadiran
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER 2: LEMBAR ABSENSI UTAMA
  // ==========================================
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6 animate-fade-in font-sans text-gray-800">
      
      {/* Tombol kembali akan mereset mode manual jika tidak ada sessionData */}
      <button 
        onClick={() => sessionData ? navigate('/') : setIsSetupComplete(false)} 
        className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft size={16} /> {sessionData ? 'Kembali ke Dashboard' : 'Ubah Pengaturan Kelas'}
      </button>

      {/* HEADER & DATE PICKER (FITUR MESIN WAKTU) */}
      <div className="bg-white p-5 md:p-6 rounded-2xl border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-5 sticky top-6 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100 shrink-0">
            <UserCheck size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">{activeMapel}</h1>
            <p className="text-sm text-gray-500 mt-0.5">Kelas <span className="font-bold text-gray-700">{activeClassName}</span></p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* FITUR EDIT PRESENSI ADA DI SINI */}
          <div className="relative w-full md:w-44" title="Ubah tanggal untuk mengedit/menyusul absen">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500" size={16} />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 bg-blue-50 border border-blue-100 text-blue-800 rounded-lg outline-none font-bold text-sm cursor-pointer"
            />
          </div>

          <button 
            onClick={handleSavePresensi} 
            disabled={isSaving || students.length === 0}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-700 transition-all disabled:opacity-50 shrink-0 w-full md:w-auto"
          >
            {isSaving ? <Clock size={16} className="animate-spin" /> : <Save size={16} />}
            <span className="inline">{isSaving ? "Menyimpan..." : "Kunci Presensi"}</span>
          </button>
        </div>
      </div>

      {/* REKAPITULASI DENGAN DISPENSASI */}
      <div className="grid grid-cols-5 gap-2 md:gap-4">
        <div className="bg-white p-3 md:p-4 rounded-xl border border-gray-200 text-center shadow-sm">
          <p className="text-[9px] md:text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Hadir</p>
          <p className="text-lg md:text-2xl font-bold text-green-600">{rekap.H}</p>
        </div>
        <div className="bg-white p-3 md:p-4 rounded-xl border border-gray-200 text-center shadow-sm">
          <p className="text-[9px] md:text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Sakit</p>
          <p className="text-lg md:text-2xl font-bold text-blue-600">{rekap.S}</p>
        </div>
        <div className="bg-white p-3 md:p-4 rounded-xl border border-gray-200 text-center shadow-sm">
          <p className="text-[9px] md:text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Izin</p>
          <p className="text-lg md:text-2xl font-bold text-orange-600">{rekap.I}</p>
        </div>
        <div className="bg-white p-3 md:p-4 rounded-xl border border-gray-200 text-center shadow-sm">
          <p className="text-[9px] md:text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Dispens</p>
          <p className="text-lg md:text-2xl font-bold text-purple-600">{rekap.D}</p>
        </div>
        <div className="bg-white p-3 md:p-4 rounded-xl border border-gray-200 text-center shadow-sm">
          <p className="text-[9px] md:text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Alpa</p>
          <p className="text-lg md:text-2xl font-bold text-red-600">{rekap.A}</p>
        </div>
      </div>

      {/* TABEL ABSENSI MAPEL */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm animate-slide-up">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[650px]">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold border-b border-gray-100">
                <th className="p-4 pl-6 w-16 text-center">No</th>
                <th className="p-4">Nama Peserta Didik</th>
                <th className="p-4 text-center pr-6">Status Kehadiran Mapel</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="3" className="p-10 text-center text-gray-400 font-medium animate-pulse">Membuka lembar kehadiran...</td></tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="3" className="p-10 text-center text-gray-400 text-sm flex items-center justify-center gap-2">
                    <AlertCircle size={16}/> Belum ada siswa di kelas ini.
                  </td>
                </tr>
              ) : students.map((s, index) => {
                const status = attendance[s.id] || 'H';
                return (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 pl-6 text-center text-xs text-gray-400 font-medium">{index + 1}</td>
                    <td className="p-4">
                      <div className="font-bold text-gray-800 text-sm uppercase">{s.name}</div>
                      <div className="text-[11px] font-mono text-gray-500 mt-0.5">NISN: {s.nisn || '-'}</div>
                    </td>
                    <td className="p-3 text-center pr-6">
                      <div className="inline-flex bg-gray-100 rounded-lg p-1 gap-1 border border-gray-200">
                        <button onClick={() => handleStatusChange(s.id, 'H')} className={`px-2 md:px-3 py-1.5 rounded-md text-xs font-bold transition-all ${status === 'H' ? 'bg-white text-green-600 shadow-sm border border-gray-200/50' : 'text-gray-400 hover:text-gray-600'}`}>Hadir</button>
                        <button onClick={() => handleStatusChange(s.id, 'S')} className={`px-2 md:px-3 py-1.5 rounded-md text-xs font-bold transition-all ${status === 'S' ? 'bg-white text-blue-600 shadow-sm border border-gray-200/50' : 'text-gray-400 hover:text-gray-600'}`}>Sakit</button>
                        <button onClick={() => handleStatusChange(s.id, 'I')} className={`px-2 md:px-3 py-1.5 rounded-md text-xs font-bold transition-all ${status === 'I' ? 'bg-white text-orange-600 shadow-sm border border-gray-200/50' : 'text-gray-400 hover:text-gray-600'}`}>Izin</button>
                        <button onClick={() => handleStatusChange(s.id, 'D')} className={`px-2 md:px-3 py-1.5 rounded-md text-xs font-bold transition-all ${status === 'D' ? 'bg-white text-purple-600 shadow-sm border border-gray-200/50' : 'text-gray-400 hover:text-gray-600'}`}>Dispens</button>
                        <button onClick={() => handleStatusChange(s.id, 'A')} className={`px-2 md:px-3 py-1.5 rounded-md text-xs font-bold transition-all ${status === 'A' ? 'bg-white text-red-600 shadow-sm border border-gray-200/50' : 'text-gray-400 hover:text-gray-600'}`}>Alpa</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Presensi;