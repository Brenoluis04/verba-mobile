import { useState } from "react";
import { Link } from "react-router-dom";
import { getErrorMessage } from "../services/api";
import "./AuthForm.css";

// Ícones em SVG (herdam a cor do texto).
function Icone({ children }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const IconeOlho = () => (
  <Icone>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </Icone>
);

const IconeOlhoRiscado = () => (
  <Icone>
    <path d="M9.9 5.2A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.2" />
    <path d="M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 4.2-.9" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    <path d="m3 3 18 18" />
  </Icone>
);

// Formulário compartilhado pelas telas de Login e Cadastro.
//  campos:      [{ name, type, placeholder, autoComplete? }]
//               campos com type "password" ganham o botão de mostrar/ocultar a senha
//  submitLabel: texto do botão
//  erroPadrao:  mensagem usada quando a API não devolve uma mais específica
//  onSubmit:    async (valores) => ...  (se lançar erro, ele aparece abaixo dos campos)
//  rodape:      { texto, link, to }  ex.: "Já tem uma conta?" + "Faça login." -> /login
export default function AuthForm({ campos, submitLabel, erroPadrao, onSubmit, rodape }) {
  const [form, setForm] = useState(() =>
    Object.fromEntries(campos.map((campo) => [campo.name, ""]))
  );
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  // Quais campos de senha estão com o texto visível.
  const [visiveis, setVisiveis] = useState({});

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const alternarSenha = (name) => setVisiveis((v) => ({ ...v, [name]: !v[name] }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (enviando) return;
    setError("");
    setEnviando(true);
    try {
      await onSubmit(form);
    } catch (err) {
      setError(getErrorMessage(err, erroPadrao));
      setEnviando(false);
    }
  };

  return (
    <div className="auth-container">
      <header className="auth-cabecalho">
        <h1>Verba</h1>
        <p>Leia e traduza seus PDFs</p>
      </header>

      <form className="auth-form" onSubmit={handleSubmit}>
        {campos.map((campo) => {
          const ehSenha = campo.type === "password";
          const mostrando = Boolean(visiveis[campo.name]);

          const input = (
            <input
              key={ehSenha ? undefined : campo.name}
              name={campo.name}
              type={ehSenha && mostrando ? "text" : campo.type}
              placeholder={campo.placeholder}
              aria-label={campo.placeholder}
              autoComplete={campo.autoComplete}
              value={form[campo.name]}
              onChange={handleChange}
              required
            />
          );

          if (!ehSenha) return input;

          return (
            <div className="campo-senha" key={campo.name}>
              {input}
              <button
                type="button"
                className="btn-olho"
                onClick={() => alternarSenha(campo.name)}
                aria-label={mostrando ? "Ocultar senha" : "Mostrar senha"}
                aria-pressed={mostrando}
              >
                {mostrando ? <IconeOlhoRiscado /> : <IconeOlho />}
              </button>
            </div>
          );
        })}

        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn-primary" disabled={enviando}>
          {enviando ? "Aguarde..." : submitLabel}
        </button>
      </form>

      <p className="auth-link">
        {rodape.texto} <Link to={rodape.to}>{rodape.link}</Link>
      </p>
    </div>
  );
}
