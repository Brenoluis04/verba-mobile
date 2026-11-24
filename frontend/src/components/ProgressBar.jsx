import "./ProgressBar.css";

// Barra de progresso com o percentual ao lado ("60%"). Usada nos cards da Biblioteca.
export default function ProgressBar({ value = 0 }) {
  const percentual = Math.min(100, Math.max(0, Math.round(Number(value) || 0)));

  const classes = ["progresso-preenchido"];
  if (percentual === 0) classes.push("vazio");
  if (percentual === 100) classes.push("completo");

  return (
    <div className="progresso">
      <div
        className="progresso-fundo"
        role="progressbar"
        aria-label="Progresso de leitura"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentual}
        aria-valuetext={`${percentual}% concluído`}
      >
        <div className={classes.join(" ")} style={{ width: `${percentual}%` }} />
      </div>

      <small className="progresso-valor">{percentual}%</small>
    </div>
  );
}
