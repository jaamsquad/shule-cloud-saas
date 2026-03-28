import React, { Suspense } from 'react'

// Module-local route config for later integration
// Each route object contains a path and a lazily loaded component
export const elearningRoutes = [
  { path: '/lms', name: 'E-learning Dashboard', element: React.lazy(() => import('./pages/Dashboard')) },
  { path: '/lms/courses', name: 'Courses', element: React.lazy(() => import('./pages/Courses')) },
  { path: '/lms/lessons', name: 'Lessons', element: React.lazy(() => import('./pages/Lessons')) },
  { path: '/lms/assignments', name: 'Assignments', element: React.lazy(() => import('./pages/Assignments')) },
  { path: '/lms/submissions', name: 'Submissions', element: React.lazy(() => import('./pages/Submissions')) },
  { path: '/lms/quizzes', name: 'Quizzes', element: React.lazy(() => import('./pages/Quizzes')) },
  { path: '/lms/discussions', name: 'Discussions', element: React.lazy(() => import('./pages/Discussions')) },
  { path: '/lms/progress', name: 'Progress', element: React.lazy(() => import('./pages/Progress')) },
  { path: '/lms/live-sessions', name: 'Live Sessions', element: React.lazy(() => import('./pages/LiveSessions')) },
  { path: '/lms/settings', name: 'E-learning Settings', element: React.lazy(() => import('./pages/Settings')) },
]

export default elearningRoutes
