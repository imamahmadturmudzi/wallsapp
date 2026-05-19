import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, query, where, orderBy } from 'firebase/firestore';
import { BookOpen, Plus, Trash2, Edit, X, Save, Clock, Archive, ExternalLink, Calendar as CalendarIcon, FileText } from 'lucide-react';

const Tugas = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('aktif'); 
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "", title: "", subject: "", description: "", dueDate: "", link: ""
  });

  const tugasRef = collection(db, "tugas");

  const getTasks = async () => {
    setLoading(true);
    const user = auth.currentUser;
    if (user) {
      try {
        const q = query(tugasRef, where("teacherId", "==", user.uid));
        const data = await getDocs(q);
        let list = data.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        list.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        setTasks(list);
      } catch (error) { console.error(error); }
    }
    setLoading(false);
  };

  useEffect(() => { 
    const unsubscribe = auth.onAuthStateChanged(user => { if (user) getTasks(); });
    return () => unsubscribe();
  }, []);

  const openAddModal = () => {
    setFormData({ id: "", title: "", subject: "", description: "", dueDate: "", link: "" });
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  const openEditModal = (task) => {
    setFormData(task);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const user = auth.currentUser;
      const cleanData = { ...formData };
      delete cleanData.id; 

      if (isEditMode) {
        await updateDoc(doc(db, "tugas", formData.id), cleanData);
      } else {
        await addDoc(tugasRef, {
          ...cleanData,
          teacherId: user.uid,
          completedBy: [], 
          createdAt: new Date().toISOString()
        });
      }
      setIsModalOpen(false);
      getTasks(); 
    } catch (error) { alert("Gagal menyimpan tugas."); }
  };

  const handleDelete = async (id, title) => {
    if (confirm(`Hapus tugas "${title}" permanen?`)) {
      await deleteDoc(doc(db, "tugas", id));
      getTasks();
    }
  };

  // === LOGIKA PEMISAHAN TUGAS AKTIF & RIWAYAT ===
  const today = new Date();
  today.setHours(0, 0, 0, 0); 

  const activeTasks = tasks.filter(task => {
    const due = new Date(task.dueDate);
    due.setHours(23, 59, 59, 999); 
    return due >= today;
  });

  const historyTasks = tasks.filter(task => {
    const due = new Date(task.dueDate);
    due.setHours(23, 59, 59, 999);
    return due < today;
  });

  const displayedTasks = activeTab === 'aktif' ? activeTasks : historyTasks;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto animate-fade-in font-sans text-gray-800">
      
      {/* HEADER FLAT & CLEAN */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-gray-50 text-gray-600 rounded-xl flex items-center justify-center border border-gray-100 shrink-0">
             <FileText size={24} />
           </div>
           <div>
             <h1 className="text-xl font-bold text-gray-800">Monitoring Tugas</h1>
             <p className="text-sm text-gray-500 mt-1">Kelola lembar penugasan, PR, dan proyek siswa.</p>
           </div>
        </div>
        <button onClick={openAddModal} className="flex items-center justify-center gap-2 bg-gray-800 text-white px-5 py-2.5 rounded-lg hover:bg-gray-900 font-medium transition-colors text-sm shrink-0">
           <Plus size={18}/> Tambah Tugas Baru
        </button>
      </div>

      {/* TAB SWITCHER MINIMALIS */}
      <div className="flex gap-2 bg-white p-1.5 rounded-xl border border-gray-200 w-full md:w-fit shadow-sm">
        <button onClick={() => setActiveTab('aktif')} className={`flex-1 md:w-36 py-2 rounded-lg text-xs font-bold transition-all flex justify-center items-center gap-2 ${activeTab === 'aktif' ? 'bg-gray-100 text-gray-800 border border-gray-200/50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
          <Clock size={14} /> Tugas Aktif ({activeTasks.length})
        </button>
        <button onClick={() => setActiveTab('riwayat')} className={`flex-1 md:w-36 py-2 rounded-lg text-xs font-bold transition-all flex justify-center items-center gap-2 ${activeTab === 'riwayat' ? 'bg-gray-100 text-gray-800 border border-gray-200/50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
          <Archive size={14} /> Riwayat ({historyTasks.length})
        </button>
      </div>

      {/* KONTEN DAFTAR TUGAS */}
      {loading ? <p className="text-center text-gray-400 font-medium py-10 animate-pulse">Memuat data tugas...</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayedTasks.length === 0 ? (
            <div className="col-span-full text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300 text-gray-400 text-sm">
               {activeTab === 'aktif' ? (
                  <p>Hore! Meja bersih, tidak ada tugas aktif saat ini.</p>
               ) : (
                  <p>Belum ada riwayat tugas yang kedaluwarsa.</p>
               )}
            </div>
          ) : (
            displayedTasks.map((task) => {
               const due = new Date(task.dueDate);
               due.setHours(23, 59, 59, 999);
               const diffTime = due - new Date();
               const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
               
               let statusText = `${daysLeft} Hari Lagi`;
               let bgBadge = 'bg-blue-50 text-blue-600 border-blue-100';

               if (daysLeft < 0) {
                  statusText = 'Kedaluwarsa';
                  bgBadge = 'bg-gray-50 text-gray-500 border-gray-200';
               } else if (daysLeft === 0) {
                  statusText = 'Hari Ini!';
                  bgBadge = 'bg-orange-50 text-orange-600 border-orange-100';
               }

               return (
                <div key={task.id} className="bg-white p-5 rounded-2xl border border-gray-200 hover:border-gray-300 transition-colors flex flex-col h-full group">
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-3">
                       <span className="text-[10px] font-bold px-2.5 py-1 rounded-md uppercase bg-gray-50 text-gray-600 border border-gray-200">
                         {task.subject}
                       </span>
                       <span className={`text-[10px] font-bold px-2 py-1 rounded-md border ${bgBadge}`}>
                         {statusText}
                       </span>
                    </div>
                    
                    <h3 className="font-bold text-gray-800 text-base leading-tight mb-2">{task.title}</h3>
                    <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed mb-4">{task.description}</p>
                    
                    <div className="flex flex-wrap gap-2">
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500 bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-100">
                         <CalendarIcon size={12} className="text-gray-400"/> {task.dueDate}
                      </div>

                      {task.link && (
                         <a href={task.link} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[11px] font-bold text-gray-700 bg-white border border-gray-200 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                            <ExternalLink size={12} className="text-gray-400"/> Lampiran
                         </a>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-1 mt-5 pt-4 border-t border-gray-50 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditModal(task)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit Tugas">
                      <Edit size={16}/>
                    </button>
                    <button onClick={() => handleDelete(task.id, task.title)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Hapus Tugas">
                      <Trash2 size={16}/>
                    </button>
                  </div>
                </div>
               )
            })
          )}
        </div>
      )}

      {/* MODAL FORM TUGAS (Dokumen Style) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl animate-zoom-in border border-gray-100 flex flex-col overflow-hidden">
            
            {/* Header Modal */}
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white">
              <h3 className="text-base font-bold text-gray-800">{isEditMode ? "Edit Penugasan" : "Lembar Tugas Baru"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                 <X size={18} />
              </button>
            </div>
            
            {/* Body Form */}
            <form onSubmit={handleSave} className="flex flex-col max-h-[80vh]">
              <div className="p-6 overflow-y-auto space-y-5 bg-gray-50/30">
                
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Mata Pelajaran</label>
                  <input type="text" value={formData.subject} onChange={(e) => setFormData({...formData, subject: e.target.value})} className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 text-sm font-semibold text-gray-800" placeholder="Contoh: Tematik, Matematika, IPA" required />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Judul Tugas</label>
                  <input type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 text-sm text-gray-800" placeholder="Contoh: LKS Halaman 12-15" required />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Instruksi Pengerjaan</label>
                  <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows="4" className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 text-sm text-gray-800 resize-none" placeholder="Jelaskan detail cara mengerjakannya..."></textarea>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Tenggat Waktu</label>
                    <input type="date" value={formData.dueDate} onChange={(e) => setFormData({...formData, dueDate: e.target.value})} className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 text-sm text-gray-800" required />
                  </div>
                  <div>
                     <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Tautan Referensi</label>
                     <input type="url" value={formData.link} onChange={(e) => setFormData({...formData, link: e.target.value})} className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 text-sm text-gray-800 placeholder-gray-300" placeholder="https://..." />
                  </div>
                </div>
              </div>

              {/* Footer Modal */}
              <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end gap-3">
                 <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-lg font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-all text-sm">
                   Batal
                 </button>
                 <button type="submit" className="px-5 py-2.5 rounded-lg font-medium text-white bg-gray-800 hover:bg-gray-900 transition-all text-sm flex items-center gap-2">
                   <Save size={16} /> Simpan Penugasan
                 </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
};

export default Tugas;