'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Layers, Plus, Search, Edit, Trash2, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Category {
  id: string;
  name: string;
  printerRoute: 'KITCHEN' | 'BAR';
}

export default function CategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Category>({
    id: '', name: '', printerRoute: 'KITCHEN'
  });

  const fetchCategories = async () => {
    const token = localStorage.getItem('pos_token');
    try {
      console.log("Fetching categories...");
      const response = await fetch('http://localhost:3000/api/v1/inventory/categories', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log("Categories response status:", response.status);
      if (response.ok) {
        const data = await response.json();
        console.log("Categories data:", data);
        setCategories(data);
      } else if (response.status === 401) {
        router.push('/login');
      } else {
        console.error("Failed to fetch categories:", await response.text());
      }
    } catch (error) {
      console.error("Fetch categories caught error:", error);
      toast.error('Error al conectar con la base de datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const token = localStorage.getItem('pos_token');
    
    const isEditing = formData.id !== '';
    const url = isEditing
      ? `http://localhost:3000/api/v1/inventory/category/${formData.id}`
      : 'http://localhost:3000/api/v1/inventory/category';
    
    const method = isEditing ? 'PATCH' : 'POST';
    
    // Solo extraemos los campos que el backend espera y permite
    const bodyData = {
      name: formData.name,
      printerRoute: formData.printerRoute,
    };

    try {
      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(bodyData),
      });

      if (response.ok) {
        toast.success(isEditing ? 'Categoría actualizada' : 'Categoría creada con éxito');
        fetchCategories();
        closeModal();
      } else {
        toast.error('Hubo un problema al guardar la categoría');
      }
    } catch (error) {
      toast.error('Error de red al intentar guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de eliminar esta categoría? Esto podría afectar a los productos asociados.')) return;
    
    const token = localStorage.getItem('pos_token');
    try {
      const response = await fetch(`http://localhost:3000/api/v1/inventory/category/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Categoría eliminada');
        setCategories(categories.filter(c => c.id !== id));
      } else {
        toast.error('No se pudo eliminar la categoría');
      }
    } catch (error) {
      toast.error('Error al conectar con el servidor');
    }
  };

  const openModal = (category?: Category) => {
    if (category) {
      setFormData(category);
    } else {
      setFormData({ id: '', name: '', printerRoute: 'KITCHEN' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans relative">
      <header className="flex justify-between items-center mb-8 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Layers className="text-indigo-600 w-8 h-8" /> 
            Categorías
          </h1>
          <p className="text-slate-500 font-medium mt-1 uppercase text-sm tracking-widest">
            Gestión de Categorías para Productos
          </p>
        </div>
        <button 
          onClick={() => openModal()}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-indigo-200"
        >
          <Plus className="w-5 h-5" />
          Nueva Categoría
        </button>
      </header>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex gap-4 items-center bg-slate-50/50">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-xs uppercase tracking-widest text-slate-400 font-bold">
                <th className="p-5">Nombre de Categoría</th>
                <th className="p-5">Ruta de Impresión</th>
                <th className="p-5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredCategories.map((category) => (
                <tr key={category.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="p-5 font-bold text-slate-800">
                    {category.name}
                  </td>
                  <td className="p-5 font-medium">
                    <span className={`px-3 py-1 rounded-lg text-xs uppercase tracking-wider ${category.printerRoute === 'KITCHEN' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                      {category.printerRoute === 'KITCHEN' ? 'Cocina' : 'Bar'}
                    </span>
                  </td>
                  <td className="p-5 text-center">
                    <div className="flex justify-center gap-2">
                        <button onClick={() => openModal(category)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(category.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredCategories.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-10 text-center text-slate-400">No hay categorías registradas.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-black text-slate-800">
                {formData.id ? 'Editar Categoría' : 'Nueva Categoría'}
              </h2>
              <button onClick={closeModal} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">Nombre de la Categoría</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ej. Desayunos" />
              </div>
              
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">Ruta de Impresión</label>
                <select 
                  value={formData.printerRoute} 
                  onChange={e => setFormData({...formData, printerRoute: e.target.value as 'KITCHEN' | 'BAR'})} 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="KITCHEN">Cocina</option>
                  <option value="BAR">Bar</option>
                </select>
                <p className="text-xs text-slate-500 mt-2">Los tickets de esta categoría se imprimirán en esta estación.</p>
              </div>

              <div className="pt-4">
                <button type="submit" disabled={isSaving} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 transition-all flex justify-center items-center gap-2">
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Guardar Categoría'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
