import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, getDocs, query, where, deleteDoc, doc, getDoc, orderBy } from 'firebase/firestore';
import { BookOpen, Calendar, Plus, Trash2, Send, School, ClipboardList, AlertCircle, Clock } from 'lucide-react';

const TugasMapel = () => {
  const [loading, setLoading] = useState(true);
  const [myClasses, setMyClasses] = useState([]);
  const [tugasList, setTugasList] = useState([]);
  const [teacherName, setTeacherName] = useState('');
  
  const [newTugas, setNewTugas] = useState({
    classId: '',
    className: '',
    mapel: '',
    judul: '',
    deskripsi: '',
    deadline: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        // 1. Ambil Nama Guru
        const profRef = doc(db, "teachers", user.uid);
        const profSnap = await getDoc(profRef);
        if (profSnap.exists()) setTeacherName(profSnap.data().name);

        // 2. Ambil Kelas & Mapel yang diampu dari Jadwal
        const jadwalSnap = await getDocs(collection(db, "jadwal"));
        const classes = [];
        const seen = new Set();

        jadwalSnap.forEach(doc => {
          const data = doc.data();
          const jadwal = data.jadwal || {};
          Object.values(jadwal).forEach(hari => {
            hari.forEach(slot => {
              if (slot.guruId === user.uid) {
                const key = `${data.classId}-${slot.mapel}`;
                if (!seen.has(key)) {
                  classes.push({ classId: data.classId, className: data.className, mapel: slot.mapel });
                  seen.add(key);
                }
              }
            });
          });
        });
        setMyClasses(classes);

        // 3. Ambil Riwayat Tugas yang pernah dibuat
        const qTugas = query(collection(db, "tugas"), where("teacherId", "==", user.uid), orderBy("createdAt", "desc"));
        const tugasSnap = await getDocs(qTugas);
        setTugasList(tugasSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleSubmitTugas = async (e) => {
    e.preventDefault();
    if (!newTugas.classId || !newTugas.judul) return alert("Lengkapi data tugas!");

    setIsSubmitting(true);
    try {
      const payload = {
        ...newTugas,
        teacherId: auth.currentUser.uid,
        teacherName: teacherName,
        createdAt: new Date().getTime(),
        status: 'aktif'
      };
      const docRef = await addDoc(collection(db, "tugas"), payload);
      setTugasList([{ id: docRef.id, ...payload }, ...tugasList]);
      setNewTugas({ ...newTugas, judul: '', deskripsi: '', deadline: '' });
      alert("Tugas berhasil dikirim ke Wali Kelas!");
    } catch (e) {
      alert("Gagal mengirim tugas.");
    }
    setIsSubmitting(false);
  };

  const handleDeleteTugas = async (id) => {
    if (confirm("Hapus pengumuman tugas ini?")) {
      await deleteDoc(doc(db, "tugas", id));
      setTugasList(tugasList.filter(t => t.id !== id));
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6 animate-fade-in font-sans text-gray-800">
      
      {/* HEADER FLAT & CLEAN */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 flex items-center gap-4">
        <div className="w-12 h-12 bg-gray-50 text-gray-600 rounded-xl flex items-center justify-center border border-gray-100 shrink-0">
          <ClipboardList size={24} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">Manajemen Tugas Siswa</h1>
          <p className="text-sm text-gray-500 mt-1">Kirim instruksi tugas agar dapat dipantau oleh Wali Kelas & Orang Tua.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* FORM INPUT TUGAS (KIRI) */}
        <div className="lg:col-span-1">
          <form onSubmit={handleSubmitTugas} className="bg-white p-6 rounded-2xl border border-gray-200 space-y-5 sticky top-6 flex flex-col">
            <h2 className="text-base font-bold text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-3">
              <Plus size={18} className="text-gray-400"/> Lembar Tugas Baru
            </h2>

            <div className="space-y-4 flex-1">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Pilih Kelas & Mapel</label>
                <select 
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 text-sm font-semibold text-gray-800"
                  onChange={e => {
                    const val = e.target.value.split('|');
                    if(val.length > 1) {
                        setNewTugas({...newTugas, classId: val[0], className: val[1], mapel: val[2]});
                    } else {
                        setNewTugas({...newTugas, classId: '', className: '', mapel: ''});
                    }
                  }}
                  required
                >
                  <option value="">-- Pilih Kelas --</option>
                  {myClasses.map((c, i) => (
                    <option key={i} value={`${c.classId}|${c.className}|${c.mapel}`}>
                       Kelas {c.className} - {c.mapel}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Judul Tugas</label>
                <input type="text" placeholder="Cth: Membuat Maket Bangun Ruang" value={newTugas.judul} onChange={e=>setNewTugas({...newTugas, judul: e.target.value})} className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 text-sm text-gray-800" required />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Instruksi / Detail</label>
                <textarea placeholder="Tulis instruksi lengkap di sini..." value={newTugas.deskripsi} onChange={e=>setNewTugas({...newTugas, deskripsi: e.target.value})} className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 text-sm text-gray-800 h-28 resize-none" />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Tenggat Waktu</label>
                <input type="date" value={newTugas.deadline} onChange={e=>setNewTugas({...newTugas, deadline: e.target.value})} className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 text-sm text-gray-800" required />
              </div>
            </div>

            <div className="pt-2">
                <button type="submit" disabled={isSubmitting} className="w-full bg-gray-800 text-white py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 hover:bg-gray-900 transition-colors disabled:opacity-50">
                <Send size={16} /> {isSubmitting ? "Mengirim..." : "Sebarkan Tugas"}
                </button>
            </div>
          </form>
        </div>

        {/* RIWAYAT TUGAS (KANAN) */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <Clock size={18} className="text-gray-400"/> Tugas yang Sedang Berjalan
          </h2>

          {loading ? (
             <div className="text-center py-10 text-gray-400 font-medium animate-pulse border border-gray-100 rounded-2xl bg-white">Memuat riwayat tugas...</div>
          ) : tugasList.length === 0 ? (
             <div className="bg-gray-50/50 p-12 rounded-2xl border border-dashed border-gray-300 text-center text-gray-400 flex flex-col items-center">
                <BookOpen size={40} className="mb-3 opacity-20"/>
                <p className="text-sm">Belum ada riwayat tugas yang dibagikan.</p>
             </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {tugasList.map(tugas => (
                <div key={tugas.id} className="bg-white p-5 rounded-2xl border border-gray-200 hover:border-gray-300 transition-colors relative group">
                  
                  {/* Tombol Hapus (Muncul saat di-hover) */}
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button onClick={() => handleDeleteTugas(tugas.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Tarik / Hapus Tugas">
                        <Trash2 size={16}/>
                     </button>
                  </div>
                  
                  <div className="flex flex-col md:flex-row justify-between md:items-start gap-4 pr-8">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="bg-gray-100 text-gray-600 text-[10px] font-bold uppercase px-2 py-0.5 rounded border border-gray-200">
                          Kelas {tugas.className}
                        </span>
                        <span className="text-xs font-semibold text-gray-500">{tugas.mapel}</span>
                      </div>
                      
                      <h3 className="text-base font-bold text-gray-800 leading-tight">{tugas.judul}</h3>
                      <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{tugas.deskripsi}</p>
                    </div>

                    <div className="bg-gray-50 px-3 py-2 rounded-lg border border-gray-100 shrink-0 md:mt-0 mt-2 flex flex-col items-center justify-center min-w-[100px]">
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Deadline</p>
                      <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                        <Calendar size={12} className="text-gray-400"/> {new Date(tugas.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default TugasMapel;