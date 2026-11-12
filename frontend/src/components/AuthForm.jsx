import { useState } from "react";
import { Link } from "react-router-dom";
import { getErrorMessage } from "../services/api";
import "./AuthForm.css";

// Formulário compartilhado pelas telas de Login e Cadastro.
//  campos:      [{ name, type, placeholder }]
//  submitLabel: texto do botão
//  erroPadrao:  mensagem usada quando a API não devolve uma mais específica
//  onSubmit:    async (valores) => ...  (se lançar erro, ele aparece abaixo dos campos)
//  rodape:      { texto, link, to }  ex.: "Já tem uma conta?" + "Faça login." -> /login
export default function AuthForm({ campos, submitLabel, erroPadrao, onSubmit, rodape }) {
  const [form, setForm] = useState(() =>
    Object.fromEntries(campos.map((campo) => [campo.name, ""]))
  );
  const [error, setError] = useState("");

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await onSubmit(form);
    } catch (err) {
      setError(getErrorMessage(err, erroPadrao));
    }
  };

  return (
    <div className="auth-container">
      <h1>Verba</h1>

      <form className="auth-form" onSubmit={handleSubmit}>
        {campos.map((campo) => (
          <input
            key={campo.name}
            name={campo.name}
            type={campo.type}
            placeholder={campo.placeholder}
            value={form[campo.name]}
            onChange={handleChange}
            required
          />
        ))}

        {error && <p className="error-message">{error}</p>}

        <button type="submit" className="btn-primary">
          {submitLabel}
        </button>
      </form>

      <p className="auth-link">
        {rodape.texto} <Link to={rodape.to}>{rodape.link}</Link>
      </p>
    </div>
  );
}
