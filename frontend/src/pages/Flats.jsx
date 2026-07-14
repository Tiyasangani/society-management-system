import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import PageHeader from '../components/PageHeader';

export default function Flats() {
  const [buildings, setBuildings] = useState([]);
  const [flats, setFlats] = useState([]);
  const [showBuildingForm, setShowBuildingForm] = useState(false);
  const [showFlatForm, setShowFlatForm] = useState(false);
  const [buildingForm, setBuildingForm] = useState({ name: '', totalFloors: '' });
  const [flatForm, setFlatForm] = useState({ buildingId: '', flatNumber: '', floorNumber: '', areaSqft: '' });
  const [error, setError] = useState('');

  const load = () => {
    api.get('/flats/buildings').then(({ data }) => setBuildings(data.data));
    api.get('/flats').then(({ data }) => setFlats(data.data));
  };
  useEffect(() => { load(); }, []);

  const handleCreateBuilding = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/flats/buildings', {
        name: buildingForm.name,
        totalFloors: buildingForm.totalFloors ? Number(buildingForm.totalFloors) : undefined,
      });
      setBuildingForm({ name: '', totalFloors: '' });
      setShowBuildingForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not add building.');
    }
  };

  const handleCreateFlat = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/flats/units', {
        buildingId: Number(flatForm.buildingId),
        flatNumber: flatForm.flatNumber,
        floorNumber: flatForm.floorNumber ? Number(flatForm.floorNumber) : undefined,
        areaSqft: flatForm.areaSqft ? Number(flatForm.areaSqft) : undefined,
      });
      setFlatForm({ buildingId: '', flatNumber: '', floorNumber: '', areaSqft: '' });
      setShowFlatForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not add flat.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <PageHeader
        eyebrow="Property"
        title="Buildings &amp; Flats"
        action={
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => { setShowBuildingForm(!showBuildingForm); setShowFlatForm(false); }}>
              {showBuildingForm ? 'Cancel' : 'Add building'}
            </button>
            <button className="btn-primary" onClick={() => { setShowFlatForm(!showFlatForm); setShowBuildingForm(false); }}>
              {showFlatForm ? 'Cancel' : 'Add flat'}
            </button>
          </div>
        }
      />

      {error && <div className="mb-6 text-sm text-bad bg-bad/10 border border-bad/20 rounded-md px-3 py-2">{error}</div>}

      {showBuildingForm && (
        <form onSubmit={handleCreateBuilding} className="card p-5 mb-8 grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm text-slate mb-1">Building name</label>
            <input required className="input-field" placeholder="e.g. Tower B" value={buildingForm.name}
              onChange={(e) => setBuildingForm({ ...buildingForm, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm text-slate mb-1">Total floors</label>
            <input type="number" min="1" className="input-field" value={buildingForm.totalFloors}
              onChange={(e) => setBuildingForm({ ...buildingForm, totalFloors: e.target.value })} />
          </div>
          <button type="submit" className="btn-primary w-fit">Add building</button>
        </form>
      )}

      {showFlatForm && (
        <form onSubmit={handleCreateFlat} className="card p-5 mb-8 grid md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-slate mb-1">Building</label>
            <select required className="input-field" value={flatForm.buildingId}
              onChange={(e) => setFlatForm({ ...flatForm, buildingId: e.target.value })}>
              <option value="">Select…</option>
              {buildings.map((b) => (
                <option key={b.building_id} value={b.building_id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate mb-1">Flat number</label>
            <input required className="input-field" placeholder="e.g. 204" value={flatForm.flatNumber}
              onChange={(e) => setFlatForm({ ...flatForm, flatNumber: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm text-slate mb-1">Floor</label>
            <input type="number" className="input-field" value={flatForm.floorNumber}
              onChange={(e) => setFlatForm({ ...flatForm, floorNumber: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm text-slate mb-1">Area (sqft)</label>
            <input type="number" className="input-field" value={flatForm.areaSqft}
              onChange={(e) => setFlatForm({ ...flatForm, areaSqft: e.target.value })} />
          </div>
          <button type="submit" className="btn-primary w-fit md:col-span-4">Add flat</button>
        </form>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-line text-xs uppercase tracking-wider text-slate bg-canvas">Buildings</div>
          <table className="w-full text-sm">
            <thead className="bg-canvas text-slate uppercase text-xs tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Floors</th>
                <th className="text-left px-4 py-3">Flats</th>
              </tr>
            </thead>
            <tbody>
              {buildings.map((b) => (
                <tr key={b.building_id} className="border-t border-line">
                  <td className="px-4 py-3">{b.name}</td>
                  <td className="px-4 py-3">{b.total_floors ?? '—'}</td>
                  <td className="px-4 py-3">{b.flat_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {buildings.length === 0 && <p className="text-slate text-sm p-4">No buildings yet.</p>}
        </div>

        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-line text-xs uppercase tracking-wider text-slate bg-canvas">Flats</div>
          <table className="w-full text-sm">
            <thead className="bg-canvas text-slate uppercase text-xs tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Flat #</th>
                <th className="text-left px-4 py-3">Building</th>
                <th className="text-left px-4 py-3">Floor</th>
              </tr>
            </thead>
            <tbody>
              {flats.map((f) => (
                <tr key={f.flat_id} className="border-t border-line">
                  <td className="px-4 py-3">{f.flat_number}</td>
                  <td className="px-4 py-3">{f.building_name}</td>
                  <td className="px-4 py-3">{f.floor_number ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {flats.length === 0 && <p className="text-slate text-sm p-4">No flats yet.</p>}
        </div>
      </div>
    </div>
  );
}
