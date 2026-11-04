// TEMPORÁRIO: marcador para o roteamento funcionar. O visual final dos formulários é de outra parte do front.
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getErrorMessage } from "../services/api";

export default function Register() {
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
    <form onSubmit={handleSubmit}>
      <h1>Cadastro</h1>
      <input name="nome_completo" placeholder="Nome completo" value={form.nome_completo} onChange={handleChange} required />
      <input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} required />
      <input name="senha" type="password" placeholder="Senha" value={form.senha} onChange={handleChange} required />
      {error && <p>{error}</p>}
      <button type="submit">Cadastrar</button>
      <p>Já tem uma conta? <Link to="/login">Fazer login</Link></p>
    </form>
  );
}
