import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Book, Star, Plus, Trash2, LayoutGrid } from 'lucide-react';

const MasterData = () => {
  const [activeTab, setActiveTab] = useState('mapel');
  const [listMapel, setListMapel] = useState([]);
  const [listEkskul, setListEkskul] = useState([]);
  const [newItem, setNewItem] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const docRef = doc(db, "metadata", "curriculum");
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setListMapel(snap.data().mapel || []);
        setListEkskul(snap.data().ekskul || []);
      }
    };
    fetchData();
  }, []);

  const handleAdd = async () => {
    if (!newItem.trim()) return;
    const updated = activeTab === 'mapel' 
      ? { mapel: [...listMapel, newItem.trim()], ekskul: listEkskul }
      : { mapel: listMapel, ekskul: [...listEkskul, newItem.trim()] };
    
    await setDoc(doc(db, "metadata", "curriculum"), updated);
    if (activeTab === 'mapel') setListMapel(updated.mapel);
    else setListEkskul(updated.ekskul);
    setNewItem('');
  };

  const handleDelete = async (index) => {
    let updated;
    if (activeTab === 'mapel') {
      const temp = [...listMapel];
      temp.splice(index, 1);
      updated = { mapel: temp, ekskul: listEkskul };
      setListMapel(temp);
    } else {
      const temp = [...listEkskul];
      temp.splice(index, 1);
      updated = { mapel: listMapel, ekskul: temp };
      setListEkskul(temp);
    }
    await setDoc(doc(db, "metadata", "curriculum"), updated);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {/* TABS MENU */}
        <div className="flex border-b">
          <button 
            onClick={() => setActiveTab('mapel')}
            className={`flex-1 py-4 font-bold flex justify-center items-center gap-2 transition-all ${activeTab === 'mapel' ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50/30' : 'text-gray-400'}`}
          >
            <Book size={18} /> Mata Pelajaran
          </button>
          <button 
            onClick={() => setActiveTab('ekskul')}
            className={`flex-1 py-4 font-bold flex justify-center items-center gap-2 transition-all ${activeTab === 'ekskul' ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50/30' : 'text-gray-400'}`}
          >
            <Star size={18} /> Ekstrakurikuler
          </button>
        </div>

        <div className="p-6">
          {/* INPUT BAR */}
          <div className="flex gap-3 mb-8">
            <input 
              type="text" 
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder={`Tambah ${activeTab === 'mapel' ? 'Mapel' : 'Ekskul'} baru...`}
              className="flex-1 p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
            />
            <button onClick={handleAdd} className="bg-teal-600 text-white p-3 rounded-xl hover:bg-teal-700 transition-all">
              <Plus />
            </button>
          </div>

          {/* LIST ITEMS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(activeTab === 'mapel' ? listMapel : listEkskul).map((item, idx) => (
              <div key={idx} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100 group hover:border-teal-200 transition-all">
                <span className="font-semibold text-gray-700">{item}</span>
                <button onClick={() => handleDelete(idx)} className="text-red-300 hover:text-red-500 transition-colors">
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MasterData;