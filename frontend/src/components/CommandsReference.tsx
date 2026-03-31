interface Command {
  cmd: string;
  desc: string;
  example?: string;
  note?: string;
}

const COMMANDS: Command[] = [
  { cmd: "/hoje", desc: "Total gasto hoje" },
  { cmd: "/mes", desc: "Total gasto no mês atual" },
  { cmd: "/semana", desc: "Total e breakdown por categoria da semana" },
  { cmd: "/ultimas", desc: "Últimas 5 transações registradas" },
  { cmd: "/categorias", desc: "Gastos por categoria no mês atual" },
  {
    cmd: "/metas",
    desc: "Ver progresso das metas do mês",
  },
  {
    cmd: "/metas <Categoria> <valor>",
    desc: "Definir meta mensal para uma categoria",
    example: "/metas Alimentação 800",
  },
  {
    cmd: "/editar",
    desc: "Listar últimas transações numeradas para editar",
  },
  {
    cmd: "/editar <N> valor <novo>",
    desc: "Alterar o valor da transação #N",
    example: "/editar 1 valor 35.90",
  },
  {
    cmd: "/editar <N> categoria <cat>",
    desc: "Alterar a categoria da transação #N",
    example: "/editar 2 categoria Lazer",
  },
  {
    cmd: "/editar <N> local <nome>",
    desc: "Alterar o estabelecimento da transação #N",
    example: "/editar 1 local Restaurante X",
  },
  {
    cmd: "/exportar",
    desc: "Receber CSV do mês atual via mensagem",
  },
  {
    cmd: "/investimento",
    desc: "Ver instruções para registrar saldo da carteira",
  },
  {
    cmd: "/investimento <valor>",
    desc: "Registrar saldo do CDB para hoje",
    example: "/investimento 13500",
  },
  {
    cmd: "/investimento <valor> <observação>",
    desc: "Registrar saldo com observação",
    example: "/investimento 13850 Rendimento ótimo esse mês",
  },
];

const FREE_TEXT: Command[] = [
  {
    cmd: "texto livre",
    desc: "Registrar gasto descrevendo em linguagem natural",
    example: "gastei 45 no mercado",
    note: "O Gemini extrai valor, estabelecimento e categoria automaticamente",
  },
  {
    cmd: "foto de recibo",
    desc: "Enviar foto de um recibo ou nota fiscal",
    note: "OCR via Gemini Vision — extrai todos os dados automaticamente",
  },
];

const CATEGORIES = ["Alimentação", "Mercado", "Transporte", "Saúde", "Lazer", "Serviços", "Outro"];

export default function CommandsReference() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Comandos */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <p className="text-sm font-medium text-gray-500 mb-5">Comandos do bot</p>
        <div className="space-y-3">
          {COMMANDS.map((c) => (
            <div
              key={c.cmd}
              className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-3 border-b border-gray-50 last:border-0"
            >
              <code className="text-xs font-mono bg-indigo-50 text-indigo-700 px-2 py-1 rounded whitespace-nowrap self-start">
                {c.cmd}
              </code>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700">{c.desc}</p>
                {c.example && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Ex:{" "}
                    <code className="font-mono bg-gray-50 px-1 rounded">
                      {c.example}
                    </code>
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Entrada por texto e foto */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <p className="text-sm font-medium text-gray-500 mb-5">Registrar gastos</p>
        <div className="space-y-3">
          {FREE_TEXT.map((c) => (
            <div
              key={c.cmd}
              className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-3 border-b border-gray-50 last:border-0"
            >
              <code className="text-xs font-mono bg-emerald-50 text-emerald-700 px-2 py-1 rounded whitespace-nowrap self-start">
                {c.cmd}
              </code>
              <div className="flex-1">
                <p className="text-sm text-gray-700">{c.desc}</p>
                {c.example && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Ex:{" "}
                    <code className="font-mono bg-gray-50 px-1 rounded">
                      {c.example}
                    </code>
                  </p>
                )}
                {c.note && (
                  <p className="text-xs text-gray-400 mt-0.5">{c.note}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Categorias válidas */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <p className="text-sm font-medium text-gray-500 mb-4">Categorias válidas</p>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <span
              key={cat}
              className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full font-medium"
            >
              {cat}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
