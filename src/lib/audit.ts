import { supabase } from './supabase';

export async function logAudit(
  acao: string,
  entidade: string,
  descricao: string,
  responsavel: string,
  valorAnterior?: Record<string, unknown> | null,
  valorNovo?: Record<string, unknown> | null,
  entidadeId?: string | null,
): Promise<void> {
  try {
    await supabase.from('auditoria').insert({
      acao,
      entidade,
      descricao,
      responsavel,
      valor_anterior: valorAnterior ?? null,
      valor_novo: valorNovo ?? null,
      entidade_id: entidadeId ?? null,
    });
  } catch {
    // Audit logging should never block the main operation
  }
}

export async function createNotification(
  pedidoId: string,
  titulo: string,
  descricao: string,
): Promise<void> {
  try {
    await supabase.from('notificacoes').insert({
      pedido_id: pedidoId,
      titulo,
      descricao,
      lida: false,
    });
  } catch {
    // Non-blocking
  }
}
