'use client'
import { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Loader2, User, Edit2, Save, X, Plus, AlertCircle, Heart, Globe, Check } from 'lucide-react'
import { useLanguage } from '@/components/providers/LanguageProvider'

export default function PatientProfilePage() {
  const { language, setLanguage, t } = useLanguage()
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
      toast.success(t('profile.updatedSuccess'))
      setEditing(false)
      fetchProfile()
    } catch {
      toast.error('Failed to save profile')
    } finally {
      setSaving(false)
    }
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
    <div className="animate-fade-in max-w-3xl space-y-4">
      <div className="page-header flex items-center justify-between">
        <div>
          <h2 className="page-title">{t('profile.title')}</h2>
          <p className="page-subtitle">{t('profile.subtitle')}</p>
        </div>
        {!editing ? (
          <button onClick={() => setEditing(true)} className="btn-secondary flex items-center gap-2">
            <Edit2 className="w-4 h-4" /> {t('action.edit')}
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => { setEditing(false); fetchProfile() }} className="btn-secondary flex items-center gap-2">
              <X className="w-4 h-4" /> {t('action.cancel')}
            </button>
            <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? t('action.saving') : t('action.save')}
            </button>
          </div>
        )}
      </div>

      {/* Language Preference Section */}
      <div className="card-new p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-teal-500/10 text-teal-600 dark:text-teal-400">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base" style={{ color: 'var(--text)' }}>{t('profile.langTitle')}</h3>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('profile.langDesc')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              setLanguage('en')
              toast.success('Language changed to English')
            }}
            className={`flex items-center justify-between p-4 rounded-xl border text-left transition-all ${
              language === 'en'
                ? 'border-teal-500 bg-teal-500/10 shadow-sm'
                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🇬🇧</span>
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>English</p>
                <p className="text-xs text-slate-500">Default interface language</p>
              </div>
            </div>
            {language === 'en' && <Check className="w-5 h-5 text-teal-600 dark:text-teal-400" />}
          </button>

          <button
            type="button"
            onClick={() => {
              setLanguage('hi')
              toast.success('भाषा बदलकर हिंदी कर दी गई है')
            }}
            className={`flex items-center justify-between p-4 rounded-xl border text-left transition-all ${
              language === 'hi'
                ? 'border-teal-500 bg-teal-500/10 shadow-sm'
                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🇮🇳</span>
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>हिंदी (Hindi)</p>
                <p className="text-xs text-slate-500">संपूर्ण इंटरफ़ेस और एआई हिंदी में</p>
              </div>
            </div>
            {language === 'hi' && <Check className="w-5 h-5 text-teal-600 dark:text-teal-400" />}
          </button>
        </div>
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
              <p className="label">{t('profile.fullName')}</p>
              {editing ? (
                <input className="input-field" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              ) : (
                <p className="font-semibold" style={{ color: 'var(--text)' }}>{profile?.userId?.name || profile?.user?.name || '—'}</p>
              )}
            </div>
            <div>
              <p className="label">{t('profile.phone')}</p>
              {editing ? (
                <input className="input-field" value={form.phone} placeholder="+91..."
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              ) : (
                <p style={{ color: 'var(--text)' }}>{profile?.userId?.phone || profile?.user?.phone || '—'}</p>
              )}
            </div>
            <div>
              <p className="label">{t('profile.uhid')}</p>
              <p className="font-mono font-bold" style={{ color: 'var(--brand)' }}>{profile?.uhid}</p>
            </div>
            <div>
              <p className="label">{t('profile.bloodGroup')}</p>
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
                  <p className="font-semibold" style={{ color: 'var(--text)' }}>{profile?.bloodGroup || profile?.blood_group || '—'}</p>
                </div>
              )}
            </div>
            <div>
              <p className="label">{t('profile.dob')}</p>
              <p style={{ color: 'var(--text)' }}>
                {profile?.dob ? new Date(profile.dob).toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-IN') : '—'}
                {age !== null && ` (${age} ${language === 'hi' ? 'वर्ष' : 'years'})`}
              </p>
            </div>
            <div>
              <p className="label">{t('profile.gender')}</p>
              <p style={{ color: 'var(--text)' }}>{profile?.gender || '—'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Medical History */}
      <div className="card-new p-6 mb-4">
        <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
          <AlertCircle className="w-5 h-5 text-red-500" /> {t('profile.allergies')}
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
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('profile.noAllergies')}</p>
          )}
        </div>
        {editing && (
          <div className="flex gap-2">
            <input className="input-field flex-1" placeholder={t('profile.addAllergy')}
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
          <Heart className="w-5 h-5" style={{ color: 'var(--brand)' }} /> {t('profile.chronic')}
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
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('profile.noChronic')}</p>
          )}
        </div>
        {editing && (
          <div className="flex gap-2">
            <input className="input-field flex-1" placeholder={t('profile.addCondition')}
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
        <h3 className="font-bold mb-4" style={{ color: 'var(--text)' }}>{t('profile.emergency')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <p className="label">{t('profile.contactName')}</p>
            {editing ? (
              <input className="input-field" placeholder="Contact name"
                value={form.emergencyContact.name}
                onChange={e => setForm(f => ({ ...f, emergencyContact: { ...f.emergencyContact, name: e.target.value } }))} />
            ) : (
              <p style={{ color: 'var(--text)' }}>{form.emergencyContact.name || '—'}</p>
            )}
          </div>
          <div>
            <p className="label">{t('profile.contactRelation')}</p>
            {editing ? (
              <input className="input-field" placeholder="e.g. Spouse / Parent"
                value={form.emergencyContact.relation}
                onChange={e => setForm(f => ({ ...f, emergencyContact: { ...f.emergencyContact, relation: e.target.value } }))} />
            ) : (
              <p style={{ color: 'var(--text)' }}>{form.emergencyContact.relation || '—'}</p>
            )}
          </div>
          <div>
            <p className="label">{t('profile.contactPhone')}</p>
            {editing ? (
              <input className="input-field" placeholder="+91..."
                value={form.emergencyContact.phone}
                onChange={e => setForm(f => ({ ...f, emergencyContact: { ...f.emergencyContact, phone: e.target.value } }))} />
            ) : (
              <p style={{ color: 'var(--text)' }}>{form.emergencyContact.phone || '—'}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
