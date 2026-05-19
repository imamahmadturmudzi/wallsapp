import { useState, useEffect } from 'react';
import { auth, db } from '../firebase'; // PASTIKAN AUTH DI-IMPORT
import { collection, getDocs, doc, setDoc, getDoc, query, where } from 'firebase/firestore';
import { Calendar, Clock, Plus, Trash2, Save, School, ChevronRight, BookOpen, User, Coffee } from 'lucide-react';

const hariList = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const MasterJadwal = () => {
  const [kelasList, setKelasList] = useState([]);
  const [selectedKelas, setSelectedKelas] = useState(null);
  const [jadwal, setJadwal] = useState({});
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [mySchoolId, setMySchoolId] = useState(""); // STATE BARU: Penyimpan ID Sekolah
  
  const [activeHari, setActiveHari] = useState('Senin');
  
  // Data Sumber (Master Data)
  const [listMapel, setListMapel] = useState([]);
  const [listGuruMapel, setListGuruMapel] = useState([]);

  // Form Input Relasional
  const [type, setType] = useState('pelajaran'); // 'pelajaran' atau 'istirahat'
  const [newSlot, setNewSlot] = useState({ 
    jamMulai: '07:00', 
    jamSelesai: '08:30', 
    mapel: '', 
    guruId: '', 
    guruName: '' 
  });

  // 1. SINKRONISASI DATA MASTER SAAS
  useEffect(() => {
    const fetchMasterDataSaaS = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        // Cek ID Sekolah Admin
        const adminRef = doc(db, "teachers", user.uid);
        const adminSnap = await getDoc(adminRef);
        
        if (adminSnap.exists() && adminSnap.data().schoolId) {
          const currentSchoolId = adminSnap.data().schoolId;
          setMySchoolId(currentSchoolId);

          // Tarik Kelas KHUSUS sekolah ini
          const qKelas = query(
            collection(db, "teachers"), 
            where("schoolId", "==", currentSchoolId),
            where("role", "in", ["wali_kelas", "ganda"])
          );
          const snapKelas = await getDocs(qKelas);
          const kList = snapKelas.docs.map(d => ({ id: d.id, ...d.data() })).filter(k => k.className);
          setKelasList(kList.sort((a, b) => a.className.localeCompare(b.className)));

          // Tarik Data Guru KHUSUS sekolah ini
          const qGuru = query(collection(db, "teachers"), where("schoolId", "==", currentSchoolId));
          const snapGuru = await getDocs(qGuru);
          const allTeachers = snapGuru.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(t => t.role !== 'admin'); 
          
          setListGuruMapel(allTeachers.sort((a, b) => (a.name || '').localeCompare(b.name || '')));

          // Tarik Referensi Mata Pelajaran (Bisa tetap global jika standar kurikulum sama)
          const docCur = await getDoc(doc(db, "metadata", "curriculum"));
          if (docCur.exists()) setListMapel(docCur.data().mapel || []);
        }
      } catch (error) {
        console.error("Gagal memuat data master SaaS:", error);
      }
    };

    fetchMasterDataSaaS();
  }, []);

  const handlePilihKelas = async (kelas) => {
    setSelectedKelas(kelas);
    setLoading(true);
    // Karena ID Kelas (guru/wali kelas) sudah unik, kita bisa langsung getDoc
    const docRef = doc(db, "jadwal", kelas.id);
    const snap = await getDoc(docRef);
    setJadwal(snap.exists() ? snap.data().jadwal : {});
    setLoading(false);
  };

  const handleAddSlot = (e) => {
    e.preventDefault();
    
    // Logika Validasi berdasarkan Tipe
    let slotToAdd = { ...newSlot };
    if (type === 'istirahat') {
        if (!slotToAdd.mapel) return alert("Isi keterangan istirahat (Cth: Istirahat 1 atau Sholat Dzuhur)");
        slotToAdd.guruId = 'istirahat';
        slotToAdd.guruName = '-';
    } else {
        if (!slotToAdd.mapel || !slotToAdd.guruId) return alert("Pilih Mata Pelajaran dan Guru Pengampu!");
    }

    const currentDay = jadwal[activeHari] || [];
    const updated = [...currentDay, slotToAdd].sort((a, b) => a.jamMulai.localeCompare(b.jamMulai));
    setJadwal({ ...jadwal, [activeHari]: updated });
    
    // Reset form
    setNewSlot({ ...newSlot, jamMulai: newSlot.jamSelesai, mapel: '', guruId: '', guruName: '' });
  };

  const handleSaveJadwal = async () => {
    if (!mySchoolId) return alert("Akses Ditolak: ID Sekolah tidak terdeteksi!");
    setIsSaving(true);
    
    try {
      await setDoc(doc(db, "jadwal", selectedKelas.id), {
        className: selectedKelas.className,
        classId: selectedKelas.id,
        schoolId: mySchoolId, // STEMPEL SAAS WAJIB!
        jadwal: jadwal,
        updatedAt: new Date().getTime()
      });
      alert("Jadwal Berhasil Disimpan!");
    } catch (e) {
      alert("Gagal menyimpan jadwal.");
    }
    setIsSaving(false);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto animate-fade-in font-sans text-gray-800">
      
      {/* HEADER FLAT & CLEAN */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-gray-50 text-gray-600 rounded-xl flex items-center justify-center border border-gray-100 shrink-0">
             <Calendar size={24} />
           </div>
           <div>
             <h1 className="text-xl font-bold text-gray-800">Master Jadwal Pelajaran</h1>
             <p className="text-sm text-gray-500 mt-1">Susun dan kelola jadwal mengajar seluruh rombongan belajar.</p>
           </div>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        
        {/* PANEL KIRI: DAFTAR KELAS */}
        <div className="w-full xl:w-72 shrink-0">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden sticky top-6">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
               <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                 <School className="text-gray-400" size={16} /> Daftar Rombel
               </h2>
            </div>
            <div className="max-h-[65vh] overflow-y-auto">
              {kelasList.length === 0 ? (
                <div className="p-5 text-center text-sm text-gray-400 italic">Belum ada kelas yang dibuat.</div>
              ) : kelasList.map(kelas => (
                <button
                  key={kelas.id}
                  onClick={() => handlePilihKelas(kelas)}
                  className={`w-full text-left px-5 py-3.5 border-b border-gray-50 transition-colors flex items-center justify-between group ${
                    selectedKelas?.id === kelas.id ? 'bg-gray-50 border-l-4 border-l-gray-800' : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <div>
                     <div className={`text-sm ${selectedKelas?.id === kelas.id ? 'font-bold text-gray-800' : 'font-semibold text-gray-700'}`}>Kelas {kelas.className}</div>
                     <div className="text-[10px] text-gray-400 mt-0.5">Wali: {kelas.name}</div>
                  </div>
                  <ChevronRight size={16} className={`${selectedKelas?.id === kelas.id ? 'text-gray-800' : 'text-gray-300 group-hover:text-gray-400'}`} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* PANEL KANAN: EDITOR */}
        <div className="flex-1">
          {!selectedKelas ? (
            <div className="bg-white p-12 rounded-2xl border border-dashed border-gray-300 text-center text-gray-400 flex flex-col items-center">
              <Calendar size={40} className="mb-3 opacity-20" />
              <p className="font-bold text-gray-500">Pilih kelas di panel kiri</p>
              <p className="text-sm">Untuk mulai menyusun jadwal pengajaran.</p>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-2xl border border-gray-200 space-y-6">
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-2 gap-4">
                <div>
                   <h2 className="text-lg font-bold text-gray-800">Editor: Kelas {selectedKelas.className}</h2>
                   <p className="text-xs text-gray-500 mt-1">Pastikan jam pelajaran tidak saling bertumpuk.</p>
                </div>
                <button onClick={handleSaveJadwal} disabled={isSaving} className="bg-gray-800 text-white px-6 py-2.5 rounded-lg font-medium text-sm hover:bg-gray-900 disabled:opacity-50 flex items-center justify-center gap-2 w-full sm:w-auto transition-colors">
                  <Save size={16} /> {isSaving ? "Menyimpan..." : "Simpan Jadwal"}
                </button>
              </div>

              {/* TAB HARI */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide border-b border-gray-100">
                {hariList.map(h => (
                  <button key={h} onClick={() => setActiveHari(h)} className={`px-5 py-2.5 text-sm font-bold transition-all whitespace-nowrap rounded-t-lg border-b-2 ${activeHari === h ? 'border-gray-800 text-gray-800 bg-gray-50/50' : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}>
                    {h}
                  </button>
                ))}
              </div>

              {/* FORM INPUT RELASIONAL */}
              <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 space-y-4">
                
                {/* TIPE TOGGLE */}
                <div className="flex gap-1.5 p-1 bg-white rounded-lg border border-gray-200 w-fit">
                  <button onClick={() => setType('pelajaran')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors ${type === 'pelajaran' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-700'}`}>Jam Pelajaran</button>
                  <button onClick={() => setType('istirahat')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors ${type === 'istirahat' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-700'}`}>Istirahat/Lainnya</button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Jam Mulai</label>
                    <input type="time" value={newSlot.jamMulai} onChange={e=>setNewSlot({...newSlot, jamMulai: e.target.value})} className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 text-sm font-semibold text-gray-800" required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Selesai</label>
                    <input type="time" value={newSlot.jamSelesai} onChange={e=>setNewSlot({...newSlot, jamSelesai: e.target.value})} className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 text-sm font-semibold text-gray-800" required />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Keterangan / Mapel</label>
                    {type === 'pelajaran' ? (
                      <select value={newSlot.mapel} onChange={e=>setNewSlot({...newSlot, mapel: e.target.value})} className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 text-sm font-semibold text-gray-800" required>
                        <option value="">-- Pilih Mata Pelajaran --</option>
                        {listMapel.map((m, i) => <option key={i} value={m}>{m}</option>)}
                      </select>
                    ) : (
                      <input type="text" placeholder="Contoh: Istirahat 1, Sholat, dll" value={newSlot.mapel} onChange={e=>setNewSlot({...newSlot, mapel: e.target.value})} className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 text-sm text-gray-800" required />
                    )}
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-end pt-2">
                  <div className="flex-1 w-full">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Guru Pengampu</label>
                    <select 
                      disabled={type === 'istirahat'}
                      value={type === 'istirahat' ? '' : newSlot.guruId} 
                      onChange={e => {
                        const name = e.target.options[e.target.selectedIndex].text;
                        setNewSlot({...newSlot, guruId: e.target.value, guruName: name});
                      }} 
                      className={`w-full p-2.5 border border-gray-200 rounded-lg outline-none text-sm font-semibold ${type === 'istirahat' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-800 focus:border-gray-400 focus:ring-1 focus:ring-gray-400'}`} 
                      required={type === 'pelajaran'}
                    >
                      <option value="">{type === 'istirahat' ? '-- Tidak Berlaku --' : '-- Pilih Guru Pengampu --'}</option>
                      {listGuruMapel.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </div>
                  <button onClick={handleAddSlot} className="w-full md:w-auto bg-white border border-gray-200 text-gray-700 px-6 py-2.5 rounded-lg font-bold hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors text-sm shrink-0">
                    <Plus size={16} /> Tambah Slot
                  </button>
                </div>
              </div>

              {/* DAFTAR JADWAL HARI AKTIF */}
              <div className="space-y-3 pt-4">
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-4">
                   <Clock size={16} className="text-gray-400"/> Kegiatan Hari {activeHari}
                </h3>
                
                {(jadwal[activeHari] || []).length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-gray-200 rounded-xl text-gray-400 text-sm bg-gray-50/50">
                     Belum ada jadwal untuk hari {activeHari}.
                  </div>
                ) : (
                  <div className="space-y-2">
                     {jadwal[activeHari].map((slot, idx) => (
                       <div key={idx} className={`flex justify-between items-center p-3.5 border rounded-xl transition-colors ${slot.guruId === 'istirahat' ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                         <div className="flex items-center gap-4">
                           <div className={`text-xs font-mono font-bold px-3 py-1.5 rounded-lg border ${slot.guruId === 'istirahat' ? 'text-gray-500 bg-white border-gray-200' : 'text-gray-700 bg-gray-50 border-gray-200'}`}>
                             {slot.jamMulai} - {slot.jamSelesai}
                           </div>
                           <div>
                             <p className={`font-bold text-sm flex items-center gap-2 ${slot.guruId === 'istirahat' ? 'text-gray-600' : 'text-gray-800'}`}>
                                {slot.guruId === 'istirahat' && <Coffee size={14} className="text-gray-400" />} {slot.mapel}
                             </p>
                             {slot.guruId !== 'istirahat' && (
                                <p className="text-[11px] text-gray-500 font-medium mt-0.5 flex items-center gap-1.5">
                                   <User size={12} className="text-gray-400"/> {slot.guruName}
                                </p>
                             )}
                           </div>
                         </div>
                         <button onClick={() => {
                           const updated = [...jadwal[activeHari]];
                           updated.splice(idx, 1);
                           setJadwal({...jadwal, [activeHari]: updated});
                         }} className="text-gray-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors" title="Hapus Slot">
                           <Trash2 size={16}/>
                         </button>
                       </div>
                     ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MasterJadwal;