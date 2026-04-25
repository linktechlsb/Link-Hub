const TTL = 2 * 60 * 60 * 1000; // 2 horas

type Entrada<T> = { data: T; expiraEm: number };

const store = new Map<string, Entrada<unknown>>();

export const cache = {
  get<T>(chave: string): T | null {
    const entrada = store.get(chave) as Entrada<T> | undefined;
    if (!entrada) return null;
    if (Date.now() > entrada.expiraEm) {
      store.delete(chave);
      return null;
    }
    return entrada.data;
  },

  set<T>(chave: string, data: T): void {
    store.set(chave, { data, expiraEm: Date.now() + TTL });
  },

  invalidar(prefixo: string): void {
    for (const chave of store.keys()) {
      if (chave.startsWith(prefixo)) store.delete(chave);
    }
  },
};
