import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { fmt, diasUteisNoMes } from '../lib/comissao'

export default function Metas() {
  const hoje = new Date()
  const [mes, setMes]       = useState(hoje.getMonth() + 1)
  const [ano, setAno]       = useState(hoje.getFullYear())
  const [perfil, setPerfil] = useState(null)
  const [equipe, setEquipe] = useState([])
  const [metas, setMetas]   = useState({})
  const [loading, setLoading]   = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso]   = useState(false)
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  const podeEditar = ['ceo','diretor','gerente','supervisor','coordenador']

  useEffect(() => { init() }, [mes, ano])

  async function init() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: p } = await supabase.from('perfis').select('*, empresas(nome)').eq('id', user.id).single()
    setPerfil(p)

    // Busca equipe conforme perfil
    const { data: membros } = await supabase
      .from('perfis')
      .select('id, nome, papel, email')
      .eq('empresa_id', p.empresa_id)
      .eq('ativo', true)
      .order('nome')

    setEquipe(membros || [])

    // Busca metas existentes
    const { data: metasExist } = await supabase
      .from('metas')
      .select('*')
      .eq('empresa_id', p.empresa_id)
      .eq('mes', mes)
      .eq('ano', ano)

    const map = {}
    ;(metasExist || []).forEach(m => { map[m.vendedor_id] = m.valor_meta })
    setMetas(map)
    setLoading(false)
  }

  async function salvar() {
    setSalvando(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: p } = await supabase.from('perfis').select('empresa_id').eq('id', user.id).single()

    const upserts = Object.entries(metas)
      .filter(([, v]) => v && Number(v) > 0)
      .map(([vendedor_id, valor_meta]) => ({
        empresa_id: p.empresa_id,
        vendedor_id,
        mes, ano,
        valor_meta: Number(valor_meta),
      }))

    if (upserts.length > 0) {
      await supabase.from('metas').upsert(upserts, { onConflict: 'vendedor_id,mes,ano' })
    }

    setSucesso(true)
    setTimeout(() => setSucesso(false), 3000)
    setSalvando(false)
  }

  const diasUteis = diasUteisNoMes(ano, mes)
  const canEdit = perfil && podeEditar.includes(perfil.papel)

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%' }}>
      <div className="spin" style={{ width:32, height:32, border:'3px solid var(--bg3)', borderTop:'3px solid var(--accent)', borderRadius:'50%' }}/>
    </div>
  )

  return (
    <div style={{ padding:32, maxWidth:900, animation:'fadeIn 0.25s ease' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28 }}>
        <div>
          <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Gestão</div>
          <h1 style={{ fontSize:22, fontWeight:500, marginTop:2 }}>Metas</h1>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <select value={mes} onChange={e => setMes(Number(e.target.value))} className="input" style={{ width:100, padding:'6px 10px' }}>
            {meses.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
          <select value={ano} onChange={e => setAno(Number(e.target.value))} className="input" style={{ width:90, padding:'6px 10px' }}>
            {[2024,2025,2026].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          {canEdit && (
            <button onClick={salvar} disabled={salvando} className="btn btn-primary">
              {salvando ? 'Salvando...' : 'Salvar metas'}
            </button>
          )}
        </div>
      </div>

      {sucesso && (
        <div style={{ background:'var(--accent-dim)', border:'1px solid rgba(0,200,150,0.3)', borderRadius:8, padding:'10px 16px', fontSize:13, color:'var(--accent)', marginBottom:20 }}>
          Metas salvas com sucesso!
        </div>
      )}

      <div className="card" style={{ marginBottom:16, padding:'14px 20px', display:'flex', gap:32 }}>
        <div>
          <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Dias úteis</div>
          <div style={{ fontSize:22, fontWeight:600, color:'var(--accent)', marginTop:2 }}>{diasUteis}</div>
          <div style={{ fontSize:12, color:'var(--text3)' }}>{meses[mes-1]} / {ano}</div>
        </div>
        <div>
          <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Meta diária (auto)</div>
          <div style={{ fontSize:13, color:'var(--text2)', marginTop:6 }}>Calculada automaticamente</div>
          <div style={{ fontSize:12, color:'var(--text3)' }}>Meta mensal ÷ {diasUteis} dias úteis</div>
        </div>
      </div>

      <div className="card">
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ borderBottom:'1px solid var(--border)' }}>
              {['Vendedor','Perfil','Meta mensal','Meta diária (auto)'].map(h => (
                <th key={h} style={{ textAlign:'left', padding:'8px 14px', fontSize:11, color:'var(--text3)', fontWeight:500, textTransform:'uppercase', letterSpacing:'0.06em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {equipe.map(v => {
              const metaMensal = Number(metas[v.id] || 0)
              const metaDiaria = diasUteis > 0 ? metaMensal / diasUteis : 0
              return (
                <tr key={v.id} style={{ borderBottom:'1px solid var(--border)' }}>
                  <td style={{ padding:'12px 14px', fontSize:14, fontWeight:500 }}>{v.nome}</td>
                  <td style={{ padding:'12px 14px' }}>
                    <span style={{ background:'var(--bg3)', color:'var(--text2)', padding:'3px 10px', borderRadius:20, fontSize:11 }}>
                      {v.papel}
                    </span>
                  </td>
                  <td style={{ padding:'12px 14px' }}>
                    {canEdit ? (
                      <input
                        type="number"
                        className="input"
                        style={{ width:160, padding:'6px 10px' }}
                        placeholder="0,00"
                        value={metas[v.id] || ''}
                        onChange={e => setMetas(m => ({ ...m, [v.id]: e.target.value }))}
                      />
                    ) : (
                      <span style={{ fontWeight:500, color:'var(--text)' }}>{fmt(metaMensal)}</span>
                    )}
                  </td>
                  <td style={{ padding:'12px 14px', color:'var(--accent)', fontWeight:500 }}>
                    {metaMensal > 0 ? fmt(metaDiaria) : <span style={{ color:'var(--text3)' }}>—</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {equipe.length === 0 && (
          <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text3)', fontSize:13 }}>
            Nenhum membro na equipe ainda.
          </div>
        )}
      </div>
    </div>
  )
}
