import { createBrowserRouter, RouterProvider } from 'react-router'
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

function Placeholder({ title, icon }: { title: string; icon?: Parameters<typeof EmptyState>[0]['icon'] }) {
  return (
    <div className="p-6">
      <EmptyState icon={icon ?? 'info'} title={title} description="Coming in a future phase." />
    </div>
  )
}

const router = createBrowserRouter([
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
      { path: 'timeline', element: <TimelinePage /> },
      { path: 'settings', element: <Placeholder title="Settings" icon="settings" /> },
      { path: 'inbox', element: <Placeholder title="AI Inbox" icon="inbox" /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
