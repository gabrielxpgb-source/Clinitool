(function () {
  'use strict';

  const state = {
    operadoras: [], unidades: [], especialidades: [], configuracoes: [], tabelas: [],
    operadoraId: 0, tabelaId: 0
  };
  const counter = { loaded:false, operadoras:[], especialidades:[], tabelas:[], itens:[], vinculos:[] };

  const el = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const js = value => String(value ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/[\r\n]/g, ' ');
  const money = value => Number(value || 0).toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
  const numberValue = value => Number(String(value ?? '').trim().replace(/\./g, '').replace(',', '.'));

  function status(message, type = 'ok') {
    const box = el('nxml-status');
    if (!box) return;
    box.textContent = message;
    box.className = `p-3 rounded-xl border text-sm ${type === 'erro' ? 'border-error bg-error-container text-on-error-container' : 'border-secondary bg-secondary-container text-on-secondary-container'}`;
  }

  function requireMaster() {
    if (typeof isClinifatMaster !== 'undefined' && isClinifatMaster) return true;
    status('Somente usuários Master podem alterar esta estrutura.', 'erro');
    return false;
  }

  async function queryBase() {
    const [ops, units] = await Promise.all([
      _supabase.from('clinifat_operadoras').select('*').order('ordem').order('nome'),
      _supabase.from('clinifat_unidades').select('*').eq('ativo', true).order('ordem').order('nome')
    ]);
    if (ops.error) throw ops.error;
    if (units.error) throw units.error;
    state.operadoras = ops.data || [];
    state.unidades = units.data || [];
  }

  function renderOperadoras() {
    const select = el('nxml-operadora');
    if (!select) return;
    const previous = String(state.operadoraId || '');
    select.innerHTML = '<option value="">Selecione um convênio</option>' + state.operadoras.map(o => `<option value="${o.id}">${esc(o.nome)}</option>`).join('');
    if ([...select.options].some(o => o.value === previous)) select.value = previous;
  }

  function renderUnidades() {
    const select = el('nxml-config-unidade');
    if (!select) return;
    select.innerHTML = '<option value="">Todas as unidades (configuração compartilhada)</option>' + state.unidades.map(u => `<option value="${u.id}">${esc(u.nome)}</option>`).join('');
  }

  async function carregarOperadora() {
    if (!state.operadoraId) return;
    const [esp, cfg, tab] = await Promise.all([
      _supabase.from('clinifat_especialidades').select('*').eq('operadora_id', state.operadoraId).order('modalidade').order('ordem').order('nome'),
      _supabase.from('clinifat_xml_configuracoes').select('*').eq('operadora_id', state.operadoraId).eq('ativo', true),
      _supabase.from('clinifat_tabelas_valores').select('*').eq('operadora_id', state.operadoraId).eq('ativo', true).order('vigencia_inicio', {ascending:false})
    ]);
    const error = esp.error || cfg.error || tab.error;
    if (error) throw error;
    state.especialidades = esp.data || [];
    state.configuracoes = cfg.data || [];
    state.tabelas = tab.data || [];
    if (!state.tabelas.some(t => t.id === state.tabelaId)) state.tabelaId = 0;
    renderEspecialidades();
    renderTabelas();
    window.nxmlCarregarConfiguracao();
  }

  function renderEspecialidades() {
    el('nxml-especialidades-count').textContent = `${state.especialidades.length} item(ns)`;
    el('nxml-especialidades-lista').innerHTML = state.especialidades.map(e => `
      <div class="cf-list-row ${e.ativo ? '' : 'is-inactive'}">
        <span class="material-symbols-outlined text-sm ${e.modalidade === 'consulta' ? 'text-primary' : 'text-tertiary'}">${e.modalidade === 'consulta' ? 'clinical_notes' : 'biotech'}</span>
        <div class="flex-1 min-w-0"><div class="font-bold text-sm truncate">${esc(e.nome)}</div><div class="text-[10px] text-outline uppercase">${esc(e.modalidade)}</div></div>
        ${typeof isClinifatMaster !== 'undefined' && isClinifatMaster ? `<button type="button" onclick="nxmlExcluirEspecialidade(${e.id},'${js(e.nome)}')" class="p-2 text-error" title="Excluir"><span class="material-symbols-outlined text-sm">delete</span></button>` : ''}
      </div>`).join('') || '<div class="cf-list-empty">Nenhuma especialidade cadastrada.</div>';
  }

  function renderTabelas() {
    el('nxml-tabelas-lista').innerHTML = state.tabelas.map(t => `
      <button type="button" onclick="nxmlSelecionarTabela(${t.id})" class="cf-list-row w-full text-left ${t.id === state.tabelaId ? 'border-secondary bg-secondary-container/20' : ''}">
        <span class="material-symbols-outlined text-sm text-secondary">price_change</span>
        <div class="flex-1 min-w-0"><div class="font-bold text-sm truncate">${esc(t.nome)}</div><div class="text-[10px] text-outline">${esc(t.situacao.toUpperCase())} • desde ${esc(t.vigencia_inicio)}</div></div>
        <span class="material-symbols-outlined text-sm text-outline">chevron_right</span>
      </button>`).join('') || '<div class="cf-list-empty">Nenhuma tabela de valores.</div>';
    if (!state.tabelaId) el('nxml-tabela-editor').innerHTML = '<div class="cf-list-empty">Selecione uma tabela ou crie uma nova.</div>';
  }

  async function renderTabelaEditor() {
    const table = state.tabelas.find(t => t.id === state.tabelaId);
    if (!table) return;
    const {data, error} = await _supabase.from('clinifat_tabela_valores_itens').select('*').eq('tabela_id', table.id);
    if (error) return status(error.message, 'erro');
    const items = data || [];
    const rows = state.especialidades.filter(e => e.ativo).map(e => {
      const item = items.find(i => i.especialidade_id === e.id && i.unidade_id == null);
      return `<label class="grid grid-cols-[1fr_130px] items-center gap-3 py-2 border-b border-outline-variant"><span><b class="text-sm">${esc(e.nome)}</b><small class="block text-[10px] text-outline uppercase">${esc(e.modalidade)}</small></span><input data-nxml-valor="${e.id}" class="sa-input text-right" inputmode="decimal" value="${Number(item?.valor || 0).toFixed(2).replace('.', ',')}"></label>`;
    }).join('');
    el('nxml-tabela-editor').innerHTML = `
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3"><div><h5 class="font-bold text-secondary">${esc(table.nome)}</h5><div class="text-[10px] text-outline">Vigência: ${esc(table.vigencia_inicio)}${table.vigencia_fim ? ` até ${esc(table.vigencia_fim)}` : ''}</div></div><span class="px-2 py-1 rounded-full bg-secondary-container text-on-secondary-container text-[10px] font-bold">${esc(table.situacao.toUpperCase())}</span></div>
      <div>${rows || '<div class="cf-list-empty">Cadastre especialidades antes de informar valores.</div>'}</div>
      ${typeof isClinifatMaster !== 'undefined' && isClinifatMaster ? '<div class="flex justify-end mt-4"><button type="button" onclick="nxmlSalvarValoresTabela()" class="h-10 px-4 rounded-xl bg-secondary text-on-secondary font-bold flex items-center gap-2"><span class="material-symbols-outlined text-sm">save</span>Salvar valores</button></div>' : ''}`;
  }

  window.nxmlCarregarBase = async function () {
    if (!el('nxml-operadora')) return;
    try {
      await queryBase();
      renderOperadoras();
      renderUnidades();
    } catch (error) {
      status(`Não foi possível carregar a nova estrutura: ${error.message}`, 'erro');
    }
  };

  window.nxmlSelecionarOperadora = async function () {
    state.operadoraId = Number(el('nxml-operadora').value) || 0;
    state.tabelaId = 0;
    el('nxml-workspace').classList.toggle('hidden', !state.operadoraId);
    el('nxml-excluir-convenio-btn').classList.toggle('hidden', !state.operadoraId || !(typeof isClinifatMaster !== 'undefined' && isClinifatMaster));
    if (!state.operadoraId) return;
    const op = state.operadoras.find(o => o.id === state.operadoraId);
    el('nxml-registro-ans').value = op?.registro_ans || '';
    el('nxml-config-unidade').value = '';
    try { await carregarOperadora(); } catch (error) { status(error.message, 'erro'); }
  };

  window.nxmlAbrirNovoConvenio = function () {
    if (!requireMaster()) return;
    el('nxml-novo-convenio-form').classList.remove('hidden');
    el('nxml-novo-convenio-nome').focus();
  };

  window.nxmlFecharNovoConvenio = function () {
    el('nxml-novo-convenio-form').classList.add('hidden');
    el('nxml-novo-convenio-nome').value = '';
    el('nxml-novo-convenio-ans').value = '';
  };

  window.nxmlCriarConvenio = async function () {
    if (!requireMaster()) return;
    const nome = el('nxml-novo-convenio-nome').value.trim();
    const registro_ans = el('nxml-novo-convenio-ans').value.replace(/\D/g, '') || null;
    if (!nome) return status('Informe o nome do convênio.', 'erro');
    const {data, error} = await _supabase.from('clinifat_operadoras').insert({nome, registro_ans}).select('*').single();
    if (error) return status(error.message, 'erro');
    window.nxmlFecharNovoConvenio();
    state.operadoraId = data.id;
    await queryBase();
    renderOperadoras(); renderUnidades();
    el('nxml-operadora').value = String(data.id);
    await window.nxmlSelecionarOperadora();
    status('Convênio cadastrado. Agora informe as especialidades, a configuração XML e a tabela de valores.');
  };

  window.nxmlSalvarOperadora = async function () {
    if (!requireMaster() || !state.operadoraId) return;
    const registro_ans = el('nxml-registro-ans').value.replace(/\D/g, '') || null;
    const {error} = await _supabase.from('clinifat_operadoras').update({registro_ans, updated_at:new Date().toISOString()}).eq('id', state.operadoraId);
    if (error) return status(error.message, 'erro');
    const op = state.operadoras.find(o => o.id === state.operadoraId); if (op) op.registro_ans = registro_ans;
    status('Registro ANS salvo.');
  };

  window.nxmlAbrirExclusaoConvenio = function () {
    if (!requireMaster() || !state.operadoraId) return;
    const op = state.operadoras.find(o => o.id === state.operadoraId);
    el('nxml-excluir-convenio-nome').textContent = op?.nome || 'este convênio';
    el('nxml-excluir-convenio-confirmacao').value = '';
    const modal = el('nxml-excluir-convenio-modal');
    modal.classList.remove('hidden'); modal.classList.add('flex');
    setTimeout(() => el('nxml-excluir-convenio-confirmacao').focus(), 50);
  };

  window.nxmlFecharExclusaoConvenio = function () {
    const modal = el('nxml-excluir-convenio-modal');
    modal.classList.add('hidden'); modal.classList.remove('flex');
    el('nxml-excluir-convenio-confirmacao').value = '';
  };

  window.nxmlConfirmarExclusaoConvenio = async function () {
    if (!requireMaster() || !state.operadoraId) return;
    if (el('nxml-excluir-convenio-confirmacao').value.trim().toUpperCase() !== 'EXCLUIR') {
      return status('Digite EXCLUIR para confirmar a remoção.', 'erro');
    }
    const id = state.operadoraId;
    const {error} = await _supabase.from('clinifat_operadoras').delete().eq('id', id);
    if (error) return status(error.message, 'erro');
    window.nxmlFecharExclusaoConvenio();
    state.operadoraId = 0; state.tabelaId = 0;
    state.especialidades = []; state.configuracoes = []; state.tabelas = [];
    el('nxml-workspace').classList.add('hidden');
    el('nxml-excluir-convenio-btn').classList.add('hidden');
    el('nxml-registro-ans').value = '';
    await queryBase(); renderOperadoras(); renderUnidades();
    status('Convênio excluído da nova estrutura. O cadastro antigo do Contador foi preservado.');
  };

  window.nxmlAdicionarEspecialidade = async function () {
    if (!requireMaster() || !state.operadoraId) return;
    const nome = el('nxml-especialidade-nome').value.trim();
    const modalidade = el('nxml-especialidade-modalidade').value;
    if (!nome) return status('Informe o nome da especialidade.', 'erro');
    const {error} = await _supabase.from('clinifat_especialidades').insert({operadora_id:state.operadoraId, nome, modalidade});
    if (error) return status(error.message, 'erro');
    el('nxml-especialidade-nome').value = '';
    await carregarOperadora(); status('Especialidade adicionada.');
  };

  window.nxmlExcluirEspecialidade = async function (id, nome) {
    if (!requireMaster() || !confirm(`Excluir a especialidade "${nome}" e seus valores nas tabelas?`)) return;
    const {error} = await _supabase.from('clinifat_especialidades').delete().eq('id', id);
    if (error) return status(error.message, 'erro');
    await carregarOperadora(); status('Especialidade excluída.');
  };

  window.nxmlAtualizarIdentificacao = function () {
    const cnpj = el('nxml-identificacao').value === 'cnpj';
    el('nxml-codigo-wrap').classList.toggle('hidden', cnpj);
    el('nxml-cnpj-wrap').classList.toggle('hidden', !cnpj);
    el('nxml-cnpj-wrap').classList.toggle('flex', cnpj);
  };

  window.nxmlCarregarConfiguracao = function () {
    const unit = Number(el('nxml-config-unidade')?.value) || null;
    const cfg = state.configuracoes.find(c => (c.unidade_id == null ? null : Number(c.unidade_id)) === unit);
    el('nxml-identificacao').value = cfg?.identificacao_prestador || 'codigo_operadora';
    el('nxml-codigo-prestador').value = cfg?.codigo_prestador || '';
    el('nxml-cnpj').value = cfg?.cnpj || '';
    el('nxml-cnes').value = cfg?.cnes || '';
    el('nxml-versao-tiss').value = cfg?.versao_tiss_padrao || '04.03.00';
    el('nxml-config-observacao').value = cfg?.observacao || '';
    window.nxmlAtualizarIdentificacao();
  };

  window.nxmlSalvarConfiguracao = async function () {
    if (!requireMaster() || !state.operadoraId) return;
    const unidade_id = Number(el('nxml-config-unidade').value) || null;
    const identificacao_prestador = el('nxml-identificacao').value;
    const payload = {
      operadora_id: state.operadoraId, unidade_id, identificacao_prestador,
      codigo_prestador: identificacao_prestador === 'codigo_operadora' ? el('nxml-codigo-prestador').value.trim() || null : null,
      cnpj: identificacao_prestador === 'cnpj' ? el('nxml-cnpj').value.replace(/\D/g, '') || null : null,
      cnes: el('nxml-cnes').value.replace(/\D/g, '') || null,
      versao_tiss_padrao: el('nxml-versao-tiss').value,
      observacao: el('nxml-config-observacao').value.trim() || null,
      updated_at: new Date().toISOString()
    };
    if (identificacao_prestador === 'codigo_operadora' && !payload.codigo_prestador) return status('Informe o código na operadora.', 'erro');
    if (identificacao_prestador === 'cnpj' && payload.cnpj?.length !== 14) return status('Informe um CNPJ com 14 dígitos.', 'erro');
    const current = state.configuracoes.find(c => (c.unidade_id == null ? null : Number(c.unidade_id)) === unidade_id);
    const query = current ? _supabase.from('clinifat_xml_configuracoes').update(payload).eq('id', current.id) : _supabase.from('clinifat_xml_configuracoes').insert(payload);
    const {error} = await query;
    if (error) return status(error.message, 'erro');
    await carregarOperadora(); el('nxml-config-unidade').value = unidade_id || ''; window.nxmlCarregarConfiguracao();
    status('Configuração XML salva.');
  };

  window.nxmlAbrirNovaTabela = function () {
    if (!requireMaster() || !state.operadoraId) return;
    const sourceOptions = state.tabelas.map(t => `<option value="${t.id}">${esc(t.nome)}</option>`).join('');
    el('nxml-tabela-editor').innerHTML = `
      <h5 class="font-bold text-secondary mb-4">Criar nova tabela de valores</h5>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label class="flex flex-col gap-1 sm:col-span-2"><span class="sa-label">Nome da tabela</span><input id="nxml-nova-tabela-nome" class="sa-input" placeholder="Ex.: 2027 Bradesco"></label>
        <label class="flex flex-col gap-1"><span class="sa-label">Início da vigência</span><input id="nxml-nova-tabela-inicio" type="date" class="sa-input"></label>
        <label class="flex flex-col gap-1"><span class="sa-label">Copiar valores de</span><select id="nxml-nova-tabela-origem" class="sa-input"><option value="">Começar sem valores</option>${sourceOptions}</select></label>
      </div>
      <div class="flex justify-end gap-2 mt-4"><button type="button" onclick="nxmlCancelarNovaTabela()" class="h-10 px-4 rounded-xl border border-outline-variant">Cancelar</button><button type="button" onclick="nxmlCriarTabela()" class="h-10 px-4 rounded-xl bg-secondary text-on-secondary font-bold">Criar tabela</button></div>`;
    el('nxml-nova-tabela-inicio').value = `${new Date().getFullYear()}-01-01`;
    if (state.tabelas[0]) el('nxml-nova-tabela-origem').value = state.tabelas[0].id;
  };

  window.nxmlCancelarNovaTabela = function () { state.tabelaId = 0; renderTabelas(); };

  window.nxmlCriarTabela = async function () {
    if (!requireMaster()) return;
    const nome = el('nxml-nova-tabela-nome').value.trim(), vigencia_inicio = el('nxml-nova-tabela-inicio').value;
    const tabela_origem_id = Number(el('nxml-nova-tabela-origem').value) || null;
    if (!nome || !vigencia_inicio) return status('Informe o nome e o início da vigência.', 'erro');
    const {data, error} = await _supabase.from('clinifat_tabelas_valores').insert({operadora_id:state.operadoraId, nome, vigencia_inicio, situacao:'atual', tabela_origem_id}).select('*').single();
    if (error) return status(error.message, 'erro');
    if (tabela_origem_id) {
      const old = await _supabase.from('clinifat_tabela_valores_itens').select('especialidade_id,unidade_id,valor').eq('tabela_id', tabela_origem_id);
      if (old.error) return status(`Tabela criada, mas os valores não foram copiados: ${old.error.message}`, 'erro');
      if (old.data?.length) {
        const copy = old.data.map(i => ({...i, tabela_id:data.id}));
        const inserted = await _supabase.from('clinifat_tabela_valores_itens').insert(copy);
        if (inserted.error) return status(`Tabela criada, mas os valores não foram copiados: ${inserted.error.message}`, 'erro');
      }
    }
    state.tabelaId = data.id; await carregarOperadora(); await renderTabelaEditor(); status('Nova tabela criada.');
  };

  window.nxmlSelecionarTabela = async function (id) { state.tabelaId = Number(id); renderTabelas(); await renderTabelaEditor(); };

  window.nxmlSalvarValoresTabela = async function () {
    if (!requireMaster() || !state.tabelaId) return;
    const inputs = [...el('nxml-tabela-editor').querySelectorAll('[data-nxml-valor]')];
    const rows = inputs.map(input => ({tabela_id:state.tabelaId, especialidade_id:Number(input.dataset.nxmlValor), unidade_id:null, valor:numberValue(input.value)}));
    if (rows.some(r => !Number.isFinite(r.valor) || r.valor < 0)) return status('Revise os valores informados.', 'erro');
    const removed = await _supabase.from('clinifat_tabela_valores_itens').delete().eq('tabela_id', state.tabelaId).is('unidade_id', null);
    if (removed.error) return status(removed.error.message, 'erro');
    if (rows.length) {
      const saved = await _supabase.from('clinifat_tabela_valores_itens').insert(rows);
      if (saved.error) return status(saved.error.message, 'erro');
    }
    await renderTabelaEditor(); status('Valores da tabela salvos.');
  };

  async function carregarBaseContador(force = false) {
    if (counter.loaded && !force) return true;
    const [ops, esp, tabs, items, links] = await Promise.all([
      _supabase.from('clinifat_operadoras').select('*').eq('ativo', true).order('ordem').order('nome'),
      _supabase.from('clinifat_especialidades').select('*').eq('ativo', true).order('ordem').order('nome'),
      _supabase.from('clinifat_tabelas_valores').select('*').eq('ativo', true).order('vigencia_inicio', {ascending:false}),
      _supabase.from('clinifat_tabela_valores_itens').select('*'),
      _supabase.from('clinifat_operadora_unidades').select('*').eq('ativo', true)
    ]);
    const error = ops.error || esp.error || tabs.error || items.error || links.error;
    if (error) { console.warn('Nova estrutura indisponível no Contador:', error.message); return false; }
    counter.operadoras = ops.data || []; counter.especialidades = esp.data || [];
    counter.tabelas = tabs.data || []; counter.itens = items.data || []; counter.vinculos = links.data || [];
    counter.loaded = true; return true;
  }

  function unidadeSelecionadaId() {
    const nome = el('select-unidade')?.value || '';
    const u = (typeof dados !== 'undefined' ? dados.unidades : []).find(x => x.nome === nome);
    return Number(u?.id) || null;
  }

  function operadorasDoContexto() {
    const unidadeId = unidadeSelecionadaId();
    const especialidadeIds = new Set(counter.especialidades.filter(e => e.modalidade === tipoAtual).map(e => e.operadora_id));
    return counter.operadoras.filter(o => {
      if (!especialidadeIds.has(o.id)) return false;
      const configured = counter.vinculos.filter(v => v.operadora_id === o.id);
      return !configured.length || !unidadeId || configured.some(v => v.unidade_id === unidadeId);
    });
  }

  function tabelaValorAplicavel(tabelaId, operadoraId) {
    const specialties = counter.especialidades.filter(e => e.operadora_id === operadoraId && e.modalidade === tipoAtual);
    const ids = new Set(specialties.map(e => e.id));
    const unitId = unidadeSelecionadaId();
    const candidates = counter.itens.filter(i => i.tabela_id === tabelaId && ids.has(i.especialidade_id));
    const resolved = specialties.map(e => candidates.find(i => i.especialidade_id === e.id && i.unidade_id === unitId) || candidates.find(i => i.especialidade_id === e.id && i.unidade_id == null)).filter(Boolean);
    const values = [...new Set(resolved.map(i => Number(i.valor || 0)))];
    if (values.length === 1) return {valor:values[0], variado:false};
    if (values.length > 1) return {valor:0, variado:true};
    return {valor:0, variado:false};
  }

  function normalize(value) {
    return String(value || '').trim().toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  }

  function contextoContador() {
    const idx = el('select-convenio')?.value ?? '', tabelaId = Number(el('select-tabela-valores')?.value) || 0;
    const convenio = idx !== '' ? dados.convenios[tipoAtual]?.[Number(idx)] : null;
    return {convenio, tabelaId, unidadeId:unidadeSelecionadaId()};
  }

  window.nxmlValorProfissional = function (nome) {
    const {convenio, tabelaId, unidadeId} = contextoContador();
    if (!convenio?.novaEstrutura || !tabelaId) return Number(valorAtual || 0);
    const meta = profissionaisMeta?.[nome] || {};
    const desired = normalize(meta.especialidade || (tipoAtual === 'consulta' ? 'Consulta' : 'SADT'));
    const specialties = counter.especialidades.filter(e => e.operadora_id === convenio.id && e.modalidade === tipoAtual);
    const specialty = specialties.find(e => normalize(e.nome) === desired)
      || specialties.find(e => normalize(e.nome) === normalize(tipoAtual === 'consulta' ? 'Consulta' : 'SADT'))
      || (specialties.length === 1 ? specialties[0] : null);
    if (!specialty) return 0;
    const items = counter.itens.filter(i => i.tabela_id === tabelaId && i.especialidade_id === specialty.id);
    const item = items.find(i => i.unidade_id === unidadeId) || items.find(i => i.unidade_id == null);
    return Number(item?.valor || 0);
  };

  window.nxmlCalcularTotalContador = function (counts) {
    return Object.entries(counts || {}).reduce((total, [nome, qtd]) => total + Number(qtd || 0) * window.nxmlValorProfissional(nome), 0);
  };

  window.nxmlAtualizarValoresCards = function () {
    Object.keys(contadores || {}).forEach(nome => {
      const label = document.getElementById(`valor-prof-${nome}`), value = window.nxmlValorProfissional(nome);
      if (label) label.textContent = value > 0 ? `${money(value)} por atendimento` : 'Valor não configurado';
    });
  };

  const carregarDropdownConveniosLegado = typeof window.carregarDropdownConvenios === 'function' ? window.carregarDropdownConvenios : null;
  window.carregarDropdownConvenios = async function () {
    const select = el('select-convenio'), tableSelect = el('select-tabela-valores');
    if (!select) return;
    select.innerHTML = '<option value="">Carregando convênios...</option>';
    if (tableSelect) { tableSelect.innerHTML = '<option value="">Selecione primeiro o convênio</option>'; tableSelect.disabled = true; }
    const available = await carregarBaseContador();
    const list = available ? operadorasDoContexto() : [];
    if (!list.length) { if (carregarDropdownConveniosLegado) carregarDropdownConveniosLegado(); return; }
    dados.convenios[tipoAtual] = list.map(o => ({id:o.id, nome:o.nome, valor:0, novaEstrutura:true}));
    select.innerHTML = '<option value="">Selecione um convênio</option>';
    dados.convenios[tipoAtual].forEach((c, index) => {
      const opt = document.createElement('option'); opt.value = index; opt.textContent = c.nome; select.appendChild(opt);
    });
    valorAtual = 0; atualizarTotais();
  };

  window.selecionarConvenio = function () {
    const idx = el('select-convenio').value, tableSelect = el('select-tabela-valores');
    valorAtual = 0;
    if (idx === '') { tableSelect.innerHTML = '<option value="">Selecione primeiro o convênio</option>'; tableSelect.disabled = true; atualizarTotais(); return; }
    const conv = dados.convenios[tipoAtual][Number(idx)];
    if (!conv?.novaEstrutura) {
      valorAtual = Number(conv?.valor || 0); tableSelect.innerHTML = '<option value="">Valor do cadastro antigo</option>'; tableSelect.disabled = true; atualizarTotais(); return;
    }
    const tables = counter.tabelas.filter(t => t.operadora_id === conv.id);
    tableSelect.disabled = false;
    tableSelect.innerHTML = '<option value="">Selecione uma tabela</option>' + tables.map(t => `<option value="${t.id}">${esc(t.nome)} • ${esc(t.situacao)}</option>`).join('');
    const current = tables.find(t => t.situacao === 'atual') || tables[0];
    if (current) { tableSelect.value = String(current.id); window.nxmlContadorSelecionarTabela(); }
    else atualizarTotais();
  };

  window.nxmlContadorSelecionarTabela = function () {
    const idx = el('select-convenio').value, tabelaId = Number(el('select-tabela-valores').value) || 0;
    const warning = el('contador-tabela-aviso');
    warning?.classList.add('hidden');
    if (idx === '' || !tabelaId) { valorAtual = 0; atualizarTotais(); return; }
    const conv = dados.convenios[tipoAtual][Number(idx)], result = tabelaValorAplicavel(tabelaId, conv.id);
    valorAtual = result.valor;
    const missing = Object.keys(contadores || {}).filter(nome => window.nxmlValorProfissional(nome) <= 0);
    if (missing.length && warning) {
      warning.textContent = `Sem valor correspondente na tabela para: ${missing.join(', ')}. Revise a especialidade desses profissionais ou os valores da tabela.`;
      warning.classList.remove('hidden');
    } else if (result.variado && warning) {
      warning.textContent = 'Valores diferentes por especialidade: o total será calculado individualmente conforme cada profissional.';
      warning.classList.remove('hidden');
    }
    window.nxmlAtualizarValoresCards();
    atualizarTotais();
  };

  window.nxmlContadorUnidadeAlterada = async function () {
    const current = el('select-convenio')?.value || '';
    await window.carregarDropdownConvenios();
    if (current && [...el('select-convenio').options].some(o => o.value === current)) { el('select-convenio').value = current; window.selecionarConvenio(); }
  };

  document.addEventListener('DOMContentLoaded', () => {
    const details = el('cfg-novo-xml');
    details?.addEventListener('toggle', () => { if (details.open) window.nxmlCarregarBase(); });
    el('nxml-especialidade-nome')?.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); window.nxmlAdicionarEspecialidade(); } });
    el('nxml-novo-convenio-nome')?.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); window.nxmlCriarConvenio(); } });
    el('nxml-novo-convenio-ans')?.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); window.nxmlCriarConvenio(); } });
  });
})();
