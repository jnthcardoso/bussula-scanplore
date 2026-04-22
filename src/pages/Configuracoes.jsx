import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const fmt = v => new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(v||0)

export default function Configuracoes() {
  const [config, setConfig]     = useState(null)
  const [unidades, setUnidades] = useState([])
  const [perfil, setPerfil]     = useState(null)
  const [loading, setLoading]   = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso]   = useState('')
  const [novaUnidade, setNovaUnidade] = useState({ nome:'', cidade:'' })
  const [senha, setSenha]       = useState({ atual:'', nova:'', confirmar:'' })
  const [erroSenha, setErroSenha] = useState('')
  const [sucessoSenha, setSucessoSenha] = useState('')

  useEffect(() => { init() }, [])

  async function init() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: p } = await supabase.from('perfis').select('*, empresas(nome)').eq('id', user.id).single()
    setPerfil(p)
    const { data: cfg } = await supabase.from('config_comissao').select('*').eq('empresa_id', p.empresa_id).single()
    setConfig(cfg || {
      percentual_fixo: 3, usa_escalonado: true,
      faixa1_limite: 79, faixa1_percentual: 2,
      faixa2_limite: 99, faixa2_percentual: 3,
      faixa3_percentual: 4, bonus_meta_ativo: false,
      bonus_meta_valor: 0, usa_comissao_por_produto: false
    })
    const { data: uns } = await supabase.from('unidades').select('*').eq('empresa_id', p.empresa_id).order('nome')
    setUnidades(uns || [])
    setLoading(false)
  }

  async function salvarComissao() {
    setSalvando(true)
    await supabase.from('config_comissao').upsert({ ...config, empresa_id: perfil.empresa_id }, { onConflict: 'empresa_id' })
    setSucesso('Configurações de comissão salvas!')
    setTimeout(() => setSucesso(''), 3000)
    setSalvando(false)
  }

  async function adicionarUnidade() {
    if (!novaUnidade.nome.trim()) return
    await supabase.from('unidades').insert({ ...novaUnidade, empresa_id: perfil.empresa_id })
    setNovaUnidade({ nome:'', cidade:'' })
    init()
  }

  async function toggleUnidade(id, ativo) {
    await supabase.from('unidades').update({ ativo: !ativo }).eq('id', id)
    init()
  }

  async function trocarSenha() {
    setErroSenha(''); setSucessoSenha('')
    if (senha.nova !== senha.confirmar) { setErroSenha('As senhas não conferem.'); return }
    if (senha.nova.length < 6) { setErroSenha('A nova senha precisa ter pelo menos 6 caracteres.'); return }
    const { error } = await supabase.auth.updateUser({ password: senha.nova })
    if (error) { setErroSenha('Erro ao trocar senha: ' + error.message); return }
    setSucessoSenha('Senha alterada com sucesso!')
    setSenha({ atual:'', nova:'', confirmar:'' })
    setTimeout(() => setSucessoSenha(''), 3000)
  }

  const canEdit = perfil && ['ceo','diretor'].includes(perfil.papel)

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%' }}>
      <div className="spin" style={{ width:32, height:32, border:'3px solid var(--bg3)', borderTop:'3px solid var(--accent)', borderRadius:'50%' }}/>
    </div>
  )

  return (
    <div style={{ padding:32, maxWidth:900, animation:'fadeIn 0.25s ease' }}>
      <div style={{ marginBottom:28 }}>
        <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Administração</div>
        <h1 style={{ fontSize:22, fontWeight:500, marginTop:2 }}>Configurações</h1>
      </div>

      {sucesso && (
        <div style={{ background:'var(--accent-dim)', border:'1px solid rgba(0,200,150,0.3)', borderRadius:8, padding:'10px 16px', fontSize:13, color:'var(--accent)', marginBottom:20 }}>
          {sucesso}
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>

        {/* COMISSÕES */}
        {canEdit && config && (
          <div className="card" style={{ gridColumn:'1/-1' }}>
            <div style={{ fontSize:14, fontWeight:500, marginBottom:20, color:'var(--text2)' }}>Regras de comissão</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:20 }}>
              <div>
                <label className="label">Modelo</label>
                <select className="input" value={config.usa_escalonado ? 'escalonado' : 'fixo'}
                  onChange={e => setConfig(c => ({ ...c, usa_escalonado: e.target.value === 'escalonado' }))}>
                  <option value="fixo">Percentual fixo</option>
                  <option value="escalonado">Escalonado por faixa</option>
                </select>
              </div>
              {!config.usa_escalonado && (
                <div>
                  <label className="label">% fixo por venda</label>
                  <input type="number" step="0.1" className="input" value={config.percentual_fixo}
                    onChange={e => setConfig(c => ({ ...c, percentual_fixo: Number(e.target.value) }))}/>
                </div>
              )}
            </div>

            {config.usa_escalonado && (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:20 }}>
                <div>
                  <label className="label">Faixa 1 — até % da meta</label>
                  <input type="number" step="1" className="input" value={config.faixa1_limite}
                    onChange={e => setConfig(c => ({ ...c, faixa1_limite: Number(e.target.value) }))}/>
                  <input type="number" step="0.1" className="input" style={{ marginTop:8 }} placeholder="% comissão" value={config.faixa1_percentual}
                    onChange={e => setConfig(c => ({ ...c, faixa1_percentual: Number(e.target.value) }))}/>
                </div>
                <div>
                  <label className="label">Faixa 2 — até % da meta</label>
                  <input type="number" step="1" className="input" value={config.faixa2_limite}
                    onChange={e => setConfig(c => ({ ...c, faixa2_limite: Number(e.target.value) }))}/>
                  <input type="number" step="0.1" className="input" style={{ marginTop:8 }} placeholder="% comissão" value={config.faixa2_percentual}
                    onChange={e => setConfig(c => ({ ...c, faixa2_percentual: Number(e.target.value) }))}/>
                </div>
                <div>
                  <label className="label">Faixa 3 — acima de {config.faixa2_limite}%</label>
                  <div style={{ height:42 }}/>
                  <input type="number" step="0.1" className="input" style={{ marginTop:8 }} placeholder="% comissão" value={config.faixa3_percentual}
                    onChange={e => setConfig(c => ({ ...c, faixa3_percentual: Number(e.target.value) }))}/>
                </div>
              </div>
            )}

            <div style={{ display:'flex', gap:16, alignItems:'center', marginBottom:20 }}>
              <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13 }}>
                <input type="checkbox" checked={config.bonus_meta_ativo}
                  onChange={e => setConfig(c => ({ ...c, bonus_meta_ativo: e.target.checked }))}/>
                Bônus ao bater 100% da meta
              </label>
              {config.bonus_meta_ativo && (
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:13, color:'var(--text2)' }}>Valor:</span>
                  <input type="number" className="input" style={{ width:140 }} value={config.bonus_meta_valor}
                    onChange={e => setConfig(c => ({ ...c, bonus_meta_valor: Number(e.target.value) }))}/>
                </div>
              )}
            </div>

            {/* Preview simulação */}
            <div style={{ background:'var(--bg3)', borderRadius:8, padding:14, marginBottom:16 }}>
              <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>Simulação com meta de R$ 10.000</div>
              <div style={{ display:'flex', gap:24, fontSize:13 }}>
                {[70,90,100,120].map(p => {
                  const real = 10000 * p / 100
                  let pct = config.usa_escalonado
                    ? (p <= config.faixa1_limite ? config.faixa1_percentual : p <= config.faixa2_limite ? config.faixa2_percentual : config.faixa3_percentual)
                    : config.percentual_fixo
                  let com = real * pct / 100
                  if (config.bonus_meta_ativo && p >= 100) com += Number(config.bonus_meta_valor)
                  return (
                    <div key={p}>
                      <div style={{ color:'var(--text3)', marginBottom:2 }}>{p}% da meta</div>
                      <div style={{ fontWeight:600, color: p >= 100 ? 'var(--accent)' : p >= 80 ? 'var(--warn)' : 'var(--danger)' }}>{fmt(com)}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            <button onClick={salvarComissao} disabled={salvando} className="btn btn-primary">
              {salvando ? 'Salvando...' : 'Salvar configurações de comissão'}
            </button>
          </div>
        )}

        {/* UNIDADES */}
        {canEdit && (
          <div className="card">
            <div style={{ fontSize:14, fontWeight:500, marginBottom:16, color:'var(--text2)' }}>Unidades / Filiais</div>
            <div style={{ marginBottom:16 }}>
              <input className="input" placeholder="Nome da unidade" value={novaUnidade.nome}
                onChange={e => setNovaUnidade(u => ({ ...u, nome: e.target.value }))}
                style={{ marginBottom:8 }}/>
              <input className="input" placeholder="Cidade (opcional)" value={novaUnidade.cidade}
                onChange={e => setNovaUnidade(u => ({ ...u, cidade: e.target.value }))}
                style={{ marginBottom:8 }}/>
              <button onClick={adicionarUnidade} className="btn btn-primary" style={{ width:'100%', justifyContent:'center' }}>
                Adicionar unidade
              </button>
            </div>
            <div>
              {unidades.map(u => (
                <div key={u.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:500 }}>{u.nome}</div>
                    {u.cidade && <div style={{ fontSize:11, color:'var(--text3)' }}>{u.cidade}</div>}
                  </div>
                  <button onClick={() => toggleUnidade(u.id, u.ativo)}
                    style={{ fontSize:11, padding:'4px 12px', borderRadius:20, border:'none', cursor:'pointer',
                      background: u.ativo ? 'var(--accent-dim)' : 'var(--bg3)',
                      color: u.ativo ? 'var(--accent)' : 'var(--text3)' }}>
                    {u.ativo ? 'Ativa' : 'Inativa'}
                  </button>
                </div>
              ))}
              {unidades.length === 0 && <div style={{ fontSize:13, color:'var(--text3)', textAlign:'center', padding:'20px 0' }}>Nenhuma unidade cadastrada.</div>}
            </div>
          </div>
        )}

        {/* SENHA */}
        <div className="card">
          <div style={{ fontSize:14, fontWeight:500, marginBottom:16, color:'var(--text2)' }}>Alterar senha</div>
          <div style={{ marginBottom:12 }}>
            <label className="label">Nova senha</label>
            <input type="password" className="input" placeholder="Mínimo 6 caracteres" value={senha.nova}
              onChange={e => setSenha(s => ({ ...s, nova: e.target.value }))}/>
          </div>
          <div style={{ marginBottom:16 }}>
            <label className="label">Confirmar nova senha</label>
            <input type="password" className="input" placeholder="Repita a nova senha" value={senha.confirmar}
              onChange={e => setSenha(s => ({ ...s, confirmar: e.target.value }))}/>
          </div>
          {erroSenha && (
            <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:8, padding:'8px 12px', fontSize:13, color:'var(--danger)', marginBottom:12 }}>
              {erroSenha}
            </div>
          )}
          {sucessoSenha && (
            <div style={{ background:'var(--accent-dim)', border:'1px solid rgba(0,200,150,0.3)', borderRadius:8, padding:'8px 12px', fontSize:13, color:'var(--accent)', marginBottom:12 }}>
              {sucessoSenha}
            </div>
          )}
          <button onClick={trocarSenha} className="btn btn-primary" style={{ width:'100%', justifyContent:'center' }}>
            Alterar senha
          </button>
        </div>

      </div>
    </div>
  )
}
