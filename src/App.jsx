import { BrowserRouter as Router, BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getMessaging, getToken } from "firebase/messaging";

// Komponen Pembungkus
import Layout from './components/Layout';
import SimkuLayout from './components/SimkuLayout';
import SimkuDashboard from './pages/simku/SimkuDashboard';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import Siswa from './pages/Siswa';
import Presensi from './pages/Presensi';
import Jurnal from './pages/Jurnal';
import Tahfidz from './pages/Tahfidz';
import Jadwal from './pages/Jadwal';
import Pengaturan from './pages/Pengaturan';
import TugasMapel from './pages/TugasMapel';
import InputNilaiMapel from './pages/InputNilaiMapel';
import MasterSekolah from './pages/MasterSekolah';
import MasterKelas from './pages/MasterKelas';
import MasterData from './pages/MasterData';
import MasterUser from './pages/MasterUser';
import MasterJadwal from './pages/MasterJadwal';
import RaporSiswa from './pages/RaporSiswa';
import CetakEvaluasi from './pages/CetakEvaluasi';
import CetakAbsensi from './pages/CetakAbsensi';
import LaporanAbsensiWali from './pages/LaporanAbsensiWali';

// --- FUNGSI PEMBANTU (Letakkan di luar komponen) ---
const requestNotificationToken = async (uid) => {
  try {
    const messaging = getMessaging();
    const token = await getToken(messaging, { vapidKey: 'BDunhxADP6aDLLgxjlxeAZsMZJiR4fnplW9Zxr1ro3RiKD4K2azMgGq94J8hbnrkTxWzuzSXYYqsurhAvRgPscw' });
    
    if (token) {
      console.log("Token FCM didapat:", token);
      // SIMPAN KE FIRESTORE (Ini jawaban untuk pertanyaan kedua Anda)
      await setDoc(doc(db, "teachers", uid), { fcmToken: token }, { merge: true });
    }
  } catch (err) {
    console.error("Gagal ambil token notifikasi:", err);
  }
};
// Pelindung Rute (Guard)
const ProtectedRoute = ({ children, allowedRoles }) => { // Tambahkan allowedRoles
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Ambil role user dari Firestore untuk validasi
        const docRef = doc(db, "teachers", currentUser.uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setRole(snap.data().role);
        }
        
        // 🚀 LOGIKA NOTIFIKASI (FIREBASE MESSAGING)
        // Dijalankan hanya setelah user terverifikasi login
        requestNotificationToken(currentUser.uid); 
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div className="flex h-screen items-center justify-center">Memeriksa...</div>;
  if (!user) return <Navigate to="/login" replace />;

  // Validasi Role
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <div className="p-10 text-center">Akses Ditolak! Anda tidak memiliki izin untuk modul ini.</div>;
  }
  
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* 1. GERBANG UTAMA (TANPA PROTEKSI) */}
        <Route path="/login" element={<LoginPage />} />

        {/* ======================================================== */}
        {/* 2. ZONA SIM-KU (Posisinya HARUS DI LUAR zona WalasApp)   */}
        {/* ======================================================== */}
        <Route 
          path="/simku" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'bendahara', 'kaur_tu']}>
              <SimkuLayout />
            </ProtectedRoute>
          }
        >
          {/* Outlet SimkuLayout */}
          <Route index element={<SimkuDashboard />} />
        </Route>

        {/* Rute Berpelindung (Dalam Sidebar) */}
        <Route path="/" element={
          <ProtectedRoute> 
            <Layout />
          </ProtectedRoute>
        }>
          {/* Index = Beranda */}
          <Route index element={<Dashboard />} />
          
          {/* Menu Umum & Wali Kelas */}
          <Route path="siswa" element={<Siswa />} />
          <Route path="presensi" element={<Presensi />} />
          <Route path="jurnal" element={<Jurnal />} />
          <Route path="tahfidz" element={<Tahfidz />} />
          <Route path="jadwal" element={<Jadwal />} />
          <Route path="pengaturan" element={<Pengaturan />} />
          
          {/* Menu Guru Mapel */}
          <Route path="tugas-mapel" element={<TugasMapel />} />
          <Route path="nilai-mapel" element={<InputNilaiMapel />} />

          {/* Menu Super Admin */}
          <Route path="master-sekolah" element={<MasterSekolah />} />
          <Route path="master-kelas" element={<MasterKelas />} />
          <Route path="master-data" element={<MasterData />} />
          <Route path="master-user" element={<MasterUser />} />
          <Route path="master-jadwal" element={<MasterJadwal />} />
          <Route path="/laporan-absensi" element={
          <ProtectedRoute allowedRoles={['admin', 'wali_kelas', 'ganda']}>
            <LaporanAbsensiWali />
          </ProtectedRoute>
        } />
        </Route>
        
        {/* Rute Cetak Rapor (Tanpa Sidebar) */}
        <Route path="/rapor" element={<RaporSiswa />} />
        <Route path="/cetak-evaluasi/:id" element={
          <ProtectedRoute allowedRoles={['admin', 'wali_kelas']}>
            <CetakEvaluasi />
          </ProtectedRoute>
        } />
        <Route path="/cetak-absensi" element={<ProtectedRoute><CetakAbsensi /></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}

export default App;