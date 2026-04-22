import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function fmt(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
}

function pct(real, meta) {
  if (!meta || meta === 0) return 0
  return Math.min(Math.round((real / meta) * 100), 999)
}

export default function Vendedores() {
  const hoje = new Date()
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [ano, setAno] = useState(hoje.getFullYear())
  const [ranking, setRanking] = useState([])
  const [loading, setLoading] = useState(true)
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

  useEffect(() => { carregar() }, [mes, ano])

  async function carregar() {
    setLoading(true)
    const inicioMes = `${ano}-${String(mes).padStart(2,'0')}-01`
    const fimMes = `${ano}-${String(mes).padStart(2,'0')}-${new Date(ano, mes, 0).getDate()}`

    const { data: perfis } = await supabase.from('perfis').select('id, nome, papel').eq('ativo', true)
    const { data: vendas } = await supabase.from('vendas').select('valor, vendedor_id').gte('data_venda', inicioMes).lte('data_venda', fimMes)
    const { data: metas } = await supabase.from('metas').select('valor_meta, vendedor_id').eq('mes', mes).eq('ano', ano)

    const lista = (perfis || []).map(p => {
      const totalVendas = (vendas || []).filter(v => v.vendedor_id === p.id).reduce((s, v) => s + Number(v.valor), 0)
      const meta = (metas || []).find(m => m.vendedor_id === p.id)?.valor_meta || 0
      const percentual = pct(totalVendas, meta)
      return { ...p, totalVendas, meta, percentual }
    }).sort((a, b) => b.totalVendas - a.totalVendas)

    setRanking(lista)
    setLoading(false)
  }

  function corBarra(p) {
    if (p >= 100) return 'var(--accent)'
    if (p >= 80) return 'var(--warn)'
    return 'var(--danger)'
  }

  function badgePapel(papel) {
    const map = { ceo: ['CEO', 'badge-green'], diretor: ['Diretor', 'badge-green'], gerente: ['Gerente', 'badge-warn'], supervisor: ['Supervisor', 'badge-warn'], coordenador: ['Coord.', 'badge-warn'], vendedor: ['Vendedor', ''] }
    const [label, cls] = map[papel] || [papel, '']
    return <span className={`badge ${cls}`} style={!cls ? { background: 'var(--bg3)', color: 'var(--text3)' } : {}}>{label}</span>
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div className="spin" style={{ width: 32, height: 32, border: '3px solid var(--bg3)', borderTop: '3px solid var(--accent)', borderRadius: '50%' }} />
    </div>
  )

  return (
    <div style={{ padding: 32, maxWidth: 900, animation: 'fadeIn 0.25s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Equipe</div>
          <h1 style={{ fontSize: 22, fontWeight: 500, marginTop: 2 }}>Ranking de Vendedores</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={mes} onChange={e => setMes(Number(e.target.value))} className="input" style={{ width: 100, padding: '6px 10px' }}>
            {meses.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={ano} onChange={e => setAno(Number(e.target.value))} className="input" style={{ width: 90, padding: '6px 10px' }}>
            {[2024, 2025, 2026].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {ranking.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text3)' }}>
          Nenhum vendedor cadastrado ainda.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {ranking.map((v, i) => (
            <div key={v.id} className="card" style={{
              display: 'grid', gridTemplateColumns: '32px 1fr auto',
              gap: 16, alignItems: 'center',
              borderColor: i === 0 ? 'rgba(0,200,150,0.25)' : undefined,
            }}>
              <div style={{ fontSize: 18, fontWeight: 600, color: i === 0 ? 'var(--accent)' : 'var(--text3)', textAlign: 'center' }}>
                {i + 1}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{v.nome}</span>
                  {badgePapel(v.papel)}
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${Math.min(v.percentual, 100)}%`, background: corBarra(v.percentual) }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--text3)' }}>
                  <span>Meta: {fmt(v.meta)}</span>
                  <span>{v.percentual}%</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 18, fontWeight: 600, color: corBarra(v.percentual) }}>
                  {fmt(v.totalVendas)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>realizado</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
