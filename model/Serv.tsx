export class Serv {
    public id:      string;
    public estilo:    string;
    public local:   string;
    public tipo:    string;
    public data:    string;
    public aval:    number;
    public status:  string;
    public nomeCliente?: string;
    public emailCliente?: string;
    public prestadorId?: string;
    public clienteId?: string;

    constructor(obj?: Partial<Serv>){
        if(obj){
            this.id     = obj.id
            this.estilo   = obj.estilo
            this.local  = obj.local
            this.tipo   = obj.tipo
            this.data   = obj.data
            this.status = obj.status || 'não realizado'
            this.nomeCliente = obj.nomeCliente
            this.emailCliente = obj.emailCliente
            this.prestadorId = obj.prestadorId
            this.clienteId = obj.clienteId
        }
    }

    toString() {
        const objeto = `{
            "id"    :   "${this.id}",
            "estilo"  :   "${this.estilo}",
            "local" :   "${this.local}",
            "tipo"  :   "${this.tipo}" ,
            "data"  :   "${this.data}",
            "status" : "${this.status}",
            "prestadorId" : "${this.prestadorId}"
        }`
        return objeto
    }

    toFirestore(){
        const serv = {
            id      : this.id,
            estilo    : this.estilo,
            local   : this.local,
            tipo    : this.tipo,
            data    : this.data,
            status  : this.status,
            nomeCliente : this.nomeCliente,
            emailCliente : this.emailCliente,
            prestadorId : this.prestadorId,
            clienteId : this.clienteId
        }
        return serv
    }


}

