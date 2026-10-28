import { useEffect, useState } from 'react'
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { AppShell } from './components/layout/AppShell'
import { DashboardPage } from './pages/DashboardPage'
import { AcademicsPage } from './pages/AcademicsPage'
import { SemesterPage } from './pages/SemesterPage'
import { CourseDetailPage } from './pages/CourseDetailPage'
import { PortfolioPage } from './pages/PortfolioPage'
import { CvPage } from './pages/CvPage'
import { TasksPage } from './pages/TasksPage'
import { TimelinePage } from './pages/TimelinePage'
import { MaterialsPage } from './pages/MaterialsPage'
import { CertificatesPage } from './pages/CertificatesPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { EmptyState } from './components/ui'
import { LoginPage } from './pages/LoginPage'
import { PersonalLifePage } from './pages/PersonalLifePage'
import { UpdatePasswordPage } from './pages/UpdatePasswordPage'
import { FinancePage } from './pages/FinancePage'

function RequireAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let active = true

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      setChecking(false)
    })

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) console.error('[auth] session check failed', error)
      setSession(data.session)
      setChecking(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  if (checking) {
    return <div className="p-6 text-sm text-muted-foreground">Checking session…</div>
  }

  return session ? <Outlet /> : <Navigate to="/login" replace />
}

function Placeholder({ title, icon }: { title: string; icon?: Parameters<typeof EmptyState>[0]['icon'] }) {
  return (
    <div className="p-6">
      <EmptyState icon={icon ?? 'info'} title={title} description="Coming in a future phase." />
    </div>
  )
}

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/update-password', element: <UpdatePasswordPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        path: '/',
        element: <AppShell />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'academics', element: <AcademicsPage /> },
          { path: 'academics/:year/:sem', element: <SemesterPage /> },
          { path: 'course/:id', element: <CourseDetailPage /> },
          { path: 'portfolio', element: <PortfolioPage /> },
          { path: 'tasks', element: <TasksPage /> },
          { path: 'analytics', element: <AnalyticsPage /> },
          { path: 'materials', element: <MaterialsPage /> },
          { path: 'certificates', element: <CertificatesPage /> },
          { path: 'cv', element: <CvPage /> },
          { path: 'personal', element: <PersonalLifePage /> },
          { path: 'timeline', element: <TimelinePage /> },
          { path: 'settings', element: <Placeholder title="Settings" icon="settings" /> },
          { path: 'inbox', element: <Placeholder title="AI Inbox" icon="inbox" /> },
          { path: 'finance', element: <FinancePage /> },
        ],
      },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
