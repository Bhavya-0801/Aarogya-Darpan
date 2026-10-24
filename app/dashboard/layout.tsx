import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import DashboardShell from '@/components/layout/DashboardShell'
import AuthProvider from '@/components/providers/AuthProvider'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/login')

  return (
    <DashboardShell>
      {children}
    </DashboardShell>
  )
}
