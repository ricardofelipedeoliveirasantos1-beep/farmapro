import React, { useState, useEffect } from 'react';
import { RefreshCw, Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PwaUpdatePrompt: React.FC = () => {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [showUpdateToast, setShowUpdateToast] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);

  useEffect(() => {
    // 1. Detectar se já está em modo PWA standalone (instalado)
    if (typeof window !== 'undefined') {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        window.location.search.includes('source=pwa');
      setIsStandalone(Boolean(standalone));
    }

    // 2. Registrar Service Worker e monitorar atualizações
    if ('serviceWorker' in navigator && process.env.NODE_ENV !== 'test') {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service Worker registrado com sucesso:', registration.scope);

          // Verificar se já há um worker aguardando ativação
          if (registration.waiting) {
            setWaitingWorker(registration.waiting);
            setShowUpdateToast(true);
          }

          // Escutar novas instalações de service workers
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // Nova versão disponível e pronta para ativar
                  setWaitingWorker(newWorker);
                  setShowUpdateToast(true);
                }
              });
            }
          });
        })
        .catch((err) => {
          console.warn('[PWA] Falha ao registrar Service Worker:', err);
        });

      // Recarregar automaticamente quando a nova versão assumir o controle
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }

    // 3. Capturar evento de instalação do PWA no Chrome / Edge
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Exibe banner discreto de instalação se ainda não for standalone
      if (!isStandalone) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Escutar confirmação de instalação
    window.addEventListener('appinstalled', () => {
      setDeferredPrompt(null);
      setShowInstallBanner(false);
      console.log('[PWA] FarmaPro Balcão instalado com sucesso no Windows!');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, [isStandalone]);

  // Ação de atualizar para nova versão
  const handleAtualizarVersao = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  // Ação de instalar no Windows
  const handleInstalarAplicativo = async () => {
    if (!deferredPrompt) return;
    setShowInstallBanner(false);
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] Resposta de instalação do usuário: ${outcome}`);
    setDeferredPrompt(null);
  };

  return (
    <>
      {/* 1. TOAST DISCRETO DE ATUALIZAÇÃO DISPONÍVEL */}
      {showUpdateToast && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed bottom-4 right-4 z-50 max-w-sm bg-slate-900 text-white rounded-xl shadow-2xl p-4 border border-blue-500/40 animate-in slide-in-from-bottom duration-200"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-600/30 text-blue-400 rounded-lg shrink-0">
              <RefreshCw className="w-5 h-5 animate-spin" style={{ animationDuration: '3s' }} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-white">Nova versão disponível</h4>
              <p className="text-xs text-slate-300 mt-0.5">
                Uma atualização do FarmaPro Balcão foi baixada com melhorias.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={handleAtualizarVersao}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Atualizar Agora
                </button>
                <button
                  type="button"
                  onClick={() => setShowUpdateToast(false)}
                  className="px-2.5 py-1.5 text-slate-400 hover:text-white text-xs font-medium rounded-lg transition-colors"
                >
                  Mais Tarde
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowUpdateToast(false)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </aside>
      )}

      {/* 2. BANNER DISCRETO DE INSTALAÇÃO NO WINDOWS (Apenas se em navegador) */}
      {showInstallBanner && !isStandalone && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed top-3 right-3 z-50 bg-white border border-blue-200 rounded-xl shadow-lg p-3 max-w-xs animate-in slide-in-from-top duration-200"
        >
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-sm shrink-0">
              +
            </div>
            <div className="flex-1 min-w-0">
              <h5 className="text-xs font-bold text-slate-900">Instalar FarmaPro Balcão</h5>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Crie um aplicativo na Área de Trabalho com abertura direta.
              </p>
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={handleInstalarAplicativo}
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-md flex items-center gap-1 transition-colors"
                >
                  <Download className="w-3 h-3" />
                  Instalar App
                </button>
                <button
                  type="button"
                  onClick={() => setShowInstallBanner(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs px-1.5 py-1"
                >
                  Agora não
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowInstallBanner(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </aside>
      )}
    </>
  );
};
