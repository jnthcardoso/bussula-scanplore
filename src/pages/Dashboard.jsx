import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function fmt(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
}

function pct(real, meta) {
  if (!meta || meta === 0) return 0
  return Math.min(Math.round((real / meta) * 100), 999)
}

function diasUteisNoMes(ano, mes) {
  const dias = new Date(ano, mes, 0).getDate()
  let uteis = 0
  for (let d = 1; d <= dias; d++) {
    const dia = new Date(ano, mes - 1, d).getDay()
    if (dia !== 0 && dia !== 6) uteis++
  }
  return uteis
}

function diasUteisAteHoje(ano, mes) {
  const hoje = new Date()
  const ultimo = hoje.getMonth() + 1 === mes && hoje.getFullYear() === ano
    ? hoje.getDate() : new Date(ano, mes, 0).getDate()
  let uteis = 0
  for (let d = 1; d <= ultimo; d++) {
    const dia = new Date(ano, mes - 1, d).getDay()
    if (dia !== 0 && dia !== 6) uteis++
  }
  return uteis
}

export default function Dashboard() {
  const hoje = new Date()
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [ano, setAno] = useState(hoje.getFullYear())
  const [dados, setDados] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { carregar() }, [mes, ano])

  async function carregar() {
    setLoading(true)
    const inicioMes = `${ano}-${String(mes).padStart(2,'0')}-01`
    const fimMes = `${ano}-${String(mes).padStart(2,'0')}-${new Date(ano, mes, 0).getDate()}`

    const [{ data: perfil }, { data: vendas }, { data: metas }] = await Promise.all([
      supabase.from('perfis').select('*, empresas(nome)').eq('id', (await supabase.auth.getUser()).data.user.id).single(),
      supabase.from('vendas').select('valor, data_venda, vendedor_id, produtos(nome)').gte('data_venda', inicioMes).lte('data_venda', fimMes),
      supabase.from('metas').select('valor_meta, vendedor_id').eq('mes', mes).eq('ano', ano),
    ])

    const totalRealizado = (vendas || []).reduce((s, v) => s + Number(v.valor), 0)
    const totalMeta = (metas || []).reduce((s, m) => s + Number(m.valor_meta), 0)
    const totalVendas = (vendas || []).length

    const uteisMes = diasUteisNoMes(ano, mes)
    const uteisAteHoje = diasUteisAteHoje(ano, mes)
    const ritmoNecessario = totalMeta > 0 ? (totalMeta / uteisMes) * uteisAteHoje : 0
    const projecao = uteisAteHoje > 0 ? (totalRealizado / uteisAteHoje) * uteisMes : 0

    setDados({ perfil, totalRealizado, totalMeta, totalVendas, ritmoNecessario, projecao, vendas: vendas || [], metas: metas || [] })
    setLoading(false)
  }

  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div className="spin" style={{ width: 32, height: 32, border: '3px solid var(--bg3)', borderTop: '3px solid var(--accent)', borderRadius: '50%' }} />
    </div>
  )

  const p = pct(dados.totalRealizado, dados.totalMeta)
  const corBarra = p >= 100 ? 'var(--accent)' : p >= 80 ? 'var(--warn)' : 'var(--danger)'

  return (
    <div style={{ padding: 32, maxWidth: 1100, animation: 'fadeIn 0.25s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {dados?.perfil?.empresas?.nome || 'Minha empresa'}
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 500, marginTop: 2 }}>Dashboard</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={mes} onChange={e => setMes(Number(e.target.value))}
            className="input" style={{ width: 100, padding: '6px 10px' }}>
            {meses.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={ano} onChange={e => setAno(Number(e.target.value))}
            className="input" style={{ width: 90, padding: '6px 10px' }}>
            {[2024, 2025, 2026].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {/* Cards KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <KpiCard titulo="Realizado" valor={fmt(dados.totalRealizado)} sub={`${p}% da meta`}
          cor={corBarra} destaque />
        <KpiCard titulo="Meta do mês" valor={fmt(dados.totalMeta)} sub={`${meses[mes-1]} ${ano}`} />
        <KpiCard titulo="Projecao final" valor={fmt(dados.projecao)}
          sub={dados.projecao >= dados.totalMeta ? 'Vai bater a meta' : 'Abaixo da meta'}
          cor={dados.projecao >= dados.totalMeta ? 'var(--accent)' : 'var(--warn)'} />
        <KpiCard titulo="Vendas lancadas" valor={dados.totalVendas} sub="no periodo" />
      </div>

      {/* Barra de progresso grande */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 13, color: 'var(--text2)' }}>Progresso da meta</span>
          <span style={{ fontSize: 20, fontWeight: 600, color: corBarra }}>{p}%</span>
        </div>
        <div className="progress-bar" style={{ height: 10 }}>
          <div className="progress-fill" style={{ width: `${Math.min(p, 100)}%`, background: corBarra }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 12, color: 'var(--text3)' }}>
          <span>Realizado: {fmt(dados.totalRealizado)}</span>
          <span>Ritmo necessario hoje: {fmt(dados.ritmoNecessario)}</span>
          <span>Meta: {fmt(dados.totalMeta)}</span>
        </div>
      </div>

      {/* Ultimas vendas */}
      <div className="card">
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 16, color: 'var(--text2)' }}>
          Ultimas vendas
        </div>
        {dados.vendas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)', fontSize: 13 }}>
            Nenhuma venda lancada neste periodo.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Data','Produto','Valor'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, color: 'var(--text3)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dados.vendas.slice(0, 10).map((v, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text2)' }}>
                    {new Date(v.data_venda + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 13 }}>
                    {v.produtos?.nome || '—'}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--accent)', fontWeight: 500 }}>
                    {fmt(v.valor)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function KpiCard({ titulo, valor, sub, cor, destaque }) {
  return (
    <div className="card" style={{ borderColor: destaque ? 'rgba(0,200,150,0.2)' : undefined }}>
      <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{titulo}</div>
      <div style={{ fontSize: 26, fontWeight: 600, color: cor || 'var(--text)', letterSpacing: '-0.02em', marginBottom: 4 }}>{valor}</div>
      <div style={{ fontSize: 12, color: 'var(--text3)' }}>{sub}</div>
    </div>
  )
}
