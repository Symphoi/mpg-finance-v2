'use client';
import { useState, useEffect } from 'react';
import { usePaginated } from '@/hooks/useApi';
import { formatDate } from '@/lib/utils';
import { Plus, Search, X, ChevronLeft, ChevronRight, Shield, Users, Key, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';

interface User { user_code: string; name: string; email: string; department: string; position: string; status: string; roles: string; role_codes: string; created_at: string; }
interface Role { role_code: string; name: string; description: string; is_system_role: number; user_count: number; }
interface Permission { permission_code: string; name: string; category: string; module: string; action: string; }

export default function RBACPage() {
  const [tab, setTab] = useState<'users'|'roles'>('users');
  const { data: users, meta, loading, setSearch, setPage, refetch } = usePaginated<User>('/api/rbac', { type:'users' });
  const [roles, setRoles]   = useState<Role[]>([]);
  const [perms, setPerms]   = useState<Permission[]>([]);
  const [search, setS]      = useState('');
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [showPermModal, setShowPermModal]   = useState<Role | null>(null);
  const [rolePermCodes, setRolePermCodes]   = useState<string[]>([]);
  const [resetModal, setResetModal]         = useState<User | null>(null);
  const [newPassword, setNewPassword]       = useState('');
  const [form, setForm]     = useState({ name:'', email:'', password:'', role_codes:[] as string[] });
  const [roleForm, setRoleForm] = useState({ name:'', description:'' });
  const [saving, setSaving] = useState(false);

  const loadRoles = async () => {
    const res  = await fetch('/api/rbac?type=roles', { credentials:'include' });
    const json = await res.json();
    if (json.success) setRoles(json.data ?? []);
  };
  const loadPerms = async () => {
    const res  = await fetch('/api/rbac?type=permissions', { credentials:'include' });
    const json = await res.json();
    if (json.success) setPerms(json.data ?? []);
  };

  useEffect(() => { loadRoles(); loadPerms(); }, []);

  const openPermModal = async (role: Role) => {
    const res  = await fetch(`/api/rbac?type=role_permissions&role_code=${role.role_code}`, { credentials:'include' });
    const json = await res.json();
    setRolePermCodes((json.data ?? []).map((p: any) => p.permission_code));
    setShowPermModal(role);
  };

  const saveRolePerms = async () => {
    if (!showPermModal) return;
    setSaving(true);
    try {
      const res = await fetch('/api/rbac', { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include',
        body: JSON.stringify({ action:'update_role_permissions', role_code: showPermModal.role_code, permission_codes: rolePermCodes }) });
      const j   = await res.json();
      if (!j.success) throw new Error(j.error);
      toast.success('Permissions diperbarui'); setShowPermModal(null);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Gagal'); }
    setSaving(false);
  };

  const createUser = async () => {
    if (!form.name || !form.email || !form.password) { toast.error('Nama, email, password wajib'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/rbac', { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include',
        body: JSON.stringify({ action:'create_user', ...form }) });
      const j   = await res.json();
      if (!j.success) throw new Error(j.error);
      toast.success('User dibuat'); setShowCreateUser(false); setForm({ name:'', email:'', password:'', role_codes:[] }); refetch();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Gagal'); }
    setSaving(false);
  };

  const createRole = async () => {
    if (!roleForm.name) { toast.error('Nama role wajib'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/rbac', { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include',
        body: JSON.stringify({ action:'create_role', ...roleForm }) });
      const j   = await res.json();
      if (!j.success) throw new Error(j.error);
      toast.success('Role dibuat'); setShowCreateRole(false); setRoleForm({ name:'', description:'' }); loadRoles();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Gagal'); }
    setSaving(false);
  };

  const toggleStatus = async (u: User) => {
    const newStatus = u.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await fetch('/api/rbac', { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include',
        body: JSON.stringify({ action:'toggle_status', user_code: u.user_code, status: newStatus }) });
      const j   = await res.json();
      if (!j.success) throw new Error(j.error);
      toast.success(`User ${newStatus === 'active' ? 'diaktifkan' : 'dinonaktifkan'}`); refetch();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Gagal'); }
  };

  const resetPassword = async () => {
    if (!resetModal || !newPassword || newPassword.length < 6) { toast.error('Password minimal 6 karakter'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/rbac', { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include',
        body: JSON.stringify({ action:'reset_password', user_code: resetModal.user_code, new_password: newPassword }) });
      const j   = await res.json();
      if (!j.success) throw new Error(j.error);
      toast.success('Password direset'); setResetModal(null); setNewPassword('');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Gagal'); }
    setSaving(false);
  };

  // Group permissions by category
  const permsByCategory = perms.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <div className="space-y-4 max-w-[1100px]">
      <div className="flex items-center justify-between">
        <div><h1 className="text-[19px] font-bold" style={{color:'var(--color-text)'}}>Roles & Permissions</h1><p className="text-[12px] mt-0.5" style={{color:'var(--color-text-muted)'}}>Manajemen user dan hak akses</p></div>
        <button className="btn btn-primary btn-sm" onClick={()=>tab==='users'?setShowCreateUser(true):setShowCreateRole(true)}><Plus size={13}/> {tab==='users'?'Tambah User':'Tambah Role'}</button>
      </div>

      <div className="flex gap-1 p-1 rounded-xl" style={{background:'var(--color-bg)', width:'fit-content'}}>
        {[['users','Users',Users],['roles','Roles',Shield]].map(([v,l,Icon])=>(
          <button key={v as string} className={`flex items-center gap-2 px-4 py-2 rounded-[9px] text-[12.5px] font-medium transition-all ${tab===v?'bg-white shadow-sm':''}`}
            style={{color: tab===v ? 'var(--color-text)' : 'var(--color-text-muted)'}} onClick={()=>setTab(v as any)}>
            <Icon size={14}/> {l as string}
          </button>
        ))}
      </div>

      {tab === 'users' && (
        <>
          <div className="card p-3 flex gap-2">
            <div className="flex-1 relative"><Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{color:'var(--color-text-muted)'}}/><input className="input" style={{paddingLeft:32}} placeholder="Cari nama, email..." value={search} onChange={(e)=>setS(e.target.value)} onKeyDown={(e)=>e.key==='Enter'&&setSearch(search)}/></div>
            <button className="btn btn-primary btn-sm" onClick={()=>setSearch(search)}>Cari</button>
          </div>
          <div className="card overflow-hidden">
            <div className="tbl-wrapper"><table className="tbl">
              <thead><tr><th>Kode</th><th>Nama</th><th>Email</th><th>Department</th><th>Roles</th><th>Status</th><th>Dibuat</th><th>Aksi</th></tr></thead>
              <tbody>
                {loading && <tr><td colSpan={8} className="text-center py-8" style={{color:'var(--color-text-muted)'}}>Memuat...</td></tr>}
                {!loading && users.length===0 && <tr><td colSpan={8} className="text-center py-10" style={{color:'var(--color-text-muted)'}}>Tidak ada user</td></tr>}
                {users.map((u)=>(
                  <tr key={u.user_code}>
                    <td><span className="tbl-mono">{u.user_code}</span></td>
                    <td><div className="font-medium" style={{color:'var(--color-text)'}}>{u.name}</div></td>
                    <td><div className="text-[12px]">{u.email}</div></td>
                    <td>{u.department||'-'}</td>
                    <td><div className="flex flex-wrap gap-1">{(u.roles||'').split(',').filter(Boolean).map(r=><span key={r} className="badge badge-purple">{r.trim()}</span>)}</div></td>
                    <td><span className={`badge ${u.status==='active'?'badge-green':'badge-gray'}`}>{u.status}</span></td>
                    <td style={{color:'var(--color-text-muted)'}}>{formatDate(u.created_at)}</td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <button className="btn btn-outline btn-sm" onClick={()=>toggleStatus(u)} title={u.status==='active'?'Nonaktifkan':'Aktifkan'}>
                          {u.status==='active' ? <ToggleRight size={13} style={{color:'#059669'}}/> : <ToggleLeft size={13}/>}
                        </button>
                        <button className="btn btn-outline btn-sm flex items-center gap-1" onClick={()=>{setResetModal(u);setNewPassword('');}}>
                          <Key size={11}/> Reset PW
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
            <div className="flex items-center justify-between px-4 py-3" style={{borderTop:'1px solid var(--color-border-soft)'}}>
              <div className="text-[12px]" style={{color:'var(--color-text-muted)'}}>{meta.total} user</div>
              <div className="pagination"><button className="page-btn" disabled={meta.page<=1} onClick={()=>setPage(meta.page-1)}><ChevronLeft size={13}/></button><button className="page-btn" disabled={meta.page>=meta.totalPages} onClick={()=>setPage(meta.page+1)}><ChevronRight size={13}/></button></div>
            </div>
          </div>
        </>
      )}

      {tab === 'roles' && (
        <div className="grid grid-cols-3 gap-3">
          {roles.map((r)=>(
            <div key={r.role_code} className="card p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{background:'#f5f3ff'}}><Shield size={16} style={{color:'#7c3aed'}}/></div>
                <div className="flex items-center gap-1.5">
                  <span className="badge badge-blue">{r.user_count} user</span>
                  {r.is_system_role ? <span className="badge badge-gray">System</span> : null}
                </div>
              </div>
              <div className="font-bold text-[14px]" style={{color:'var(--color-text)'}}>{r.name}</div>
              <div className="text-[11px] font-mono mt-0.5" style={{color:'var(--color-text-muted)'}}>{r.role_code}</div>
              {r.description && <div className="text-[12px] mt-1" style={{color:'var(--color-text-muted)'}}>{r.description}</div>}
              {!r.is_system_role && (
                <button className="btn btn-outline btn-sm mt-3 w-full justify-center" onClick={()=>openPermModal(r)}>
                  <Shield size={11}/> Kelola Permissions
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create User */}
      {showCreateUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:'rgba(0,0,0,0.4)'}}>
          <div className="bg-white rounded-2xl shadow-2xl w-[480px] p-6">
            <div className="flex items-center justify-between mb-4"><div className="font-bold text-[15px]">Tambah User</div><button onClick={()=>setShowCreateUser(false)}><X size={15} style={{color:'var(--color-text-muted)'}}/></button></div>
            <div className="space-y-3">
              <div><label className="input-label">Nama *</label><input className="input" value={form.name} onChange={(e)=>setForm(f=>({...f,name:e.target.value}))}/></div>
              <div><label className="input-label">Email *</label><input type="email" className="input" value={form.email} onChange={(e)=>setForm(f=>({...f,email:e.target.value}))}/></div>
              <div><label className="input-label">Password *</label><input type="password" className="input" value={form.password} onChange={(e)=>setForm(f=>({...f,password:e.target.value}))} placeholder="Min 6 karakter"/></div>
              <div>
                <label className="input-label">Roles</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {roles.map(r=>(
                    <label key={r.role_code} className="flex items-center gap-1.5 cursor-pointer text-[12px] p-2 rounded-lg border" style={{borderColor: form.role_codes.includes(r.role_code)?'#a78bfa':'var(--color-border)', background: form.role_codes.includes(r.role_code)?'#f5f3ff':'#fff'}}>
                      <input type="checkbox" checked={form.role_codes.includes(r.role_code)}
                        onChange={(e)=>setForm(f=>({...f,role_codes:e.target.checked?[...f.role_codes,r.role_code]:f.role_codes.filter(x=>x!==r.role_code)}))}/>
                      {r.name}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5 justify-end"><button className="btn btn-outline" onClick={()=>setShowCreateUser(false)}>Batal</button><button className="btn btn-primary" onClick={createUser} disabled={saving}>{saving?'Menyimpan...':'Simpan'}</button></div>
          </div>
        </div>
      )}

      {/* Create Role */}
      {showCreateRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:'rgba(0,0,0,0.4)'}}>
          <div className="bg-white rounded-2xl shadow-2xl w-[400px] p-6">
            <div className="flex items-center justify-between mb-4"><div className="font-bold text-[15px]">Tambah Role</div><button onClick={()=>setShowCreateRole(false)}><X size={15} style={{color:'var(--color-text-muted)'}}/></button></div>
            <div className="space-y-3">
              <div><label className="input-label">Nama Role *</label><input className="input" value={roleForm.name} onChange={(e)=>setRoleForm(f=>({...f,name:e.target.value}))}/></div>
              <div><label className="input-label">Deskripsi</label><textarea className="input resize-none" rows={2} value={roleForm.description} onChange={(e)=>setRoleForm(f=>({...f,description:e.target.value}))}/></div>
            </div>
            <div className="flex gap-2 mt-5 justify-end"><button className="btn btn-outline" onClick={()=>setShowCreateRole(false)}>Batal</button><button className="btn btn-primary" onClick={createRole} disabled={saving}>{saving?'Menyimpan...':'Simpan'}</button></div>
          </div>
        </div>
      )}

      {/* Permission Manager */}
      {showPermModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.4)'}}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[700px] max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b" style={{borderColor:'var(--color-border)'}}>
              <div><div className="font-bold text-[15px]">Permissions — {showPermModal.name}</div><div className="text-[12px] font-mono mt-0.5" style={{color:'var(--color-text-muted)'}}>{showPermModal.role_code}</div></div>
              <button onClick={()=>setShowPermModal(null)}><X size={15} style={{color:'var(--color-text-muted)'}}/></button>
            </div>
            <div className="p-5 space-y-5">
              {Object.entries(permsByCategory).map(([cat, catPerms])=>(
                <div key={cat}>
                  <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{color:'var(--color-text-muted)'}}>{cat}</div>
                  <div className="grid grid-cols-2 gap-2">
                    {catPerms.map(p=>(
                      <label key={p.permission_code} className="flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer text-[12px]"
                        style={{borderColor: rolePermCodes.includes(p.permission_code)?'#a78bfa':'var(--color-border)', background: rolePermCodes.includes(p.permission_code)?'#f5f3ff':'#fff'}}>
                        <input type="checkbox" className="mt-0.5" checked={rolePermCodes.includes(p.permission_code)}
                          onChange={(e)=>setRolePermCodes(prev=>e.target.checked?[...prev,p.permission_code]:prev.filter(x=>x!==p.permission_code))}/>
                        <div>
                          <div className="font-medium" style={{color:'var(--color-text)'}}>{p.name}</div>
                          <div className="text-[10.5px] font-mono mt-0.5" style={{color:'var(--color-text-muted)'}}>{p.permission_code}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 p-5 border-t" style={{borderColor:'var(--color-border)'}}>
              <div className="text-[12px] mr-auto" style={{color:'var(--color-text-muted)'}}>{rolePermCodes.length} permission dipilih</div>
              <button className="btn btn-outline" onClick={()=>setShowPermModal(null)}>Batal</button>
              <button className="btn btn-primary" onClick={saveRolePerms} disabled={saving}>{saving?'Menyimpan...':'Simpan Permissions'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password */}
      {resetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:'rgba(0,0,0,0.4)'}}>
          <div className="bg-white rounded-2xl shadow-2xl w-[380px] p-6">
            <div className="flex items-center justify-between mb-4"><div className="font-bold text-[15px]">Reset Password</div><button onClick={()=>setResetModal(null)}><X size={15} style={{color:'var(--color-text-muted)'}}/></button></div>
            <p className="text-[12.5px] mb-3" style={{color:'var(--color-text-secondary)'}}>Reset password untuk <strong>{resetModal.name}</strong></p>
            <div><label className="input-label">Password Baru *</label><input type="password" className="input" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} placeholder="Min 6 karakter"/></div>
            <div className="flex gap-2 mt-5 justify-end"><button className="btn btn-outline" onClick={()=>setResetModal(null)}>Batal</button><button className="btn btn-primary" onClick={resetPassword} disabled={saving}>{saving?'Mereset...':'Reset Password'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
