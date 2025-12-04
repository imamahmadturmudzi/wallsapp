import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute'; 
import LoginPage from './pages/LoginPage'; 

// Import Halaman-Halaman Guru
import Dashboard from './pages/Dashboard';
import Siswa from './pages/Siswa';
import Jurnal from './pages/Jurnal';
import Akademik from './pages/Akademik';
import Absensi from './pages/Absensi'; // Pastikan ini ada
import Tugas from './pages/Tugas';     // Pastikan ini ada
import Tahfidz from './pages/Tahfidz';
import Pengaturan from './pages/Pengaturan'; // <--- INI YANG TADI LUPA DI-IMPORT

// Import Halaman Orang Tua
import RaporSiswa from './pages/RaporSiswa';
import Jadwal from './pages/Jadwal';
function App() {
  return (
    <BrowserRouter>
      <Routes>
        
        {/* Halaman Login (Public) */}
        <Route path="/login" element={<LoginPage />} />

        {/* Redirect: Kalau buka web pertama kali, lempar ke login */}
        <Route path="/ortu" element={<Navigate to="/login" />} /> 

        {/* === AREA GURU (DILINDUNGI PASSWORD) === */}
        <Route path="/" element={
          <ProtectedRoute> 
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="siswa" element={<Siswa />} />
          <Route path="jurnal" element={<Jurnal />} />
          <Route path="akademik" element={<Akademik />} />
          <Route path="absensi" element={<Absensi />} />
          <Route path="tugas" element={<Tugas />} />
          <Route path="tahfidz" element={<Tahfidz />} />
          <Route path="pengaturan" element={<Pengaturan />} /> {/* <--- Route Baru */}
          <Route path="jadwal" element={<Jadwal />} />
        </Route>

        {/* === AREA ORANG TUA (PUBLIC TAPI BUTUH NIS) === */}
        <Route path="/rapor/:id" element={<RaporSiswa />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;