export class Usuario {
    public id:      string;
    public nome:    string;
    public email:   string;
    public senha:   string;
    public fone:    string;
    public localizacao: string;
    public dataNascimento: Date;   
    public admin:   boolean;

    constructor(obj?: Partial<Usuario>){
        if(obj){
            this.id     = obj.id
            this.nome   = obj.nome
            this.email  = obj.email
            this.senha  = obj.senha
            this.fone   = obj.fone
            this.localizacao = obj.localizacao
            this.dataNascimento   = obj.dataNascimento
            this.admin  = obj.admin
        }
    }

    toString() {
        const objeto = `{
            "id"    :   "${this.id}",
            "nome"  :   "${this.nome}",
            "email" :   "${this.email}",
            "senha" :   "${this.senha}",
            "fone"  :   "${this.fone}",
            "localizacao"  :   "${this.localizacao}",
            "dataNascimento"  :   "${this.dataNascimento}",
            "admin" :   "${this.admin}"
        }`
        return objeto
    }

    toFirestore(){
        const usuario = {
            id      : this.id,
            nome    : this.nome,
            email   : this.email,
            senha   : this.senha,
            fone    : this.fone,
            localizacao : this.localizacao,
            dataNascimento    : this.dataNascimento,
            admin   : this.admin
        }
        return usuario
    }


}
