import { useState, useEffect } from 'react';
import { db, auth } from '../firebase'; 
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, serverTimestamp, getDoc, where, updateDoc } from 'firebase/firestore';
// Import Icon Link
import { Calendar, Save, Trash2, BookOpen, Clock, AlertCircle, CheckCircle, ChevronDown, ChevronUp, Link as LinkIcon } from 'lucide-react';

const Tugas = () => {
  const [tasks, setTasks] = useState([]);
  const [students, setStudents] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  const [subjects, setSubjects] = useState([]);
  const [activeSubject, setActiveSubject] = useState("");

  // State Form (Sudah ada 'link')
  const [newTask, setNewTask] = useState({ 
    subject: "", 
    title: "", 
    description: "", 
    link: "", // <--- Field untuk link
    startDate: new Date().toISOString().slice(0, 10), 
    dueDate: new Date().toISOString().slice(0, 10) 
  });

  const [expandedTaskId, setExpandedTaskId] = useState(null);

  const tugasRef = collection(db, "tugas");
  const siswaRef = collection(db, "siswa");

  // === 1. LOAD DATA ===
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          // Ambil Mapel
          const configRef = doc(db, "settings", user.uid); 
          const configSnap = await getDoc(configRef);
          let listMapel = ["Matematika", "B. Indonesia", "IPA", "IPS", "PAI"];
          if (configSnap.exists() && configSnap.data().subjects) {
             listMapel = configSnap.data().subjects;
          }
          setSubjects(listMapel);
          setActiveSubject(listMapel[0]); 
          setNewTask(prev => ({ ...prev, subject: listMapel[0] }));

          // Ambil Siswa
          const qSiswa = query(siswaRef, where("teacherId", "==", user.uid));
          const sSnap = await getDocs(qSiswa);
          const sList = sSnap.docs.map(d => ({id: d.id, ...d.data()}));
          sList.sort((a, b) => a.name.localeCompare(b.name));
          setStudents(sList);

          // Ambil Tugas
          fetchTasks(user.uid);
          
        } catch (error) { console.error(error); }
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchTasks = async (uid) => {
    const q = query(tugasRef, where("teacherId", "==", uid), orderBy("dueDate", "desc"));
    const snapshot = await getDocs(q);
    setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  // === 2. SIMPAN TUGAS ===
  const handleSave = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!newTask.title || !user) return alert("Isi judul tugas!");

    try {
      await addDoc(tugasRef, {
        ...newTask,
        subject: activeSubject, // Pakai mapel tab aktif
        teacherId: user.uid,
        completedBy: [],
        createdAt: serverTimestamp()
      });
      alert("Tugas dibuat!");
      setNewTask(prev => ({ ...prev, title: "", description: "", link: "" })); // Reset
      fetchTasks(user.uid);
    } catch (error) { alert("Gagal menyimpan."); }
  };

  // === 3. UPDATE STATUS ===
  const toggleStudentStatus = async (task, studentId) => {
    const isCompleted = task.completedBy?.includes(studentId);
    let newCompletedBy = task.completedBy || [];

    if (isCompleted) {
      newCompletedBy = newCompletedBy.filter(id => id !== studentId);
    } else {
      newCompletedBy.push(studentId);
    }

    const updatedTasks = tasks.map(t => t.id === task.id ? { ...t, completedBy: newCompletedBy } : t);
    setTasks(updatedTasks);

    try {
      const taskDocRef = doc(db, "tugas", task.id);
      await updateDoc(taskDocRef, { completedBy: newCompletedBy });
    } catch (e) { alert("Gagal update status"); }
  };

  const handleDelete = async (id) => {
    if (confirm("Hapus tugas ini?")) {
      await deleteDoc(doc(db, "tugas", id));
      const user = auth.currentUser;
      if(user) fetchTasks(user.uid);
    }
  };

  const filteredTasks = tasks.filter(t => t.subject === activeSubject);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Monitoring Tugas</h1>
          <p className="text-gray-500 text-sm">Pilih Mapel &rarr; Buat Tugas &rarr; Ceklis Siswa.</p>
        </div>
      </div>

      {/* TAB MAPEL */}
      <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-hide">
        {subjects.map((sub) => (
          <button key={sub} onClick={() => setActiveSubject(sub)}
            className={`whitespace-nowrap px-5 py-2 rounded-full font-medium transition-colors border
              ${activeSubject === sub ? 'bg-teal-600 text-white border-teal-600 shadow-md' : 'bg-white text-gray-500 border-gray-200'}`}>
            {sub}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* === FORM INPUT === */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <BookOpen className="text-teal-600" size={20}/> Tugas Baru: {activeSubject}
          </h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div><label className="text-xs font-bold text-gray-500">Judul / Hal</label><input className="w-full p-2 bg-gray-50 rounded-lg border" value={newTask.title} onChange={(e) => setNewTask({...newTask, title: e.target.value})} placeholder="PR Hal 10..."/></div>
            <div><label className="text-xs font-bold text-gray-500">Ket.</label><textarea className="w-full p-2 bg-gray-50 rounded-lg border" value={newTask.description} onChange={(e) => setNewTask({...newTask, description: e.target.value})}/></div>
            
            {/* INPUT LINK (Disini letaknya) */}
            <div>
               <label className="text-xs font-bold text-gray-500 flex items-center gap-1"><LinkIcon size={12}/> Link Soal (Opsional)</label>
               <input type="url" className="w-full p-2 bg-gray-50 rounded-lg border text-teal-600" placeholder="https://..." value={newTask.link} onChange={(e) => setNewTask({...newTask, link: e.target.value})}/>
            </div>

            <div className="grid grid-cols-2 gap-2">
               <div><label className="text-xs font-bold text-gray-500">Mulai</label><input type="date" className="w-full p-2 bg-gray-50 rounded-lg border" value={newTask.startDate} onChange={(e)=>setNewTask({...newTask, startDate: e.target.value})}/></div>
               <div><label className="text-xs font-bold text-gray-500">Deadline</label><input type="date" className="w-full p-2 bg-gray-50 rounded-lg border font-bold" value={newTask.dueDate} onChange={(e)=>setNewTask({...newTask, dueDate: e.target.value})}/></div>
            </div>
            <button className="w-full bg-teal-600 text-white py-2 rounded-xl font-bold shadow hover:bg-teal-700">Buat Tugas</button>
          </form>
        </div>

        {/* === LIST TUGAS === */}
        <div className="lg:col-span-2 space-y-4">
           {loading && <p className="text-gray-400">Memuat...</p>}
           {!loading && filteredTasks.length === 0 && (
             <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed text-gray-400">Belum ada tugas di mapel {activeSubject}.</div>
           )}

           {filteredTasks.map((task) => {
             const isExpanded = expandedTaskId === task.id;
             const countDone = task.completedBy?.length || 0;
             const totalSiswa = students.length;
             const percent = totalSiswa > 0 ? Math.round((countDone / totalSiswa) * 100) : 0;

             return (
               <div key={task.id} className={`bg-white rounded-2xl shadow-sm border transition-all ${isExpanded ? 'border-teal-300 ring-2 ring-teal-50' : 'border-gray-200'}`}>
                 
                 <div className="p-4 flex justify-between items-start cursor-pointer" onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}>
                    <div className="flex-1 pr-4">
                       <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                         {task.title}
                         <span className={`text-[10px] px-2 py-0.5 rounded-full ${percent === 100 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                           {countDone}/{totalSiswa} Selesai
                         </span>
                       </h3>
                       
                       {/* TAMPILAN LINK DI KARTU GURU (Disini letaknya) */}
                       {task.link && (
                          <a href={task.link} target="_blank" rel="noreferrer" onClick={(e)=>e.stopPropagation()} className="text-xs text-teal-500 underline flex items-center gap-1 mt-1 mb-1">
                             <LinkIcon size={12}/> Lihat Lampiran Soal
                          </a>
                       )}

                       <p className="text-gray-500 text-xs mt-1">{task.startDate} s/d <b>{task.dueDate}</b></p>
                       <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2 max-w-xs"><div className={`h-1.5 rounded-full ${percent === 100 ? 'bg-green-500' : 'bg-teal-500'}`} style={{width: `${percent}%`}}></div></div>
                    </div>
                    <div className="flex items-center gap-2">
                       <button onClick={(e) => {e.stopPropagation(); handleDelete(task.id)}} className="p-2 text-gray-300 hover:text-red-500"><Trash2 size={18}/></button>
                       {isExpanded ? <ChevronUp className="text-teal-500"/> : <ChevronDown className="text-gray-400"/>}
                    </div>
                 </div>

                 {isExpanded && (
                   <div className="border-t border-gray-100 bg-gray-50/50 p-4 rounded-b-2xl">
                      <p className="text-xs font-bold text-gray-500 uppercase mb-3">Checklist:</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {students.map((student) => {
                          const isDone = task.completedBy?.includes(student.id);
                          return (
                            <div key={student.id} 
                                 onClick={() => toggleStudentStatus(task, student.id)}
                                 className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-all
                                 ${isDone ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 hover:border-teal-300'}`}>
                               <div className="flex items-center gap-2">
                                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs ${isDone ? 'bg-green-500' : 'bg-gray-200'}`}>{isDone && <CheckCircle size={12}/>}</div>
                                  <span className={`text-sm ${isDone ? 'text-green-800 font-bold' : 'text-gray-600'}`}>{student.name}</span>
                               </div>
                               {isDone ? <span className="text-[10px] text-green-600 font-bold">SUDAH</span> : <span className="text-[10px] text-red-400">BELUM</span>}
                            </div>
                          )
                        })}
                      </div>
                   </div>
                 )}
               </div>
             )
           })}
        </div>
      </div>
    </div>
  );
};
export default Tugas;