import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { calcularComissao, corAtingimento, diasUteisNoMes, diasUteisAteHoje, fmt } from '../lib/comissao'

export default function Comissoes() {
  const hoje = new Date()
  const [mes, setMes]       = useState(hoje.getMonth() + 1)
  const [ano, setAno]       = useState(hoje.getFullYear())
  const [dados, setDados]   = useState([])
  const [config, setConfig] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  const gestores = ['ceo','diretor','gerente','supervisor','coordenador']

  useEffect(() => { carregar() }, [mes, ano])

  async function carregar() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: p } = await supabase.from('perfis').select('*, empresas(nome)').eq('id', user.id).single()
    setPerfil(p)

    const { data: cfg } = await supabase.from('config_comissao').select('*').eq('empresa_id', p.empresa_id).single()
    setConfig(cfg)

    const inicioMes = `${ano}-${String(mes).padStart(2,'0')}-01`
    const fimMes    = `${ano}-${String(mes).padStart(2,'0')}-${new Date(ano, mes, 0).getDate()}`

    // Gestores veem a equipe, vendedor vê só o próprio
    let query = supabase.from('perfis').select('id, nome, papel').eq('empresa_id', p.empresa_id).eq('ativo', true)
    if (p.papel === 'vendedor') query = query.eq('id', user.id)

    const { data: membros } = await query.order('nome')
    const { data: vendas }  = await supabase.from('vendas').select('valor, vendedor_id').gte('data_venda', inicioMes).lte('data_venda', fimMes)
    const { data: metasDB } = await supabase.from('metas').select('valor_meta, vendedor_id').eq('mes', mes).eq('ano', ano).eq('empresa_id', p.empresa_id)

    const uteisMes    = diasUteisNoMes(ano, mes)
    const uteisAteHj  = diasUteisAteHoje(ano, mes)

    const lista = (membros || []).map(m => {
      const realizado  = (vendas || []).filter(v => v.vendedor_id === m.id).reduce((s,v) => s + Number(v.valor), 0)
      const meta       = Number((metasDB || []).find(mt => mt.vendedor_id === m.id)?.valor_meta || 0)
      const metaDiaria = uteisMes > 0 ? meta / uteisMes : 0
      const ritmoNec   = uteisAteHj > 0 ? metaDiaria * uteisAteHj : 0
      const projecao   = uteisAteHj > 0 ? (realizado / uteisAteHj) * uteisMes : 0
      const comissao   = cfg ? calcularComissao(realizado, meta, cfg) : { bruto:0, liquido:0, atingimento:0 }
      return { ...m, realizado, meta, metaDiaria, ritmoNec, projecao, comissao }
    }).sort((a,b) => b.realizado - a.realizado)

    setDados(lista)
    setLoading(false)
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%' }}>
      <div className="spin" style={{ width:32, height:32, border:'3px solid var(--bg3)', borderTop:'3px solid var(--accent)', borderRadius:'50%' }}/>
    </div>
  )

  const isGestor = perfil && gestores.includes(perfil.papel)

  return (
    <div style={{ padding:32, maxWidth:1000, animation:'fadeIn 0.25s ease' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28 }}>
        <div>
          <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Financeiro</div>
          <h1 style={{ fontSize:22, fontWeight:500, marginTop:2 }}>Comissões</h1>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <select value={mes} onChange={e => setMes(Number(e.target.value))} className="input" style={{ width:100, padding:'6px 10px' }}>
            {meses.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
          <select value={ano} onChange={e => setAno(Number(e.target.value))} className="input" style={{ width:90, padding:'6px 10px' }}>
            {[2024,2025,2026].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {/* Config atual */}
      {config && isGestor && (
        <div className="card" style={{ marginBottom:20, padding:'14px 20px' }}>
          <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>Regras ativas</div>
          <div style={{ display:'flex', gap:24, flexWrap:'wrap', fontSize:13 }}>
            {config.usa_escalonado ? (
              <>
                <span style={{ color:'var(--text2)' }}>Até {config.faixa1_limite}% meta → <b style={{ color:'var(--accent)' }}>{config.faixa1_percentual}%</b></span>
                <span style={{ color:'var(--text2)' }}>Até {config.faixa2_limite}% → <b style={{ color:'var(--accent)' }}>{config.faixa2_percentual}%</b></span>
                <span style={{ color:'var(--text2)' }}>Acima → <b style={{ color:'var(--accent)' }}>{config.faixa3_percentual}%</b></span>
              </>
            ) : (
              <span style={{ color:'var(--text2)' }}>Fixo: <b style={{ color:'var(--accent)' }}>{config.percentual_fixo}%</b></span>
            )}
            {config.bonus_meta_ativo && (
              <span style={{ color:'var(--text2)' }}>Bônus 100%: <b style={{ color:'var(--warn)' }}>{fmt(config.bonus_meta_valor)}</b></span>
            )}
          </div>
        </div>
      )}

      {/* Cards de cada membro */}
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {dados.map((v, i) => {
          const pct = v.meta > 0 ? Math.min((v.realizado / v.meta) * 100, 100) : 0
          const cor = corAtingimento(v.comissao.atingimento || 0)
          return (
            <div key={v.id} className="card" style={{ borderColor: i === 0 && isGestor ? 'rgba(0,200,150,0.2)' : undefined }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr', gap:16, alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:500 }}>{v.nome}</div>
                  <span style={{ background:'var(--bg3)', color:'var(--text3)', padding:'2px 8px', borderRadius:20, fontSize:11 }}>{v.papel}</span>
                </div>
                <div>
                  <div style={{ fontSize:11, color:'var(--text3)', marginBottom:4 }}>Realizado</div>
                  <div style={{ fontSize:16, fontWeight:600, color: cor }}>{fmt(v.realizado)}</div>
                  <div style={{ fontSize:11, color:'var(--text3)' }}>de {fmt(v.meta)}</div>
                </div>
                <div>
                  <div style={{ fontSize:11, color:'var(--text3)', marginBottom:6 }}>Atingimento</div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width:`${pct}%`, background: cor }}/>
                  </div>
                  <div style={{ fontSize:12, fontWeight:600, color: cor, marginTop:4 }}>
                    {v.meta > 0 ? `${((v.realizado/v.meta)*100).toFixed(1)}%` : '—'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize:11, color:'var(--text3)', marginBottom:4 }}>Projeção</div>
                  <div style={{ fontSize:14, fontWeight:500, color: v.projecao >= v.meta ? 'var(--accent)' : 'var(--warn)' }}>
                    {fmt(v.projecao)}
                  </div>
                  <div style={{ fontSize:11, color:'var(--text3)' }}>
                    {v.projecao >= v.meta ? 'Vai bater a meta' : 'Abaixo do ritmo'}
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:11, color:'var(--text3)', marginBottom:4 }}>Comissão estimada</div>
                  <div style={{ fontSize:18, fontWeight:600, color:'var(--accent)' }}>{fmt(v.comissao.liquido)}</div>
                  <div style={{ fontSize:11, color:'var(--text3)' }}>bruto: {fmt(v.comissao.bruto)}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {dados.length === 0 && (
        <div className="card" style={{ textAlign:'center', padding:'48px 0', color:'var(--text3)' }}>
          Nenhum dado encontrado para este período.
        </div>
      )}
    </div>
  )
}
