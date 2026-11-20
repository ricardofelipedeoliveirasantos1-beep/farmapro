import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'farmapro_jwt_secret_dev_local_2026_super_seguro';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m'; // 15 minutos padrão

export interface PayloadAccessToken {
  sub: string; // ID do Usuário
  nome: string;
  email: string;
  empresaId?: string;
  filialId?: string;
  papelEmpresa?: 'PROPRIETARIO' | 'ADMINISTRADOR' | 'COLABORADOR';
  cargoNome?: string;
  nivelAcesso?: 'ADMIN' | 'GERENTE' | 'FARMACEUTICO' | 'OPERADOR_CAIXA' | 'ATENDENTE';
  permissoes?: string[];
  origemPin?: boolean; // True se autenticado via PIN rápido em PDV
  dispositivoId?: string;
}

export class JwtService {
  /**
   * Assina e gera um Access Token JWT.
   */
  static gerarAccessToken(payload: PayloadAccessToken): string {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
      issuer: 'farmapro-auth',
      audience: 'farmapro-app',
    });
  }

  /**
   * Valida a assinatura e decodifica o Access Token JWT.
   */
  static verificarAccessToken(token: string): PayloadAccessToken | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        issuer: 'farmapro-auth',
        audience: 'farmapro-app',
      }) as PayloadAccessToken;
      return decoded;
    } catch {
      return null;
    }
  }
}
