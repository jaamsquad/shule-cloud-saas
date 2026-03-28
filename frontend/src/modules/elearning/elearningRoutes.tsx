import React from 'react'

// Module-local route config for later integration
// Each route object contains a path and a lazily loaded component
export const elearningRoutes = [
  { path: '/elearning', name: 'E-learning Dashboard', element: React.lazy(() => import('./pages/Dashboard')) },
  { path: '/elearning/courses', name: 'Courses', element: React.lazy(() => import('./pages/Courses')) },
  { path: '/elearning/lessons', name: 'Lessons', element: React.lazy(() => import('./pages/Lessons')) },
  { path: '/elearning/assignments', name: 'Assignments', element: React.lazy(() => import('./pages/Assignments')) },
  { path: '/elearning/submissions', name: 'Submissions', element: React.lazy(() => import('./pages/Submissions')) },
  { path: '/elearning/quizzes', name: 'Quizzes', element: React.lazy(() => import('./pages/Quizzes')) },
  { path: '/elearning/discussions', name: 'Discussions', element: React.lazy(() => import('./pages/Discussions')) },
  { path: '/elearning/progress', name: 'Progress', element: React.lazy(() => import('./pages/Progress')) },
  { path: '/elearning/live-sessions', name: 'Live Sessions', element: React.lazy(() => import('./pages/LiveSessions')) },
  { path: '/elearning/settings', name: 'E-learning Settings', element: React.lazy(() => import('./pages/Settings')) },
]

export default elearningRoutes
