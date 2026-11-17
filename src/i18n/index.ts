// 文言の取り出し。JSON の入れ子を "comments.c90" のような点区切りのキーにして引く。公開時は ja だけ

export type Messages = Record<string, string>;
export type Vars = Record<string, string | number>;

/** 入れ子の JSON を点区切りのキーに平らにする。文字列以外の値はエラー */
export function flatten(obj: unknown, prefix = '', out: Messages = {}): Messages {
  if (typeof obj === 'string') {
    out[prefix] = obj;
    return out;
  }
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    throw new Error(`i18n: ${prefix || '(root)'} は文字列か入れ子のオブジェクトにしてください`);
  }
  for (const [k, v] of Object.entries(obj)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  return out;
}

/** {name} の形の差し込みを置き換える。値がない差し込みはそのまま残す */
export function format(template: string, vars: Vars = {}): string {
  return template.replace(/\{(\w+)\}/g, (all, name: string) => (name in vars ? String(vars[name]) : all));
}

let messages: Messages = {};

export function setMessages(m: Messages): void {
  messages = m;
}

/** 文言を引く。ない場合はキーをそのまま返す（検査で起動時に止まるので、通常は起きない） */
export function t(key: string, vars?: Vars): string {
  return format(messages[key] ?? key, vars);
}
