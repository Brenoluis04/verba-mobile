import { useNavigate } from "react-router-dom";
import AuthForm from "../components/AuthForm";
import { useAuth } from "../contexts/AuthContext";

const CAMPOS = [
  { name: "email", type: "email", placeholder: "Email" },
  { name: "senha", type: "password", placeholder: "Senha" },
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
        navigate("/trilhas");
      }}
      rodape={{ texto: "Não tem uma conta?", link: "Cadastre-se.", to: "/cadastro" }}
    />
  );
}
