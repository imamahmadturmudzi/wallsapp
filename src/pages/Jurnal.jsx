import { useState, useEffect } from 'react';
import { db, auth } from '../firebase'; // Import Auth
import { collection, addDoc, onSnapshot, query, orderBy, getDocs, where } from 'firebase/firestore';
import { Plus, ThumbsUp, ThumbsDown, X, Save, Trash2 } from 'lucide-react';

const Jurnal = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [logs, setLogs] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newLog, setNewLog] = useState({ 
    studentId: "", studentName: "", type: "positif", note: "" 
  });

  const jurnalRef = collection(db, "jurnal");
  const siswaRef = collection(db, "siswa");

  // 1. AMBIL DATA REALTIME (FILTERED)
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        // Ambil Siswa Milik Guru
        const fetchStudents = async () => {
          const qSiswa = query(siswaRef, where("teacherId", "==", user.uid));
          const data = await getDocs(qSiswa);
          setStudents(data.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        };
        fetchStudents();

        // Ambil Jurnal Milik Guru
        const qJurnal = query(
            jurnalRef, 
            where("teacherId", "==", user.uid),
            orderBy("createdAt", "desc")
        );
        const unsubscribeLogs = onSnapshot(qJurnal, (snapshot) => {
          setLogs(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
          setLoading(false);
        });

        return () => unsubscribeLogs();
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // 2. SIMPAN DENGAN ID GURU
  const handleSave = async (e) => {
    e.preventDefault();
    if (!newLog.studentId) return alert("Pilih siswa dulu!");

    const user = auth.currentUser;
    if (!user) return alert("Sesi habis.");

    try {
      await addDoc(jurnalRef, {
        teacherId: user.uid, // <--- STEMPEL PENTING
        studentId: newLog.studentId,
        studentName: newLog.studentName,
        type: newLog.type,
        note: newLog.note,
        createdAt: new Date().toISOString(),
        displayTime: new Date().toLocaleString('id-ID'),
      });
      
      setIsModalOpen(false);
      setNewLog({ studentId: "", studentName: "", type: "positif", note: "" });
    } catch (error) {
      console.error(error);
      alert("Gagal menyimpan.");
    }
  };

  const handleSelectStudent = (e) => {
    const selectedId = e.target.value;
    const selectedStudent = students.find(s => s.id === selectedId);
    setNewLog({ 
      ...newLog, 
      studentId: selectedId, 
      studentName: selectedStudent ? selectedStudent.name : "" 
    });
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto min-h-screen relative pb-24">
      <h1 className="text-2xl font-bold text-gray-800 mb-6 flex justify-between items-center">
        Jurnal Sikap
        <span className="text-sm font-normal text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          {logs.length} Catatan
        </span>
      </h1>

      <div className="space-y-4">
        {!loading && logs.length === 0 && (
          <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-2xl border border-dashed">
            Belum ada catatan sikap di kelas ini.
          </div>
        )}

        {logs.map((log) => (
          <div key={log.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-white
              ${log.type === 'positif' ? 'bg-green-500 shadow-green-200' : 'bg-red-500 shadow-red-200'} shadow-lg`}>
              {log.type === 'positif' ? <ThumbsUp size={20} /> : <ThumbsDown size={20} />}
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-gray-800">{log.studentName}</h3>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full 
                    ${log.type === 'positif' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {log.type === 'positif' ? 'Prestasi' : 'Pelanggaran'}
                  </span>
                </div>
                <span className="text-[10px] text-gray-400">{log.displayTime}</span>
              </div>
              <p className="text-gray-600 text-sm mt-2 italic">"{log.note}"</p>
            </div>
          </div>
        ))}
      </div>

      <button onClick={() => setIsModalOpen(true)} className="fixed bottom-20 md:bottom-10 right-4 md:right-10 bg-teal-600 text-white p-4 rounded-full shadow-xl shadow-teal-300 hover:bg-teal-700 transition-transform hover:scale-110 z-40">
        <Plus size={28} />
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Catat Kejadian</h2>
              <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-gray-400"/></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <button type="button" onClick={() => setNewLog({...newLog, type: 'positif'})} className={`p-3 rounded-xl flex flex-col items-center gap-2 border-2 ${newLog.type === 'positif' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-100 text-gray-400'}`}><ThumbsUp size={24} /> <span className="font-medium">Positif</span></button>
                <button type="button" onClick={() => setNewLog({...newLog, type: 'negatif'})} className={`p-3 rounded-xl flex flex-col items-center gap-2 border-2 ${newLog.type === 'negatif' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-100 text-gray-400'}`}><ThumbsDown size={24} /> <span className="font-medium">Negatif</span></button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Siswa</label>
                <select className="w-full p-3 bg-gray-50 rounded-xl border-none" value={newLog.studentId} onChange={handleSelectStudent} required>
                  <option value="">-- Cari Nama Siswa --</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.nis})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan</label>
                <textarea rows="3" className="w-full p-3 bg-gray-50 rounded-xl border-none" value={newLog.note} onChange={(e) => setNewLog({...newLog, note: e.target.value})} required></textarea>
              </div>
              <button type="submit" className="w-full bg-teal-600 text-white py-3 rounded-xl font-bold">Simpan</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Jurnal;