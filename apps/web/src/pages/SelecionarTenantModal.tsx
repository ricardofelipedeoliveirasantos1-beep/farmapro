import React from 'react';
import { Modal, Botao, Badge } from '@farmapro/ui';
import { useAuth } from '../contexts/AuthContext.js';
import { Building2, MapPin, Check } from 'lucide-react';

interface SelecionarTenantModalProps {
  aberto: boolean;
  aoFechar: () => void;
}

export const SelecionarTenantModal: React.FC<SelecionarTenantModalProps> = ({ aberto, aoFechar }) => {
  const { empresasDisponiveis, empresaAtiva, filialAtiva, selecionarContexto, carregando } = useAuth();

  const handleSelecionar = async (empresaId: string, filialId: string) => {
    await selecionarContexto(empresaId, filialId);
    aoFechar();
  };

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Selecionar Empresa e Filial Ativa"
      descricao="Alterne o contexto operacional para gerenciar outra farmácia autorizada"
    >
      <div className="space-y-4">
        {empresasDisponiveis.map(emp => (
          <div key={emp.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
            <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 text-sm">{emp.nomeFantasia}</h4>
                  <p className="text-xs text-slate-500">
                    {emp.razaoSocial} • CNPJ: {emp.cnpj}
                  </p>
                </div>
              </div>
              <Badge
                variante={emp.papelEmpresa === 'PROPRIETARIO' ? 'sucesso' : 'info'}
              >
                {emp.papelEmpresa === 'PROPRIETARIO' ? 'Proprietário' : 'Administrador'}
              </Badge>
            </div>

            <div className="p-3 divide-y divide-slate-100">
              {emp.filiais.map(fil => {
                const eAtiva = empresaAtiva?.id === emp.id && filialAtiva?.id === fil.id;
                return (
                  <div
                    key={fil.id}
                    className={`flex items-center justify-between py-2.5 px-3 rounded-lg transition-colors ${
                      eAtiva ? 'bg-blue-50/70 border border-blue-200' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <MapPin className={`w-4 h-4 ${eAtiva ? 'text-blue-600' : 'text-slate-400'}`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-800">{fil.nome}</span>
                          <span className="text-xs text-slate-500 font-mono">[{fil.codigoFilial}]</span>
                          {fil.eMatriz && (
                            <Badge variante="neutro">Matriz</Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          Cargo nesta unidade: <strong className="text-slate-700">{fil.cargoNome}</strong>
                        </p>
                      </div>
                    </div>

                    <div>
                      {eAtiva ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-100/80 px-2.5 py-1 rounded-md">
                          <Check className="w-3.5 h-3.5" />
                          Unidade Ativa
                        </span>
                      ) : (
                        <Botao
                          variante="secundario"
                          tamanho="sm"
                          disabled={carregando}
                          onClick={() => handleSelecionar(emp.id, fil.id)}
                        >
                          Acessar Unidade
                        </Botao>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
};
