import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Calendar, Plus, Trash2, Clock, BookOpen, Save, Loader2 } from 'lucide-react';

const Jadwal = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const days = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const [activeDay, setActiveDay] = useState("Senin");
  
  // Data Jadwal { Senin: [], Selasa: [], ... }
  const [schedule, setSchedule] = useState({}); 
  const [subjects, setSubjects] = useState([]); // List Mapel dari Pengaturan

  // Form Input
  const [newItem, setNewItem] = useState({ timeStart: "07:00", timeEnd: "08:00", subject: "" });

  // 1. LOAD DATA
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          // A. Ambil List Mapel (Dari Pengaturan)
          const configRef = doc(db, "settings", user.uid);
          const configSnap = await getDoc(configRef);
          let listMapel = ["Matematika", "B. Indonesia", "IPA", "IPS", "PAI"];
          if (configSnap.exists() && configSnap.data().subjects) {
            listMapel = configSnap.data().subjects;
          }
          setSubjects(listMapel);
          setNewItem(prev => ({ ...prev, subject: listMapel[0] }));

          // B. Ambil Jadwal Yang Sudah Ada
          const jadwalRef = doc(db, "jadwal", user.uid); // Satu Dokumen per Guru
          const jadwalSnap = await getDoc(jadwalRef);
          if (jadwalSnap.exists()) {
            setSchedule(jadwalSnap.data());
          }
        } catch (error) { console.error(error); }
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. TAMBAH JADWAL KE STATE
  const handleAdd = () => {
    const currentDaySchedule = schedule[activeDay] || [];
    const updatedDay = [...currentDaySchedule, { ...newItem, id: Date.now() }];
    
    // Sortir berdasarkan jam
    updatedDay.sort((a, b) => a.timeStart.localeCompare(b.timeStart));

    const newSchedule = { ...schedule, [activeDay]: updatedDay };
    setSchedule(newSchedule);
    saveToFirebase(newSchedule); // Auto Save
  };

  // 3. HAPUS ITEM
  const handleDelete = (id) => {
    const updatedDay = schedule[activeDay].filter(item => item.id !== id);
    const newSchedule = { ...schedule, [activeDay]: updatedDay };
    setSchedule(newSchedule);
    saveToFirebase(newSchedule);
  };

  // 4. SIMPAN KE FIREBASE
  const saveToFirebase = async (data) => {
    setSaving(true);
    const user = auth.currentUser;
    if (user) {
      try {
        await setDoc(doc(db, "jadwal", user.uid), data, { merge: true });
      } catch (e) { alert("Gagal simpan"); }
    }
    setSaving(false);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto pb-24">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Jadwal Pelajaran</h1>
          <p className="text-gray-500 text-sm">Atur roster mingguan kelas.</p>
        </div>
        {saving && <span className="text-xs text-teal-600 flex items-center gap-1"><Loader2 className="animate-spin" size={12}/> Menyimpan...</span>}
      </div>

      {/* Tab Hari */}
      <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
        {days.map(day => (
          <button key={day} onClick={() => setActiveDay(day)}
            className={`px-6 py-2 rounded-full font-bold transition-all whitespace-nowrap border
            ${activeDay === day ? 'bg-teal-600 text-white border-teal-600 shadow-lg shadow-teal-200' : 'bg-white text-gray-500 border-gray-200'}`}>
            {day}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Form Input */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Plus size={18}/> Tambah Mapel ({activeDay})</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
               <div>
                 <label className="text-xs font-bold text-gray-500">Mulai</label>
                 <input type="time" className="w-full p-2 border rounded-lg bg-gray-50" value={newItem.timeStart} onChange={e => setNewItem({...newItem, timeStart: e.target.value})} />
               </div>
               <div>
                 <label className="text-xs font-bold text-gray-500">Selesai</label>
                 <input type="time" className="w-full p-2 border rounded-lg bg-gray-50" value={newItem.timeEnd} onChange={e => setNewItem({...newItem, timeEnd: e.target.value})} />
               </div>
            </div>
            <div>
               <label className="text-xs font-bold text-gray-500">Mata Pelajaran</label>
               <select className="w-full p-2 border rounded-lg" value={newItem.subject} onChange={e => setNewItem({...newItem, subject: e.target.value})}>
                 {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                 <option value="Istirahat">☕ Istirahat</option>
                 <option value="Upacara">🚩 Upacara</option>
                 <option value="Pulang">🏠 Pulang</option>
               </select>
            </div>
            <button onClick={handleAdd} className="w-full bg-teal-600 text-white py-2 rounded-xl font-bold shadow hover:bg-teal-700">Tambah ke Jadwal</button>
          </div>
        </div>

        {/* List Jadwal */}
        <div className="lg:col-span-2 space-y-3">
           {!schedule[activeDay] || schedule[activeDay].length === 0 ? (
             <div className="p-10 text-center border-2 border-dashed border-gray-200 rounded-2xl text-gray-400">
               Belum ada jadwal hari {activeDay}.
             </div>
           ) : (
             schedule[activeDay].map((item, idx) => (
               <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center group hover:border-teal-200 transition-colors">
                  <div className="flex items-center gap-4">
                     <div className="bg-teal-50 text-teal-700 font-bold p-3 rounded-lg text-center min-w-[80px]">
                        <span className="block text-sm">{item.timeStart}</span>
                        <span className="block text-xs opacity-50">-</span>
                        <span className="block text-sm opacity-80">{item.timeEnd}</span>
                     </div>
                     <div>
                        <h4 className="font-bold text-gray-800 text-lg">{item.subject}</h4>
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">Jam ke-{idx+1}</span>
                     </div>
                  </div>
                  <button onClick={() => handleDelete(item.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18}/></button>
               </div>
             ))
           )}
        </div>

      </div>
    </div>
  );
};

export default Jadwal;