import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getErrorMessage } from "../services/api";
import "./Auth.css";

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", senha: "" });
  const [error, setError] = useState("");

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await signIn(form);
      navigate("/trilhas");
    } catch (err) {
      setError(getErrorMessage(err, "Não foi possível entrar."));
    }
  };

  return (
    <div className="auth-container">
      <h1>Verba</h1>

      <form className="auth-form" onSubmit={handleSubmit}>
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

        <button type="submit">Entrar</button>
      </form>

      <p className="auth-link">
        Não tem uma conta? <Link to="/cadastro">Cadastre-se.</Link>
      </p>
    </div>
  );
}