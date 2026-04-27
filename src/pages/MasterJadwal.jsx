import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, getDoc, query, where } from 'firebase/firestore';
import { Calendar, Clock, Plus, Trash2, Save, School, ChevronRight, BookOpen, User, Coffee } from 'lucide-react';

const hariList = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const MasterJadwal = () => {
  const [kelasList, setKelasList] = useState([]);
  const [selectedKelas, setSelectedKelas] = useState(null);
  const [jadwal, setJadwal] = useState({});
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
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

  // 1. SINKRONISASI DATA MASTER
  const fetchMasterData = async () => {
    try {
      const qKelas = query(collection(db, "teachers"), where("role", "in", ["wali_kelas", "ganda"]));
      const snapKelas = await getDocs(qKelas);
      const kList = snapKelas.docs.map(d => ({ id: d.id, ...d.data() })).filter(k => k.className);
      setKelasList(kList.sort((a, b) => a.className.localeCompare(b.className)));

      const docCur = await getDoc(doc(db, "metadata", "curriculum"));
      if (docCur.exists()) setListMapel(docCur.data().mapel || []);

      const snapGuru = await getDocs(collection(db, "teachers"));
      const allTeachers = snapGuru.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(t => t.role !== 'admin'); 
      
      setListGuruMapel(allTeachers.sort((a, b) => (a.name || '').localeCompare(b.name || '')));
    } catch (error) {
      console.error("Gagal memuat data master:", error);
    }
  };

  useEffect(() => {
    fetchMasterData();
  }, []);

  const handlePilihKelas = async (kelas) => {
    setSelectedKelas(kelas);
    setLoading(true);
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
    setIsSaving(true);
    try {
      await setDoc(doc(db, "jadwal", selectedKelas.id), {
        className: selectedKelas.className,
        classId: selectedKelas.id,
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
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col xl:flex-row gap-6">
        
        {/* PANEL KIRI: DAFTAR KELAS */}
        <div className="w-full xl:w-80 shrink-0">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm sticky top-6">
            <h2 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
              <School className="text-teal-600" size={20} /> Kelas Tersedia
            </h2>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
              {kelasList.map(kelas => (
                <button
                  key={kelas.id}
                  onClick={() => handlePilihKelas(kelas)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    selectedKelas?.id === kelas.id ? 'bg-teal-50 border-teal-200 text-teal-800 font-bold' : 'bg-gray-50 border-transparent hover:bg-gray-100'
                  }`}
                >
                  <div className="text-sm">Kelas {kelas.className}</div>
                  <div className="text-[10px] opacity-60 font-normal">Wali: {kelas.name}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* PANEL KANAN: EDITOR */}
        <div className="flex-1">
          {!selectedKelas ? (
            <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-gray-200 text-center text-gray-400">
              <Calendar size={48} className="mx-auto opacity-20 mb-4" />
              <p className="font-bold">Pilih kelas di panel kiri</p>
              <p className="text-sm">Untuk mulai menyusun jadwal pengajaran</p>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-4 gap-4">
                <h2 className="text-xl font-bold">Editor Jadwal: {selectedKelas.className}</h2>
                <button onClick={handleSaveJadwal} disabled={isSaving} className="bg-teal-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2 w-full sm:w-auto justify-center">
                  <Save size={18} /> {isSaving ? "Menyimpan..." : "Simpan Jadwal"}
                </button>
              </div>

              {/* TAB HARI */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {hariList.map(h => (
                  <button key={h} onClick={() => setActiveHari(h)} className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeHari === h ? 'bg-teal-600 text-white shadow-lg shadow-teal-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                    {h}
                  </button>
                ))}
              </div>

              {/* FORM INPUT RELASIONAL */}
              <div className="bg-teal-50/50 p-5 rounded-3xl border border-teal-100 space-y-4">
                {/* TIPE TOGGLE */}
                <div className="flex gap-2 p-1 bg-white rounded-xl border border-teal-100 w-fit">
                  <button onClick={() => setType('pelajaran')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${type === 'pelajaran' ? 'bg-teal-600 text-white' : 'text-teal-600'}`}>Jam Pelajaran</button>
                  <button onClick={() => setType('istirahat')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${type === 'istirahat' ? 'bg-teal-600 text-white' : 'text-teal-600'}`}>Istirahat/Lainnya</button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-teal-800 uppercase ml-1">Mulai</label>
                    <input type="time" value={newSlot.jamMulai} onChange={e=>setNewSlot({...newSlot, jamMulai: e.target.value})} className="w-full p-2.5 rounded-xl border border-teal-200 outline-none text-sm bg-white" required />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-teal-800 uppercase ml-1">Selesai</label>
                    <input type="time" value={newSlot.jamSelesai} onChange={e=>setNewSlot({...newSlot, jamSelesai: e.target.value})} className="w-full p-2.5 rounded-xl border border-teal-200 outline-none text-sm bg-white" required />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-teal-800 uppercase ml-1">Keterangan / Mapel</label>
                    {type === 'pelajaran' ? (
                      <select value={newSlot.mapel} onChange={e=>setNewSlot({...newSlot, mapel: e.target.value})} className="w-full p-2.5 rounded-xl border border-teal-200 outline-none text-sm bg-white" required>
                        <option value="">-- Pilih Mapel --</option>
                        {listMapel.map((m, i) => <option key={i} value={m}>{m}</option>)}
                      </select>
                    ) : (
                      <input type="text" placeholder="Contoh: Istirahat 1, Sholat, dll" value={newSlot.mapel} onChange={e=>setNewSlot({...newSlot, mapel: e.target.value})} className="w-full p-2.5 rounded-xl border border-teal-200 outline-none text-sm bg-white" required />
                    )}
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex-1 w-full">
                    <label className="text-[10px] font-bold text-teal-800 uppercase ml-1">Guru Pengampu</label>
                    <select 
                      disabled={type === 'istirahat'}
                      value={type === 'istirahat' ? '' : newSlot.guruId} 
                      onChange={e => {
                        const name = e.target.options[e.target.selectedIndex].text;
                        setNewSlot({...newSlot, guruId: e.target.value, guruName: name});
                      }} 
                      className={`w-full p-2.5 rounded-xl border border-teal-200 outline-none text-sm font-medium ${type === 'istirahat' ? 'bg-gray-100 text-gray-400' : 'bg-white'}`} 
                      required={type === 'pelajaran'}
                    >
                      <option value="">{type === 'istirahat' ? '-- Tidak Butuh Guru --' : '-- Pilih Guru --'}</option>
                      {listGuruMapel.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </div>
                  <button onClick={handleAddSlot} className="w-full md:w-auto bg-teal-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-teal-700 flex items-center justify-center gap-2 shadow-lg shadow-teal-100">
                    <Plus size={18} /> Tambah Slot
                  </button>
                </div>
              </div>

              {/* DAFTAR JADWAL HARI AKTIF */}
              <div className="space-y-3">
                <h3 className="font-bold text-gray-700 border-b pb-2 flex items-center gap-2">
                   Kegiatan Hari {activeHari}
                </h3>
                {(jadwal[activeHari] || []).length === 0 ? (
                  <div className="text-center p-8 border border-dashed border-gray-200 rounded-xl text-gray-400 text-sm">Belum ada agenda.</div>
                ) : (
                  jadwal[activeHari].map((slot, idx) => (
                    <div key={idx} className={`flex justify-between items-center p-4 border rounded-2xl transition-all ${slot.guruId === 'istirahat' ? 'bg-orange-50/50 border-orange-100' : 'bg-gray-50 border-gray-100 hover:border-teal-300'}`}>
                      <div className="flex items-center gap-4">
                        <div className={`text-xs font-mono font-black px-3 py-2 rounded-xl border ${slot.guruId === 'istirahat' ? 'text-orange-700 bg-white border-orange-200' : 'text-teal-700 bg-teal-100 border-teal-200'}`}>
                          {slot.jamMulai} - {slot.jamSelesai}
                        </div>
                        <div>
                          <p className="font-bold text-gray-800 text-sm flex items-center gap-2">
                             {slot.guruId === 'istirahat' && <Coffee size={14} className="text-orange-500" />} {slot.mapel}
                          </p>
                          <p className="text-[10px] text-gray-500 font-medium mt-0.5 flex items-center gap-1">
                             <User size={10}/> {slot.guruName}
                          </p>
                        </div>
                      </div>
                      <button onClick={() => {
                        const updated = [...jadwal[activeHari]];
                        updated.splice(idx, 1);
                        setJadwal({...jadwal, [activeHari]: updated});
                      }} className="text-red-300 hover:text-red-500 p-2"><Trash2 size={18}/></button>
                    </div>
                  ))
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