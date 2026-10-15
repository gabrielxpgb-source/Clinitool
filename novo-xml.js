(function () {
  'use strict';
  const state = {unidades:[], operadoras:[], especialidades:[], configuracoes:[], tabelas:[], itens:[], profissionais:[]};
  const el = id => document.getElementById(id);
  const escXml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  const normalize = value => String(value || '').trim().toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
  const digits = value => String(value || '').replace(/\D/g, '');

  function status(message, type='ok') {
    const box=el('novo-xml-status'); if(!box)return;
    box.textContent=message; box.className=`p-3 rounded-xl border text-sm ${type==='erro'?'border-error bg-error-container text-on-error-container':'border-secondary bg-secondary-container text-on-secondary-container'}`;
  }
  function option(value,label){return `<option value="${value}">${String(label||'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}</option>`;}

  async function load() {
    const queries=[
      _supabase.from('clinifat_unidades').select('*').eq('ativo',true).order('ordem').order('nome'),
      _supabase.from('clinifat_operadoras').select('*').eq('ativo',true).order('ordem').order('nome'),
      _supabase.from('clinifat_especialidades').select('*').eq('ativo',true).eq('modalidade','consulta').order('ordem').order('nome'),
      _supabase.from('clinifat_xml_configuracoes').select('*').eq('ativo',true),
      _supabase.from('clinifat_tabelas_valores').select('*').eq('ativo',true).order('vigencia_inicio',{ascending:false}),
      _supabase.from('clinifat_tabela_valores_itens').select('*'),
      _supabase.from('guidecheck_profissionais').select('*').eq('ativo',true).order('nome')
    ];
    const r=await Promise.all(queries); const error=r.find(x=>x.error)?.error;
    if(error) throw error;
    [state.unidades,state.operadoras,state.especialidades,state.configuracoes,state.tabelas,state.itens,state.profissionais]=r.map(x=>x.data||[]);
  }

  function renderBase() {
    el('novo-xml-unidade').innerHTML='<option value="">Selecione...</option>'+state.unidades.map(u=>option(u.id,u.nome)).join('');
    el('novo-xml-operadora').innerHTML='<option value="">Selecione...</option>'+state.operadoras.filter(o=>state.especialidades.some(e=>e.operadora_id===o.id)).map(o=>option(o.id,o.nome)).join('');
    el('novo-xml-profissional').innerHTML='<option value="">Selecione ou preencha manualmente</option>'+state.profissionais.map(p=>option(p.id,`${p.nome}${p.especialidade?' • '+p.especialidade:''}`)).join('');
    if(!el('novo-xml-data').value) el('novo-xml-data').value=new Date().toISOString().slice(0,10);
  }

  window.novoXmlAbrir=async function(){
    navegar('tela-novo-xml'); status('Carregando configurações...');
    try{await load();renderBase();status('Base carregada. Selecione unidade e convênio.');}catch(error){status(`Não foi possível carregar a base: ${error.message}`,'erro');}
  };

  function contexto() {
    const unidadeId=Number(el('novo-xml-unidade').value)||0, operadoraId=Number(el('novo-xml-operadora').value)||0, tabelaId=Number(el('novo-xml-tabela').value)||0;
    const unidade=state.unidades.find(x=>x.id===unidadeId), operadora=state.operadoras.find(x=>x.id===operadoraId), tabela=state.tabelas.find(x=>x.id===tabelaId);
    const config=state.configuracoes.find(x=>x.operadora_id===operadoraId&&x.unidade_id===unidadeId)||state.configuracoes.find(x=>x.operadora_id===operadoraId&&x.unidade_id==null);
    return {unidadeId,operadoraId,tabelaId,unidade,operadora,tabela,config};
  }

  window.novoXmlAtualizarContexto=function(){window.novoXmlSelecionarOperadora();};
  window.novoXmlSelecionarOperadora=function(){
    const {operadoraId,unidade,operadora,config}=contexto();
    const tables=state.tabelas.filter(t=>t.operadora_id===operadoraId);
    el('novo-xml-tabela').innerHTML='<option value="">Selecione...</option>'+tables.map(t=>option(t.id,`${t.nome} • ${t.situacao}`)).join('');
    const current=tables.find(t=>t.situacao==='atual')||tables[0]; if(current)el('novo-xml-tabela').value=current.id;
    el('novo-xml-contexto-resumo').innerHTML=operadora?`<b>${operadora.nome}</b> • ${unidade?.nome||'unidade não selecionada'} • ANS ${operadora.registro_ans||'não informado'} • ${config?`TISS ${config.versao_tiss_padrao} • ${config.identificacao_prestador==='cnpj'?'CNPJ':'Código na operadora'}`:'sem configuração XML'}`:'Selecione unidade e convênio.';
    window.novoXmlAtualizarValor();
  };

  window.novoXmlSelecionarProfissional=function(){
    const p=state.profissionais.find(x=>x.id===Number(el('novo-xml-profissional').value)); if(!p)return;
    el('novo-xml-conselho-numero').value=p.crm||p.crm_52||''; el('novo-xml-cbo').value=p.cbo||'';
    el('novo-xml-conselho').value=normalize(p.especialidade).includes('psico')?'09':'06';
    if(p.uf){const uf={RJ:'33',SP:'35',MG:'31'}[String(p.uf).toUpperCase()];if(uf)el('novo-xml-uf').value=uf;}
    window.novoXmlAtualizarValor();
  };

  window.novoXmlAtualizarValor=function(){
    const {operadoraId,tabelaId,unidadeId}=contexto(); if(!operadoraId||!tabelaId)return;
    const p=state.profissionais.find(x=>x.id===Number(el('novo-xml-profissional').value));
    const wanted=normalize(p?.especialidade||'Consulta');
    const specialties=state.especialidades.filter(e=>e.operadora_id===operadoraId);
    const specialty=specialties.find(e=>normalize(e.nome)===wanted)||specialties.find(e=>normalize(e.nome)==='consulta')||(specialties.length===1?specialties[0]:null);
    if(!specialty)return;
    const items=state.itens.filter(i=>i.tabela_id===tabelaId&&i.especialidade_id===specialty.id);
    const item=items.find(i=>i.unidade_id===unidadeId)||items.find(i=>i.unidade_id==null);
    if(item)el('novo-xml-valor').value=Number(item.valor||0).toFixed(2).replace('.',',');
  };

  function field(id,label,validator=v=>!!String(v||'').trim()) {const value=el(id).value.trim();return {value,error:validator(value)?'':label};}
  function build() {
    const ctx=contexto(), prof=state.profissionais.find(x=>x.id===Number(el('novo-xml-profissional').value));
    const required=[field('novo-xml-lote','Número do lote'),field('novo-xml-guia','Número da guia'),field('novo-xml-carteira','Carteira'),field('novo-xml-data','Data do atendimento'),field('novo-xml-procedimento','Procedimento'),field('novo-xml-valor','Valor')];
    const errors=required.map(x=>x.error).filter(Boolean);
    if(!ctx.unidade)errors.push('Unidade'); if(!ctx.operadora)errors.push('Convênio'); if(!ctx.tabela)errors.push('Tabela de valores'); if(!ctx.config)errors.push('Configuração XML da unidade');
    if(!ctx.operadora?.registro_ans)errors.push('Registro ANS'); if(!prof)errors.push('Profissional executante');
    if(errors.length)throw new Error(`Preencha ou configure: ${errors.join(', ')}.`);
    const value=Number(el('novo-xml-valor').value.replace(/\./g,'').replace(',','.')); if(!Number.isFinite(value)||value<0)throw new Error('Valor do procedimento inválido.');
    const now=new Date(), date=now.toISOString().slice(0,10), time=now.toTimeString().slice(0,8), seq=String(now.getTime()).slice(-12);
    const version=String(ctx.config.versao_tiss_padrao||'04.03.00').replace(/^0/,''); const schemaVersion=version.replaceAll('.','_');
    const providerTag=ctx.config.identificacao_prestador==='cnpj'?'CNPJ':'codigoPrestadorNaOperadora'; const providerValue=providerTag==='CNPJ'?ctx.config.cnpj:ctx.config.codigo_prestador;
    if(!providerValue)throw new Error('A identificação do prestador está incompleta na configuração XML.');
    const guia=digits(el('novo-xml-guia').value), lote=digits(el('novo-xml-lote').value);
    const xml=`<?xml version="1.0" encoding="ISO-8859-1"?>\n<ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.ans.gov.br/padroes/tiss/schemas http://www.ans.gov.br/padroes/tiss/schemas/tissV${schemaVersion}.xsd"><ans:cabecalho><ans:identificacaoTransacao><ans:tipoTransacao>ENVIO_LOTE_GUIAS</ans:tipoTransacao><ans:sequencialTransacao>${seq}</ans:sequencialTransacao><ans:dataRegistroTransacao>${date}</ans:dataRegistroTransacao><ans:horaRegistroTransacao>${time}</ans:horaRegistroTransacao></ans:identificacaoTransacao><ans:origem><ans:identificacaoPrestador><ans:${providerTag}>${escXml(providerValue)}</ans:${providerTag}></ans:identificacaoPrestador></ans:origem><ans:destino><ans:registroANS>${escXml(ctx.operadora.registro_ans)}</ans:registroANS></ans:destino><ans:Padrao>${version}</ans:Padrao></ans:cabecalho><ans:prestadorParaOperadora><ans:loteGuias><ans:numeroLote>${lote}</ans:numeroLote><ans:guiasTISS><ans:guiaConsulta><ans:cabecalhoConsulta><ans:registroANS>${escXml(ctx.operadora.registro_ans)}</ans:registroANS><ans:numeroGuiaPrestador>${guia}</ans:numeroGuiaPrestador></ans:cabecalhoConsulta><ans:numeroGuiaOperadora>${guia}</ans:numeroGuiaOperadora><ans:dadosBeneficiario><ans:numeroCarteira>${escXml(el('novo-xml-carteira').value.trim())}</ans:numeroCarteira><ans:atendimentoRN>${el('novo-xml-rn').value}</ans:atendimentoRN></ans:dadosBeneficiario><ans:contratadoExecutante><ans:${providerTag}>${escXml(providerValue)}</ans:${providerTag}>${ctx.config.cnes?`<ans:CNES>${escXml(ctx.config.cnes)}</ans:CNES>`:''}</ans:contratadoExecutante><ans:profissionalExecutante><ans:nomeProfissional>${escXml(prof.nome)}</ans:nomeProfissional><ans:conselhoProfissional>${el('novo-xml-conselho').value}</ans:conselhoProfissional><ans:numeroConselhoProfissional>${escXml(el('novo-xml-conselho-numero').value.trim())}</ans:numeroConselhoProfissional><ans:UF>${el('novo-xml-uf').value}</ans:UF><ans:CBOS>${escXml(el('novo-xml-cbo').value.trim())}</ans:CBOS></ans:profissionalExecutante><ans:indicacaoAcidente>${el('novo-xml-acidente').value}</ans:indicacaoAcidente><ans:dadosAtendimento><ans:regimeAtendimento>01</ans:regimeAtendimento><ans:dataAtendimento>${el('novo-xml-data').value}</ans:dataAtendimento><ans:tipoConsulta>${el('novo-xml-tipo-consulta').value}</ans:tipoConsulta><ans:procedimento><ans:codigoTabela>${escXml(el('novo-xml-codigo-tabela').value.trim())}</ans:codigoTabela><ans:codigoProcedimento>${escXml(el('novo-xml-procedimento').value.trim())}</ans:codigoProcedimento><ans:valorProcedimento>${value.toFixed(2)}</ans:valorProcedimento></ans:procedimento></ans:dadosAtendimento>${el('novo-xml-observacao').value.trim()?`<ans:observacao>${escXml(el('novo-xml-observacao').value.trim())}</ans:observacao>`:''}</ans:guiaConsulta></ans:guiasTISS></ans:loteGuias></ans:prestadorParaOperadora><ans:epilogo><ans:hash></ans:hash></ans:epilogo></ans:mensagemTISS>`;
    const doc=new DOMParser().parseFromString(xml,'application/xml'); const parserError=doc.querySelector('parsererror');if(parserError)throw new Error('Falha ao montar o XML.');
    const hash=window.xmlCalcularHashDocumento?window.xmlCalcularHashDocumento(doc):''; doc.getElementsByTagNameNS('*','hash')[0].textContent=hash;
    const finalXml='<?xml version="1.0" encoding="ISO-8859-1"?>\n'+new XMLSerializer().serializeToString(doc).replace(/^<\?xml[^>]*>\s*/,'');
    return {xml:finalXml,name:`${ctx.operadora.registro_ans}_${lote}_${hash||'NOVO'}.xml`};
  }

  function fileFrom(result){const bytes=new Uint8Array(result.xml.length);for(let i=0;i<result.xml.length;i++)bytes[i]=result.xml.charCodeAt(i)<=255?result.xml.charCodeAt(i):63;return new File([bytes],result.name,{type:'application/xml'});}
  window.novoXmlBaixar=function(){try{const result=build(),file=fileFrom(result),a=document.createElement('a');a.href=URL.createObjectURL(file);a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);status('XML gerado. Recomendamos conferi-lo no XML Edit antes do envio.');}catch(error){status(error.message,'erro');}};
  window.novoXmlAbrirNoEditor=function(){try{const result=build(),file=fileFrom(result),input=el('xml-file-input'),transfer=new DataTransfer();transfer.items.add(file);input.files=transfer.files;navegar('tela-xml-edit');input.dispatchEvent(new Event('change',{bubbles:true}));}catch(error){status(error.message,'erro');}};
})();
