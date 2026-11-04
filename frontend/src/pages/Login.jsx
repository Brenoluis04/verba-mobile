// TEMPORÁRIO: marcador para o roteamento funcionar. O visual final dos formulários é de outra parte do front.
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getErrorMessage } from "../services/api";

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
    <form onSubmit={handleSubmit}>
      <h1>Login</h1>
      <input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} required />
      <input name="senha" type="password" placeholder="Senha" value={form.senha} onChange={handleChange} required />
      {error && <p>{error}</p>}
      <button type="submit">Entrar</button>
      <p>Não tem uma conta? <Link to="/cadastro">Cadastre-se</Link></p>
    </form>
  );
}
