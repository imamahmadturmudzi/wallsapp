import { useState, useEffect } from 'react';
import { db, auth } from '../firebase'; // Import Auth
import { collection, getDocs, query, where, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { Calendar, Save, AlertTriangle, CheckCircle, XCircle, Clock, Search } from 'lucide-react';

const Absensi = () => {
  const [activeTab, setActiveTab] = useState('input');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [attendanceInput, setAttendanceInput] = useState({});
  const [rekapData, setRekapData] = useState([]);

  const siswaRef = collection(db, "siswa");
  const absensiRef = collection(db, "absensi");

  // 1. AMBIL DATA SISWA (MILIK GURU)
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const q = query(siswaRef, where("teacherId", "==", user.uid));
        const data = await getDocs(q);
        const studentList = data.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        studentList.sort((a, b) => a.name.localeCompare(b.name));
        setStudents(studentList);

        const initialAbsen = {};
        studentList.forEach(s => initialAbsen[s.id] = 'H');
        setAttendanceInput(initialAbsen);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. AMBIL REKAP (MILIK GURU)
  const fetchRekap = async () => {
    setLoading(true);
    const user = auth.currentUser;
    if (!user) return;

    // Ambil Absensi Milik Guru Ini Saja
    const qAbsen = query(absensiRef, where("teacherId", "==", user.uid));
    const absenSnapshot = await getDocs(qAbsen);
    const absenList = absenSnapshot.docs.map(doc => doc.data());

    const stats = students.map(student => {
      const myAbsen = absenList.filter(a => a.studentId === student.id);
      const count = { H: 0, S: 0, I: 0, A: 0 };
      myAbsen.forEach(a => { if (count[a.status] !== undefined) count[a.status]++; });
      return { ...student, stats: count };
    });

    setRekapData(stats);
    setLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'rekap') fetchRekap();
  }, [activeTab]);

  // 3. SIMPAN ABSEN (DENGAN TEACHER ID)
  const handleSaveAbsensi = async () => {
    const user = auth.currentUser;
    if(!confirm(`Simpan absensi?`) || !user) return;

    try {
      const promises = students.map(async (student) => {
        const status = attendanceInput[student.id];
        await addDoc(absensiRef, {
          teacherId: user.uid, // <--- STEMPEL GURU
          studentId: student.id,
          studentName: student.name,
          date: selectedDate,
          status: status,
          createdAt: serverTimestamp()
        });
      });
      await Promise.all(promises);
      alert("Tersimpan!");
      setActiveTab('rekap');
    } catch (error) {
      alert("Gagal menyimpan.");
    }
  };

  // Helper Render Status
  const getStatusWarning = (stats) => {
    if (stats.A >= 1) return <span className="flex items-center gap-1 text-red-600 bg-red-100 px-2 py-1 rounded-lg text-xs font-bold"><AlertTriangle size={12}/> Peringatan Alpha ({stats.A})</span>;
    if (stats.I > 3) return <span className="flex items-center gap-1 text-orange-600 bg-orange-100 px-2 py-1 rounded-lg text-xs font-bold"><Clock size={12}/> Peringatan Izin ({stats.I})</span>;
    return <span className="text-green-600 bg-green-100 px-2 py-1 rounded-lg text-xs font-bold">Aman</span>;
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto pb-24">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Presensi Siswa</h1>
        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button onClick={() => setActiveTab('input')} className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'input' ? 'bg-white shadow text-teal-600' : 'text-gray-500'}`}>Input</button>
          <button onClick={() => setActiveTab('rekap')} className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'rekap' ? 'bg-white shadow text-teal-600' : 'text-gray-500'}`}>Rekap</button>
        </div>
      </div>

      {activeTab === 'input' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-4 mb-6">
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="p-2 border rounded-lg bg-gray-50 font-bold" />
            <p className="font-bold text-gray-500">Total: {students.length} Siswa</p>
          </div>
          <div className="space-y-4">
            {students.map((student) => (
              <div key={student.id} className="flex items-center justify-between border-b pb-3">
                <p className="font-bold text-gray-800">{student.name}</p>
                <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                  {['H', 'S', 'I', 'A'].map((status) => (
                    <button key={status} onClick={() => setAttendanceInput({...attendanceInput, [student.id]: status})} className={`w-8 h-8 rounded-md text-xs font-bold ${attendanceInput[student.id] === status ? (status==='H'?'bg-green-500 text-white':status==='S'?'bg-teal-500 text-white':status==='I'?'bg-orange-500 text-white':'bg-red-600 text-white') : 'text-gray-400'}`}>{status}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <button onClick={handleSaveAbsensi} className="w-full mt-6 bg-teal-600 text-white py-3 rounded-xl font-bold shadow-lg">Simpan</button>
        </div>
      )}

      {activeTab === 'rekap' && (
        <div className="space-y-3">
           {!loading && rekapData.map((data) => (
             <div key={data.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                <div><h3 className="font-bold">{data.name}</h3><div className="mt-1">{getStatusWarning(data.stats)}</div></div>
                <div className="flex gap-3 text-center text-xs">
                   <div>H <span className="block font-bold text-green-600 text-sm">{data.stats.H}</span></div>
                   <div>S <span className="block font-bold text-teal-600 text-sm">{data.stats.S}</span></div>
                   <div>I <span className="block font-bold text-orange-600 text-sm">{data.stats.I}</span></div>
                   <div>A <span className="block font-bold text-red-600 text-sm">{data.stats.A}</span></div>
                </div>
             </div>
           ))}
        </div>
      )}
    </div>
  );
};
export default Absensi;