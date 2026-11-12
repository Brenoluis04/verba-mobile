import "./ProgressBar.css";

// Barra de progresso + texto "N% concluído". Usada na Biblioteca e nas Trilhas.
export default function ProgressBar({ value = 0 }) {
  const percentual = Math.min(100, Math.max(0, Number(value) || 0));

  return (
    <>
      <div
        className="progresso-fundo"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentual}
      >
        <div className="progresso-preenchido" style={{ width: `${percentual}%` }} />
      </div>

      <small>{percentual}% concluído</small>
    </>
  );
}
