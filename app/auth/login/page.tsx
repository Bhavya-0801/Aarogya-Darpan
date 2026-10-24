'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Heart, Shield, Users, Activity, Eye, EyeOff, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const result = await signIn('credentials', { email, password, redirect: false })
    if (result?.error) {
      setLoading(false)
      toast.error('Invalid email or password')
    } else {
      toast.success('Welcome back!')
      window.location.href = '/dashboard'
    }
  }

  return (
    <div className="auth-layout">
      {/* Left panel */}
      <div className="auth-left relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-400/20 rounded-full translate-y-1/2 -translate-x-1/2" />
        </div>
        <div className="relative">
          <div className="mb-16">
            <img
              src="/logo.png"
              alt="Aarogya Darpan"
              style={{ height: '52px', width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 2px 12px rgba(255,255,255,0.6)) brightness(1.15)' }}
            />
          </div>
          <div>
            <h2 className="font-serif text-4xl font-bold mb-4 leading-tight">
              Welcome<br /><em>Back</em>
            </h2>
            <p className="text-white/70 text-lg leading-relaxed">
              Sign in to access your dashboard, patient records, and clinical tools.
            </p>
          </div>
        </div>
        <div className="relative space-y-4">
          {[
            { icon: Shield, label: '256-bit AES encrypted data' },
            { icon: Users, label: 'Role-based access control' },
            { icon: Activity, label: 'Real-time hospital analytics' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3 text-white/80">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium">{label}</span>
            </div>
          ))}
          <div className="pt-4 border-t border-white/20">
            <p className="text-white/50 text-sm">
              No account yet?{' '}
              <Link href="/auth/register" className="text-brand-300 font-semibold hover:text-brand-200">
                Register now
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="auth-right">
        <div className="max-w-md w-full mx-auto">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-800 transition-colors flex items-center gap-1 mb-8">
            ← Back to home
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Sign In</h1>
          <p className="text-gray-500 mb-8">Enter your credentials to continue</p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="label" htmlFor="email">EMAIL ADDRESS</label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  className="input-field pl-10"
                  placeholder="you@hospital.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">✉</span>
              </div>
            </div>

            <div>
              <label className="label" htmlFor="password">PASSWORD</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  className="input-field pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              id="login-submit-btn"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 text-base"
            >
              {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Signing in...</> : 'Sign In →'}
            </button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-blue-800 text-sm">
              <span className="font-bold">New to Aarogya Darpan?</span> The platform starts empty.
              Register as a <strong>Hospital Admin</strong> to set up your hospital, or as a <strong>Patient</strong> to manage your health records.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
