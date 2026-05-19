import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, doc, updateDoc, query, where, getDoc, setDoc } from 'firebase/firestore';
import { BookOpen, Users, Save, ChevronRight, AlertCircle, School, Plus, Trash2, SlidersHorizontal, Calculator, TextQuote } from 'lucide-react';

const InputNilaiMapel = () => {
  const [loading, setLoading] = useState(true);
  const [classesTaught, setClassesTaught] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [grades, setGrades] = useState({}); 
  const [isSaving, setIsSaving] = useState(false);

  // === PENGATURAN PENILAIAN ===
  const [kkm, setKkm] = useState(75);
  const [phCount, setPhCount] = useState(1);
  const [phDescriptions, setPhDescriptions] = useState(['']); 
  const [weights, setWeights] = useState({ PH: 50, UTS: 25, UAS: 25 });
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const fetchMyClasses = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const jadwalSnap = await getDocs(collection(db, "jadwal"));
        const myClassesMap = new Map(); 

        jadwalSnap.forEach(doc => {
          const dataKelas = doc.data();
          const jadwalMingguan = dataKelas.jadwal || {};
          
          Object.values(jadwalMingguan).forEach(hariArr => {
            hariArr.forEach(slot => {
              if (slot.guruId === user.uid) {
                const uniqueKey = `${dataKelas.classId}_${slot.mapel}`;
                if (!myClassesMap.has(uniqueKey)) {
                  myClassesMap.set(uniqueKey, { classId: dataKelas.classId, className: dataKelas.className, mapel: slot.mapel });
                }
              }
            });
          });
        });

        const classArray = Array.from(myClassesMap.values());
        setClassesTaught(classArray.sort((a, b) => a.className.localeCompare(b.className)));
      } catch (error) { console.error(error); }
      setLoading(false);
    };
    fetchMyClasses();
  }, []);

  const handleSelectClass = async (cls) => {
    setSelectedClass(cls);
    setLoading(true);
    try {
      const classDoc = await getDoc(doc(db, "teachers", cls.classId));
      if (classDoc.exists() && classDoc.data().kkm) setKkm(Number(classDoc.data().kkm));
      else setKkm(75);

      const settingRef = doc(db, "mapel_settings", `${cls.classId}_${cls.mapel}`);
      const settingSnap = await getDoc(settingRef);
      let maxPhLength = 1;

      if (settingSnap.exists()) {
         const data = settingSnap.data();
         setWeights(data.weights || { PH: 50, UTS: 25, UAS: 25 });
         setPhCount(data.phCount || 1);
         setPhDescriptions(data.phDescriptions || ['']);
         maxPhLength = data.phCount || 1;
      } else {
         setWeights({ PH: 50, UTS: 25, UAS: 25 });
         setPhCount(1);
         setPhDescriptions(['']);
      }

      const qSiswa = query(collection(db, "siswa"), where("teacherId", "==", cls.classId));
      const snapSiswa = await getDocs(qSiswa);
      const studentList = [];
      const currentGrades = {};

      snapSiswa.forEach(doc => {
        const data = doc.data();
        studentList.push({ id: doc.id, ...data });
        
        if (data.nilaiMapel && data.nilaiMapel[cls.mapel] && typeof data.nilaiMapel[cls.mapel] === 'object') {
           const objNilai = data.nilaiMapel[cls.mapel];
           currentGrades[doc.id] = { PH: objNilai.PH || Array(maxPhLength).fill(''), UTS: objNilai.UTS || '', UAS: objNilai.UAS || '' };
           if (objNilai.PH && objNilai.PH.length > maxPhLength) {
              maxPhLength = objNilai.PH.length;
              setPhCount(maxPhLength);
           }
        } else {
           currentGrades[doc.id] = { PH: Array(maxPhLength).fill(''), UTS: '', UAS: '' };
        }
      });

      setStudents(studentList.sort((a, b) => a.name.localeCompare(b.name)));
      
      Object.keys(currentGrades).forEach(key => {
         while (currentGrades[key].PH.length < maxPhLength) currentGrades[key].PH.push('');
      });
      setGrades(currentGrades);
      
      setPhDescriptions(prev => {
        const newDesc = [...prev];
        while (newDesc.length < maxPhLength) newDesc.push('');
        return newDesc;
      });

    } catch (error) { console.error(error); }
    setLoading(false);
  };

  const handleGradeChange = (studentId, type, value, phIndex = 0) => {
    setGrades(prev => {
      const studentData = { ...prev[studentId] };
      if (type === 'PH') {
        const newPhArr = [...studentData.PH];
        newPhArr[phIndex] = value;
        studentData.PH = newPhArr;
      } else studentData[type] = value;
      return { ...prev, [studentId]: studentData };
    });
  };

  const hitungNilaiAkhir = (studentId) => {
    const data = grades[studentId];
    if (!data) return 0;
    const validPh = data.PH.map(Number).filter(n => !isNaN(n) && n > 0);
    const avgPh = validPh.length > 0 ? validPh.reduce((a,b)=>a+b, 0) / validPh.length : 0;
    const uts = Number(data.UTS) || 0;
    const uas = Number(data.UAS) || 0;
    const wPh = Number(weights.PH) || 0;
    const wUts = Number(weights.UTS) || 0;
    const wUas = Number(weights.UAS) || 0;
    const totalWeight = wPh + wUts + wUas;
    if (totalWeight === 0) return 0;
    return Math.round(((avgPh * wPh) + (uts * wUts) + (uas * wUas)) / totalWeight);
  };

  const generateDeskripsi = (studentId) => {
    const dataPH = grades[studentId].PH.map(v => v === '' ? null : Number(v));
    if (dataPH.filter(v => v !== null).length === 0) return "-";

    let maxVal = -1; let minVal = 101;
    let maxIdx = -1; let minIdx = -1;

    dataPH.forEach((val, idx) => {
      if (val !== null) {
        if (val > maxVal) { maxVal = val; maxIdx = idx; }
        if (val < minVal) { minVal = val; minIdx = idx; }
      }
    });

    const descMax = phDescriptions[maxIdx] || `materi ke-${maxIdx + 1}`;
    const descMin = phDescriptions[minIdx] || `materi ke-${minIdx + 1}`;

    let narasi = `Menunjukkan penguasaan yang sangat baik dalam materi ${descMax}.`;
    if (minVal < kkm && minIdx !== maxIdx) {
       narasi += ` Namun perlu bimbingan lebih lanjut pada materi ${descMin}.`;
    }
    return narasi;
  };

  const addPhColumn = () => {
    setPhCount(prev => prev + 1);
    setPhDescriptions(prev => [...prev, '']);
    setGrades(prev => {
      const newGrades = {...prev};
      Object.keys(newGrades).forEach(key => newGrades[key].PH.push(''));
      return newGrades;
    });
  };

  const removePhColumn = () => {
    if (phCount <= 1) return;
    setPhCount(prev => prev - 1);
    setPhDescriptions(prev => prev.slice(0, -1));
    setGrades(prev => {
      const newGrades = {...prev};
      Object.keys(newGrades).forEach(key => newGrades[key].PH.pop());
      return newGrades;
    });
  };

  const handleSaveGrades = async () => {
    const totalW = Number(weights.PH) + Number(weights.UTS) + Number(weights.UAS);
    if (totalW !== 100) return alert("Total Bobot Persentase harus tepat 100%!");
    
    for (let i = 0; i < phCount; i++) {
       if (!phDescriptions[i].trim()) return alert(`Harap isi Deskripsi Materi untuk PH ${i+1} di menu Bobot (%) !`);
    }

    setIsSaving(true);
    try {
      await setDoc(doc(db, "mapel_settings", `${selectedClass.classId}_${selectedClass.mapel}`), {
        weights: weights, phCount: phCount, phDescriptions: phDescriptions
      });

      const updatePromises = students.map(async (student) => {
        const studentRef = doc(db, "siswa", student.id);
        const finalScore = hitungNilaiAkhir(student.id);
        const deskripsiCapaian = generateDeskripsi(student.id);
        
        const payloadNilai = {
          PH: grades[student.id].PH.map(v => v === '' ? '' : Number(v)),
          UTS: grades[student.id].UTS === '' ? '' : Number(grades[student.id].UTS),
          UAS: grades[student.id].UAS === '' ? '' : Number(grades[student.id].UAS),
          NilaiAkhir: finalScore,
          Deskripsi: deskripsiCapaian 
        };

        await updateDoc(studentRef, { [`nilaiMapel.${selectedClass.mapel}`]: payloadNilai });
      });

      await Promise.all(updatePromises);
      alert(`Nilai dan Deskripsi Capaian ${selectedClass.mapel} berhasil disimpan!`);
    } catch (error) { alert("Terjadi kesalahan."); console.error(error); }
    setIsSaving(false);
  };

  if (loading && !selectedClass) return <div className="p-10 text-center text-gray-400 font-medium animate-pulse mt-10">Menyiapkan buku nilai...</div>;

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto flex flex-col xl:flex-row gap-6 animate-fade-in font-sans text-gray-800">
      
      {/* SIDEBAR: DAFTAR KELAS AMPUAN */}
      <div className="w-full xl:w-72 shrink-0 space-y-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 sticky top-6">
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
             <BookOpen className="text-gray-400" size={16} /> Daftar Kelas Ampuan
          </h2>
          {classesTaught.length === 0 ? (
            <div className="text-center p-6 border border-dashed border-gray-200 rounded-xl text-gray-400 text-xs font-medium">Belum ada kelas yang ditugaskan.</div>
          ) : (
            <div className="space-y-1.5">
              {classesTaught.map((cls, idx) => {
                const isSelected = selectedClass?.classId === cls.classId && selectedClass?.mapel === cls.mapel;
                return (
                  <button 
                    key={idx} 
                    onClick={() => handleSelectClass(cls)} 
                    className={`w-full flex justify-between items-center p-3.5 rounded-xl transition-all border group ${isSelected ? 'bg-gray-50 border-l-4 border-l-gray-800 border-t-gray-200 border-r-gray-200 border-b-gray-200' : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-200'}`}
                  >
                    <div className="text-left">
                       <div className={`text-sm ${isSelected ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}>{cls.mapel}</div>
                       <div className="text-[10px] text-gray-500 font-medium flex items-center gap-1 mt-1">
                          <School size={10}/> Kelas {cls.className}
                       </div>
                    </div>
                    <ChevronRight size={16} className={`${isSelected ? 'text-gray-800' : 'text-gray-300 group-hover:text-gray-400'}`} />
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* AREA UTAMA: SPREADSHEET */}
      <div className="flex-1 overflow-hidden">
        {!selectedClass ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-2xl h-full flex flex-col items-center justify-center p-12 text-gray-400 min-h-[500px]">
             <Calculator size={48} className="opacity-20 mb-4 text-gray-500" />
             <p className="font-bold text-gray-500">Pilih Kelas Ampuan</p>
             <p className="text-sm mt-1">Buku nilai akan ditampilkan di sini.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 flex flex-col h-[85vh] animate-slide-up shadow-sm">
            
            {/* HEADER SPREADSHEET */}
            <div className="p-5 md:p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 bg-white rounded-t-2xl z-10">
              <div>
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">{selectedClass.mapel}</h2>
                <div className="flex flex-wrap gap-2 mt-2">
                   <p className="text-[11px] text-gray-600 font-semibold flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-2 py-1 rounded-md">
                      <School size={12}/> Kelas {selectedClass.className}
                   </p>
                   <p className="text-[11px] text-gray-600 font-semibold flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-2 py-1 rounded-md">
                      Standar KKM: <span className="font-black text-gray-800">{kkm}</span>
                   </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <button 
                  onClick={() => setShowSettings(!showSettings)} 
                  className={`px-5 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 border transition-colors w-full sm:w-auto ${showSettings ? 'bg-gray-100 text-gray-800 border-gray-300' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                >
                  <SlidersHorizontal size={16} /> Konfigurasi Penilaian
                </button>
                <button 
                  onClick={handleSaveGrades} 
                  disabled={isSaving || students.length===0} 
                  className="bg-gray-800 text-white px-6 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 hover:bg-gray-900 transition-colors disabled:opacity-50 w-full sm:w-auto"
                >
                  {isSaving ? "Merekam..." : <><Save size={16} /> Simpan Lembar Nilai</>}
                </button>
              </div>
            </div>

            {/* PANEL KONFIGURASI (BOBOT & DESKRIPSI) */}
            {showSettings && (
              <div className="bg-gray-50 p-6 shrink-0 animate-slide-down border-b border-gray-200 flex flex-col gap-6 overflow-y-auto max-h-[40vh] md:max-h-[50vh]">
                
                {/* BOBOT */}
                <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between border-b border-gray-200 pb-6">
                  <div className="flex-1 w-full">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-3 ml-0.5">Persentase Bobot Nilai (%)</p>
                    <div className="flex flex-wrap sm:flex-nowrap gap-3">
                      <div className="flex-1 min-w-[100px]">
                         <label className="text-[10px] font-bold text-gray-500 uppercase ml-0.5">Harian (PH)</label>
                         <input type="number" value={weights.PH} onChange={e=>setWeights({...weights, PH: e.target.value})} className="w-full bg-white border border-gray-200 p-2.5 rounded-lg outline-none text-sm font-bold text-center mt-1.5 focus:border-gray-500 focus:ring-1 focus:ring-gray-500" />
                      </div>
                      <div className="flex-1 min-w-[100px]">
                         <label className="text-[10px] font-bold text-gray-500 uppercase ml-0.5">Tengah Semester</label>
                         <input type="number" value={weights.UTS} onChange={e=>setWeights({...weights, UTS: e.target.value})} className="w-full bg-white border border-gray-200 p-2.5 rounded-lg outline-none text-sm font-bold text-center mt-1.5 focus:border-gray-500 focus:ring-1 focus:ring-gray-500" />
                      </div>
                      <div className="flex-1 min-w-[100px]">
                         <label className="text-[10px] font-bold text-gray-500 uppercase ml-0.5">Akhir Semester</label>
                         <input type="number" value={weights.UAS} onChange={e=>setWeights({...weights, UAS: e.target.value})} className="w-full bg-white border border-gray-200 p-2.5 rounded-lg outline-none text-sm font-bold text-center mt-1.5 focus:border-gray-500 focus:ring-1 focus:ring-gray-500" />
                      </div>
                    </div>
                  </div>
                  <div className="w-full lg:w-48 bg-white border border-gray-200 p-4 rounded-xl text-center flex flex-col justify-center">
                     <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Kalkulasi</p>
                     <p className={`text-3xl font-black mt-1 ${(Number(weights.PH)+Number(weights.UTS)+Number(weights.UAS))===100?'text-gray-800':'text-red-500'}`}>{Number(weights.PH)+Number(weights.UTS)+Number(weights.UAS)}%</p>
                  </div>
                </div>

                {/* DESKRIPSI PH */}
                <div className="w-full">
                  <p className="text-[10px] text-gray-800 font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5 ml-0.5">
                    <TextQuote size={14} className="text-gray-400"/> Topik / Materi Penilaian Harian
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({length: phCount}).map((_, i) => (
                      <div key={i} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Kompetensi PH Ke-{i+1}</label>
                        <input 
                          type="text" 
                          placeholder="Cth: Teks Eksposisi" 
                          value={phDescriptions[i]}
                          onChange={(e) => {
                            const newDesc = [...phDescriptions];
                            newDesc[i] = e.target.value;
                            setPhDescriptions(newDesc);
                          }}
                          className="w-full mt-2 bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 text-gray-800 font-medium placeholder-gray-400 transition-all"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-start gap-2 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                     <AlertCircle size={14} className="text-blue-500 shrink-0 mt-0.5" />
                     <p className="text-[10px] text-blue-700 font-medium leading-relaxed">Kalimat deskripsi capaian di Rapor Siswa akan dirakit secara otomatis oleh mesin menggunakan topik materi dengan nilai tertinggi (Kekuatan) dan nilai terendah (Kelemahan) dari data di atas.</p>
                  </div>
                </div>
              </div>
            )}

            {/* TABEL SPREADSHEET */}
            <div className="flex-1 overflow-auto bg-gray-50/30 relative">
              {loading ? (
                <div className="flex items-center justify-center h-full text-gray-400 font-medium animate-pulse">Memuat spreadsheet...</div>
              ) : students.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm italic">Buku induk kosong. Siswa belum terdaftar di kelas ini.</div>
              ) : (
                <div className="min-w-[900px]">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-10 bg-gray-50 shadow-sm">
                      <tr className="text-gray-500 text-[10px] font-bold uppercase tracking-wider border-b border-gray-200">
                        <th className="p-3 w-12 text-center border-r border-gray-200">No</th>
                        <th className="p-3 min-w-[200px] border-r border-gray-200">Identitas Siswa</th>
                        <th className="p-0 border-r border-gray-200 bg-white" colSpan={phCount}>
                          <div className="flex justify-between items-center px-3 py-2 border-b border-gray-200 bg-gray-50">
                             <span>Penilaian Harian (PH)</span>
                             <div className="flex gap-1.5">
                               <button onClick={removePhColumn} className="p-1 text-gray-400 hover:bg-gray-200 hover:text-red-500 rounded transition-colors" title="Hapus Kolom"><Trash2 size={12}/></button>
                               <button onClick={addPhColumn} className="px-1.5 py-1 bg-white border border-gray-200 rounded text-gray-600 hover:bg-gray-100 transition-colors flex items-center gap-1" title="Tambah Kolom"><Plus size={12}/></button>
                             </div>
                          </div>
                          <div className="flex bg-white">
                            {Array.from({length: phCount}).map((_, i) => (
                               <div key={i} className={`flex-1 p-2 text-center text-gray-600 ${i!==phCount-1?'border-r border-gray-200':''}`}>Ke-{i+1}</div>
                            ))}
                          </div>
                        </th>
                        <th className="p-3 w-20 text-center border-r border-gray-200">Tengah<br/>Smt</th>
                        <th className="p-3 w-20 text-center border-r border-gray-200">Akhir<br/>Smt</th>
                        <th className="p-3 w-24 text-center border-r border-gray-200 bg-gray-100 text-gray-700">Kalkulasi<br/>Akhir</th>
                        <th className="p-3 w-28 text-center">Status<br/>Capaian</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student, index) => {
                        const nilaiAkhir = hitungNilaiAkhir(student.id);
                        const isTuntas = nilaiAkhir >= kkm;
                        return (
                          <tr key={student.id} className="border-b border-gray-100 hover:bg-white transition-colors">
                            <td className="p-3 text-center text-gray-400 text-xs border-r border-gray-100 font-medium">{index + 1}</td>
                            <td className="p-3 border-r border-gray-100 bg-white sticky left-0 z-0">
                               <div className="font-semibold text-gray-800 text-sm whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]" title={student.name}>{student.name}</div>
                            </td>
                            
                            {/* INPUT PH */}
                            {Array.from({length: phCount}).map((_, i) => (
                              <td key={i} className="p-1.5 border-r border-gray-100 align-middle">
                                 <input 
                                   type="number" min="0" max="100" placeholder="-" 
                                   value={grades[student.id].PH[i] !== undefined ? grades[student.id].PH[i] : ''} 
                                   onChange={(e) => handleGradeChange(student.id, 'PH', e.target.value, i)} 
                                   className="w-full text-center p-2 rounded-lg border border-transparent hover:border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 focus:bg-white bg-transparent outline-none text-sm font-semibold text-gray-700 transition-all placeholder-gray-300"
                                 />
                              </td>
                            ))}
                            
                            {/* INPUT UTS & UAS */}
                            <td className="p-1.5 border-r border-gray-100 align-middle">
                               <input 
                                 type="number" min="0" max="100" placeholder="-" 
                                 value={grades[student.id].UTS} 
                                 onChange={(e) => handleGradeChange(student.id, 'UTS', e.target.value)} 
                                 className="w-full text-center p-2 rounded-lg border border-transparent hover:border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 focus:bg-white bg-transparent outline-none text-sm font-semibold text-gray-700 transition-all placeholder-gray-300"
                               />
                            </td>
                            <td className="p-1.5 border-r border-gray-100 align-middle">
                               <input 
                                 type="number" min="0" max="100" placeholder="-" 
                                 value={grades[student.id].UAS} 
                                 onChange={(e) => handleGradeChange(student.id, 'UAS', e.target.value)} 
                                 className="w-full text-center p-2 rounded-lg border border-transparent hover:border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 focus:bg-white bg-transparent outline-none text-sm font-semibold text-gray-700 transition-all placeholder-gray-300"
                               />
                            </td>
                            
                            {/* HASIL AKHIR & STATUS */}
                            <td className="p-3 border-r border-gray-100 text-center align-middle bg-gray-50/50">
                               <span className={`text-lg font-black ${nilaiAkhir > 0 ? 'text-gray-800' : 'text-gray-300'}`}>{nilaiAkhir || '-'}</span>
                            </td>
                            <td className="p-3 text-center align-middle">
                               {nilaiAkhir === 0 ? (
                                  <span className="text-[10px] text-gray-400">-</span>
                               ) : (
                                  <span className={`text-[9px] font-bold uppercase px-2.5 py-1.5 rounded-md border tracking-wider ${isTuntas ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                    {isTuntas ? 'Tuntas' : 'Remedial'}
                                  </span>
                               )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InputNilaiMapel;