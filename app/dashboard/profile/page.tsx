'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  Loader2, Edit2, Save, X, Building2, Stethoscope,
  Phone, Mail, MapPin, Hash, Briefcase, IndianRupee,
  User, ClipboardList, Beaker, ShoppingBag, Star
} from 'lucide-react'
import LanguagePreferenceCard from '@/components/LanguagePreferenceCard'


// ─── Hospital Admin Profile ──────────────────────────────────────────────────
function HospitalAdminProfile() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<any>({})

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const [settingsRes, profileRes] = await Promise.all([
        axios.get('/api/settings'),
        axios.get('/api/profile'),
      ])
      setData({ hospital: settingsRes.data.hospital, user: profileRes.data.user })
      setForm({
        name: profileRes.data.user?.name || '',
        phone: profileRes.data.user?.phone || '',
      })
    } catch { } finally { setLoading(false) }
  }

  async function save() {
    setSaving(true)
    try {
      await axios.patch('/api/profile', { name: form.name, phone: form.phone })
      toast.success('Profile updated!')
      setEditing(false)
      load()
    } catch { toast.error('Save failed') } finally { setSaving(false) }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand)' }} /></div>

  const h = data?.hospital
  const u = data?.user

  return (
    <div className="animate-fade-in max-w-3xl space-y-4">
      <div className="page-header flex items-center justify-between">
        <div>
          <h2 className="page-title">My Profile</h2>
          <p className="page-subtitle">Hospital administrator account</p>
        </div>
        {!editing
          ? <button onClick={() => setEditing(true)} className="btn-secondary flex items-center gap-2"><Edit2 className="w-4 h-4" /> Edit</button>
          : <div className="flex gap-2">
            <button onClick={() => { setEditing(false); load() }} className="btn-secondary flex items-center gap-2"><X className="w-4 h-4" /> Cancel</button>
            <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
            </button>
          </div>
        }
      </div>

      {/* Language Preference */}
      <LanguagePreferenceCard />

      {/* Admin info */}
      <div className="card-new p-6">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #1e3a5f, #3b82f6)' }}>
            {(u?.name || 'A')[0].toUpperCase()}
          </div>
          <div className="flex-1 grid grid-cols-2 gap-4">
            <div>
              <p className="label">FULL NAME</p>
              {editing
                ? <input className="input-field" value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} />
                : <p className="font-semibold" style={{ color: 'var(--text)' }}>{u?.name}</p>
              }
            </div>
            <div>
              <p className="label">EMAIL</p>
              <p style={{ color: 'var(--text)' }}>{u?.email}</p>
            </div>
            <div>
              <p className="label">PHONE</p>
              {editing
                ? <input className="input-field" value={form.phone} onChange={e => setForm((f: any) => ({ ...f, phone: e.target.value }))} />
                : <p style={{ color: 'var(--text)' }}>{u?.phone || '—'}</p>
              }
            </div>
            <div>
              <p className="label">ROLE</p>
              <span className="badge-blue">Hospital Administrator</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hospital details */}
      <div className="card-new p-6">
        <h3 className="font-bold mb-5 flex items-center gap-2" style={{ color: 'var(--text)' }}>
          <Building2 className="w-5 h-5" style={{ color: '#3b82f6' }} /> Hospital Details
        </h3>
        {h ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <p className="label">HOSPITAL NAME</p>
              <p className="font-bold text-lg" style={{ color: 'var(--text)' }}>{h.name}</p>
            </div>
            <div>
              <p className="label">LICENSE NUMBER</p>
              <p className="font-mono" style={{ color: 'var(--text)' }}>{h.licenseNumber || '—'}</p>
            </div>
            <div>
              <p className="label">CITY / STATE</p>
              <p style={{ color: 'var(--text)' }}>{[h.address?.city, h.address?.state].filter(Boolean).join(', ') || '—'}</p>
            </div>
            <div>
              <p className="label">PHONE</p>
              <p style={{ color: 'var(--text)' }}>{h.phone || '—'}</p>
            </div>
            <div>
              <p className="label">TOTAL BEDS</p>
              <p style={{ color: 'var(--text)' }}>{h.totalBeds || 0}</p>
            </div>
            {h.departments?.length > 0 && (
              <div className="col-span-2">
                <p className="label mb-2">DEPARTMENTS</p>
                <div className="flex flex-wrap gap-2">
                  {h.departments.map((d: string) => (
                    <span key={d} className="px-2.5 py-1 rounded-lg text-xs font-medium"
                      style={{ background: 'rgba(13,148,136,0.1)', color: 'var(--brand)' }}>{d}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center py-6 gap-2 text-center">
            <Building2 className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Hospital details not found.</p>
            <a href="/dashboard/settings" className="text-sm font-semibold" style={{ color: 'var(--brand)' }}>Complete hospital setup in Settings →</a>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Doctor Profile ──────────────────────────────────────────────────────────
function DoctorProfile() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<any>({})

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const [uRes, aRes] = await Promise.all([axios.get('/api/profile'), axios.get('/api/analytics')])
      const user = uRes.data.user
      let hospital = aRes.data.hospital
      // Fallback: fetch hospital directly if analytics didn't resolve it
      if (!hospital && user?.hospitalId) {
        const hRes = await axios.get(`/api/hospitals/public?hospitalId=${user.hospitalId}`).catch(() => null)
        // analytics gives us the hospital object; if not, try settings-like approach
        const hList = await axios.get('/api/hospitals/public').catch(() => ({ data: { hospitals: [] } }))
        const found = hList.data.hospitals?.find((h: any) => h._id === user.hospitalId)
        if (found) hospital = found
      }
      setData({ user, hospital })
      setForm({ name: user?.name || '', phone: user?.phone || '', specialization: user?.specialization || '', department: user?.department || '', opdFee: user?.opdFee || 300 })
    } catch { } finally { setLoading(false) }
  }

  async function save() {
    setSaving(true)
    try {
      await axios.patch('/api/profile', { name: form.name, phone: form.phone })
      toast.success('Profile updated!'); setEditing(false); load()
    } catch { toast.error('Save failed') } finally { setSaving(false) }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand)' }} /></div>
  const u = data?.user
  const h = data?.hospital

  return (
    <div className="animate-fade-in max-w-3xl space-y-4">
      <div className="page-header flex items-center justify-between">
        <div>
          <h2 className="page-title">My Profile</h2>
          <p className="page-subtitle">Doctor account</p>
        </div>
        {!editing
          ? <button onClick={() => setEditing(true)} className="btn-secondary flex items-center gap-2"><Edit2 className="w-4 h-4" /> Edit</button>
          : <div className="flex gap-2">
            <button onClick={() => { setEditing(false); load() }} className="btn-secondary flex items-center gap-2"><X className="w-4 h-4" /> Cancel</button>
            <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
            </button>
          </div>
        }
      </div>

      {/* Language Preference */}
      <LanguagePreferenceCard />

      {/* Doctor card */}
      <div className="card-new p-6">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #4c1d95, #8b5cf6)' }}>
            {(u?.name || 'D')[0].toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="label">FULL NAME</p>
                {editing
                  ? <input className="input-field" value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} />
                  : <p className="font-bold text-lg" style={{ color: 'var(--text)' }}>Dr. {u?.name}</p>
                }
              </div>
              <div>
                <p className="label">EMAIL</p>
                <p style={{ color: 'var(--text)' }}>{u?.email}</p>
              </div>
              <div>
                <p className="label">PHONE</p>
                {editing
                  ? <input className="input-field" value={form.phone} onChange={e => setForm((f: any) => ({ ...f, phone: e.target.value }))} />
                  : <p style={{ color: 'var(--text)' }}>{u?.phone || '—'}</p>
                }
              </div>
              <div>
                <p className="label">ROLE</p>
                <span className="badge-purple">Doctor</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Professional details */}
      <div className="card-new p-6">
        <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
          <Stethoscope className="w-5 h-5" style={{ color: '#8b5cf6' }} /> Professional Details
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="label">SPECIALIZATION</p>
            <p className="font-semibold" style={{ color: 'var(--text)' }}>{u?.specialization || '—'}</p>
          </div>
          <div>
            <p className="label">DEPARTMENT</p>
            <p style={{ color: 'var(--text)' }}>{u?.department || '—'}</p>
          </div>
          <div>
            <p className="label">OPD CONSULTATION FEE</p>
            <p className="font-bold text-xl" style={{ color: '#8b5cf6' }}>₹{u?.opdFee || 300}</p>
          </div>
          <div>
            <p className="label">HOSPITAL</p>
            <p className="font-semibold" style={{ color: 'var(--text)' }}>{h?.name || '—'}</p>
            {h?.city && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{h.city}, {h.state}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Staff Profile (Receptionist / Lab Tech / Pharmacy) ─────────────────────
function StaffProfile({ roleLabel, icon: Icon, color }: { roleLabel: string; icon: any; color: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<any>({})

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const [uRes, aRes] = await Promise.all([axios.get('/api/profile'), axios.get('/api/analytics')])
      const user = uRes.data.user
      let hospital = aRes.data.hospital
      // Fallback: search hospital list using user's hospitalId
      if (!hospital && user?.hospitalId) {
        const hList = await axios.get('/api/hospitals/public').catch(() => ({ data: { hospitals: [] } }))
        const found = hList.data.hospitals?.find((h: any) => h._id === user.hospitalId?.toString())
        if (found) hospital = found
      }
      setData({ user, hospital })
      setForm({ name: user?.name || '', phone: user?.phone || '' })
    } catch { } finally { setLoading(false) }
  }

  async function save() {
    setSaving(true)
    try {
      await axios.patch('/api/profile', { name: form.name, phone: form.phone })
      toast.success('Profile updated!'); setEditing(false); load()
    } catch { toast.error('Save failed') } finally { setSaving(false) }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand)' }} /></div>
  const u = data?.user
  const h = data?.hospital

  return (
    <div className="animate-fade-in max-w-3xl space-y-4">
      <div className="page-header flex items-center justify-between">
        <div>
          <h2 className="page-title">My Profile</h2>
          <p className="page-subtitle">{roleLabel} account</p>
        </div>
        {!editing
          ? <button onClick={() => setEditing(true)} className="btn-secondary flex items-center gap-2"><Edit2 className="w-4 h-4" /> Edit</button>
          : <div className="flex gap-2">
            <button onClick={() => { setEditing(false); load() }} className="btn-secondary flex items-center gap-2"><X className="w-4 h-4" /> Cancel</button>
            <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
            </button>
          </div>
        }
      </div>

      {/* Language Preference */}
      <LanguagePreferenceCard />

      <div className="card-new p-6">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${color}cc, ${color})` }}>
            {(u?.name || 'S')[0].toUpperCase()}
          </div>
          <div className="flex-1 grid grid-cols-2 gap-4">
            <div>
              <p className="label">FULL NAME</p>
              {editing
                ? <input className="input-field" value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} />
                : <p className="font-bold" style={{ color: 'var(--text)' }}>{u?.name}</p>
              }
            </div>
            <div>
              <p className="label">EMAIL</p>
              <p style={{ color: 'var(--text)' }}>{u?.email}</p>
            </div>
            <div>
              <p className="label">PHONE</p>
              {editing
                ? <input className="input-field" value={form.phone} onChange={e => setForm((f: any) => ({ ...f, phone: e.target.value }))} />
                : <p style={{ color: 'var(--text)' }}>{u?.phone || '—'}</p>
              }
            </div>
            <div>
              <p className="label">ROLE</p>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ background: `${color}15`, color }}>
                <Icon className="w-3 h-3" /> {roleLabel}
              </div>
            </div>
            {u?.department && (
              <div>
                <p className="label">DEPARTMENT</p>
                <p style={{ color: 'var(--text)' }}>{u.department}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hospital */}
      <div className="card-new p-6">
        <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
          <Building2 className="w-5 h-5" style={{ color }} /> Assigned Hospital
        </h3>
        {h ? (
          <div className="grid grid-cols-2 gap-4">
            <div><p className="label">HOSPITAL NAME</p><p className="font-semibold" style={{ color: 'var(--text)' }}>{h.name}</p></div>
            <div><p className="label">LOCATION</p><p style={{ color: 'var(--text)' }}>{h.city}{h.state ? `, ${h.state}` : ''}</p></div>
          </div>
        ) : <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No hospital assigned yet. Ask your admin to link you.</p>}
      </div>
    </div>
  )
}

// ─── Main Router ─────────────────────────────────────────────────────────────
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const role = (session?.user as any)?.role

  useEffect(() => {
    if (role === 'patient') router.replace('/dashboard/profile/patient')
  }, [role, router])

  if (!role || role === 'patient') return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand)' }} /></div>
  if (role === 'hospital_admin') return <HospitalAdminProfile />
  if (role === 'doctor') return <DoctorProfile />
  if (role === 'receptionist') return <StaffProfile roleLabel="Receptionist" icon={ClipboardList} color="#f59e0b" />
  if (role === 'lab_technician') return <StaffProfile roleLabel="Lab Technician" icon={Beaker} color="#ef4444" />
  if (role === 'pharmacy') return <StaffProfile roleLabel="Pharmacy" icon={ShoppingBag} color="#10b981" />

  return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand)' }} /></div>
}
