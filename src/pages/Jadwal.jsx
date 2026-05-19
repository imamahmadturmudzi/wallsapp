import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Calendar, Share2, ShieldAlert, User, BookOpen, Clock } from 'lucide-react';

const hariList = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const Jadwal = () => {
  const [jadwal, setJadwal] = useState({});
  const [loading, setLoading] = useState(true);
  const [teacherProfile, setTeacherProfile] = useState({});

  useEffect(() => {
    const fetchJadwal = async () => {
      const user = auth.currentUser;
      if (user) {
        const profRef = doc(db, "teachers", user.uid);
        const profSnap = await getDoc(profRef);
        if (profSnap.exists()) setTeacherProfile(profSnap.data());

        const jadRef = doc(db, "jadwal", user.uid);
        const jadSnap = await getDoc(jadRef);
        
        if (jadSnap.exists()) {
          setJadwal(jadSnap.data().jadwal || {});
        }
      }
      setLoading(false);
    };
    fetchJadwal();
  }, []);

  const handleShareWhatsApp = () => {
    let textWA = `*📚 JADWAL PELAJARAN KELAS ${teacherProfile.className || ''} 📚*\n`;
    textWA += `_Berlaku untuk Tahun Ajaran Ini_\n\n`;

    let isEmpty = true;

    hariList.forEach(hari => {
      if (jadwal[hari] && jadwal[hari].length > 0) {
        isEmpty = false;
        textWA += `*🗓️ HARI ${hari.toUpperCase()}*\n`;
        
        jadwal[hari].forEach(slot => {
          textWA += `🕘 ${slot.jamMulai} - ${slot.jamSelesai}\n`;
          textWA += `📖 *${slot.mapel}* _(${slot.guruName || 'Menunggu Guru'})_\n\n`;
        });
      }
    });

    if (isEmpty) {
      alert("Jadwal masih kosong! Admin belum mendistribusikan jadwal untuk kelas Anda.");
      return;
    }

    textWA += `_Catatan: Harap siswa hadir tepat waktu dan mematuhi tata tertib sekolah._\n\n`;
    textWA += `*Salam hangat,*\n*Wali Kelas ${teacherProfile.className || ''}*`;

    const encodedText = encodeURIComponent(textWA);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 animate-fade-in font-sans text-gray-800">
      
      {/* HEADER FLAT & CLEAN */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-gray-50 text-gray-600 rounded-xl flex items-center justify-center border border-gray-100 shrink-0">
             <Calendar size={24} />
           </div>
           <div>
             <h1 className="text-xl font-bold text-gray-800">Jadwal Kelas {teacherProfile.className}</h1>
             <p className="text-sm text-gray-500 mt-1">Distribusi kegiatan belajar mengajar tersinkronisasi pusat.</p>
           </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto shrink-0">
          <div className="bg-gray-50 text-gray-600 border border-gray-200 px-3 py-2.5 rounded-lg flex items-center gap-2 text-xs font-bold w-full sm:w-auto justify-center">
             <ShieldAlert size={14} className="text-gray-400" /> Tersinkronisasi
          </div>
          <button 
            onClick={handleShareWhatsApp}
            className="w-full sm:w-auto bg-[#25D366] hover:bg-[#1ebd5a] text-white px-5 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors text-sm"
          >
            <Share2 size={16}/> Siarkan ke Grup WA
          </button>
        </div>
      </div>

      {/* GRID JADWAL MINGGUAN MINIMALIS */}
      {loading ? (
        <div className="text-center p-12 text-gray-400 font-medium animate-pulse">Menyinkronkan data dari server pusat...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {hariList.map(hari => {
            const hasJadwal = jadwal[hari] && jadwal[hari].length > 0;
            
            return (
              <div key={hari} className="bg-white rounded-2xl border border-gray-200 flex flex-col h-full overflow-hidden hover:border-gray-300 transition-colors">
                
                {/* Header Hari */}
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 text-center">
                  <h3 className="text-xs font-bold text-gray-600 uppercase tracking-widest">{hari}</h3>
                </div>
                
                {/* Konten Jadwal */}
                <div className="p-4 flex-1 flex flex-col gap-3">
                  {!hasJadwal ? (
                    <div className="flex-1 flex items-center justify-center py-8">
                       <p className="text-xs text-gray-400 italic">Belum ada kegiatan</p>
                    </div>
                  ) : (
                    jadwal[hari].map((slot, idx) => (
                      <div key={idx} className="bg-white p-3.5 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors flex gap-3.5 items-center">
                        
                        <div className="text-[10px] font-mono font-bold text-gray-500 bg-gray-50 px-2.5 py-2 rounded-lg border border-gray-100 shrink-0 flex flex-col items-center justify-center min-w-[70px]">
                          <span>{slot.jamMulai}</span>
                          <span className="text-gray-300 mx-1">-</span>
                          <span>{slot.jamSelesai}</span>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-800 truncate mb-1" title={slot.mapel}>
                            {slot.mapel}
                          </p>
                          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium truncate" title={slot.guruName || 'Menunggu Guru'}>
                             <User size={12} className="text-gray-400 shrink-0" /> 
                             <span className="truncate">{slot.guruName || 'Menunggu Guru'}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
              </div>
            )
          })}
        </div>
      )}
    </div>
  );
};

export default Jadwal;