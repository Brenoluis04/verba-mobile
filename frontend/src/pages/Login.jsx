import { useNavigate } from "react-router-dom";
import AuthForm from "../components/AuthForm";
import { useAuth } from "../contexts/AuthContext";

const CAMPOS = [
  { name: "email", type: "email", placeholder: "Email", autoComplete: "email" },
  { name: "senha", type: "password", placeholder: "Senha", autoComplete: "current-password" },
];

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();

  return (
    <AuthForm
      campos={CAMPOS}
      submitLabel="Entrar"
      erroPadrao="Não foi possível entrar."
      onSubmit={async (valores) => {
        await signIn(valores);
        navigate("/biblioteca");
      }}
      rodape={{ texto: "Não tem uma conta?", link: "Cadastre-se.", to: "/cadastro" }}
    />
  );
}
