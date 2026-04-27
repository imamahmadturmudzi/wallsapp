import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Save, School, Award, MapPin, Globe, Shield } from 'lucide-react';

const MasterSekolah = () => {
  const [schoolData, setSchoolData] = useState({
    namaSekolah: '',
    npsn: '',
    alamat: '',
    kkmDefault: 75,
    tahunAjaran: '2025/2026',
    semester: 'Ganjil'
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchSchool = async () => {
      // Kita gunakan 'KODE_SEKOLAH_UTAMA' sebagai ID dokumen pusat
      const docRef = doc(db, "metadata", "school_info");
      const snap = await getDoc(docRef);
      if (snap.exists()) setSchoolData(snap.data());
    };
    fetchSchool();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, "metadata", "school_info"), schoolData);
      alert("Data Sekolah berhasil diperbarui!");
    } catch (e) {
      alert("Gagal menyimpan data.");
    }
    setIsSaving(false);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Shield className="text-teal-600" /> Profil Institusi
        </h1>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="bg-teal-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-teal-700 transition-all shadow-lg shadow-teal-100"
        >
          <Save size={18} /> {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* FORM IDENTITAS */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <h2 className="font-bold text-gray-700 flex items-center gap-2 border-b pb-3 mb-4">
            <School size={18} className="text-teal-500" /> Identitas Sekolah
          </h2>
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase">Nama Resmi Sekolah</label>
            <input 
              type="text" 
              value={schoolData.namaSekolah}
              onChange={(e) => setSchoolData({...schoolData, namaSekolah: e.target.value})}
              className="w-full p-3 mt-1 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
              placeholder="Contoh: SMP Negeri 1 Kuningan"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase">NPSN</label>
            <input 
              type="text" 
              value={schoolData.npsn}
              onChange={(e) => setSchoolData({...schoolData, npsn: e.target.value})}
              className="w-full p-3 mt-1 bg-gray-50 border border-gray-200 rounded-xl outline-none"
            />
          </div>
        </div>

        {/* FORM KONFIGURASI AKADEMIK */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <h2 className="font-bold text-gray-700 flex items-center gap-2 border-b pb-3 mb-4">
            <Award size={18} className="text-teal-500" /> Standar Akademik
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase">KKM Pusat</label>
              <input 
                type="number" 
                value={schoolData.kkmDefault}
                onChange={(e) => setSchoolData({...schoolData, kkmDefault: e.target.value})}
                className="w-full p-3 mt-1 bg-teal-50 border border-teal-100 text-teal-700 font-bold rounded-xl outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase">Semester</label>
              <select 
                value={schoolData.semester}
                onChange={(e) => setSchoolData({...schoolData, semester: e.target.value})}
                className="w-full p-3 mt-1 bg-gray-50 border border-gray-200 rounded-xl outline-none"
              >
                <option value="Ganjil">Ganjil</option>
                <option value="Genap">Genap</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MasterSekolah;