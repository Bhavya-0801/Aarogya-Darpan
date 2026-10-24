'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import axios from 'axios'
import {
  Loader2, Heart, FileText, FlaskConical, Receipt, IndianRupee,
  Lock, Calendar, Users, LayoutDashboard
} from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import { useLanguage } from '@/components/providers/LanguageProvider'

interface PatientCounts { prescriptions: number; labs: number; bills: number; outstanding: number }

export default function DashboardPage() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role
  const { language, t } = useLanguage()
  const [loading, setLoading] = useState(true)

  // Patient state
  const [profile, setProfile] = useState<any>(null)
  const [counts, setCounts] = useState<PatientCounts>({ prescriptions: 0, labs: 0, bills: 0, outstanding: 0 })

  // Admin/Doctor/etc state
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    if (!role) return

    if (role === 'patient') {
      loadPatientData()
    } else if (['hospital_admin', 'doctor', 'receptionist', 'lab_technician'].includes(role)) {
      loadStaffData()
    } else {
      setLoading(false)
    }
  }, [role])

  async function loadPatientData() {
    try {
      const [profileRes, prescRes, labRes, billRes] = await Promise.all([
        axios.get('/api/profile'),
        axios.get('/api/prescriptions'),
        axios.get('/api/labs'),
        axios.get('/api/bills'),
      ])
      const bills = billRes.data.bills || []
      const outstanding = bills
        .filter((b: any) => b.status === 'pending')
        .reduce((s: number, b: any) => s + (b.totalAmount - (b.paidAmount || 0)), 0)

      setProfile(profileRes.data.profile)
      setCounts({
        prescriptions: prescRes.data.prescriptions?.length || 0,
        labs: labRes.data.reports?.length || 0,
        bills: bills.length,
        outstanding,
      })
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function loadStaffData() {
    try {
      const { data } = await axios.get('/api/analytics')
      setStats(data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand)' }} />
      </div>
    )
  }

  /* === PATIENT DASHBOARD === */
  if (role === 'patient') {
    const rawName = session?.user?.name?.split(' ')[0] || ''
    const displayName = rawName ? (language === 'hi' ? `${rawName} जी` : rawName) : (language === 'hi' ? 'मरीज़' : 'Patient')
    const uhid = profile?.uhid || '—'
    const hasRecords = counts.prescriptions > 0 || counts.labs > 0 || counts.bills > 0

    return (
      <div className="animate-fade-in max-w-4xl">
        {/* Hero banner */}
        <div className="hero-banner mb-6">
          <div className="relative z-10">
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {t('dash.patientDashboard')}
            </p>
            <h1 className="text-3xl font-bold text-white mb-4">
              {t('dash.welcome')}, {displayName} 👋
            </h1>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.8)' }}>
                {t('dash.patientId')}
              </span>
              <span className="text-xs font-bold px-3 py-1 rounded-full font-mono border text-white"
                style={{ background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.25)' }}>
                {uhid}
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border text-white"
                style={{ background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)' }}>
                <Lock className="w-3 h-3" /> ENC
              </span>
            </div>
          </div>
          <div className="flex gap-8 mt-6 pt-4 border-t flex-wrap" style={{ borderColor: 'rgba(255,255,255,0.2)' }}>
            {[
              { label: t('dash.prescriptions'), value: counts.prescriptions },
              { label: t('dash.labReports'), value: counts.labs },
              { label: t('dash.bills'), value: counts.bills },
              { label: t('dash.outstanding'), value: `₹${counts.outstanding.toLocaleString('en-IN')}` },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Records or empty state */}
        {!hasRecords ? (
          <div className="card-new">
            <div className="empty-state py-20 px-4 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 mx-auto"
                style={{ background: 'rgba(13,148,136,0.1)' }}>
                <Heart className="w-8 h-8" style={{ color: 'var(--brand)' }} />
              </div>
              <p className="font-semibold text-lg mb-2" style={{ color: 'var(--text)' }}>
                {t('dash.noRecordsTitle')}
              </p>
              <p className="text-sm max-w-md mx-auto" style={{ color: 'var(--text-muted)' }}>
                {t('dash.noRecordsDesc')}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: FileText, label: t('dash.prescriptions'), count: counts.prescriptions, href: '/dashboard/prescriptions', color: '#3b82f6' },
              { icon: FlaskConical, label: t('dash.labReports'), count: counts.labs, href: '/dashboard/labs', color: '#8b5cf6' },
              { icon: Receipt, label: t('dash.bills'), count: counts.bills, href: '/dashboard/billing', color: '#f59e0b' },
              { icon: IndianRupee, label: t('dash.outstanding'), count: `₹${counts.outstanding.toLocaleString('en-IN')}`, href: '/dashboard/billing', color: '#ef4444' },
            ].map(({ icon: Icon, label, count, href, color }) => (
              <Link key={label} href={href} className="stat-card-new hover:-translate-y-0.5 transition-transform cursor-pointer">
                <div className="stat-icon" style={{ background: `${color}15` }}>
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <p className="stat-value">{count}</p>
                <p className="stat-label">{label}</p>
              </Link>
            ))}
          </div>
        )}

        {/* Quick actions */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: t('dash.bookAppointment'), href: '/dashboard/appointments', icon: Calendar },
            { label: t('dash.myPrescriptions'), href: '/dashboard/prescriptions', icon: FileText },
            { label: t('dash.labReports'), href: '/dashboard/labs', icon: FlaskConical },
            { label: t('dash.familyMembers'), href: '/dashboard/family', icon: Users },
          ].map(({ label, href, icon: Icon }) => (
            <Link key={label} href={href}
              className="card-new p-4 flex items-center gap-3 hover:shadow-md transition-all text-sm font-medium">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(13,148,136,0.1)' }}>
                <Icon className="w-4 h-4" style={{ color: 'var(--brand)' }} />
              </div>
              <span style={{ color: 'var(--text)' }}>{label}</span>
            </Link>
          ))}
        </div>
      </div>
    )
  }

  /* === PHARMACY DASHBOARD === */
  if (role === 'pharmacy') {
    return (
      <div className="animate-fade-in max-w-3xl">
        <div className="hero-banner mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
            {t('dash.pharmacyDashboard')}
          </p>
          <h1 className="text-3xl font-bold text-white mb-1">{t('dash.welcome')} 💊</h1>
          <p style={{ color: 'rgba(255,255,255,0.8)' }}>{t('dash.useToken')}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Link href="/dashboard/pharmacy/check-token" className="stat-card-new hover:-translate-y-0.5 transition-transform">
            <div className="stat-icon" style={{ background: 'rgba(13,148,136,0.1)' }}>
              <FileText className="w-5 h-5" style={{ color: 'var(--brand)' }} />
            </div>
            <p className="stat-label">{t('dash.checkToken')}</p>
            <p className="stat-sublabel">{t('dash.checkTokenDesc')}</p>
          </Link>
          <Link href="/dashboard/prescriptions" className="stat-card-new hover:-translate-y-0.5 transition-transform">
            <div className="stat-icon" style={{ background: 'rgba(59,130,246,0.1)' }}>
              <Receipt className="w-5 h-5" style={{ color: '#3b82f6' }} />
            </div>
            <p className="stat-label">{t('dash.allPrescriptions')}</p>
            <p className="stat-sublabel">{t('dash.allPrescriptionsDesc')}</p>
          </Link>
        </div>
      </div>
    )
  }

  /* === STAFF / ADMIN DASHBOARD === */
  const adminStats = stats?.stats
  const hospitalName = stats?.hospital?.name || (language === 'hi' ? 'आपका अस्पताल' : 'Your Hospital')
  const hospitalId = stats?.hospital?.hospitalId || '—'
  const hospitalCity = stats?.hospital?.city || '—'
  const patientCount = adminStats?.totalPatients ?? 0
  const prescCount = adminStats?.totalPrescriptions ?? 0
  const pendingLabs = adminStats?.pendingLabs ?? 0
  const revenue = adminStats?.todayRevenue ?? 0

  const dashboardTitle = role === 'doctor'
    ? t('dash.doctorDashboard')
    : role === 'hospital_admin'
    ? t('dash.adminDashboard')
    : t('dash.staffDashboard')

  return (
    <div className="animate-fade-in">
      {/* Hero banner */}
      <div className="hero-banner mb-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {dashboardTitle}
            </p>
            <h1 className="text-3xl font-bold text-white mb-4">{hospitalName}</h1>
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>
                {t('dash.hospitalId')}
              </span>
              {hospitalId !== '—' && (
                <span className="text-xs font-bold px-3 py-1 rounded-full font-mono border text-white"
                  style={{ background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.25)' }}>
                  {hospitalId}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            {hospitalCity !== '—' && (
              <>
                <p className="text-2xl font-bold text-white">—</p>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>{hospitalCity}</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="stats-grid">
        {[
          { icon: Users, label: t('dash.totalPatients'), value: patientCount, sublabel: t('dash.registered'), color: '#0d9488' },
          { icon: FileText, label: t('dash.prescriptions'), value: prescCount, sublabel: t('dash.created'), color: '#3b82f6' },
          { icon: FlaskConical, label: t('dash.pendingLabs'), value: pendingLabs, sublabel: t('dash.awaitingResults'), color: '#f59e0b' },
          { icon: IndianRupee, label: t('dash.revenue'), value: `₹${revenue.toLocaleString('en-IN')}`, sublabel: t('dash.collected'), color: '#10b981' },
        ].map(({ icon: Icon, label, value, sublabel, color }) => (
          <div key={label} className="stat-card-new">
            <div className="stat-icon" style={{ background: `${color}15` }}>
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            <p className="stat-value">{value}</p>
            <p className="stat-label">{label}</p>
            <p className="stat-sublabel">{sublabel}</p>
          </div>
        ))}
      </div>

      {/* Empty state for fresh hospital */}
      {patientCount === 0 && prescCount === 0 && (
        <div className="card-new mt-6">
          <div className="empty-state py-20 px-4 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 mx-auto"
              style={{ background: 'rgba(13,148,136,0.1)' }}>
              <LayoutDashboard className="w-8 h-8" style={{ color: 'var(--brand)' }} />
            </div>
            <p className="font-semibold text-lg mb-2" style={{ color: 'var(--text)' }}>
              {t('dash.setupHospital')}
            </p>
            <p className="text-sm max-w-md mx-auto" style={{ color: 'var(--text-muted)' }}>
              {t('dash.setupHospitalDesc')}
            </p>
            <div className="flex gap-3 mt-6 justify-center flex-wrap">
              <Link href="/dashboard/staff" className="btn-primary">
                {t('dash.addStaff')}
              </Link>
              <Link href="/dashboard/patients" className="btn-secondary">
                {t('dash.registerPatient')}
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
