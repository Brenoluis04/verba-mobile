
import { useState } from "react";
import { Link } from "react-router-dom";
import "./AuthForm.css";

export default function AuthForm({
  titulo,
  campos,
  form,
  handleChange,
  handleSubmit,
  error,
  textoBotao,
  textoLink,
  link,
}) {
  const [mostrarSenha, setMostrarSenha] = useState(false);

  return (
    <main className="auth-container">
      <h1>Verba</h1>

      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>{titulo}</h2>

        {campos.map((campo) => (
          <div className="auth-campo" key={campo.name}>
            <input
              name={campo.name}
              type={
                campo.name === "senha" && mostrarSenha
                  ? "text"
                  : campo.type
              }
              placeholder={campo.placeholder}
              value={form[campo.name]}
              onChange={handleChange}
              required
            />

            {campo.name === "senha" && (
              <button
                type="button"
                className="auth-ver-senha"
                onClick={() => setMostrarSenha(!mostrarSenha)}
              >
                {mostrarSenha ? "Ocultar" : "Mostrar"}
              </button>
            )}
          </div>
        ))}

        {error && <p className="auth-error">{error}</p>}

        <button type="submit">{textoBotao}</button>
      </form>

      <p className="auth-link">
        {textoLink} <Link to={link.path}>{link.texto}</Link>
      </p>
    </main>
  );
}
