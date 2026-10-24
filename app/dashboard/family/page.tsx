'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  Users, Plus, Search, X, Loader2, UserPlus, Heart, Phone,
  Mail, Calendar, Trash2, Activity
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

const RELATIONS = ['Spouse', 'Parent', 'Child', 'Sibling', 'Grandparent', 'Other']

export default function FamilyPage() {
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', relation: '', dob: '', gender: '', bloodGroup: '',
    phone: '', allergies: '', chronicConditions: '',
  })

  useEffect(() => { fetchMembers() }, [])

  async function fetchMembers() {
    try {
      const { data } = await axios.get('/api/family')
      setMembers(data.members || [])
    } catch { toast.error('Could not load family members') }
    finally { setLoading(false) }
  }

  async function addMember() {
    if (!form.name || !form.relation || !form.dob || !form.gender) {
      return toast.error('Name, relation, date of birth and gender are required')
    }
    setSaving(true)
    try {
      await axios.post('/api/family', {
        ...form,
        allergies: form.allergies ? form.allergies.split(',').map(s => s.trim()).filter(Boolean) : [],
        chronicConditions: form.chronicConditions ? form.chronicConditions.split(',').map(s => s.trim()).filter(Boolean) : [],
      })
      toast.success('Family member added')
      setShowModal(false)
      setForm({ name: '', relation: '', dob: '', gender: '', bloodGroup: '', phone: '', allergies: '', chronicConditions: '' })
      fetchMembers()
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to add member')
    } finally { setSaving(false) }
  }

  async function deleteMember(id: string) {
    if (!confirm('Remove this family member?')) return
    await axios.delete(`/api/family?id=${id}`)
    toast.success('Member removed')
    setMembers(prev => prev.filter(m => m._id !== id && m.id !== id))
  }

  const COLORS = ['#0d9488', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981']

  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand)' }} />
    </div>
  )

  return (
    <div className="animate-fade-in max-w-4xl">
      <div className="page-header flex items-center justify-between">
        <div>
          <h2 className="page-title">Family Members</h2>
          <p className="page-subtitle">Manage your family health profiles under one account</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <UserPlus className="w-4 h-4" /> Add Member
        </button>
      </div>

      {members.length === 0 ? (
        <div className="card-new">
          <div className="empty-state py-20">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(13,148,136,0.1)' }}>
              <Users className="w-7 h-7" style={{ color: 'var(--brand)' }} />
            </div>
            <p className="font-semibold text-lg" style={{ color: 'var(--text)' }}>No family members yet</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Add family members to manage their health data alongside yours.</p>
            <button onClick={() => setShowModal(true)} className="btn-primary mt-4">Add First Member</button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {members.map((m, i) => {
            const memberId = m.id || m._id
            const color = COLORS[i % COLORS.length]
            const age = m.dob ? Math.floor((Date.now() - new Date(m.dob).getTime()) / (365.25 * 24 * 3600000)) : null
            const blood = m.bloodGroup || m.blood_group
            const chronic = m.chronicConditions || m.chronic_conditions || []
            return (
              <div key={memberId} className="card-new p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                      style={{ background: color }}>
                      {(m.name || 'M')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold" style={{ color: 'var(--text)' }}>{m.name}</p>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{m.relation}</p>
                    </div>
                  </div>
                  <button onClick={() => deleteMember(memberId)}
                    className="p-1.5 rounded-lg opacity-50 hover:opacity-100 transition-opacity"
                    style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div>
                    <p className="label">GENDER</p>
                    <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{m.gender || '—'}</p>
                  </div>
                  <div>
                    <p className="label">AGE</p>
                    <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{age ? `${age} years` : '—'}</p>
                  </div>
                  {blood && (
                    <div>
                      <p className="label">BLOOD GROUP</p>
                      <p className="text-sm font-medium flex items-center gap-1" style={{ color: 'var(--text)' }}>
                        <Heart className="w-3 h-3 text-red-400" /> {blood}
                      </p>
                    </div>
                  )}
                  {m.phone && (
                    <div>
                      <p className="label">PHONE</p>
                      <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{m.phone}</p>
                    </div>
                  )}
                </div>

                {(m.allergies?.length > 0 || chronic?.length > 0) && (
                  <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                    {m.allergies?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-1">
                        {m.allergies.map((a: string) => (
                          <span key={a} className="badge-red text-xs">{a}</span>
                        ))}
                      </div>
                    )}
                    {chronic?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {chronic.map((c: string) => (
                          <span key={c} className="badge-yellow text-xs">{c}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add Member Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative z-10 w-full max-w-lg rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold" style={{ color: 'var(--text)' }}>Add Family Member</h3>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-gray-100/10">
                <X className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">FULL NAME *</label>
                  <input className="input-field" placeholder="Member name" value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="label">RELATION *</label>
                  <select className="input-field" value={form.relation}
                    onChange={e => setForm(f => ({ ...f, relation: e.target.value }))}>
                    <option value="">Select...</option>
                    {RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">DATE OF BIRTH *</label>
                  <input type="date" className="input-field" value={form.dob}
                    onChange={e => setForm(f => ({ ...f, dob: e.target.value }))} />
                </div>
                <div>
                  <label className="label">GENDER *</label>
                  <select className="input-field" value={form.gender}
                    onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                    <option value="">Select...</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="label">BLOOD GROUP</label>
                  <select className="input-field" value={form.bloodGroup}
                    onChange={e => setForm(f => ({ ...f, bloodGroup: e.target.value }))}>
                    <option value="">Unknown</option>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">PHONE</label>
                  <input className="input-field" placeholder="+91..." value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">ALLERGIES (comma-separated)</label>
                <input className="input-field" placeholder="e.g. Penicillin, Aspirin" value={form.allergies}
                  onChange={e => setForm(f => ({ ...f, allergies: e.target.value }))} />
              </div>
              <div>
                <label className="label">CHRONIC CONDITIONS (comma-separated)</label>
                <input className="input-field" placeholder="e.g. Diabetes, Hypertension" value={form.chronicConditions}
                  onChange={e => setForm(f => ({ ...f, chronicConditions: e.target.value }))} />
              </div>
              <button onClick={addMember} disabled={saving} className="btn-primary w-full">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding...</> : 'Add Member'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
