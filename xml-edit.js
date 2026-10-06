(() => {
  'use strict';

  const state = { doc: null, file: null, guides: [], selected: -1, audit: null, changes: [] };
  const byId = id => document.getElementById(id);
  const local = node => node?.localName || node?.nodeName?.split(':').pop() || '';
  const children = node => Array.from(node?.childNodes || []).filter(n => n.nodeType === 1);
  const descendants = (node, name) => Array.from(node?.getElementsByTagNameNS?.('*', name) || []);
  const first = (node, name) => descendants(node, name)[0] || null;
  const value = (node, name) => first(node, name)?.textContent?.trim() || '';
  const money = n => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const esc = v => window.escapeHtmlCF ? escapeHtmlCF(v) : String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const mask = (v, left = 3, right = 3) => { const s=String(v||''); return s.length <= left+right ? '••••' : s.slice(0,left)+'•'.repeat(Math.min(7,s.length-left-right))+s.slice(-right); };

  function leafValues(node, out = []) {
    if (!node || node.nodeType !== 1) return out;
    const els = children(node);
    if (!els.length) {
      if (local(node) !== 'hash') out.push(node.textContent || '');
      return out;
    }
    els.forEach(child => leafValues(child, out));
    return out;
  }

  function md5cycle(x, k) {
    let [a,b,c,d]=x;
    const cmn=(q,a,b,x,s,t)=>add32(((add32(add32(a,q),add32(x,t))<<s)|(add32(add32(a,q),add32(x,t))>>>(32-s))),b);
    const ff=(a,b,c,d,x,s,t)=>cmn((b&c)|((~b)&d),a,b,x,s,t);
    const gg=(a,b,c,d,x,s,t)=>cmn((b&d)|(c&(~d)),a,b,x,s,t);
    const hh=(a,b,c,d,x,s,t)=>cmn(b^c^d,a,b,x,s,t);
    const ii=(a,b,c,d,x,s,t)=>cmn(c^(b|(~d)),a,b,x,s,t);
    a=ff(a,b,c,d,k[0],7,-680876936); d=ff(d,a,b,c,k[1],12,-389564586); c=ff(c,d,a,b,k[2],17,606105819); b=ff(b,c,d,a,k[3],22,-1044525330);
    a=ff(a,b,c,d,k[4],7,-176418897); d=ff(d,a,b,c,k[5],12,1200080426); c=ff(c,d,a,b,k[6],17,-1473231341); b=ff(b,c,d,a,k[7],22,-45705983);
    a=ff(a,b,c,d,k[8],7,1770035416); d=ff(d,a,b,c,k[9],12,-1958414417); c=ff(c,d,a,b,k[10],17,-42063); b=ff(b,c,d,a,k[11],22,-1990404162);
    a=ff(a,b,c,d,k[12],7,1804603682); d=ff(d,a,b,c,k[13],12,-40341101); c=ff(c,d,a,b,k[14],17,-1502002290); b=ff(b,c,d,a,k[15],22,1236535329);
    a=gg(a,b,c,d,k[1],5,-165796510); d=gg(d,a,b,c,k[6],9,-1069501632); c=gg(c,d,a,b,k[11],14,643717713); b=gg(b,c,d,a,k[0],20,-373897302);
    a=gg(a,b,c,d,k[5],5,-701558691); d=gg(d,a,b,c,k[10],9,38016083); c=gg(c,d,a,b,k[15],14,-660478335); b=gg(b,c,d,a,k[4],20,-405537848);
    a=gg(a,b,c,d,k[9],5,568446438); d=gg(d,a,b,c,k[14],9,-1019803690); c=gg(c,d,a,b,k[3],14,-187363961); b=gg(b,c,d,a,k[8],20,1163531501);
    a=gg(a,b,c,d,k[13],5,-1444681467); d=gg(d,a,b,c,k[2],9,-51403784); c=gg(c,d,a,b,k[7],14,1735328473); b=gg(b,c,d,a,k[12],20,-1926607734);
    a=hh(a,b,c,d,k[5],4,-378558); d=hh(d,a,b,c,k[8],11,-2022574463); c=hh(c,d,a,b,k[11],16,1839030562); b=hh(b,c,d,a,k[14],23,-35309556);
    a=hh(a,b,c,d,k[1],4,-1530992060); d=hh(d,a,b,c,k[4],11,1272893353); c=hh(c,d,a,b,k[7],16,-155497632); b=hh(b,c,d,a,k[10],23,-1094730640);
    a=hh(a,b,c,d,k[13],4,681279174); d=hh(d,a,b,c,k[0],11,-358537222); c=hh(c,d,a,b,k[3],16,-722521979); b=hh(b,c,d,a,k[6],23,76029189);
    a=hh(a,b,c,d,k[9],4,-640364487); d=hh(d,a,b,c,k[12],11,-421815835); c=hh(c,d,a,b,k[15],16,530742520); b=hh(b,c,d,a,k[2],23,-995338651);
    a=ii(a,b,c,d,k[0],6,-198630844); d=ii(d,a,b,c,k[7],10,1126891415); c=ii(c,d,a,b,k[14],15,-1416354905); b=ii(b,c,d,a,k[5],21,-57434055);
    a=ii(a,b,c,d,k[12],6,1700485571); d=ii(d,a,b,c,k[3],10,-1894986606); c=ii(c,d,a,b,k[10],15,-1051523); b=ii(b,c,d,a,k[1],21,-2054922799);
    a=ii(a,b,c,d,k[8],6,1873313359); d=ii(d,a,b,c,k[15],10,-30611744); c=ii(c,d,a,b,k[6],15,-1560198380); b=ii(b,c,d,a,k[13],21,1309151649);
    a=ii(a,b,c,d,k[4],6,-145523070); d=ii(d,a,b,c,k[11],10,-1120210379); c=ii(c,d,a,b,k[2],15,718787259); b=ii(b,c,d,a,k[9],21,-343485551);
    x[0]=add32(a,x[0]); x[1]=add32(b,x[1]); x[2]=add32(c,x[2]); x[3]=add32(d,x[3]);
  }
  function add32(a,b){return (a+b)&0xFFFFFFFF;}
  function md5block(s){const out=[];for(let i=0;i<64;i+=4)out[i>>2]=s.charCodeAt(i)+(s.charCodeAt(i+1)<<8)+(s.charCodeAt(i+2)<<16)+(s.charCodeAt(i+3)<<24);return out;}
  function md51(s){let n=s.length,state=[1732584193,-271733879,-1732584194,271733878],i;for(i=64;i<=n;i+=64)md5cycle(state,md5block(s.substring(i-64,i)));s=s.substring(i-64);const tail=Array(16).fill(0);for(i=0;i<s.length;i++)tail[i>>2]|=s.charCodeAt(i)<<(i%4<<3);tail[i>>2]|=0x80<<(i%4<<3);if(i>55){md5cycle(state,tail);tail.fill(0);}tail[14]=n*8;md5cycle(state,tail);return state;}
  const hexChr='0123456789abcdef'.split('');
  function rhex(n){let s='';for(let j=0;j<4;j++)s+=hexChr[(n>>(j*8+4))&15]+hexChr[(n>>(j*8))&15];return s;}
  function md5Latin1(s){return md51(s).map(rhex).join('').toUpperCase();}
  function calcularHash(doc=state.doc){return md5Latin1(leafValues(doc.documentElement).join(''));}

  function guideType(node) { return local(node) === 'guiaConsulta' ? 'consulta' : 'sadt'; }
  function guideHeader(node) { return first(node, 'cabecalhoGuia') || first(node, 'cabecalhoConsulta') || node; }
  function guideItem(node) { return first(node, 'procedimentoExecutado') || first(node, 'dadosAtendimento') || node; }

  function parseGuide(node, index) {
    const tipo=guideType(node), item=guideItem(node), atendimento=first(node,'dadosAtendimento') || item, totalBlock=descendants(node,'valorTotal').find(n=>children(n).length) || null;
    const procedimento=first(item,'procedimento') || item;
    const totalItem=tipo==='consulta' ? Number(value(atendimento,'valorProcedimento')||0) : Number(value(item,'valorTotal')||0);
    const totalGeral=tipo==='consulta' ? totalItem : Number(value(totalBlock,'valorTotalGeral')||0);
    return { index,node,item,tipo, guia:value(guideHeader(node),'numeroGuiaPrestador'), principal:value(guideHeader(node),'guiaPrincipal'), operadora:value(node,'numeroGuiaOperadora'), carteira:value(first(node,'dadosBeneficiario'),'numeroCarteira'), senha:value(first(node,'dadosAutorizacao'),'senha'), autorizacao:value(first(node,'dadosAutorizacao'),'dataAutorizacao'), solicitacao:value(first(node,'dadosSolicitacao'),'dataSolicitacao'), execucao:tipo==='consulta'?value(atendimento,'dataAtendimento'):value(item,'dataExecucao'), codigo:value(procedimento,'codigoProcedimento'), descricao:value(procedimento,'descricaoProcedimento'), quantidade:tipo==='consulta'?1:Number(value(item,'quantidadeExecutada')||0), unitario:tipo==='consulta'?totalItem:Number(value(item,'valorUnitario')||0), totalItem, totalProc:tipo==='consulta'?totalItem:Number(value(totalBlock,'valorProcedimentos')||0), totalGeral, solicitante:value(first(node,'profissionalSolicitante'),'nomeProfissional'), executor:tipo==='consulta'?value(first(node,'profissionalExecutante'),'nomeProfissional'):value(first(node,'equipeSadt'),'nomeProf'), conselhoSolic:value(first(node,'profissionalSolicitante'),'numeroConselhoProfissional'), ufSolic:value(first(node,'profissionalSolicitante'),'UF'), cbosSolic:value(first(node,'profissionalSolicitante'),'CBOS'), conselhoExec:tipo==='consulta'?value(first(node,'profissionalExecutante'),'numeroConselhoProfissional'):value(first(node,'equipeSadt'),'numeroConselhoProfissional'), ufExec:tipo==='consulta'?value(first(node,'profissionalExecutante'),'UF'):value(first(node,'equipeSadt'),'UF'), cbosExec:tipo==='consulta'?value(first(node,'profissionalExecutante'),'CBOS'):value(first(node,'equipeSadt'),'CBOS'), observacao:value(node,'observacao'), indicacaoClinica:value(first(node,'dadosSolicitacao'),'indicacaoClinica'), indicacaoAcidente:value(node,'indicacaoAcidente'), tecnica:value(item,'tecnicaUtilizada') };
  }

  function auditar() {
    const guides=state.guides.map(parseGuide); const issues=[]; const per=guides.map(()=>[]);
    const add=(level,msg,index=null)=>{issues.push({level,msg,index});if(index!==null)per[index].push(level);};
    guides.forEach((g,i)=>{
      const required=[['guia','Número da guia'],['carteira','Carteira'],['execucao',g.tipo==='consulta'?'Data de atendimento':'Data de execução'],['codigo','Procedimento'],['executor','Profissional executante']];
      if(g.tipo==='sadt') required.push(['senha','Senha']);
      required.forEach(([k,label])=>{if(!g[k])add('erro',`${label} não informado.`,i);});
      if(g.tipo==='sadt' && g.guia && (g.guia!==g.principal || g.guia!==g.operadora)) add('alerta','Os três números de guia são diferentes.',i);
      if(g.tipo==='consulta' && g.guia && g.operadora && g.guia!==g.operadora) add('alerta','Número da guia difere do número da guia da operadora.',i);
      if(g.autorizacao && g.solicitacao && g.autorizacao!==g.solicitacao) add('alerta','Data de autorização diferente da solicitação.',i);
      if(g.execucao && g.autorizacao && g.execucao<g.autorizacao) add('erro','Data de atendimento/execução anterior à autorização.',i);
      if(g.tipo==='sadt' && !Number.isInteger(g.quantidade)) add('erro','Quantidade deve ser um número inteiro.',i);
      const calc=Math.round(g.quantidade*g.unitario*100)/100;
      if(Math.abs(calc-g.totalItem)>.009) add('erro',`Total do item deveria ser ${money(calc)}.`,i);
      if(Math.abs(g.totalItem-g.totalProc)>.009 || Math.abs(g.totalProc-g.totalGeral)>.009) add('erro','Totais do item e da guia não conferem.',i);
    });
    [['guia','Número da guia'],['carteira','Carteira'],['senha','Senha'],['observacao','Observação/conta']].forEach(([k,label])=>{const seen=new Map();guides.forEach((g,i)=>{if(!g[k])return;if(seen.has(g[k])){add('erro',`${label} duplicado entre as guias ${seen.get(g[k])+1} e ${i+1}.`,i);}else seen.set(g[k],i);});});
    const informed=value(state.doc,'hash').toUpperCase(); const calculated=calcularHash();
    if(informed!==calculated)add('erro','Hash do XML não corresponde ao conteúdo atual.');
    state.audit={guides,issues,per,informed,calculated}; return state.audit;
  }

  function badge(level){return level==='erro'?'bg-error-container text-on-error-container':level==='alerta'?'bg-tertiary-container text-on-tertiary-container':'bg-secondary-container text-on-secondary-container';}
  function render() {
    const a=auditar(); const total=a.guides.reduce((n,g)=>n+g.totalGeral,0); const lote=value(state.doc,'numeroLote'); const padrao=value(state.doc,'Padrao'); const ans=value(state.doc,'registroANS'); const prest=value(state.doc,'codigoPrestadorNaOperadora');
    byId('xml-summary').innerHTML=[['Lote',lote],['Padrão',padrao],['Guias',a.guides.length],['Total',money(total)],['Registro ANS',ans],['Prestador',prest]].map(([k,v])=>`<div class="p-3 rounded-xl bg-surface-container-high border border-outline-variant"><div class="text-[10px] uppercase text-outline">${esc(k)}</div><div class="font-bold mt-1 truncate">${esc(v)}</div></div>`).join('');
    byId('xml-guide-count').textContent=`${a.guides.length} guia(s)`;
    byId('xml-guides-body').innerHTML=a.guides.map((g,i)=>{const levels=a.per[i];const st=levels.includes('erro')?'erro':levels.includes('alerta')?'alerta':'ok';return `<tr class="border-b border-outline-variant hover:bg-surface-container-high cursor-pointer" onclick="xmlAbrirGuia(${i})"><td class="p-3">${i+1}</td><td class="p-3 font-bold text-primary">${esc(g.guia)}</td><td class="p-3">${esc(g.carteira)}</td><td class="p-3">${esc(g.execucao)}</td><td class="p-3"><div>${esc(g.codigo)}</div><div class="text-[10px] text-outline">${esc(g.descricao)}</div></td><td class="p-3 text-right font-bold">${esc(money(g.totalGeral))}</td><td class="p-3"><span class="px-2 py-1 rounded-full ${st==='ok'?'bg-secondary-container text-on-secondary-container':badge(st)}">${st==='ok'?'OK':st.toUpperCase()}</span></td></tr>`;}).join('');
    const hashOk=a.informed===a.calculated; const general=[{level:hashOk?'ok':'erro',msg:hashOk?'Hash confere com o conteúdo do arquivo.':'Hash inválido para o conteúdo atual.'},{level:a.issues.some(x=>x.level==='erro')?'erro':a.issues.some(x=>x.level==='alerta')?'alerta':'ok',msg:a.issues.length?`${a.issues.length} ocorrência(s) encontrada(s).`:'Nenhuma inconsistência interna encontrada.'}];
    byId('xml-audit-list').innerHTML=[...general,...a.issues.slice(0,20)].map(x=>`<button type="button" ${x.index!=null?`onclick="xmlAbrirGuia(${x.index})"`:''} class="text-left p-3 rounded-xl ${badge(x.level)}">${x.index!=null?`Guia ${x.index+1}: `:''}${esc(x.msg)}</button>`).join('');
    byId('xml-change-log').innerHTML=state.changes.length?state.changes.slice().reverse().map(c=>`<div class="py-2 border-b border-outline-variant"><b>Guia ${c.guide}</b> — ${esc(c.field)}<br><span class="text-outline">${esc(c.before)} → ${esc(c.after)}</span></div>`).join(''):'Nenhuma alteração realizada.';
  }

  function ensureChild(parent, tag, beforeTag='') {
    if(!parent) return null;
    let node=first(parent,tag); if(node) return node;
    const ns=state.doc.documentElement.namespaceURI, prefix=state.doc.documentElement.prefix || 'ans';
    node=state.doc.createElementNS(ns, `${prefix}:${tag}`);
    const before=beforeTag ? children(parent).find(n=>local(n)===beforeTag) : null;
    parent.insertBefore(node,before || null); return node;
  }
  function operatorCodeNode(guide) {
    if(guideType(guide)==='consulta') return first(first(guide,'contratadoExecutante'),'codigoPrestadorNaOperadora');
    return first(first(guide,'codProfissional'),'codigoPrestadorNaOperadora');
  }
  const domainOptions={
    uf:[['11','RO - Rondônia'],['12','AC - Acre'],['13','AM - Amazonas'],['14','RR - Roraima'],['15','PA - Pará'],['16','AP - Amapá'],['17','TO - Tocantins'],['21','MA - Maranhão'],['22','PI - Piauí'],['23','CE - Ceará'],['24','RN - Rio Grande do Norte'],['25','PB - Paraíba'],['26','PE - Pernambuco'],['27','AL - Alagoas'],['28','SE - Sergipe'],['29','BA - Bahia'],['31','MG - Minas Gerais'],['32','ES - Espírito Santo'],['33','RJ - Rio de Janeiro'],['35','SP - São Paulo'],['41','PR - Paraná'],['42','SC - Santa Catarina'],['43','RS - Rio Grande do Sul'],['50','MS - Mato Grosso do Sul'],['51','MT - Mato Grosso'],['52','GO - Goiás'],['53','DF - Distrito Federal'],['98','EX - Países Estrangeiros']],
    conselho:[['01','CRESS - Serviço Social'],['02','COREN - Enfermagem'],['03','CRF - Farmácia'],['04','CREFONO - Fonoaudiologia'],['05','CREFITO - Fisioterapia e Terapia Ocupacional'],['06','CRM - Medicina'],['07','CRN - Nutrição'],['08','CRO - Odontologia'],['09','CRP - Psicologia'],['10','Outros Conselhos'],['11','CRBio - Biologia'],['12','CRBM - Biomedicina'],['13','CREF - Educação Física'],['14','CRMV - Medicina Veterinária'],['15','CRTR - Técnicos em Radiologia']],
    grau:[['00','Cirurgião'],['01','Primeiro Auxiliar'],['02','Segundo Auxiliar'],['03','Terceiro Auxiliar'],['04','Quarto Auxiliar'],['05','Instrumentador'],['06','Anestesista'],['07','Auxiliar de Anestesista'],['08','Consultor'],['09','Perfusionista'],['10','Pediatra na sala de parto'],['11','Auxiliar SADT'],['12','Clínico'],['13','Intensivista']],
    acidente:[['0','Trabalho'],['1','Trânsito'],['2','Outros'],['9','Não Acidente']],
    atendimento:[['01','Remoção'],['02','Pequena Cirurgia'],['03','Outras Terapias'],['04','Consulta'],['05','Exame Ambulatorial'],['06','Atendimento Domiciliar'],['07','Internação'],['08','Quimioterapia'],['09','Radioterapia'],['10','Terapia Renal Substitutiva'],['11','Pronto Socorro'],['13','Pequeno atendimento'],['14','Saúde Ocupacional - Admissional'],['15','Saúde Ocupacional - Demissional'],['16','Saúde Ocupacional - Periódico'],['17','Saúde Ocupacional - Retorno ao trabalho'],['18','Saúde Ocupacional - Mudança de função'],['19','Saúde Ocupacional - Promoção à saúde'],['20','Saúde Ocupacional - Beneficiário novo'],['21','Saúde Ocupacional - Assistência a demitidos'],['22','Telessaúde'],['23','Exame']],
    regime:[['01','Ambulatorial'],['02','Domiciliar'],['03','Internação'],['04','Pronto-socorro'],['05','Telessaúde']],
    consulta:[['1','Primeira Consulta'],['2','Retorno / Seguimento'],['3','Pré-natal'],['4','Por encaminhamento']],
    tecnica:[['1','Convencional'],['2','Vídeo'],['3','Robótica']],
    tabela:[['00','Tabela própria das operadoras'],['18','Diárias, taxas e gases medicinais'],['19','Materiais e OPME'],['20','Medicamentos'],['22','Procedimentos e eventos em saúde'],['23','Caráter do atendimento'],['24','CBO'],['25','Código da despesa'],['26','Conselho profissional'],['35','Grau de participação'],['36','Indicador de acidente'],['48','Técnica utilizada'],['50','Tipo de atendimento'],['52','Tipo de consulta'],['59','Unidade da federação'],['76','Regime de atendimento'],['87','Tabelas de domínio'],['98','Tabela própria de pacotes']]
  };
  function def(label,scope,tag,type='text',opts={}) { return {label,scope,tag,type,...opts}; }
  function fieldDefsForGuide(guide) {
    const common=[
      def('Registro ANS','header','registroANS','text',{key:'ans',apply:'ans'}),
      def('Número guia prestador','header','numeroGuiaPrestador'),
      def('Número guia operadora','custom','numeroGuiaOperadora','text',{finder:g=>first(g,'numeroGuiaOperadora')}),
      def('Carteira','dadosBeneficiario','numeroCarteira'),
      def('Indicação de acidente','guide','indicacaoAcidente','text',{list:'acidente'}),
      def('Observação','guide','observacao','textarea')
    ];
    if(guideType(guide)==='consulta') return [...common,
      def('Código na operadora','custom','codigoPrestadorNaOperadora','text',{key:'operatorCode',apply:'operatorCode',finder:operatorCodeNode}),
      def('CNES','contratadoExecutante','CNES'),
      def('Profissional executante','profissionalExecutante','nomeProfissional'),
      def('Conselho do executante','profissionalExecutante','conselhoProfissional','text',{list:'conselho'}),
      def('Número do conselho','profissionalExecutante','numeroConselhoProfissional'),
      def('UF do executante','profissionalExecutante','UF','text',{list:'uf'}),
      def('CBO do executante','profissionalExecutante','CBOS'),
      def('Data de atendimento','dadosAtendimento','dataAtendimento','date',{key:'execucao'}),
      def('Código da tabela','procedimento','codigoTabela','text',{list:'tabela'}),
      def('Código do procedimento','procedimento','codigoProcedimento'),
      def('Valor do procedimento','procedimento','valorProcedimento','number'),
      def('Regime de atendimento','dadosAtendimento','regimeAtendimento','text',{list:'regime'}),
      def('Tipo de consulta','dadosAtendimento','tipoConsulta','text',{list:'consulta'}),
      def('Tipo de saída','dadosAtendimento','tipoSaida')
    ];
    return [...common.slice(0,2),
      def('Guia principal','header','guiaPrincipal'),common[2],
      def('Data de autorização','dadosAutorizacao','dataAutorizacao','date',{key:'autorizacao'}),
      def('Senha','dadosAutorizacao','senha'),common[3],
      def('Data da solicitação','dadosSolicitacao','dataSolicitacao','date'),
      def('Caráter do atendimento','dadosSolicitacao','caraterAtendimento'),
      def('Indicação clínica','dadosSolicitacao','indicacaoClinica','textarea',{create:true}),
      def('Profissional solicitante','profissionalSolicitante','nomeProfissional'),
      def('Conselho do solicitante','profissionalSolicitante','conselhoProfissional','text',{list:'conselho'}),
      def('Número conselho solicitante','profissionalSolicitante','numeroConselhoProfissional'),
      def('UF do solicitante','profissionalSolicitante','UF','text',{list:'uf'}),
      def('CBO do solicitante','profissionalSolicitante','CBOS'),
      def('Código contratado executante','contratadoExecutante','codigoPrestadorNaOperadora'),
      def('CNES','dadosExecutante','CNES'),
      def('Código individual na operadora','custom','codigoPrestadorNaOperadora','text',{key:'operatorCode',apply:'operatorCode',finder:operatorCodeNode}),
      def('Profissional executante','equipeSadt','nomeProf'),
      def('Conselho do executante','equipeSadt','conselho','text',{list:'conselho'}),
      def('Número conselho executante','equipeSadt','numeroConselhoProfissional'),
      def('UF do executante','equipeSadt','UF','text',{list:'uf'}),
      def('CBO do executante','equipeSadt','CBOS'),
      def('Grau de participação','equipeSadt','grauPart','text',{list:'grau',apply:'grauPart'}),
      common[4],
      def('Tipo de atendimento','dadosAtendimento','tipoAtendimento','text',{list:'atendimento'}),
      def('Regime de atendimento','dadosAtendimento','regimeAtendimento','text',{list:'regime'}),
      def('Tipo de consulta','dadosAtendimento','tipoConsulta','text',{list:'consulta'}),
      def('Data de execução','procedimentoExecutado','dataExecucao','date',{key:'execucao'}),
      def('Código da tabela','procedimento','codigoTabela','text',{list:'tabela'}),
      def('Código do procedimento','procedimento','codigoProcedimento'),
      def('Descrição do procedimento','procedimento','descricaoProcedimento'),
      def('Quantidade','procedimentoExecutado','quantidadeExecutada','number',{step:'1'}),
      def('Técnica utilizada','procedimentoExecutado','tecnicaUtilizada','text',{create:true,before:'reducaoAcrescimo',list:'tecnica'}),
      def('Valor unitário','procedimentoExecutado','valorUnitario','number'),
      common[5]
    ];
  }
  function fieldNode(definition,guide,create=false) {
    if(definition.scope==='header') return first(guideHeader(guide),definition.tag);
    if(definition.scope==='guide') return first(guide,definition.tag);
    if(definition.scope==='custom') return definition.finder?.(guide) || null;
    const scope=first(guide,definition.scope); let node=first(scope,definition.tag);
    if(!node && create && definition.create) node=ensureChild(scope,definition.tag,definition.before);
    return node;
  }
  function applyEverywhere(group,newValue,currentGuideNo) {
    if(group==='ans') {
      descendants(state.doc,'registroANS').forEach(node=>{const before=node.textContent;if(before!==newValue){node.textContent=newValue;state.changes.push({guide:'todas',field:'Registro ANS',before,after:newValue});}}); return;
    }
    if(group==='operatorCode') state.guides.forEach((guide,index)=>{const node=operatorCodeNode(guide);if(node&&node.textContent!==newValue){const before=node.textContent;node.textContent=newValue;state.changes.push({guide:index+1,field:'Código na operadora',before,after:newValue});}});
    if(group==='grauPart') state.guides.forEach((guide,index)=>{if(guideType(guide)!=='sadt')return;const node=first(first(guide,'equipeSadt'),'grauPart');if(node&&node.textContent!==newValue){const before=node.textContent;node.textContent=newValue;state.changes.push({guide:index+1,field:'Grau de participação',before,after:newValue});}});
  }

  window.xmlAbrirGuia=index=>{
    state.selected=index; const guide=state.guides[index],fields=[],defs=fieldDefsForGuide(guide).filter(d=>fieldNode(d,guide,false)||d.create);
    byId('xml-editor-title').textContent=`Editar guia ${index+1} — ${value(guideHeader(guide),'numeroGuiaPrestador')} (${guideType(guide)==='consulta'?'Consulta':'SP/SADT'})`;
    byId('xml-guide-form').innerHTML=defs.map((d,i)=>{
      const node=fieldNode(d,guide,false); fields.push({definition:d,node});
      const current=node?.textContent?.trim()||'', step=d.type==='number'?`step="${d.step||'0.01'}"`:'';
      const listId=d.list?`xml-list-${d.list}-${i}`:'';
      const dataList=d.list?`<datalist id="${listId}">${domainOptions[d.list].map(([code,label])=>`<option value="${esc(code)}">${esc(label)} - ${esc(code)}</option>`).join('')}</datalist>`:'';
      const control=d.type==='textarea'
        ? `<textarea data-xml-index="${i}" class="xml-edit-control min-h-[88px] py-3">${esc(current)}</textarea>`
        : `<input data-xml-index="${i}" type="${d.type}" ${step} ${d.list?`list="${listId}" autocomplete="off"`:''} value="${esc(current)}" class="xml-edit-control">${dataList}`;
      const hint=d.list?`<span class="text-[10px] text-outline">Digite o código, sigla ou descrição para pesquisar.</span>`:'';
      const apply=d.apply?`<label class="flex items-center gap-2 mt-2 text-[11px] text-tertiary cursor-pointer"><input type="checkbox" data-xml-apply="${i}" class="rounded border-outline-variant bg-surface-container-highest">Aplicar a todas as guias</label>`:'';
      return `<label class="flex flex-col gap-1.5 ${d.type==='textarea'?'md:col-span-2':''}"><span class="text-xs font-bold text-on-surface-variant">${esc(d.label)}</span>${control}${hint}${apply}</label>`;
    }).join('');
    state.editFields=fields; byId('xml-editor').classList.remove('hidden'); byId('xml-editor').scrollIntoView({behavior:'smooth',block:'start'});
  };
  window.xmlFecharEditor=()=>{byId('xml-editor').classList.add('hidden');state.selected=-1;};
  window.xmlSalvarGuia=()=>{
    if(state.selected<0)return; const guideNo=state.selected+1,guide=state.guides[state.selected],inputs=Array.from(byId('xml-guide-form').querySelectorAll('[data-xml-index]'));
    const prospective={};inputs.forEach(input=>{const f=state.editFields[Number(input.dataset.xmlIndex)];if(f?.definition.key)prospective[f.definition.key]=input.value.trim();});
    if(prospective.autorizacao&&prospective.execucao&&prospective.execucao<prospective.autorizacao){alert('A data de atendimento/execução não pode ser anterior à data de autorização.');return;}
    inputs.forEach(input=>{const i=Number(input.dataset.xmlIndex),f=state.editFields[i],d=f.definition;let node=f.node||fieldNode(d,guide,true);if(!node)return;const before=node.textContent,after=input.value.trim();const apply=byId('xml-guide-form').querySelector(`[data-xml-apply="${i}"]`)?.checked;if(apply){applyEverywhere(d.apply,after,guideNo);return;}if(before!==after){node.textContent=after;state.changes.push({guide:guideNo,field:d.label,before,after});}});
    if(guideType(guide)==='sadt') {const item=first(guide,'procedimentoExecutado'),qtd=Number(value(item,'quantidadeExecutada')||0),unit=Number(value(item,'valorUnitario')||0),total=(Math.round(qtd*unit*100)/100).toFixed(2),itemTotal=first(item,'valorTotal'),guideTotal=descendants(guide,'valorTotal').find(n=>children(n).length)||null;if(itemTotal)itemTotal.textContent=total;const vp=first(guideTotal,'valorProcedimentos'),vg=first(guideTotal,'valorTotalGeral');if(vp)vp.textContent=total;if(vg)vg.textContent=total;}
    const hashNode=first(state.doc,'hash');if(hashNode)hashNode.textContent=calcularHash(); render(); xmlFecharEditor();
  };

  window.xmlRevalidar=()=>render();
  window.xmlExportar=()=>{
    if(!state.doc)return; const a=auditar(); if(a.issues.some(x=>x.level==='erro')&&!confirm('Ainda existem erros na auditoria. Deseja exportar mesmo assim?'))return;
    const hashNode=first(state.doc,'hash');const newHash=calcularHash();if(hashNode)hashNode.textContent=newHash;
    let xml=new XMLSerializer().serializeToString(state.doc);if(!xml.startsWith('<?xml'))xml='<?xml version="1.0" encoding="ISO-8859-1"?>\n'+xml;
    const bytes=new Uint8Array(xml.length);for(let i=0;i<xml.length;i++){const code=xml.charCodeAt(i);bytes[i]=code<=255?code:63;}
    const blob=new Blob([bytes],{type:'application/xml'});const aTag=document.createElement('a');aTag.href=URL.createObjectURL(blob);const original=state.file?.name||'lote.xml';const oldHash=state.audit?.informed||'';aTag.download=oldHash&&original.includes(oldHash)?original.replace(oldHash,newHash):original.replace(/\.xml$/i,`_EDIT_${newHash}.xml`);aTag.click();setTimeout(()=>URL.revokeObjectURL(aTag.href),1000);render();
  };
  window.xmlLimpar=()=>{state.doc=null;state.file=null;state.guides=[];state.changes=[];byId('xml-workspace').classList.add('hidden');byId('xml-file-input').value='';xmlFecharEditor();};

  async function loadFile(file){
    if(!file)return; const buffer=await file.arrayBuffer(); let text; try{text=new TextDecoder('iso-8859-1').decode(buffer);}catch{text=new TextDecoder().decode(buffer);} const doc=new DOMParser().parseFromString(text,'application/xml');const err=doc.querySelector('parsererror');if(err){alert('XML inválido: '+err.textContent.slice(0,220));return;}const guides=[...descendants(doc,'guiaSP-SADT'),...descendants(doc,'guiaConsulta')];if(!guides.length){alert('Nenhuma guia SP/SADT ou Consulta foi encontrada neste XML.');return;}state.doc=doc;state.file=file;state.guides=guides;state.changes=[];byId('xml-file-name').textContent=file.name;byId('xml-file-meta').textContent=`${(file.size/1024).toFixed(1)} KB • XML local • original preservado`;byId('xml-workspace').classList.remove('hidden');render();byId('xml-workspace').scrollIntoView({behavior:'smooth',block:'start'});
  }

  document.addEventListener('DOMContentLoaded',()=>{
    const input=byId('xml-file-input'),button=byId('xml-select-btn'),drop=byId('xml-drop-zone');if(!input||!button||!drop)return;
    button.addEventListener('click',()=>input.click());input.addEventListener('change',()=>loadFile(input.files[0]));
    ['dragenter','dragover'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add('border-tertiary');}));
    ['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove('border-tertiary');}));
    drop.addEventListener('drop',e=>loadFile(Array.from(e.dataTransfer.files).find(f=>f.name.toLowerCase().endsWith('.xml'))));
  });
})();
