
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getErrorMessage } from "../services/api";
import AuthForm from "../components/AuthForm";

export default function Register() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    nome_completo: "",
    email: "",
    senha: "",
  });

  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await signUp(form);
      navigate("/biblioteca");
    } catch (err) {
      setError(
        getErrorMessage(err, "Não foi possível cadastrar.")
      );
    }
  };

  return (
    <AuthForm
      titulo="Cadastro"
      campos={[
        {
          name: "nome_completo",
          type: "text",
          placeholder: "Nome completo",
        },
        {
          name: "email",
          type: "email",
          placeholder: "Email",
        },
        {
          name: "senha",
          type: "password",
          placeholder: "Senha",
        },
      ]}
      form={form}
      handleChange={handleChange}
      handleSubmit={handleSubmit}
      error={error}
      textoBotao="Cadastrar"
      textoLink="Já tem uma conta?"
      link={{
        path: "/login",
        texto: "Fazer login",
      }}
    />
  );
}
