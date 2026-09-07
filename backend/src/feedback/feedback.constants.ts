/**
 * Itens avaliados por padrão na pesquisa pós-evento. O organizador pode
 * renomear, remover ou acrescentar itens — quando isso acontece a lista fica
 * gravada em `Event.feedbackItems`; enquanto o campo for null, vale esta.
 */
export const DEFAULT_FEEDBACK_ITEMS = [
  'Organização',
  'Estrutura da Casa',
  'Ministério de Música',
  'Pregações',
  'Gincana',
  'Limpeza',
  'Cozinha',
  'Refeições',
] as const;

export const MAX_FEEDBACK_ITEMS = 30;
export const MAX_FEEDBACK_ITEM_LENGTH = 120;

/** Lê `Event.feedbackItems` caindo na lista padrão se estiver vazio/corrompido. */
export function parseFeedbackItems(raw: string | null | undefined): string[] {
  if (!raw) return [...DEFAULT_FEEDBACK_ITEMS];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...DEFAULT_FEEDBACK_ITEMS];
    const items = parsed.filter((i): i is string => typeof i === 'string' && i.trim() !== '');
    return items.length > 0 ? items : [...DEFAULT_FEEDBACK_ITEMS];
  } catch {
    return [...DEFAULT_FEEDBACK_ITEMS];
  }
}
