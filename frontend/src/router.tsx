import { createBrowserRouter, Navigate } from 'react-router-dom'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'

import LandingPage from '@/pages/public/LandingPage'
import AboutPage from '@/pages/public/AboutPage'
import ContactPage from '@/pages/public/ContactPage'
import LoginPage from '@/pages/auth/LoginPage'
import DashboardPage from '@/pages/app/DashboardPage'
import DebtsPage from '@/pages/app/DebtsPage'
import ExpensesPage from '@/pages/app/ExpensesPage'
import IncomesPage from '@/pages/app/IncomesPage'
import AIAnalysisPage from '@/pages/app/AIAnalysisPage'

export const router = createBrowserRouter([
  // Public routes (no auth required)
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/about', element: <AboutPage /> },
      { path: '/contact', element: <ContactPage /> },
    ],
  },

  // Auth routes
  { path: '/login', element: <LoginPage /> },

  // Protected app routes
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: '/app', element: <Navigate to="/app/dashboard" replace /> },
      { path: '/app/dashboard', element: <DashboardPage /> },
      { path: '/app/debts', element: <DebtsPage /> },
      { path: '/app/expenses', element: <ExpensesPage /> },
      { path: '/app/incomes', element: <IncomesPage /> },
      { path: '/app/ai', element: <AIAnalysisPage /> },
    ],
  },

  // Fallback
  { path: '*', element: <Navigate to="/" replace /> },
])
