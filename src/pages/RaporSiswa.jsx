import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { User, BookOpen, ChevronLeft, Calendar, AlertTriangle, MessageCircle, Heart, Star, Briefcase, CheckCircle, Clock, XCircle, ExternalLink, Key } from 'lucide-react';

const RaporSiswa = () => {
  const { id } = useParams();
  const [student, setStudent] = useState(null);
  const [grades, setGrades] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState({ H:0, S:0, I:0, A:0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('akademik');
  const [tahfidz, setTahfidz] = useState([]); 
  const [schoolInfo, setSchoolInfo] = useState({ schoolName: "", className: "" });
  
  // GANTI DENGAN NOMOR WA ANDA
  const WALI_KELAS_PHONE = "6281234567890"; 

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Ambil Profil Siswa & Info Sekolah Guru
        const studentSnap = await getDoc(doc(db, "siswa", id));
        if (studentSnap.exists()) {
          const sData = studentSnap.data();
          setStudent(sData);

          if (sData.teacherId) {
             const teacherSnap = await getDoc(doc(db, "teachers", sData.teacherId));
             if (teacherSnap.exists()) {
                setSchoolInfo(teacherSnap.data());
             }
          }
          
          // FETCH TUGAS (Hanya milik guru ini)
          const qTugas = query(collection(db, "tugas"), where("teacherId", "==", sData.teacherId));
          const tugasSnap = await getDocs(qTugas);
          const sortedTasks = tugasSnap.docs.map(d => ({id:d.id, ...d.data()})).sort((a,b)=>new Date(a.dueDate)-new Date(b.dueDate));
          setTasks(sortedTasks);
        }

        const nilaiSnap = await getDoc(doc(db, "nilai", id));
        if (nilaiSnap.exists()) setGrades(nilaiSnap.data());

        // Fetch Logs
        const qJurnal = query(collection(db, "jurnal"), where("studentId", "==", id));
        const logsSnap = await getDocs(qJurnal);
        setLogs(logsSnap.docs.map(d => d.data()).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)));

        // Fetch Absen
        const qAbsen = query(collection(db, "absensi"), where("studentId", "==", id));
        const absenSnap = await getDocs(qAbsen);
        let absenList = absenSnap.docs.map(d => d.data()).sort((a,b) => new Date(b.date) - new Date(a.date));
        setAttendance(absenList);
        
        const stats = { H: 0, S: 0, I: 0, A: 0 };
        absenList.forEach(a => { if (stats[a.status] !== undefined) stats[a.status]++; });
        setAttendanceStats(stats);
        
        // Fetch Tahfidz
        const qTahfidz = query(collection(db, "tahfidz"), where("studentId", "==", id));
        const tahfidzSnap = await getDocs(qTahfidz);
        const sortedTahfidz = tahfidzSnap.docs.map(d => d.data()).sort((a,b) => b.createdAt - a.createdAt);
        setTahfidz(sortedTahfidz);

      } catch (error) { console.error(error); }
      setLoading(false);
    };
    fetchData();
  }, [id]);

  const handleLaporWA = () => {
    if (!student) return;
    const message = `Assalamualaikum, saya wali dari ${student.name} (Kode Login: ${student.loginCode})...`;
    window.open(`https://wa.me/${WALI_KELAS_PHONE}?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-blue-600">Memuat Rapor...</div>;
  if (!student) return <div className="p-10 text-center">Siswa tidak ditemukan.</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-24 relative">
      
      {/* Header */}
      <div className="bg-blue-600 text-white p-6 rounded-b-3xl shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10"><BookOpen size={100} /></div>
        
        <Link to="/login" className="inline-flex items-center gap-2 text-blue-100 mb-4 hover:text-white transition-colors relative z-10">
          <ChevronLeft size={20} /> Keluar
        </Link>
        
        <div className="flex items-center gap-4 relative z-10 mt-4">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold backdrop-blur-sm shadow-inner border border-white/30">
            {student.name ? student.name.charAt(0) : "?"}
          </div>
          <div>
            <h1 className="text-xl font-bold">{student.name}</h1>
            
            {/* --- UPDATE DISINI: TAMPILKAN LOGIN CODE BUKAN NIS --- */}
            <div className="flex items-center gap-2 mt-1 mb-2">
               <span className="text-blue-100 opacity-90 font-mono text-sm flex items-center gap-1">
                 <Key size={12}/> Kode Login: 
               </span>
               <span className="bg-white/20 px-2 py-0.5 rounded text-sm font-bold font-mono tracking-widest">
                 {student.loginCode || student.nis || "-"}
               </span>
            </div>
            {/* ----------------------------------------------------- */}

            <div className="inline-flex gap-2 text-[10px] bg-blue-700/50 px-2 py-1 rounded-lg border border-blue-500/30">
               <span>🏫 {schoolInfo.schoolName || "Sekolah"}</span>
               <span>•</span>
               <span>{schoolInfo.className || "Kelas"}</span>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 mt-6 relative z-10">
          <button onClick={() => setActiveTab('akademik')} className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'akademik' ? 'bg-white text-blue-600 shadow-md' : 'bg-blue-700/50 text-blue-100 hover:bg-blue-700'}`}>Laporan Belajar</button>
          <button onClick={() => setActiveTab('profil')} className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'profil' ? 'bg-white text-blue-600 shadow-md' : 'bg-blue-700/50 text-blue-100 hover:bg-blue-700'}`}>Biodata</button>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-6 -mt-2 relative z-0">
        
        {/* === TAB LAPORAN BELAJAR === */}
        {activeTab === 'akademik' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* 1. MONITORING TUGAS & PR */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-blue-100">
              <h2 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
                <BookOpen className="text-blue-600" size={20} /> Monitoring Tugas & PR
              </h2>

              {tasks.length === 0 ? (
                <div className="bg-gray-50 text-gray-500 p-4 rounded-xl text-sm text-center">
                  Belum ada tugas yang diberikan.
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.map((task) => {
                    const isDone = task.completedBy?.includes(student?.id || ""); 
                    const due = new Date(task.dueDate);
                    const today = new Date(); today.setHours(0,0,0,0);
                    const diffTime = due - today;
                    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    return (
                      <div key={task.id} className={`p-3 rounded-xl border-l-4 shadow-sm bg-white
                        ${isDone ? 'border-green-500' : daysLeft < 0 ? 'border-red-500' : 'border-orange-500'}`}>
                        
                        <div className="flex justify-between items-start">
                           <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-blue-50 text-blue-700">
                             {task.subject}
                           </span>
                           {isDone ? (
                             <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full"><CheckCircle size={12}/> SELESAI</span>
                           ) : (
                             <span className="flex items-center gap-1 text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded-full"><XCircle size={12}/> BELUM</span>
                           )}
                        </div>

                        <h3 className="font-bold text-gray-800 text-sm mt-1">{task.title}</h3>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description || "-"}</p>
                        
                        {task.link && (
                           <a href={task.link} target="_blank" rel="noreferrer" 
                              className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors">
                              <ExternalLink size={12} /> Buka Lampiran Soal
                           </a>
                        )}

                        {!isDone && (
                           <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-1 text-[10px] text-gray-400">
                              <Clock size={10} /> Deadline: {task.dueDate.split('-').reverse().join('/')} 
                              <span className={`ml-1 font-bold ${daysLeft < 0 ? 'text-red-500' : 'text-orange-500'}`}>
                                ({daysLeft < 0 ? "Terlewat" : daysLeft === 0 ? "Hari Ini" : `${daysLeft} hari lagi`})
                              </span>
                           </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 2. NILAI SIKAP */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
               <h2 className="font-bold text-gray-800 flex items-center gap-2 mb-4"><Heart className="text-orange-500" size={20}/> Sikap & Karakter</h2>
               <div className="grid grid-cols-2 gap-4 mb-3">
                  <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 text-center">
                    <span className="text-xs text-orange-600 font-bold uppercase block mb-1">Spiritual</span>
                    <span className="text-lg font-bold text-gray-800">{grades?.sikap?.spiritual || "-"}</span>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 text-center">
                    <span className="text-xs text-orange-600 font-bold uppercase block mb-1">Sosial</span>
                    <span className="text-lg font-bold text-gray-800">{grades?.sikap?.sosial || "-"}</span>
                  </div>
               </div>
               {grades?.sikap?.catatan && (
                 <div className="bg-gray-50 p-3 rounded-xl text-sm text-gray-600 italic border border-gray-100">" {grades.sikap.catatan} "</div>
               )}
            </div>

            {/* 3. TAHFIDZ */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-green-100">
              <h2 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
                <BookOpen className="text-green-600" size={20} /> Laporan Tahfidz
              </h2>
              {tahfidz.length === 0 ? (
                <p className="text-gray-400 italic text-center text-sm">Belum ada data hafalan.</p>
              ) : (
                <div className="space-y-4">
                   {tahfidz.find(t => t.status !== 'Khatam') && (
                     <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                        <p className="text-xs text-blue-600 font-bold uppercase mb-1">Sedang Dihafal</p>
                        <div className="flex justify-between items-center">
                           <span className="font-bold text-blue-900">{tahfidz.find(t => t.status !== 'Khatam').surah}</span>
                           <span className="text-sm bg-white px-2 py-1 rounded text-blue-700 font-mono">
                             Ayat {tahfidz.find(t => t.status !== 'Khatam').ayatStart}-{tahfidz.find(t => t.status !== 'Khatam').ayatEnd}
                           </span>
                        </div>
                     </div>
                   )}
                   <div>
                      <p className="text-xs text-gray-400 font-bold uppercase mb-2">Hafalan Tuntas (Khatam)</p>
                      <div className="flex flex-wrap gap-2">
                        {tahfidz.filter(t => t.status === 'Khatam').map((t, idx) => (
                           <span key={idx} className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 border border-green-200">
                              <CheckCircle size={10} /> {t.surah}
                           </span>
                        ))}
                      </div>
                   </div>
                </div>
              )}
            </div>

            {/* 4. EKSKUL */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="font-bold text-gray-800 flex items-center gap-2 mb-4"><Star className="text-purple-600" size={20}/> Pengembangan Diri</h2>
              <div className="space-y-3">
                 {[1, 2, 3].map(num => {
                    const nama = student[`ekskul${num}`];
                    const nilai = grades?.ekskul?.[`predikat${num}`];
                    if(!nama) return null;
                    return (
                       <div key={num} className="flex justify-between items-center p-3 bg-purple-50 rounded-xl border border-purple-100">
                          <span className="font-bold text-purple-900">{nama}</span>
                          <span className="text-xs font-bold bg-white text-purple-700 px-3 py-1 rounded-full border border-purple-200">{nilai ? `Predikat: ${nilai}` : "Belum dinilai"}</span>
                       </div>
                    )
                 })}
                 {!student.ekskul1 && <p className="text-gray-400 italic text-center text-sm">Tidak mengikuti kegiatan ekskul.</p>}
              </div>
            </div>

            {/* 5. ABSENSI */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="font-bold text-gray-800 flex items-center gap-2 mb-4"><Calendar className="text-green-600" size={20}/> Kehadiran</h2>
              <div className="grid grid-cols-4 gap-2 text-center text-sm mb-2">
                 <div className="bg-green-50 p-2 rounded-lg font-bold text-green-700">{attendanceStats.H}<br/><span className="text-[10px] uppercase font-normal">Hadir</span></div>
                 <div className="bg-blue-50 p-2 rounded-lg font-bold text-blue-700">{attendanceStats.S}<br/><span className="text-[10px] uppercase font-normal">Sakit</span></div>
                 <div className="bg-orange-50 p-2 rounded-lg font-bold text-orange-700">{attendanceStats.I}<br/><span className="text-[10px] uppercase font-normal">Izin</span></div>
                 <div className="bg-red-50 p-2 rounded-lg font-bold text-red-700">{attendanceStats.A}<br/><span className="text-[10px] uppercase font-normal">Alpha</span></div>
              </div>
            </div>

          </div>
        )}

        {/* === TAB BIODATA === */}
        {activeTab === 'profil' && (
           <div className="space-y-4 animate-fade-in">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                 <h2 className="font-bold text-gray-800 border-b pb-2 mb-3">Data Pribadi</h2>
                 <p className="flex justify-between text-sm py-1"><span className="text-gray-500">TTL</span> <span>{student.birthPlace}, {student.birthDate}</span></p>
                 <p className="flex justify-between text-sm py-1"><span className="text-gray-500">Agama</span> <span>{student.religion}</span></p>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                 <h2 className="font-bold text-gray-800 border-b pb-2 mb-3">Orang Tua</h2>
                 <p className="flex justify-between text-sm py-1"><span className="text-gray-500">Ayah</span> <span>{student.fatherName}</span></p>
                 <p className="flex justify-between text-sm py-1"><span className="text-gray-500">Ibu</span> <span>{student.motherName}</span></p>
                 <p className="flex justify-between text-sm py-1"><span className="text-gray-500">HP</span> <span>{student.parentPhone}</span></p>
              </div>
           </div>
        )}
      </div>

      <button onClick={handleLaporWA} className="fixed bottom-6 right-6 bg-green-500 text-white p-4 rounded-full shadow-xl flex items-center gap-2 z-50 hover:bg-green-600 transition-all active:scale-95"><MessageCircle size={24}/><span className="font-bold text-sm hidden md:inline">Hubungi Guru</span></button>
    </div>
  );
};

export default RaporSiswa;