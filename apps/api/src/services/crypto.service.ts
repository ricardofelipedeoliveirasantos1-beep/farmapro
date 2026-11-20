import { hash, verify, Algorithm } from '@node-rs/argon2';
import crypto from 'node:crypto';

/**
 * Serviço de Criptografia e Hashing do FarmaPro.
 * Utiliza o algoritmo padrão Argon2id para proteção avançada de credenciais.
 */
export class CryptoService {
  /**
   * Gera hash seguro de senha utilizando Argon2id.
   */
  static async gerarHashSenha(senha: string): Promise<string> {
    return hash(senha, {
      algorithm: Algorithm.Argon2id,
      memoryCost: 19456, // 19 MiB
      timeCost: 2,
      parallelism: 1,
    });
  }

  /**
   * Verifica se a senha informada corresponde ao hash Argon2id armazenado.
   */
  static async verificarSenha(hashArmazenado: string, senhaDigitada: string): Promise<boolean> {
    try {
      return await verify(hashArmazenado, senhaDigitada);
    } catch {
      return false;
    }
  }

  /**
   * Gera hash seguro para o PIN rápido de 6 dígitos.
   */
  static async gerarHashPin(pin: string): Promise<string> {
    if (!/^\d{6}$/.test(pin)) {
      throw new Error('O PIN deve conter exatamente 6 dígitos numéricos.');
    }
    return hash(pin, {
      algorithm: Algorithm.Argon2id,
      memoryCost: 16384, // 16 MiB
      timeCost: 2,
      parallelism: 1,
    });
  }

  /**
   * Verifica se o PIN informado confere com o hash armazenado.
   */
  static async verificarPin(hashArmazenado: string, pinDigitado: string): Promise<boolean> {
    try {
      return await verify(hashArmazenado, pinDigitado);
    } catch {
      return false;
    }
  }

  /**
   * Gera um token pseudoaleatório criptograficamente seguro (ex: refresh token, recuperação de senha).
   */
  static gerarTokenAleatorio(tamanhoBytes = 32): string {
    return crypto.randomBytes(tamanhoBytes).toString('hex');
  }

  /**
   * Gera hash SHA-256 de um token para persistência segura no banco.
   */
  static gerarHashSha256(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
