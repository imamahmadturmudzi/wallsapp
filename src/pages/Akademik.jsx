import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, doc, setDoc, onSnapshot, query, where } from 'firebase/firestore';
import { Book, Save, Loader2, Star, Heart } from 'lucide-react';

const Akademik = () => {
  const [activeTab, setActiveTab] = useState("Sikap & Karakter"); 
  const [students, setStudents] = useState([]);
  const [grades, setGrades] = useState({}); 
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        const fetchData = async () => {
          try {
            // Ambil Siswa (Filtered)
            const qSiswa = query(collection(db, "siswa"), where("teacherId", "==", user.uid));
            const siswaSnapshot = await getDocs(qSiswa);
            const siswaList = siswaSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            siswaList.sort((a, b) => a.name.localeCompare(b.name));
            setStudents(siswaList);

            // Pantau Nilai
            const unsubscribeNilai = onSnapshot(collection(db, "nilai"), (snapshot) => {
              const gradesData = {};
              snapshot.docs.forEach(doc => { gradesData[doc.id] = doc.data(); });
              setGrades(gradesData);
              setLoading(false);
            });
            return () => unsubscribeNilai();
          } catch (error) { setLoading(false); }
        };
        fetchData();
      }
    });
    return () => unsubscribeAuth();
  }, []);

  const handleSikapChange = (sid, f, v) => setGrades(p => ({...p, [sid]: {...p[sid], sikap: {...p[sid]?.sikap, [f]: v}}}));
  const handleEkskulChange = (sid, n, v) => setGrades(p => ({...p, [sid]: {...p[sid], ekskul: {...p[sid]?.ekskul, [`predikat${n}`]: v}}}));
  
  const getSikap = (sid, f) => grades[sid]?.sikap?.[f] || "";
  const getEkskul = (sid, n) => grades[sid]?.ekskul?.[`predikat${n}`] || "";

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const promises = students.map(async (student) => {
        const docRef = doc(db, "nilai", student.id);
        let dataToUpdate = {};
        if (activeTab === "Ekstrakurikuler") { dataToUpdate = { ekskul: grades[student.id]?.ekskul || {} }; }
        else { dataToUpdate = { sikap: grades[student.id]?.sikap || {} }; }
        await setDoc(docRef, dataToUpdate, { merge: true });
      });
      await Promise.all(promises);
      alert("Tersimpan!");
    } catch (e) { alert("Gagal."); }
    setIsSaving(false);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto pb-24">
       <div className="flex justify-between items-center gap-4">
          <div><h1 className="text-2xl font-bold flex gap-2"><Book className="text-teal-600"/> Penilaian Non-Akademik</h1><p className="text-sm text-gray-500">Input: <b>{activeTab}</b></p></div>
          <button onClick={handleSave} disabled={isSaving||loading} className="bg-green-600 text-white px-6 py-2 rounded-xl flex gap-2 shadow">{isSaving?<Loader2 className="animate-spin"/>:<Save/>} Simpan</button>
       </div>

       <div className="flex gap-2 pb-2">
          <button onClick={() => setActiveTab("Sikap & Karakter")} className={`flex-1 py-2 rounded-lg font-bold border ${activeTab==="Sikap & Karakter"?'bg-orange-500 text-white border-orange-500':'bg-white text-gray-500'}`}><Heart size={16} className="inline mr-2"/> Sikap & Karakter</button>
          <button onClick={() => setActiveTab("Ekstrakurikuler")} className={`flex-1 py-2 rounded-lg font-bold border ${activeTab==="Ekstrakurikuler"?'bg-purple-600 text-white border-purple-600':'bg-white text-gray-500'}`}><Star size={16} className="inline mr-2"/> Ekskul</button>
       </div>

       {!loading && activeTab === "Ekstrakurikuler" && (
          <div className="bg-white rounded-2xl border overflow-hidden">
             <table className="w-full text-left">
                <thead className="bg-purple-50 text-purple-800 font-bold text-sm uppercase"><tr><th className="p-4">Nama</th><th className="p-4 text-center">Ekskul 1</th><th className="p-4 text-center">Ekskul 2</th><th className="p-4 text-center">Ekskul 3</th></tr></thead>
                <tbody>
                   {students.map((s) => (
                      <tr key={s.id} className="hover:bg-purple-50 border-b last:border-0">
                         <td className="p-4 font-bold">{s.name}</td>
                         {[1,2,3].map(n => <td key={n} className="p-4 text-center">{s[`ekskul${n}`] ? <div className="bg-gray-50 p-2 rounded border"><div className="text-xs text-gray-500 mb-1 font-bold">{s[`ekskul${n}`]}</div><select value={getEkskul(s.id, n)} onChange={(e)=>handleEkskulChange(s.id, n, e.target.value)} className="w-full border rounded p-1 text-sm"><option value="">-Nilai-</option><option value="A">A</option><option value="B">B</option><option value="C">C</option></select></div> : "-"}</td>)}
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
       )}

       {!loading && activeTab === "Sikap & Karakter" && (
        <div className="bg-white rounded-2xl border overflow-hidden">
           <table className="w-full text-left">
            <thead className="bg-orange-50 text-orange-800 font-bold text-sm uppercase"><tr><th className="p-4 w-1/4">Nama</th><th className="p-4 text-center w-32">Spiritual</th><th className="p-4 text-center w-32">Sosial</th><th className="p-4 text-center">Catatan Wali Kelas</th></tr></thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="hover:bg-orange-50 border-b last:border-0">
                  <td className="p-4 font-bold">{s.name}</td>
                  <td className="p-4"><select value={getSikap(s.id, 'spiritual')} onChange={(e) => handleSikapChange(s.id, 'spiritual', e.target.value)} className="w-full p-2 border rounded-lg"><option value="">-</option><option value="Sangat Baik">Sangat Baik</option><option value="Baik">Baik</option><option value="Cukup">Cukup</option></select></td>
                  <td className="p-4"><select value={getSikap(s.id, 'sosial')} onChange={(e) => handleSikapChange(s.id, 'sosial', e.target.value)} className="w-full p-2 border rounded-lg"><option value="">-</option><option value="Sangat Baik">Sangat Baik</option><option value="Baik">Baik</option><option value="Cukup">Cukup</option></select></td>
                  <td className="p-4"><input type="text" value={getSikap(s.id, 'catatan')} onChange={(e) => handleSikapChange(s.id, 'catatan', e.target.value)} className="w-full p-2 border rounded-lg" placeholder="Catatan..." /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
export default Akademik;