'use client'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Heart, LayoutDashboard, Users, Calendar, FileText, BedDouble,
  FlaskConical, CreditCard, UserCog, BarChart3, Brain, MessageCircle,
  LogOut, ChevronRight, Building2, Activity,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['all'] },
  { href: '/dashboard/patients', icon: Users, label: 'Patients', roles: ['hospital_admin', 'doctor', 'receptionist'] },
  { href: '/dashboard/appointments', icon: Calendar, label: 'Appointments', roles: ['hospital_admin', 'doctor', 'receptionist', 'patient'] },
  { href: '/dashboard/records', icon: FileText, label: 'Medical Records', roles: ['hospital_admin', 'doctor', 'patient'] },
  { href: '/dashboard/beds', icon: BedDouble, label: 'Bed Management', roles: ['hospital_admin', 'receptionist'] },
  { href: '/dashboard/labs', icon: FlaskConical, label: 'Lab Reports', roles: ['hospital_admin', 'doctor', 'lab_technician', 'patient'] },
  { href: '/dashboard/billing', icon: CreditCard, label: 'Billing', roles: ['hospital_admin', 'receptionist', 'patient'] },
  { href: '/dashboard/staff', icon: UserCog, label: 'Staff', roles: ['hospital_admin'] },
  { href: '/dashboard/analytics', icon: BarChart3, label: 'Analytics', roles: ['hospital_admin', 'doctor'] },
]

const AI_ITEMS = [
  { href: '/dashboard/ai/symptom-checker', icon: Brain, label: 'Symptom Checker', roles: ['all'] },
  { href: '/dashboard/ai/chatbot', icon: MessageCircle, label: 'Health Chatbot', roles: ['all'] },
]

const ROLE_COLORS: Record<string, string> = {
  hospital_admin: 'bg-purple-100 text-purple-700',
  doctor: 'bg-blue-100 text-blue-700',
  patient: 'bg-green-100 text-green-700',
  receptionist: 'bg-amber-100 text-amber-700',
  lab_technician: 'bg-teal-100 text-teal-700',
}

const ROLE_LABELS: Record<string, string> = {
  hospital_admin: 'Hospital Admin',
  doctor: 'Doctor',
  patient: 'Patient',
  receptionist: 'Receptionist',
  lab_technician: 'Lab Technician',
}

export default function Sidebar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const userRole = (session?.user as any)?.role || ''

  function hasAccess(roles: string[]) {
    return roles.includes('all') || roles.includes(userRole)
  }

  function isActive(href: string) {
    return href === '/dashboard' ? pathname === href : pathname.startsWith(href)
  }

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-gray-100 flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-center">
        <Link href="/dashboard" className="flex items-center justify-center">
          <img
            src="/logo.png"
            alt="Aarogya Darpan"
            className="h-10 w-auto object-contain"
          />
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-3">Main Menu</p>
        {NAV_ITEMS.filter((item) => hasAccess(item.roles)).map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={`sidebar-link ${isActive(href) ? 'active' : ''}`}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            <span>{label}</span>
            {isActive(href) && <ChevronRight className="w-4 h-4 ml-auto" />}
          </Link>
        ))}

        <div className="pt-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-3">AI Tools</p>
          {AI_ITEMS.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className={`sidebar-link ${isActive(href) ? 'active' : ''}`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span>{label}</span>
              <span className="ml-auto text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full font-semibold">AI</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* User card */}
      <div className="p-4 border-t border-gray-100">
        <div className="p-3 bg-gray-50 rounded-xl">
          <div className="flex items-start justify-between gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {(session?.user?.name || 'U')[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gray-900 text-sm truncate">{session?.user?.name}</p>
              <p className="text-gray-400 text-xs truncate">{session?.user?.email}</p>
              <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mt-1 ${ROLE_COLORS[userRole] || 'bg-gray-100 text-gray-600'}`}>
                {ROLE_LABELS[userRole] || userRole}
              </span>
            </div>
          </div>
          <button
            id="logout-btn"
            onClick={() => signOut({ callbackUrl: '/auth/login' })}
            className="mt-3 w-full flex items-center justify-center gap-2 text-sm text-red-500 hover:text-red-600 hover:bg-red-50 py-2 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>
    </aside>
  )
}
