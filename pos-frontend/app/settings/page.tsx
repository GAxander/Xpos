'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, Plus, Map, Users, Square, X, Loader2, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';

interface Table {
  id: string;
  number: string;
  capacity: number;
  status: string;
}

interface Zone {
  id: string;
  name: string;
  tables: Table[];
}

export default function SettingsPage() {
  const router = useRouter();
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Forms state
  const [zoneForm, setZoneForm] = useState({ id: '', name: '' });
  const [tableForm, setTableForm] = useState({ id: '', zoneId: '', number: '', capacity: 4 });

  const fetchZones = async () => {
    const token = localStorage.getItem('pos_token');
    try {
      const response = await fetch('http://localhost:3000/api/v1/floor/zones', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setZones(data);
      } else if (response.status === 401) {
        router.push('/login');
      }
    } catch (error) {
      toast.error('Error al cargar la configuración de salas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZones();
  }, [router]);

  // --- ZONES ---

  const handleSaveZone = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const token = localStorage.getItem('pos_token');
    const isEditing = zoneForm.id !== '';
    const url = isEditing 
      ? `http://localhost:3000/api/v1/floor/zone/${zoneForm.id}`
      : 'http://localhost:3000/api/v1/floor/zone';
    const method = isEditing ? 'PATCH' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ name: zoneForm.name }),
      });

      if (response.ok) {
        toast.success(isEditing ? 'Zona actualizada' : 'Zona creada');
        setZoneForm({ id: '', name: '' });
        fetchZones();
        setIsZoneModalOpen(false);
      } else {
        toast.error('Hubo un problema al guardar la zona');
      }
    } catch (error) {
      toast.error('Error de red al intentar guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteZone = async (id: string, tableCount: number) => {
    if (tableCount > 0) {
      if (!window.confirm(`Esta zona tiene ${tableCount} mesas. Si la eliminas, también se eliminarán sus mesas. ¿Continuar de todas formas?`)) return;
    } else {
      if (!window.confirm('¿Estás seguro de eliminar esta zona?')) return;
    }

    const token = localStorage.getItem('pos_token');
    try {
      const response = await fetch(`http://localhost:3000/api/v1/floor/zone/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Zona eliminada');
        fetchZones();
      } else {
        toast.error('No se pudo eliminar la zona');
      }
    } catch (error) {
      toast.error('Error al conectar con el servidor');
    }
  };

  const openZoneModal = (zone?: Zone) => {
    if (zone) {
      setZoneForm({ id: zone.id, name: zone.name });
    } else {
      setZoneForm({ id: '', name: '' });
    }
    setIsZoneModalOpen(true);
  };

  // --- TABLES ---

  const handleSaveTable = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const token = localStorage.getItem('pos_token');
    const isEditing = tableForm.id !== '';
    const url = isEditing 
      ? `http://localhost:3000/api/v1/floor/table/${tableForm.id}`
      : 'http://localhost:3000/api/v1/floor/table';
    const method = isEditing ? 'PATCH' : 'POST';
    
    // Alfanumérico, así que se envía como String
    const payload: any = {
      number: String(tableForm.number).trim(),
      capacity: Number(tableForm.capacity),
    };
    if (!isEditing) {
      payload.zoneId = tableForm.zoneId;
    }

    try {
      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success(isEditing ? 'Mesa actualizada' : 'Mesa agregada');
        fetchZones();
        setIsTableModalOpen(false);
      } else {
        toast.error('Hubo un problema al guardar la mesa');
      }
    } catch (error) {
      toast.error('Error de red al intentar guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTable = async (id: string, number: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar la Mesa ${number}?`)) return;

    const token = localStorage.getItem('pos_token');
    try {
      const response = await fetch(`http://localhost:3000/api/v1/floor/table/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Mesa eliminada');
        fetchZones();
      } else {
        toast.error('No se pudo eliminar la mesa');
      }
    } catch (error) {
      toast.error('Error al conectar con el servidor');
    }
  };

  const openTableModal = (zoneId: string, table?: Table) => {
    if (table) {
      setTableForm({ id: table.id, zoneId, number: String(table.number), capacity: table.capacity });
    } else {
      setTableForm({ id: '', zoneId, number: '', capacity: 4 });
    }
    setIsTableModalOpen(true);
  };

  if (loading) return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans relative">
      <header className="flex justify-between items-center mb-8 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Settings className="text-slate-600 w-8 h-8" /> 
            Configuración
          </h1>
          <p className="text-slate-500 font-medium mt-1 uppercase text-sm tracking-widest">
            Gestión del Plano de Sala (Zonas y Mesas)
          </p>
        </div>
        <button 
          onClick={() => openZoneModal()}
          className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-slate-200"
        >
          <Plus className="w-5 h-5" />
          Nueva Zona
        </button>
      </header>

      {zones.length === 0 ? (
        <div className="text-center bg-white rounded-3xl shadow-sm border border-slate-100 p-16">
          <Map className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800 mb-2">No hay zonas configuradas</h3>
          <p className="text-slate-500 mb-6 max-w-md mx-auto">
            Comienza creando la primera zona de tu restaurante (ej. "Terraza", "Salón Principal") para poder agregarle mesas posteriormente.
          </p>
          <button 
            onClick={() => openZoneModal()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl font-bold transition-all"
          >
            <Plus className="w-5 h-5" />
            Crear mi primera Zona
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {zones.map(zone => (
            <div key={zone.id} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3 border-l-4 border-slate-500 pl-4">
                    {zone.name}
                    <span className="text-xs font-bold px-3 py-1 bg-slate-200 text-slate-600 rounded-lg ml-2">
                      {zone.tables.length} mesas
                    </span>
                  </h2>
                  <div className="flex border border-slate-200 rounded-lg overflow-hidden ml-4">
                    <button onClick={() => openZoneModal(zone)} className="p-2 text-slate-500 hover:bg-slate-200 transition-colors" title="Editar Zona">
                      <Edit className="w-4 h-4" />
                    </button>
                    <div className="w-px bg-slate-200"></div>
                    <button onClick={() => handleDeleteZone(zone.id, zone.tables.length)} className="p-2 text-rose-500 hover:bg-rose-50 transition-colors" title="Eliminar Zona">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => openTableModal(zone.id)}
                  className="flex items-center gap-2 px-4 py-2 border-2 border-slate-200 hover:border-slate-800 hover:bg-slate-800 hover:text-white text-slate-700 rounded-xl font-bold transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  Agregar Mesa
                </button>
              </div>

              <div className="p-6">
                {zone.tables.length === 0 ? (
                  <p className="text-center text-slate-400 py-8">Esta zona aún no tiene mesas asignadas. Haz clic en "Agregar Mesa" para empezar.</p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {/* Quitamos el sort matemático asumiendo que es string, o hacemos un sort alfanumérico si se desea luego */}
                    {[...zone.tables].sort((a,b) => String(a.number).localeCompare(String(b.number))).map(table => (
                      <div key={table.id} className="relative p-5 rounded-2xl border-2 border-slate-100 flex flex-col items-center justify-center min-h-[120px] hover:border-slate-300 transition-colors group">
                        
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openTableModal(zone.id, table)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md">
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeleteTable(table.id, String(table.number))} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <Square className="w-8 h-8 text-slate-300 mb-2 mt-2" />
                        <span className="text-lg font-black text-slate-800 mb-1">
                          Mesa {table.number}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase tracking-widest">
                          <Users className="w-3 h-3" />
                          {table.capacity} p.
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL ZONA */}
      {isZoneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-black text-slate-800">
                {zoneForm.id ? 'Editar Zona' : 'Nueva Zona'}
              </h2>
              <button onClick={() => setIsZoneModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveZone} className="p-6 space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">Nombre de la Zona</label>
                <input required type="text" value={zoneForm.name} onChange={e => setZoneForm({...zoneForm, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-500 outline-none" placeholder="Ej. Jardín, Segundo Piso..." />
              </div>
              <div className="pt-4">
                <button type="submit" disabled={isSaving} className="w-full bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex justify-center items-center gap-2">
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Guardar Zona'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL MESA */}
      {isTableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-black text-slate-800">
                {tableForm.id ? 'Editar Mesa' : 'Agregar Mesa'}
              </h2>
              <button onClick={() => setIsTableModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveTable} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 block">Identificador</label>
                  <input required type="text" value={tableForm.number} onChange={e => setTableForm({...tableForm, number: e.target.value.toUpperCase()})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-500 outline-none uppercase" placeholder="Ej. A1, T2" />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 block">Capacidad (Sillas)</label>
                  <input required type="number" min="1" value={tableForm.capacity} onChange={e => setTableForm({...tableForm, capacity: Number(e.target.value)})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-500 outline-none" />
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">Puedes usar números y letras para nombrar a tus mesas.</p>
              <div className="pt-4">
                <button type="submit" disabled={isSaving} className="w-full bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex justify-center items-center gap-2">
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Guardar Mesa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
