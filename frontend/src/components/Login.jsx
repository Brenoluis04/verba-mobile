import React from "react";
import "./Auth.css";

function Login({ mudarTela }) {
  return (
    <div className="auth-container">

      <h1>Verba</h1>

      <form className="auth-form">

        <input
          type="email"
          placeholder="Email"
          required
        />

        <input
          type="password"
          placeholder="Senha"
          required
        />

        <button type="submit">
          Entrar
        </button>

      </form>

      <p className="auth-link">
        Não tem uma conta?
        <span onClick={mudarTela}>
          Cadastre-se.
        </span>
      </p>

    </div>
  );
}

export default Login;