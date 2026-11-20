import React, { useState } from 'react';
import {
  Modal,
  Botao,
  CampoTexto,
  Alerta,
} from '@farmapro/ui';
import { useAuth } from '../contexts/AuthContext.js';
import { ShieldCheck, KeyRound, Smartphone, AlertCircle } from 'lucide-react';

interface LoginModalProps {
  aberto: boolean;
  aoFechar: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ aberto, aoFechar }) => {
  const { login, loginPin, carregando, erroAuth } = useAuth();
  const [modo, setModo] = useState<'senha' | 'pin'>('senha');
  const [email, setEmail] = useState('carlos@farmavida.demo');
  const [senha, setSenha] = useState('FarmaPro@2026');
  const [pin, setPin] = useState('');
  const [cpf, setCpf] = useState('222.222.222-22');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modo === 'senha') {
      const ok = await login(email, senha);
      if (ok) aoFechar();
    } else {
      const ok = await loginPin(pin, 'aaaaaaaa-2222-4000-8000-000000000002', 'HW-CAIXA-01-TERMINAL');
      if (ok) aoFechar();
    }
  };

  const digitarDigitoPin = (digito: string) => {
    if (pin.length < 6) {
      setPin(prev => prev + digito);
    }
  };

  const apagarDigitoPin = () => {
    setPin(prev => prev.slice(0, -1));
  };

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Autenticação Segura FarmaPro"
      descricao="Acesse o ambiente operacional farmacêutico com credenciais validadas"
    >
      <div className="space-y-5">
        {/* Alternador de Modo de Login */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setModo('senha')}
            className={`flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium rounded-md transition-all ${
              modo === 'senha'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            E-mail e Senha
          </button>
          <button
            type="button"
            onClick={() => setModo('pin')}
            className={`flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium rounded-md transition-all ${
              modo === 'pin'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            PIN Rápido PDV
          </button>
        </div>

        {erroAuth && (
          <Alerta tipo="erro" titulo="Falha de Autenticação">
            {erroAuth}
          </Alerta>
        )}

        {modo === 'senha' ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <CampoTexto
              rotulo="E-mail Corporativo"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu.email@farmacia.com.br"
              dica="Utilize o e-mail cadastrado pelo administrador da farmácia."
            />

            <CampoTexto
              rotulo="Senha de Acesso"
              type="password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              placeholder="••••••••••••"
              dica="Protegida criptograficamente por Argon2id (mínimo 19 MiB)."
            />

            <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-100 text-xs text-blue-900 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Segurança Criptográfica Argon2id + JWT</p>
                <p className="text-blue-700">
                  Proteção contra força bruta com Rate Limiting e revogação instantânea de sessões.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Botao type="button" variante="secundario" onClick={aoFechar}>
                Cancelar
              </Botao>
              <Botao type="submit" variante="primario" carregando={carregando}>
                Entrar com Senha
              </Botao>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Terminal Caixa 01 — Filial Centro (Autorizado)</p>
                <p className="text-amber-800">
                  O PIN de 6 dígitos concede agilidade para vendas no balcão. Operações administrativas sensíveis requerem senha mestre.
                </p>
              </div>
            </div>

            <CampoTexto
              rotulo="CPF ou Matrícula do Operador"
              value={cpf}
              onChange={e => setCpf(e.target.value)}
              placeholder="000.000.000-00"
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                PIN Operacional (6 Dígitos)
              </label>
              <div className="flex justify-center gap-2 mb-3">
                {[0, 1, 2, 3, 4, 5].map(idx => (
                  <div
                    key={idx}
                    className={`w-10 h-12 rounded-lg border flex items-center justify-center text-xl font-bold ${
                      pin[idx]
                        ? 'border-blue-600 bg-blue-50 text-blue-800'
                        : 'border-slate-300 bg-white text-slate-400'
                    }`}
                  >
                    {pin[idx] ? '●' : ''}
                  </div>
                ))}
              </div>

              {/* Teclado Virtual Numérico */}
              <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map(btn => (
                  <button
                    key={btn}
                    type="button"
                    onClick={() => {
                      if (btn === 'C') setPin('');
                      else if (btn === '⌫') apagarDigitoPin();
                      else digitarDigitoPin(btn);
                    }}
                    className="h-11 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 font-semibold text-slate-800 transition-colors active:scale-95 text-base flex items-center justify-center cursor-pointer"
                  >
                    {btn}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Botao type="button" variante="secundario" onClick={aoFechar}>
                Cancelar
              </Botao>
              <Botao
                type="submit"
                variante="primario"
                disabled={pin.length !== 6 || carregando}
                carregando={carregando}
              >
                Autenticar PIN
              </Botao>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
