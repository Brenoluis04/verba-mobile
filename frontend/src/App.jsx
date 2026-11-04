
import { useState } from 'react';
import Login from './components/Login';
import Cadastro from './components/Cadastro';
import './App.css';

function App() {
  const [tela, setTela] = useState('login');

  return (
    <>
      {tela === 'login' ? (
        <Login mudarTela={() => setTela('cadastro')} />
      ) : (
        <Cadastro mudarTela={() => setTela('login')} />
      )}
    </>
  );
}

export default App;
