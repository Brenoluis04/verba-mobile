
import { Routes, Route, Navigate } from "react-router-dom";

import Login from "../pages/Login";
import Register from "../pages/Cadastro";
import Leitor from "../pages/Leitor";
import Biblioteca from "../pages/Biblioteca";
import NotFound from "../pages/NotFound";

import LayoutPrivado from "../components/LayoutPrivado";
import { PrivateRoute, PublicRoute } from "./guards";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      <Route
        path="/cadastro"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />

      <Route
        element={
          <PrivateRoute>
            <LayoutPrivado />
          </PrivateRoute>
        }
      >
        <Route path="/leitor" element={<Leitor />} />
        <Route path="/biblioteca" element={<Biblioteca />} />
        {/* A página Trilhas foi removida. Login, Cadastro e guards ainda mandam para /trilhas, então ela só redireciona. */}
        <Route path="/trilhas" element={<Navigate to="/leitor" replace />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
