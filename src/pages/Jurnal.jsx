import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, query, where, orderBy } from 'firebase/firestore';
import { BookMarked, Plus, Trash2, CheckCircle, AlertCircle, MessageSquare, X } from 'lucide-react';

const Jurnal = () => {
  const [jurnals, setJurnals] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    studentId: '', studentName: '', type: 'positif', note: ''
  });

  const jurnalRef = collection(db, "jurnal");
  const siswaRef = collection(db, "siswa");

  const fetchData = async () => {
    setLoading(true);
    const user = auth.currentUser;
    if (user) {
      try {
        const qSiswa = query(siswaRef, where("teacherId", "==", user.uid));
        const siswaSnap = await getDocs(qSiswa);
        let listSiswa = siswaSnap.docs.map(d => ({ id: d.id, name: d.data().name }));
        listSiswa.sort((a, b) => a.name.localeCompare(b.name));
        setStudents(listSiswa);

        const qJurnal = query(jurnalRef, where("teacherId", "==", user.uid), orderBy("createdAt", "desc"));
        const jurnalSnap = await getDocs(qJurnal);
        let listJurnal = jurnalSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setJurnals(listJurnal);
      } catch (error) {
        console.error("Gagal mengambil data:", error);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => { if (user) fetchData(); });
    return () => unsubscribe();
  }, []);

  const handleStudentSelect = (e) => {
    const selectedId = e.target.value;
    const selectedStudent = students.find(s => s.id === selectedId);
    setFormData({
      ...formData,
      studentId: selectedId,
      studentName: selectedStudent ? selectedStudent.name : ''
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.studentId) return alert("Pilih siswa terlebih dahulu!");
    if (!formData.note.trim()) return alert("Catatan tidak boleh kosong!");

    setIsSaving(true);
    try {
      const user = auth.currentUser;
      const now = new Date();
      const displayTime = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' WIB';

      await addDoc(jurnalRef, {
        ...formData,
        teacherId: user.uid,
        displayTime: displayTime,
        createdAt: now.getTime()
      });

      setIsModalOpen(false);
      setFormData({ studentId: '', studentName: '', type: 'positif', note: '' });
      fetchData(); 
    } catch (error) {
      alert("Gagal menyimpan jurnal.");
    }
    setIsSaving(false);
  };

  const handleDelete = async (id, studentName, type) => {
    const pesanKonfirmasi = type === 'negatif' 
      ? `Tandai masalah ${studentName} sebagai SELESAI dan hapus dari jurnal orang tua?` 
      : `Hapus catatan positif ${studentName}?`;

    if (confirm(pesanKonfirmasi)) {
      try {
        await deleteDoc(doc(db, "jurnal", id));
        setJurnals(jurnals.filter(j => j.id !== id));
      } catch (error) {
        alert("Gagal menghapus jurnal.");
      }
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto animate-fade-in font-sans text-gray-800">
      
      {/* HEADER FLAT & CLEAN */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-gray-50 text-gray-600 rounded-xl flex items-center justify-center border border-gray-100 shrink-0">
             <BookMarked size={24} />
           </div>
           <div>
             <h1 className="text-xl font-bold text-gray-800">Jurnal Sikap Kelas</h1>
             <p className="text-sm text-gray-500 mt-1">Catat perilaku anekdotal siswa sebagai laporan terintegrasi.</p>
           </div>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center justify-center gap-2 bg-gray-800 text-white px-5 py-2.5 rounded-lg hover:bg-gray-900 font-medium transition-colors text-sm shrink-0">
          <Plus size={18} /> Tambah Catatan
        </button>
      </div>

      {/* DAFTAR JURNAL */}
      {loading ? (
        <p className="text-center py-10 text-gray-400 font-medium animate-pulse">Memuat jurnal kelas...</p>
      ) : jurnals.length === 0 ? (
        <div className="bg-gray-50/50 p-12 rounded-2xl border border-dashed border-gray-300 text-center text-gray-400 flex flex-col items-center">
          <MessageSquare size={40} className="mb-3 opacity-20" />
          <p className="text-sm">Belum ada catatan jurnal. Kelas terpantau aman dan kondusif!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {jurnals.map((item) => (
            <div key={item.id} className="bg-white p-5 rounded-2xl border border-gray-200 hover:border-gray-300 transition-colors flex flex-col h-full group">
              
              <div className="flex justify-between items-start mb-4">
                <div className={`text-[9px] font-bold px-2 py-1 rounded uppercase tracking-wider border ${item.type === 'positif' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                  {item.type === 'positif' ? 'Sikap Positif' : 'Perlu Perbaikan'}
                </div>
                <span className="text-[10px] text-gray-400 font-medium">{item.displayTime}</span>
              </div>
              
              <h3 className="font-bold text-gray-800 text-base mb-2">{item.studentName}</h3>
              <p className="text-sm text-gray-600 leading-relaxed flex-1 italic bg-gray-50/50 p-3 rounded-lg border border-gray-100">
                "{item.note}"
              </p>

              {/* TOMBOL HAPUS / SELESAIKAN (SOPAN) */}
              <div className="mt-4 pt-3 border-t border-gray-50 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleDelete(item.id, item.studentName, item.type)} 
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors
                    ${item.type === 'negatif' 
                      ? 'text-gray-500 hover:text-green-600 hover:bg-green-50 border border-transparent hover:border-green-100'
                      : 'text-gray-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100'
                    }`}
                >
                  {item.type === 'negatif' ? (
                    <><CheckCircle size={14} /> Tandai Selesai</>
                  ) : (
                    <><Trash2 size={14} /> Hapus Catatan</>
                  )}
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* MODAL TAMBAH JURNAL (Dokumen Style) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl animate-zoom-in border border-gray-100 flex flex-col overflow-hidden">
            
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10 rounded-t-2xl">
              <h3 className="text-base font-bold text-gray-800">Catatan Jurnal Baru</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                 <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="flex flex-col max-h-[80vh]">
              <div className="p-6 overflow-y-auto space-y-5 bg-gray-50/30">
                
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Pilih Siswa</label>
                  <select value={formData.studentId} onChange={handleStudentSelect} className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 text-sm font-semibold text-gray-800" required>
                    <option value="">-- Daftar Siswa --</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2 ml-0.5">Sifat Catatan</label>
                  <div className="flex gap-3">
                    <label className={`flex-1 flex flex-col items-center justify-center py-3 px-1 rounded-lg border cursor-pointer transition-all text-center
                      ${formData.type === 'positif' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-400 bg-white hover:bg-gray-50'}`}>
                      <input type="radio" name="type" value="positif" checked={formData.type === 'positif'} onChange={(e) => setFormData({...formData, type: e.target.value})} className="hidden" />
                      <CheckCircle size={16} className="mb-1.5" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Apresiasi</span>
                    </label>
                    <label className={`flex-1 flex flex-col items-center justify-center py-3 px-1 rounded-lg border cursor-pointer transition-all text-center
                      ${formData.type === 'negatif' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-400 bg-white hover:bg-gray-50'}`}>
                      <input type="radio" name="type" value="negatif" checked={formData.type === 'negatif'} onChange={(e) => setFormData({...formData, type: e.target.value})} className="hidden" />
                      <AlertCircle size={16} className="mb-1.5" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Perbaikan</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Deskripsi Kejadian</label>
                  <textarea value={formData.note} onChange={(e) => setFormData({...formData, note: e.target.value})} rows="4" className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 text-sm text-gray-800 resize-none" placeholder="Contoh: Berkelahi di kantin, atau Membantu teman membersihkan kelas..." required></textarea>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end gap-3 sticky bottom-0">
                 <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-lg font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-all text-sm">
                   Batal
                 </button>
                 <button type="submit" disabled={isSaving} className="px-5 py-2.5 rounded-lg font-medium text-white bg-gray-800 hover:bg-gray-900 transition-all text-sm flex items-center gap-2 disabled:opacity-50">
                   {isSaving ? 'Menyimpan...' : 'Simpan Jurnal'}
                 </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
};

export default Jurnal;