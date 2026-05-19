import { useState, useEffect } from 'react';
import { auth, db } from '../firebase'; // PASTIKAN AUTH DI-IMPORT
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Book, Star, Plus, Trash2, LayoutGrid } from 'lucide-react';

const MasterData = () => {
  const [activeTab, setActiveTab] = useState('mapel');
  const [listMapel, setListMapel] = useState([]);
  const [listEkskul, setListEkskul] = useState([]);
  const [newItem, setNewItem] = useState('');
  const [mySchoolId, setMySchoolId] = useState(""); // STATE BARU: Penyimpan ID Sekolah

  // INISIALISASI SAAS
  useEffect(() => {
    const fetchDataSaaS = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        // 1. Tarik profil Admin untuk cek ID Sekolahnya
        const adminRef = doc(db, "teachers", user.uid);
        const adminSnap = await getDoc(adminRef);

        if (adminSnap.exists() && adminSnap.data().schoolId) {
          const currentSchoolId = adminSnap.data().schoolId;
          setMySchoolId(currentSchoolId);

          // 2. Tarik kurikulum KHUSUS sekolah ini
          const docRef = doc(db, "curriculums", currentSchoolId);
          const snap = await getDoc(docRef);
          
          if (snap.exists()) {
            setListMapel(snap.data().mapel || []);
            setListEkskul(snap.data().ekskul || []);
          }
        }
      } catch (error) {
        console.error("Gagal menarik data kurikulum SaaS:", error);
      }
    };
    fetchDataSaaS();
  }, []);

  const handleAdd = async () => {
    if (!newItem.trim() || !mySchoolId) return;
    
    const updated = activeTab === 'mapel' 
      ? { mapel: [...listMapel, newItem.trim()], ekskul: listEkskul }
      : { mapel: listMapel, ekskul: [...listEkskul, newItem.trim()] };
    
    // Simpan dengan stempel schoolId (menggunakan ID dokumen = schoolId)
    await setDoc(doc(db, "curriculums", mySchoolId), {
      ...updated,
      schoolId: mySchoolId,
      updatedAt: new Date().getTime()
    }, { merge: true });

    if (activeTab === 'mapel') setListMapel(updated.mapel);
    else setListEkskul(updated.ekskul);
    setNewItem('');
  };

  const handleDelete = async (index) => {
    if (!mySchoolId) return;
    let updated;

    if (activeTab === 'mapel') {
      const temp = [...listMapel];
      temp.splice(index, 1);
      updated = { mapel: temp, ekskul: listEkskul };
      setListMapel(temp);
    } else {
      const temp = [...listEkskul];
      temp.splice(index, 1);
      updated = { mapel: listMapel, ekskul: temp };
      setListEkskul(temp);
    }

    await setDoc(doc(db, "curriculums", mySchoolId), {
      ...updated,
      updatedAt: new Date().getTime()
    }, { merge: true });
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto animate-fade-in font-sans text-gray-800">
      
      {/* HEADER FLAT & CLEAN */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-gray-50 text-gray-600 rounded-xl flex items-center justify-center border border-gray-100 shrink-0">
             <LayoutGrid size={24} />
           </div>
           <div>
             <h1 className="text-xl font-bold text-gray-800">Master Data Kurikulum</h1>
             <p className="text-sm text-gray-500 mt-1">Kelola daftar referensi mata pelajaran dan ekstrakurikuler sekolah.</p>
           </div>
        </div>
      </div>

      {/* TAB SWITCHER MINIMALIS */}
      <div className="flex gap-2 bg-white p-1.5 rounded-xl border border-gray-200 w-full md:w-fit shadow-sm">
        <button 
          onClick={() => setActiveTab('mapel')} 
          className={`flex-1 md:w-44 py-2 rounded-lg text-xs font-bold transition-all flex justify-center items-center gap-2 ${activeTab === 'mapel' ? 'bg-gray-100 text-gray-800 border border-gray-200/50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
        >
          <Book size={14} /> Mata Pelajaran
        </button>
        <button 
          onClick={() => setActiveTab('ekskul')} 
          className={`flex-1 md:w-44 py-2 rounded-lg text-xs font-bold transition-all flex justify-center items-center gap-2 ${activeTab === 'ekskul' ? 'bg-gray-100 text-gray-800 border border-gray-200/50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
        >
          <Star size={14} /> Ekstrakurikuler
        </button>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200">
        
        {/* INPUT BAR */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input 
            type="text" 
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder={`Ketik nama ${activeTab === 'mapel' ? 'mata pelajaran' : 'ekstrakurikuler'} baru...`}
            className="flex-1 p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 text-sm font-medium text-gray-800 transition-all placeholder-gray-400"
          />
          <button 
            onClick={handleAdd} 
            disabled={!newItem.trim()}
            className="bg-gray-800 text-white px-6 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            <Plus size={16} /> Tambah Data
          </button>
        </div>

        {/* LIST ITEMS */}
        {(activeTab === 'mapel' ? listMapel : listEkskul).length === 0 ? (
           <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl text-gray-400 text-sm bg-gray-50/50">
              Belum ada data {activeTab === 'mapel' ? 'mata pelajaran' : 'ekstrakurikuler'} yang didaftarkan.
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {(activeTab === 'mapel' ? listMapel : listEkskul).map((item, idx) => (
              <div key={idx} className="flex justify-between items-center p-3.5 bg-white rounded-xl border border-gray-200 group hover:border-gray-300 transition-colors">
                <span className="font-semibold text-gray-700 text-sm pl-1">{item}</span>
                <button 
                  onClick={() => handleDelete(idx)} 
                  className="text-gray-300 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  title="Hapus Data"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
        
      </div>
    </div>
  );
};

export default MasterData;