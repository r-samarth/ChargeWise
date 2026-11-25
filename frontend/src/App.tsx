import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { RegisterPage } from "./pages/RegisterPage";
import { SavedJourneysPage } from "./pages/SavedJourneysPage";
import { StationDetailsPage } from "./pages/StationDetailsPage";
import { StationsExplorerPage } from "./pages/StationsExplorerPage";
import { TripHistoryPage } from "./pages/TripHistoryPage";
import { TripPlannerPage } from "./pages/TripPlannerPage";
import { TripResultsPage } from "./pages/TripResultsPage";
import { VehicleFormPage } from "./pages/VehicleFormPage";
import { VehiclesPage } from "./pages/VehiclesPage";
import { VerifyEmailPage } from "./pages/VerifyEmailPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

export function AppRoutes() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route
          path="/verify-email"
          element={
            <ProtectedRoute>
              <VerifyEmailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vehicles"
          element={
            <ProtectedRoute>
              <VehiclesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vehicles/new"
          element={
            <ProtectedRoute>
              <VehicleFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vehicles/:id/edit"
          element={
            <ProtectedRoute>
              <VehicleFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/plan"
          element={
            <ProtectedRoute>
              <TripPlannerPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trips/:id"
          element={
            <ProtectedRoute>
              <TripResultsPage />
            </ProtectedRoute>
          }
        />
        <Route path="/stations" element={<StationsExplorerPage />} />
        <Route path="/stations/:id" element={<StationDetailsPage />} />
        <Route
          path="/saved-journeys"
          element={
            <ProtectedRoute>
              <SavedJourneysPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trip-history"
          element={
            <ProtectedRoute>
              <TripHistoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute requireAdmin>
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
