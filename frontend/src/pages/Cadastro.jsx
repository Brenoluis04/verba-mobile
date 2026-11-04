import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getErrorMessage } from "../services/api";
import "./Auth.css";

export default function Cadastro() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ nome_completo: "", email: "", senha: "" });
  const [error, setError] = useState("");

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await signUp(form);
      navigate("/trilhas");
    } catch (err) {
      setError(getErrorMessage(err, "Não foi possível cadastrar."));
    }
  };

  return (
    <div className="auth-container">
      <h1>Verba</h1>

      <form className="auth-form" onSubmit={handleSubmit}>
        <input
          name="nome_completo"
          type="text"
          placeholder="Nome completo"
          value={form.nome_completo}
          onChange={handleChange}
          required
        />
        <input
          name="email"
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          required
        />
        <input
          name="senha"
          type="password"
          placeholder="Senha"
          value={form.senha}
          onChange={handleChange}
          required
        />

        {error && <p className="error-message">{error}</p>}

        <button type="submit">Cadastrar</button>
      </form>

      <p className="auth-link">
        Já tem uma conta? <Link to="/login">Faça login.</Link>
      </p>
    </div>
  );
}