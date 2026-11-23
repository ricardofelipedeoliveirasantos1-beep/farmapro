import React, { useState } from 'react';
import {
  User,
  CreditCard,
  Calendar,
  MapPin,
  Building,
  CheckCircle2,
  AlertCircle,
  Eraser,
  Save,
  Check,
} from 'lucide-react';
import { ClientesService, ClienteCompleto } from '../../services/clientesService.js';

interface CadastrarClienteViewProps {
  aoClienteCadastrado?: (cliente: ClienteCompleto) => void;
  aoVoltarPreVenda?: () => void;
}

const UFS_BRASIL = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

export const CadastrarClienteView: React.FC<CadastrarClienteViewProps> = ({
  aoClienteCadastrado,
}) => {
  const [cpf, setCpf] = useState<string>('');
  const [nome, setNome] = useState<string>('');
  const [sobrenome, setSobrenome] = useState<string>('');
  const [dataNascimento, setDataNascimento] = useState<string>('');
  const [endereco, setEndereco] = useState<string>('');
  const [complemento, setComplemento] = useState<string>('');
  const [cidade, setCidade] = useState<string>('');
  const [uf, setUf] = useState<string>('PR');

  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState<boolean>(false);

  // Máscara automática de CPF
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatado = ClientesService.aplicarMascaraCpf(e.target.value);
    setCpf(formatado);
    if (mensagemErro) setMensagemErro(null);
  };

  // Máscara de Data de Nascimento
  const handleDataNascimentoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatado = ClientesService.aplicarMascaraData(e.target.value);
    setDataNascimento(formatado);
  };

  const handleLimpar = () => {
    setCpf('');
    setNome('');
    setSobrenome('');
    setDataNascimento('');
    setEndereco('');
    setComplemento('');
    setCidade('');
    setUf('PR');
    setMensagemErro(null);
    setMensagemSucesso(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMensagemErro(null);
    setMensagemSucesso(null);
    setCarregando(true);

    const res = ClientesService.cadastrarCliente({
      cpf,
      nome,
      sobrenome,
      dataNascimento,
      endereco,
      complemento,
      cidade,
      uf,
    });

    setCarregando(false);

    if (!res.sucesso) {
      setMensagemErro(res.mensagem);
    } else {
      setMensagemSucesso(res.mensagem);
      if (res.cliente && aoClienteCadastrado) {
        aoClienteCadastrado(res.cliente);
      }
      // Limpa os campos após salvar
      setCpf('');
      setNome('');
      setSobrenome('');
      setDataNascimento('');
      setEndereco('');
      setComplemento('');
      setCidade('');
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 animate-in fade-in duration-200">
      {/* CARD PRINCIPAL: CADASTRO DE CLIENTES (EXATO À IMAGEM DE REFERÊNCIA) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-7">
        {/* Cabeçalho da Seção */}
        <div className="flex items-center gap-2.5 pb-4 mb-6 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Cadastrar Cliente</h2>
            <p className="text-xs text-slate-500 font-medium">
              Identificação comercial por CPF para fidelidade e histórico de atendimento.
            </p>
          </div>
        </div>

        {/* Notificações de Sucesso ou Erro */}
        {mensagemSucesso && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{mensagemSucesso}</span>
          </div>
        )}

        {mensagemErro && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{mensagemErro}</span>
          </div>
        )}

        {/* GRID PRINCIPAL: FORMULÁRIO (ESQUERDA) + PAINEL DE INFORMAÇÕES (DIREITA) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Lado Esquerdo: Formulário (Col 8) */}
          <form onSubmit={handleSubmit} className="lg:col-span-8 space-y-4">
            {/* Linha 1: CPF, Nome, Sobrenome */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
              {/* CPF */}
              <div className="sm:col-span-4">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  CPF <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    value={cpf}
                    onChange={handleCpfChange}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    required
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm font-mono text-slate-900 outline-none transition-all placeholder:text-slate-400 bg-slate-50/50 focus:bg-white"
                  />
                </div>
              </div>

              {/* Nome */}
              <div className="sm:col-span-4">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Digite o nome"
                    required
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 bg-slate-50/50 focus:bg-white"
                  />
                </div>
              </div>

              {/* Sobrenome */}
              <div className="sm:col-span-4">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Sobrenome <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    value={sobrenome}
                    onChange={(e) => setSobrenome(e.target.value)}
                    placeholder="Digite o sobrenome"
                    required
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 bg-slate-50/50 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Linha 2: Data de Nascimento (Opcional) e Endereço (Obrigatório) */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
              {/* Data de Nascimento */}
              <div className="sm:col-span-4">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Data de Nascimento
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    value={dataNascimento}
                    onChange={handleDataNascimentoChange}
                    placeholder="DD/MM/AAAA"
                    maxLength={10}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm font-mono text-slate-900 outline-none transition-all placeholder:text-slate-400 bg-slate-50/50 focus:bg-white"
                  />
                </div>
              </div>

              {/* Endereço */}
              <div className="sm:col-span-8">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Endereço <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                    placeholder="Rua, Avenida, Nº, Bairro"
                    required
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 bg-slate-50/50 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Linha 3: Complemento, Cidade, UF */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
              {/* Complemento */}
              <div className="sm:col-span-4">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Complemento
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    value={complemento}
                    onChange={(e) => setComplemento(e.target.value)}
                    placeholder="Apto, Bloco, etc."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 bg-slate-50/50 focus:bg-white"
                  />
                </div>
              </div>

              {/* Cidade */}
              <div className="sm:col-span-5">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Cidade <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    placeholder="Digite a cidade"
                    required
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 bg-slate-50/50 focus:bg-white"
                  />
                </div>
              </div>

              {/* UF */}
              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  UF <span className="text-red-500">*</span>
                </label>
                <select
                  value={uf}
                  onChange={(e) => setUf(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm font-semibold text-slate-900 outline-none transition-all bg-slate-50/50 focus:bg-white cursor-pointer"
                >
                  {UFS_BRASIL.map((estado) => (
                    <option key={estado} value={estado}>
                      {estado}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Linha 4: Botões Limpar e Salvar Cliente */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleLimpar}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors text-xs font-semibold"
              >
                <Eraser className="w-3.5 h-3.5" />
                <span>Limpar</span>
              </button>

              <button
                type="submit"
                disabled={carregando}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{carregando ? 'Salvando...' : 'Salvar Cliente'}</span>
              </button>
            </div>
          </form>

          {/* Lado Direito: Box de Informações (Col 4 - Exato à Imagem) */}
          <div className="lg:col-span-4 bg-sky-50/70 border border-sky-200 rounded-2xl p-5 select-none">
            <div className="flex items-center gap-2 text-sky-900 font-bold text-sm mb-3.5">
              <div className="w-5 h-5 rounded-full bg-sky-200 text-sky-800 flex items-center justify-center text-xs font-bold">
                i
              </div>
              <span>Informações</span>
            </div>

            <ul className="space-y-2.5 text-xs text-slate-700">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="font-medium">Cadastro rápido e simplificado.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="font-medium">CPF é o identificador único do cliente.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="font-medium">Nome e sobrenome são obrigatórios.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="font-medium">Data de nascimento é opcional.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="font-medium">O histórico de compras é consultado pelo CPF.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
