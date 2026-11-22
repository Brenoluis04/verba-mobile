
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getErrorMessage } from "../services/api";
import AuthForm from "../components/AuthForm";

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
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
      await signIn(form);
      navigate("/biblioteca");
    } catch (err) {
      setError(
        getErrorMessage(err, "Não foi possível entrar.")
      );
    }
  };

  return (
    <AuthForm
      titulo="Login"
      campos={[
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
      textoBotao="Entrar"
      textoLink="Não tem uma conta?"
      link={{
        path: "/cadastro",
        texto: "Cadastre-se",
      }}
    />
  );
}
