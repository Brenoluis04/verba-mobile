import React from "react";
import "./Auth.css";

function Cadastro({ mudarTela }) {
  return (
    <div className="auth-container">

      <h1>Trilhas.IA</h1>

      <form className="auth-form">

        <input
          type="text"
          placeholder="Nome completo"
          required
        />

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
          Cadastrar
        </button>

      </form>

      <p className="auth-link">
        Já tem uma conta?
        <span onClick={mudarTela}>
          Faça login.
        </span>
      </p>

    </div>
  );
}

export default Cadastro;