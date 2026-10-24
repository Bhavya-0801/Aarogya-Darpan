'use client'
import { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Loader2, User, Edit2, Save, X, Plus, AlertCircle, Heart } from 'lucide-react'

export default function PatientProfilePage() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', phone: '', bloodGroup: '',
    allergies: [] as string[], newAllergy: '',
    chronicConditions: [] as string[], newCondition: '',
    emergencyContact: { name: '', relation: '', phone: '' },
  })

  useEffect(() => { fetchProfile() }, [])

  async function fetchProfile() {
    try {
      const { data } = await axios.get('/api/profile')
      const p = data.profile
      if (p) {
        setProfile(p)
        setForm({
          name: p.userId?.name || p.user?.name || '',
          phone: p.userId?.phone || p.user?.phone || '',
          bloodGroup: p.bloodGroup || p.blood_group || '',
          allergies: Array.isArray(p.allergies) ? p.allergies : [],
          newAllergy: '',
          chronicConditions: Array.isArray(p.chronicConditions || p.chronic_conditions) ? (p.chronicConditions || p.chronic_conditions) : [],
          newCondition: '',
          emergencyContact: p.emergencyContact || {
            name: p.emergency_name || '',
            relation: p.emergency_relation || '',
            phone: p.emergency_phone || '',
          },
        })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function save() {
    setSaving(true)
    try {
      await axios.patch('/api/profile', {
        name: form.name, phone: form.phone, bloodGroup: form.bloodGroup,
        allergies: form.allergies, chronicConditions: form.chronicConditions,
        emergencyContact: form.emergencyContact,
      })
      toast.success('Profile updated')
      setEditing(false)
      fetchProfile()
    } catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  function addAllergy() {
    if (form.newAllergy.trim()) {
      setForm(f => ({ ...f, allergies: [...f.allergies, f.newAllergy.trim()], newAllergy: '' }))
    }
  }

  function addCondition() {
    if (form.newCondition.trim()) {
      setForm(f => ({ ...f, chronicConditions: [...f.chronicConditions, f.newCondition.trim()], newCondition: '' }))
    }
  }

  if (loading) {
    return <div className="flex justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand)' }} />
    </div>
  }

  const age = profile?.dob ? Math.floor((Date.now() - new Date(profile.dob).getTime()) / (365.25 * 24 * 3600000)) : null

  return (
    <div className="animate-fade-in max-w-3xl">
      <div className="page-header flex items-center justify-between">
        <div>
          <h2 className="page-title">My Profile</h2>
          <p className="page-subtitle">Personal information & medical history</p>
        </div>
        {!editing ? (
          <button onClick={() => setEditing(true)} className="btn-secondary flex items-center gap-2">
            <Edit2 className="w-4 h-4" /> Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => { setEditing(false); fetchProfile() }} className="btn-secondary flex items-center gap-2">
              <X className="w-4 h-4" /> Cancel
            </button>
            <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
          </div>
        )}
      </div>

      {/* Profile card */}
      <div className="card-new p-6 mb-4">
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-3xl font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--hero-from), var(--hero-to))' }}>
            {((profile?.userId?.name || profile?.user?.name || 'U')[0]).toUpperCase()}
          </div>
          <div className="flex-1 grid grid-cols-2 gap-4">
            <div>
              <p className="label">FULL NAME</p>
              {editing ? (
                <input className="input-field" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              ) : (
                <p className="font-semibold" style={{ color: 'var(--text)' }}>{profile?.userId?.name || profile?.user?.name || '—'}</p>
              )}
            </div>
            <div>
              <p className="label">PHONE</p>
              {editing ? (
                <input className="input-field" value={form.phone} placeholder="+91..."
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              ) : (
                <p style={{ color: 'var(--text)' }}>{profile?.userId?.phone || profile?.user?.phone || '—'}</p>
              )}
            </div>
            <div>
              <p className="label">PATIENT ID (UHID)</p>
              <p className="font-mono font-bold" style={{ color: 'var(--brand)' }}>{profile?.uhid}</p>
            </div>
            <div>
              <p className="label">BLOOD GROUP</p>
              {editing ? (
                <select className="input-field" value={form.bloodGroup}
                  onChange={e => setForm(f => ({ ...f, bloodGroup: e.target.value }))}>
                  <option value="">Unknown</option>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Heart className="w-4 h-4 text-red-400" />
                  <p className="font-semibold" style={{ color: 'var(--text)' }}>{profile?.bloodGroup || '—'}</p>
                </div>
              )}
            </div>
            <div>
              <p className="label">DATE OF BIRTH</p>
              <p style={{ color: 'var(--text)' }}>
                {profile?.dob ? new Date(profile.dob).toLocaleDateString('en-IN') : '—'}
                {age !== null && ` (${age} years)`}
              </p>
            </div>
            <div>
              <p className="label">GENDER</p>
              <p style={{ color: 'var(--text)' }}>{profile?.gender || '—'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Medical History */}
      <div className="card-new p-6 mb-4">
        <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
          <AlertCircle className="w-5 h-5 text-red-500" /> Allergies
        </h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {form.allergies.map((a, i) => (
            <span key={i} className="flex items-center gap-1.5 badge-red">
              {a}
              {editing && (
                <button onClick={() => setForm(f => ({ ...f, allergies: f.allergies.filter((_, j) => j !== i) }))}
                  className="hover:text-red-900">
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
          {form.allergies.length === 0 && !editing && (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No known allergies</p>
          )}
        </div>
        {editing && (
          <div className="flex gap-2">
            <input className="input-field flex-1" placeholder="Add allergy (e.g. Penicillin)"
              value={form.newAllergy}
              onChange={e => setForm(f => ({ ...f, newAllergy: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAllergy())} />
            <button onClick={addAllergy} className="btn-primary px-4">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div className="card-new p-6 mb-4">
        <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
          <Heart className="w-5 h-5" style={{ color: 'var(--brand)' }} /> Long-term Medical Conditions
        </h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {form.chronicConditions.map((c, i) => (
            <span key={i} className="flex items-center gap-1.5 badge-yellow">
              {c}
              {editing && (
                <button onClick={() => setForm(f => ({ ...f, chronicConditions: f.chronicConditions.filter((_, j) => j !== i) }))}>
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
          {form.chronicConditions.length === 0 && !editing && (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No chronic conditions</p>
          )}
        </div>
        {editing && (
          <div className="flex gap-2">
            <input className="input-field flex-1" placeholder="Add condition (e.g. Diabetes Type 2)"
              value={form.newCondition}
              onChange={e => setForm(f => ({ ...f, newCondition: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCondition())} />
            <button onClick={addCondition} className="btn-primary px-4">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Emergency Contact */}
      <div className="card-new p-6">
        <h3 className="font-bold mb-4" style={{ color: 'var(--text)' }}>Emergency Contact</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { k: 'name', label: 'NAME', placeholder: 'Contact name' },
            { k: 'relation', label: 'RELATION', placeholder: 'e.g. Spouse' },
            { k: 'phone', label: 'PHONE', placeholder: '+91...' },
          ].map(({ k, label, placeholder }) => (
            <div key={k}>
              <p className="label">{label}</p>
              {editing ? (
                <input className="input-field" placeholder={placeholder}
                  value={(form.emergencyContact as any)[k]}
                  onChange={e => setForm(f => ({ ...f, emergencyContact: { ...f.emergencyContact, [k]: e.target.value } }))} />
              ) : (
                <p style={{ color: 'var(--text)' }}>{(profile?.emergencyContact as any)?.[k] || '—'}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
