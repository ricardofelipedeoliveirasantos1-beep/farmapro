import React from 'react';
import { Modal, Botao } from '@farmapro/ui';
import {
  Keyboard,
  ArrowRight,
} from 'lucide-react';

interface AjudaOperacionalModalProps {
  aberto: boolean;
  aoFechar: () => void;
}

export const AjudaOperacionalModal: React.FC<AjudaOperacionalModalProps> = ({
  aberto,
  aoFechar,
}) => {
  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Ajuda Operacional & Guia de Teclas de Atalho"
      descricao="Instruções rápidas para operação no Balcão e no Caixa (PDV)"
    >
      <div className="space-y-5 py-2 text-slate-800 text-xs">
        {/* Fluxo de Atendimento */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
          <span className="font-extrabold text-blue-900 block text-sm">
            Fluxo Operacional de Vendas FarmaPro
          </span>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-blue-800 pt-1">
            <span className="bg-white px-2.5 py-1 rounded-md border border-blue-200">
              1. Balcão / Consulta
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-blue-500" />
            <span className="bg-white px-2.5 py-1 rounded-md border border-blue-200">
              2. Comanda PV-XXXX
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-blue-500" />
            <span className="bg-white px-2.5 py-1 rounded-md border border-blue-200">
              3. Leitura no Caixa (F1)
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-blue-500" />
            <span className="bg-white px-2.5 py-1 rounded-md border border-blue-200">
              4. Pagamento & Troco
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-blue-500" />
            <span className="bg-white px-2.5 py-1 rounded-md border border-blue-200 text-emerald-800 font-bold">
              5. Conclusão (F10)
            </span>
          </div>
          <p className="text-[11px] text-blue-700 leading-relaxed pt-1">
            O atendente no balcão não realiza cobrança nem movimenta valores. O cliente recebe o número da comanda (ex.: <strong>PV-1048</strong>) e se dirige ao operador de caixa para pagamento e conferência.
          </p>
        </div>

        {/* Mapa de Teclas de Atalho */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
            <Keyboard className="w-4 h-4 text-blue-600" />
            <span>Teclas de Atalho Operacionais</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-slate-700">Ler Comanda PV ou Código EAN</span>
              <kbd className="bg-blue-600 text-white font-mono font-bold px-2 py-0.5 rounded text-[11px]">
                F1
              </kbd>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-slate-700">Pagamento Instantâneo via PIX</span>
              <kbd className="bg-blue-600 text-white font-mono font-bold px-2 py-0.5 rounded text-[11px]">
                F2
              </kbd>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-slate-700">Cartão de Crédito</span>
              <kbd className="bg-blue-600 text-white font-mono font-bold px-2 py-0.5 rounded text-[11px]">
                F3
              </kbd>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-slate-700">Cartão de Débito</span>
              <kbd className="bg-blue-600 text-white font-mono font-bold px-2 py-0.5 rounded text-[11px]">
                F4
              </kbd>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-slate-700">Dinheiro em Espécie (Troco)</span>
              <kbd className="bg-emerald-600 text-white font-mono font-bold px-2 py-0.5 rounded text-[11px]">
                F5
              </kbd>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-slate-700">Resgate de Voucher</span>
              <kbd className="bg-amber-600 text-white font-mono font-bold px-2 py-0.5 rounded text-[11px]">
                F6
              </kbd>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-slate-700">Gerar Comanda no Balcão</span>
              <kbd className="bg-emerald-600 text-white font-mono font-bold px-2 py-0.5 rounded text-[11px]">
                F9
              </kbd>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-slate-700">Finalizar Venda no Caixa</span>
              <kbd className="bg-blue-700 text-white font-mono font-bold px-2 py-0.5 rounded text-[11px]">
                F10
              </kbd>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-slate-700">Limpar Venda / Cancelar</span>
              <kbd className="bg-slate-700 text-white font-mono font-bold px-2 py-0.5 rounded text-[11px]">
                Esc
              </kbd>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-slate-700">Buscar Medicamento no Balcão</span>
              <kbd className="bg-slate-700 text-white font-mono font-bold px-2 py-0.5 rounded text-[11px]">
                Ctrl + F
              </kbd>
            </div>
          </div>
        </div>

        {/* Regras Financeiras */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5 text-[11px] text-slate-600">
          <strong className="text-slate-900 block font-bold text-xs">Regras Importantes de Caixa:</strong>
          <p>• <strong>Cálculo de Troco:</strong> O troco é calculado dinamicamente em tempo real sobre cédulas recebidas em dinheiro.</p>
          <p>• <strong>Pagamento Misto:</strong> Em vendas divididas (ex: PIX + Dinheiro), o troco é devolvido exclusivamente com base no montante em dinheiro entregue.</p>
          <p>• <strong>Resgate de Voucher:</strong> Vouchers decorrentes de devoluções devem ser utilizados de forma 100% integral. Não há troco em dinheiro sobre saldo de voucher.</p>
        </div>

        <div className="flex justify-end pt-2">
          <Botao variante="primario" tamanho="sm" onClick={aoFechar}>
            Entendido
          </Botao>
        </div>
      </div>
    </Modal>
  );
};
