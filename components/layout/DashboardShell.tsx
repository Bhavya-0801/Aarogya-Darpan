'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  Heart, LayoutDashboard, Users, Calendar, FileText, BedDouble,
  FlaskConical, CreditCard, UserCog, BarChart3,
  LogOut, ChevronRight, Settings, Shield, Activity,
  Pill, Beaker, Receipt, AlertCircle, Menu, X,
  ClipboardList, ShoppingBag, Bell, Sun, Moon, Lock,
  UserSearch, Package, PackageX, Globe
} from 'lucide-react'
import axios from 'axios'
import AIChatbot from '@/components/AIChatbot'
import { useLanguage } from '@/components/providers/LanguageProvider'

interface NavItem { href: string; icon: any; label: string; tKey?: string }
interface NavSection { sectionLabel?: string; items: NavItem[] }
type Role = 'patient' | 'hospital_admin' | 'doctor' | 'receptionist' | 'lab_technician' | 'pharmacy'

const NAV_CONFIG: Record<Role, NavSection[]> = {
  patient: [
    {
      sectionLabel: 'PATIENT',
      items: [
        { href: '/dashboard', icon: Heart, label: 'My Health', tKey: 'nav.myHealth' },
        { href: '/dashboard/prescriptions', icon: Pill, label: 'Prescriptions', tKey: 'nav.prescriptions' },
        { href: '/dashboard/labs', icon: FlaskConical, label: 'Lab Reports', tKey: 'nav.labs' },
        { href: '/dashboard/billing', icon: Receipt, label: 'Bills', tKey: 'nav.bills' },
        { href: '/dashboard/appointments', icon: Calendar, label: 'Appointments', tKey: 'nav.appointments' },
        { href: '/dashboard/family', icon: Users, label: 'Family', tKey: 'nav.family' },
      ],
    },
  ],
  hospital_admin: [
    {
      sectionLabel: 'HOSPITAL',
      items: [
        { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', tKey: 'nav.dashboard' },
        { href: '/dashboard/patients', icon: Users, label: 'Patients', tKey: 'nav.patients' },
        { href: '/dashboard/beds', icon: BedDouble, label: 'Beds', tKey: 'nav.beds' },
        { href: '/dashboard/staff', icon: UserCog, label: 'Doctors & Staff', tKey: 'nav.staff' },
        { href: '/dashboard/appointments', icon: Calendar, label: 'Appointments', tKey: 'nav.appointments' },
      ],
    },
    {
      sectionLabel: 'CLINICAL',
      items: [
        { href: '/dashboard/prescriptions', icon: FileText, label: 'Prescriptions', tKey: 'nav.prescriptions' },
        { href: '/dashboard/labs', icon: FlaskConical, label: 'Laboratory', tKey: 'nav.laboratory' },
        { href: '/dashboard/billing', icon: CreditCard, label: 'Billing', tKey: 'nav.billing' },
        { href: '/dashboard/insurance', icon: Shield, label: 'Insurance', tKey: 'nav.insurance' },
      ],
    },
    {
      sectionLabel: 'ADMIN',
      items: [
        { href: '/dashboard/analytics', icon: BarChart3, label: 'Reports', tKey: 'nav.reports' },
        { href: '/dashboard/settings', icon: Settings, label: 'Settings', tKey: 'nav.settings' },
      ],
    },
  ],
  doctor: [
    {
      sectionLabel: 'CLINICAL',
      items: [
        { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', tKey: 'nav.dashboard' },
        { href: '/dashboard/patients', icon: Users, label: 'My Patients', tKey: 'nav.myPatients' },
        { href: '/dashboard/prescriptions', icon: FileText, label: 'Prescriptions', tKey: 'nav.prescriptions' },
        { href: '/dashboard/appointments', icon: Calendar, label: 'Appointments', tKey: 'nav.appointments' },
        { href: '/dashboard/patients?tab=access', icon: UserSearch, label: 'Patient Access', tKey: 'nav.patientAccess' },
      ],
    },
  ],
  receptionist: [
    {
      sectionLabel: 'RECEPTION',
      items: [
        { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', tKey: 'nav.dashboard' },
        { href: '/dashboard/emergency', icon: AlertCircle, label: 'Registration', tKey: 'nav.registration' },
        { href: '/dashboard/appointments', icon: Calendar, label: 'Appointments', tKey: 'nav.appointments' },
        { href: '/dashboard/billing', icon: CreditCard, label: 'Billing', tKey: 'nav.billing' },
        { href: '/dashboard/patients', icon: Users, label: 'Patients', tKey: 'nav.patients' },
      ],
    },
  ],
  lab_technician: [
    {
      sectionLabel: 'LABORATORY',
      items: [
        { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', tKey: 'nav.dashboard' },
        { href: '/dashboard/labs', icon: Beaker, label: 'Test Reports', tKey: 'nav.labs' },
      ],
    },
  ],
  pharmacy: [
    {
      sectionLabel: 'PHARMACY',
      items: [
        { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', tKey: 'nav.dashboard' },
        { href: '/dashboard/pharmacy/check-token', icon: ShoppingBag, label: 'Check Token', tKey: 'nav.checkToken' },
        { href: '/dashboard/pharmacy/inventory', icon: Package, label: 'Medicine Inventory', tKey: 'nav.inventory' },
        { href: '/dashboard/prescriptions', icon: ClipboardList, label: 'All Prescriptions', tKey: 'nav.prescriptions' },
      ],
    },
  ],
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const role = ((session?.user as any)?.role || 'patient') as Role
  const { language, setLanguage, t } = useLanguage()

  const [darkMode, setDarkMode] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [hospitalName, setHospitalName] = useState('')

  useEffect(() => {
    const isDark = localStorage.getItem('darkMode') === 'true'
    setDarkMode(isDark)
    if (isDark) document.documentElement.classList.add('dark')
  }, [])

  useEffect(() => {
    axios.get('/api/notifications').then(({ data }) => {
      setUnreadCount(data.unreadCount || 0)
    }).catch(() => {})
  }, [])

  // Fetch hospital name for staff roles
  useEffect(() => {
    if (['hospital_admin', 'doctor', 'receptionist', 'lab_technician', 'pharmacy'].includes(role)) {
      axios.get('/api/analytics').then(({ data }) => {
        if (data.hospital?.name) setHospitalName(data.hospital.name)
      }).catch(() => {})
    }
  }, [role])

  function toggleDark() {
    const next = !darkMode
    setDarkMode(next)
    localStorage.setItem('darkMode', String(next))
    document.documentElement.classList.toggle('dark', next)
  }

  function isActive(href: string) {
    const cleanHref = href.split('?')[0]
    if (cleanHref === '/dashboard') return pathname === cleanHref
    return pathname.startsWith(cleanHref)
  }

  const navSections = NAV_CONFIG[role] || NAV_CONFIG.patient
  const roleLabel = t(`role.${role}`) || role.toUpperCase()

  const subLabel =
    role === 'patient' ? (session?.user?.name || '') :
    hospitalName || '—'

  const SidebarContent = () => (
    <>
      {/* Brand Header */}
      <div className="sidebar-header">
        <Link href="/dashboard" className="w-full flex items-center justify-center bg-white/95 hover:bg-white rounded-xl py-2 px-3 shadow transition-all">
          <img
            src="/logo.png"
            alt="Aarogya Darpan"
            className="h-9 w-auto max-w-[190px] object-contain"
          />
        </Link>
      </div>

      {/* Role label */}
      <div className="px-5 py-3 border-b border-white/10">
        <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.45)' }}>{roleLabel}</p>
        <p className="text-white text-sm font-semibold truncate" style={{ maxWidth: '168px' }}>{subLabel}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        {navSections.map((section, si) => (
          <div key={si} className="sidebar-section">
            {section.sectionLabel && (
              <p className="sidebar-section-label">{section.sectionLabel}</p>
            )}
            {section.items.map(({ href, icon: Icon, label, tKey }) => {
              const displayLabel = tKey ? t(tKey) : label
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={`sidebar-nav-item ${isActive(href) ? 'active' : ''}`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{displayLabel}</span>
                  {isActive(href) && <ChevronRight className="w-3 h-3 ml-auto opacity-70" />}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
            style={{ background: 'var(--brand)' }}>
            {(session?.user?.name || 'U')[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white font-semibold text-sm truncate">{session?.user?.name}</p>
            <p className="text-xs truncate" style={{ color: 'var(--sidebar-muted)' }}>{session?.user?.email}</p>
          </div>
        </div>
        <button
          id="logout-btn"
          onClick={() => signOut({ callbackUrl: '/auth/login' })}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
          style={{ color: 'rgba(255,255,255,0.5)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.15)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <LogOut className="w-4 h-4" /> {t('nav.logout')}
        </button>
      </div>
    </>
  )

  const activeItem = navSections.flatMap(s => s.items).find(i => isActive(i.href))
  const pageTitle = activeItem?.tKey ? t(activeItem.tKey) : (activeItem?.label || 'Overview')

  return (
    <div className={`dashboard-layout ${darkMode ? 'dark' : ''}`}>
      {/* Desktop Sidebar */}
      <aside className="sidebar hidden lg:flex flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="sidebar absolute left-0 top-0 bottom-0 flex flex-col w-64 z-10">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="main-content">
        {/* Topbar */}
        <header className="topbar">
          <div className="flex items-center gap-3">
            <button className="lg:hidden btn-ghost p-2" onClick={() => setMobileOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            <span className="topbar-title">
              {pageTitle}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Bilingual Quick Toggle */}
            <button
              id="lang-toggle-btn"
              onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold btn-ghost transition-all"
              style={{
                background: 'rgba(13, 148, 136, 0.1)',
                border: '1px solid rgba(13, 148, 136, 0.25)',
                color: 'var(--brand)',
              }}
              title="Switch Language / भाषा बदलें"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{language === 'en' ? '🇮🇳 हिंदी' : '🇬🇧 English'}</span>
            </button>

            {/* ENC badge */}
            <div className="enc-badge hidden sm:flex">
              <Lock className="w-3 h-3" />
              ENC
            </div>

            {/* Dark mode */}
            <button
              id="dark-mode-toggle"
              onClick={toggleDark}
              className="btn-ghost p-2 rounded-xl"
              title={darkMode ? 'Light mode' : 'Dark mode'}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Notifications */}
            <Link href="/dashboard/notifications" className="relative btn-ghost p-2 rounded-xl" title={t('nav.notifications')}>
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 text-xs bg-red-500 text-white rounded-full flex items-center justify-center font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>

            {/* Profile */}
            <Link href="/dashboard/profile" id="profile-btn"
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md hover:scale-105 transition-transform"
              style={{ background: 'var(--brand)' }}
              title={t('nav.profile')}>
              {(session?.user?.name || 'U')[0].toUpperCase()}
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="page-scroll animate-fade-in">
          {children}
        </main>
      </div>
      <AIChatbot />
    </div>
  )
}
