/*export interface IAval {
  id?: number;
  titulo?: string;
  descricao?: string;
  nota: number;
  data?: string; 
  aprovado?: boolean;
  usuarioId?: number;
}

export default class Aval implements IAval {
  id?: number;
  titulo?: string;
  descricao?: string;
  nota: number;
  data?: string;
  aprovado?: boolean;
  usuarioId?: number;

  constructor(data?: Partial<IAval>) {
    this.nota = 0;
    this.aprovado = false;
    Object.assign(this, data);
  }

  static fromJSON(json: any): Aval {
    if (!json) return new Aval();
    return new Aval({
      id: json.id,
      titulo: json.titulo,
      descricao: json.descricao,
      nota: json.nota != null ? Number(json.nota) : 0,
      data: json.data,
      aprovado: json.aprovado != null ? Boolean(json.aprovado) : false,
      usuarioId: json.usuarioId,
    });
  }

  toJSON(): Record<string, any> {
    return {
      id: this.id,
      titulo: this.titulo,
      descricao: this.descricao,
      nota: this.nota,
      data: this.data,
      aprovado: this.aprovado,
      usuarioId: this.usuarioId,
    };
  }

  validate(): string | null {
    if (this.nota == null || Number.isNaN(this.nota)) return 'Nota inválida';
    if (this.nota < 0 || this.nota > 5) return 'A nota deve ser entre 0 e 5';
    if (this.titulo && this.titulo.length > 100) return 'Título muito longo';
    return null;
  }
}*/