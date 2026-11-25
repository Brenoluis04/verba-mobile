import { useNavigate } from "react-router-dom";
import AuthForm from "../components/AuthForm";
import { useAuth } from "../contexts/AuthContext";

const CAMPOS = [
  { name: "nome_completo", type: "text", placeholder: "Nome completo", autoComplete: "name" },
  { name: "email", type: "email", placeholder: "Email", autoComplete: "email" },
  { name: "senha", type: "password", placeholder: "Senha", autoComplete: "new-password" },
];

export default function Cadastro() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  return (
    <AuthForm
      campos={CAMPOS}
      submitLabel="Cadastrar"
      erroPadrao="Não foi possível cadastrar."
      onSubmit={async (valores) => {
        await signUp(valores);
        navigate("/biblioteca");
      }}
      rodape={{ texto: "Já tem uma conta?", link: "Faça login.", to: "/login" }}
    />
  );
}
