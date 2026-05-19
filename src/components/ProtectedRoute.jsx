import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";

const ProtectedRoute = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listener: Cek status login setiap saat
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div className="h-screen flex items-center justify-center">Memuat...</div>;

  // Jika user ada (sudah login), tampilkan halaman tujuan (children).
  // Jika tidak, tendang ke /login
  return user ? children : <Navigate to="/login" />;
};
// 2. SATPAM KHUSUS ORANG TUA (Cek Local Storage)
const ProtectedParentRoute = ({ children }) => {
  const isOrtuLoggedin = localStorage.getItem("isOrtuLoggedin");
  if (isOrtuLoggedin !== "true") {
    return <Navigate to="/login" />;
  }
  return children;
};

export default ProtectedRoute;