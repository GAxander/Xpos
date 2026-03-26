'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Package, Search, Plus, AlertCircle, CheckCircle2, ArrowUpDown, Filter, Edit, Trash2, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  category: string;
  categoryId?: string;
  stationId?: string; // Edit support
  price: number;
  stock: number;
  minStock: number;
  modifierGroups?: ModifierGroup[];
}

interface ModifierOption {
  targetProductId: string;
  priceOverride?: number;
  targetProduct?: { name: string }; // Solo para lectura
}

interface ModifierGroup {
  id?: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  options: ModifierOption[];
}

interface Category {
  id: string;
  name: string;
}

interface KitchenStation {
  id: string;
  name: string;
}

export default function InventoryPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados para el Modal funcional
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stations, setStations] = useState<KitchenStation[]>([]);
  const [activeTab, setActiveTab] = useState<'info' | 'modifiers'>('info');
  const [formData, setFormData] = useState<Product>({
    id: '', name: '', category: '', categoryId: '', stationId: '', price: 0, stock: 0, minStock: 0, modifierGroups: []
  });

  // 1. LEER: Obtener productos del backend real
  const fetchProducts = async () => {
    const token = localStorage.getItem('pos_token');
    try {
      const response = await fetch('http://localhost:3000/api/v1/products', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      } else if (response.status === 401) {
        router.push('/login');
      }
    } catch (error) {
      toast.error('Error al conectar con la base de datos (Productos)');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    const token = localStorage.getItem('pos_token');
    try {
      const response = await fetch('http://localhost:3000/api/v1/inventory/categories', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchStations = async () => {
    const token = localStorage.getItem('pos_token');
    try {
      const response = await fetch('http://localhost:3000/api/v1/kitchen-stations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setStations(await response.json());
      }
    } catch (error) {
      console.error('Error fetching stations:', error);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchStations();
  }, [router]);

  // 2. CREAR / EDITAR: Guardar en la base de datos
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const token = localStorage.getItem('pos_token');
    
    const isEditing = formData.id !== '';
    const url = isEditing 
      ? `http://localhost:3000/api/v1/products/${formData.id}` 
      : 'http://localhost:3000/api/v1/products';
    
    const method = isEditing ? 'PATCH' : 'POST';

    // Extraemos solo los datos relevantes para crear o editar
    const bodyData = {
      name: formData.name,
      categoryId: formData.categoryId,
      stationId: formData.stationId || null,
      price: formData.price,
      stock: formData.stock,
      minStock: formData.minStock,
      modifierGroups: formData.modifierGroups?.map(mg => ({
        name: mg.name,
        minSelect: Number(mg.minSelect),
        maxSelect: Number(mg.maxSelect),
        options: mg.options.map((opt: any) => ({
          targetProductId: opt.targetProductId,
          priceOverride: opt.priceOverride ? Number(opt.priceOverride) : 0
        }))
      })),
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
        toast.success(isEditing ? 'Producto actualizado' : 'Producto creado con éxito');
        fetchProducts(); // Recargamos la tabla
        closeModal();
      } else {
        toast.error('Hubo un problema al guardar el producto');
      }
    } catch (error) {
      toast.error('Error de red al intentar guardar');
    } finally {
      setIsSaving(false);
    }
  };

  // 3. ELIMINAR: Borrar de la base de datos
  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de eliminar este producto del inventario?')) return;
    
    const token = localStorage.getItem('pos_token');
    try {
      const response = await fetch(`http://localhost:3000/api/v1/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Producto eliminado');
        setProducts(products.filter(p => p.id !== id));
      } else {
        toast.error('No se pudo eliminar el producto');
      }
    } catch (error) {
      toast.error('Error al conectar con el servidor');
    }
  };

  // Controladores del Modal
  const openModal = (product?: Product) => {
    setActiveTab('info');
    if (product) {
      setFormData({ ...product, modifierGroups: product.modifierGroups || [] }); // Si mandamos producto, es Editar
    } else {
      setFormData({ id: '', name: '', category: '', categoryId: '', stationId: '', price: 0, stock: 0, minStock: 0, modifierGroups: [] }); // Si no, es Nuevo
    }
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  // Cálculos y Filtros
  const lowStockCount = products.filter(p => p.stock <= p.minStock).length;
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans relative">
      
      {/* Cabecera */}
      <header className="flex justify-between items-center mb-8 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Package className="text-emerald-600 w-8 h-8" /> 
            Inventario
          </h1>
          <p className="text-slate-500 font-medium mt-1 uppercase text-sm tracking-widest">
            Gestión de Productos y Stock
          </p>
        </div>
        <button 
          onClick={() => openModal()}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-emerald-200"
        >
          <Plus className="w-5 h-5" />
          Nuevo Producto
        </button>
      </header>

      {/* Tabla e Interfaz (Mismo diseño que te gustó) */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex gap-4 items-center bg-slate-50/50">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o categoría..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-slate-900"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-xs uppercase tracking-widest text-slate-400 font-bold">
                <th className="p-5">Producto</th>
                <th className="p-5">Categoría</th>
                <th className="p-5">Precio (S/)</th>
                <th className="p-5">Stock</th>
                <th className="p-5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredProducts.map((product) => {
                const isLowStock = product.stock <= product.minStock;
                return (
                  <tr key={product.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="p-5 font-bold text-slate-800">
                      {product.name}
                      {isLowStock && <span className="ml-3 px-2 py-0.5 rounded text-[10px] bg-rose-100 text-rose-700 uppercase tracking-wider">Bajo</span>}
                    </td>
                    <td className="p-5 font-medium">
                      <span className="px-3 py-1 bg-slate-100 rounded-lg text-xs uppercase tracking-wider">{product.category}</span>
                    </td>
                    <td className="p-5 font-black text-slate-700">{Number(product.price).toFixed(2)}</td>
                    <td className="p-5">
                      <span className={`font-bold ${isLowStock ? 'text-rose-600' : 'text-slate-700'}`}>{product.stock} un.</span>
                    </td>
                    <td className="p-5 text-center">
                      <div className="flex justify-center gap-2">
                        {/* Botón Editar */}
                        <button onClick={() => openModal(product)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                        {/* Botón Eliminar */}
                        <button onClick={() => handleDelete(product.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-slate-400">No hay productos disponibles.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL PARA CREAR / EDITAR PRODUCTO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-black text-slate-800">
                {formData.id ? 'Editar Producto / Combo' : 'Nuevo Producto / Combo'}
              </h2>
              <button type="button" onClick={closeModal} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex border-b border-slate-200">
               <button 
                type="button" 
                onClick={() => setActiveTab('info')} 
                className={`flex-1 py-3 font-bold text-sm transition-colors ${activeTab === 'info' ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/30' : 'text-slate-500 hover:bg-slate-50'}`}
               >
                 Datos Principales
               </button>
               <button 
                type="button" 
                onClick={() => setActiveTab('modifiers')} 
                className={`flex-1 py-3 font-bold text-sm transition-colors ${activeTab === 'modifiers' ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/30' : 'text-slate-500 hover:bg-slate-50'}`}
               >
                 Opciones y Combos
               </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <form id="productForm" onSubmit={handleSave} className="p-6 space-y-4">
                
                {activeTab === 'info' && (
                  <>
                    <div>
                      <label className="text-sm font-bold text-slate-700 mb-1 block">Nombre del Producto</label>
                      <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Ej. Lomo Saltado" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-bold text-slate-700 mb-1 block">Categoría</label>
                        <select required value={formData.categoryId || ''} onChange={e => setFormData({...formData, categoryId: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none">
                          <option value="" disabled>Selecciona una categoría</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-bold text-slate-700 mb-1 block">Área de Prepración (KDS)</label>
                        <select value={formData.stationId || ''} onChange={e => setFormData({...formData, stationId: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none">
                          <option value="">Sin área asignada</option>
                          {stations.map((st) => (
                            <option key={st.id} value={st.id}>{st.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-bold text-slate-700 mb-1 block">Precio (S/)</label>
                        <input required type="number" step="0.10" value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
                      </div>
                      <div>
                        <label className="text-sm font-bold text-slate-700 mb-1 block">Stock Actual</label>
                        <input required type="number" value={formData.stock} onChange={e => setFormData({...formData, stock: parseInt(e.target.value)})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-bold text-slate-700 mb-1 block">Stock Mínimo</label>
                        <input required type="number" value={formData.minStock} onChange={e => setFormData({...formData, minStock: parseInt(e.target.value)})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
                      </div>
                      <div></div>
                    </div>
                  </>
                )}

                {activeTab === 'modifiers' && (
                  <div className="space-y-6">
                    <p className="text-sm text-slate-500 leading-relaxed">Añade grupos de opciones para crear Combos. Por ejemplo: <strong>"Bebida a elección"</strong>, donde el cliente escoge un jugo del Bar, o <strong>"Guarnición"</strong>.</p>
                    
                    {formData.modifierGroups?.map((group, gIndex) => (
                      <div key={gIndex} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 relative">
                         <button type="button" onClick={() => {
                           const newGroups = [...(formData.modifierGroups || [])];
                           newGroups.splice(gIndex, 1);
                           setFormData({...formData, modifierGroups: newGroups});
                         }} className="absolute top-4 right-4 text-rose-400 hover:bg-rose-100 p-1.5 rounded-lg transition-colors">
                           <Trash2 className="w-4 h-4" />
                         </button>

                         <div className="mb-4 pr-8">
                           <label className="text-xs font-bold text-slate-500 uppercase">Nombre del Grupo</label>
                           <input required type="text" value={group.name} placeholder='Ej: "Opciones de Bebida"' onChange={(e) => {
                             const newGroups = [...(formData.modifierGroups || [])];
                             newGroups[gIndex].name = e.target.value;
                             setFormData({...formData, modifierGroups: newGroups});
                           }} className="w-full bg-white border-b border-slate-300 font-bold focus:border-emerald-500 outline-none py-1" />
                         </div>
                         
                         <div className="flex gap-4 mb-4">
                           <div className="flex-1">
                             <label className="text-xs font-bold text-slate-500 uppercase">Mín. Selección</label>
                             <input required type="number" min="0" value={group.minSelect} onChange={(e) => {
                               const newGroups = [...(formData.modifierGroups || [])];
                               newGroups[gIndex].minSelect = parseInt(e.target.value);
                               setFormData({...formData, modifierGroups: newGroups});
                             }} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none focus:border-emerald-500" />
                           </div>
                           <div className="flex-1">
                             <label className="text-xs font-bold text-slate-500 uppercase">Máx. Selección</label>
                             <input required type="number" min="1" value={group.maxSelect} onChange={(e) => {
                               const newGroups = [...(formData.modifierGroups || [])];
                               newGroups[gIndex].maxSelect = parseInt(e.target.value);
                               setFormData({...formData, modifierGroups: newGroups});
                             }} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none focus:border-emerald-500" />
                           </div>
                         </div>

                         <div className="space-y-2">
                           <label className="text-xs font-bold text-slate-500 uppercase">Opciones (Productos vinculados)</label>
                           {group.options.map((opt, oIndex) => (
                              <div key={oIndex} className="flex gap-2 items-center">
                                <select required value={opt.targetProductId} onChange={(e) => {
                                  const newGroups = [...(formData.modifierGroups || [])];
                                  newGroups[gIndex].options[oIndex].targetProductId = e.target.value;
                                  setFormData({...formData, modifierGroups: newGroups});
                                }} className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-emerald-500">
                                  <option value="">Selecciona Producto...</option>
                                  {products.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                  ))}
                                </select>
                                <input type="number" min="0" step="0.10" placeholder="0.00 (Gratis)" value={opt.priceOverride !== undefined && opt.priceOverride !== null ? opt.priceOverride : ''} onChange={(e) => {
                                  const newGroups = [...(formData.modifierGroups || [])];
                                  newGroups[gIndex].options[oIndex].priceOverride = e.target.value ? parseFloat(e.target.value) : undefined;
                                  setFormData({...formData, modifierGroups: newGroups});
                                }} className="w-24 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-emerald-500" />
                                <button type="button" onClick={() => {
                                   const newGroups = [...(formData.modifierGroups || [])];
                                   newGroups[gIndex].options.splice(oIndex, 1);
                                   setFormData({...formData, modifierGroups: newGroups});
                                }} className="text-rose-400 hover:bg-rose-100 p-1.5 rounded-lg transition-colors">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                           ))}
                           <button type="button" onClick={() => {
                             const newGroups = [...(formData.modifierGroups || [])];
                             newGroups[gIndex].options.push({ targetProductId: '', priceOverride: 0 });
                             setFormData({...formData, modifierGroups: newGroups});
                           }} className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 py-1">
                             <Plus className="w-3 h-3" /> Añadir Opción
                           </button>
                         </div>
                      </div>
                    ))}

                    <button type="button" onClick={() => {
                      setFormData({
                        ...formData, 
                        modifierGroups: [...(formData.modifierGroups || []), { name: '', minSelect: 0, maxSelect: 1, options: [] }]
                      });
                    }} className="w-full border-2 border-dashed border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                      <Plus className="w-4 h-4" /> {formData.modifierGroups && formData.modifierGroups.length > 0 ? 'Añadir Otro Grupo' : 'Añadir Primer Grupo (Combo)'}
                    </button>
                  </div>
                )}
              </form>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <button form="productForm" type="submit" disabled={isSaving} className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-200 transition-all flex justify-center items-center gap-2">
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Guardar Producto'}
              </button>
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
}