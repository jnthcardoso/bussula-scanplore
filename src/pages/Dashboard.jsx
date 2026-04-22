import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { calcularComissao, diasUteisNoMes, diasUteisAteHoje, fmt, corAtingimento } from '../lib/comissao'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, Cell } from 'recharts'

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function KpiCard({ titulo, valor, sub, cor, destaque }) {
  return (
    <div className="card" style={{ padding:'16px 20px', borderColor: destaque ? 'rgba(0,200,150,0.25)' : undefined }}>
      <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>{titulo}</div>
      <div style={{ fontSize:24, fontWeight:600, color: cor || 'var(--text)', letterSpacing:'-0.02em', marginBottom:4 }}>{valor}</div>
      <div style={{ fontSize:12, color:'var(--text3)' }}>{sub}</div>
    </div>
  )
}

const tooltipStyle = { background:'#111827', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, color:'#f0f4f8', fontSize:12 }

export default function Dashboard() {
  const hoje = new Date()
  const [mes, setMes]   = useState(hoje.getMonth() + 1)
  const [ano, setAno]   = useState(hoje.getFullYear())
  const [dados, setDados] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { carregar() }, [mes, ano])

  async function carregar() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: perfil }   = await supabase.from('perfis').select('*, empresas(nome)').eq('id', user.id).single()
    const { data: cfg }      = await supabase.from('config_comissao').select('*').eq('empresa_id', perfil.empresa_id).single()

    const inicioMes = `${ano}-${String(mes).padStart(2,'0')}-01`
    const fimMes    = `${ano}-${String(mes).padStart(2,'0')}-${new Date(ano, mes, 0).getDate()}`

    const [{ data: vendas }, { data: metas }, { data: membros }] = await Promise.all([
      supabase.from('vendas').select('valor, data_venda, vendedor_id, produtos(nome)').gte('data_venda', inicioMes).lte('data_venda', fimMes),
      supabase.from('metas').select('valor_meta, vendedor_id').eq('mes', mes).eq('ano', ano),
      supabase.from('perfis').select('id, nome').eq('empresa_id', perfil.empresa_id).eq('ativo', true),
    ])

    const totalRealizado = (vendas||[]).reduce((s,v) => s + Number(v.valor), 0)
    const totalMeta      = (metas||[]).reduce((s,m) => s + Number(m.valor_meta), 0)
    const uteisMes       = diasUteisNoMes(ano, mes)
    const uteisHoje      = diasUteisAteHoje(ano, mes)
    const ritmoNec       = totalMeta > 0 ? (totalMeta / uteisMes) * uteisHoje : 0
    const projecao       = uteisHoje > 0 ? (totalRealizado / uteisHoje) * uteisMes : 0
    const comissao       = cfg ? calcularComissao(totalRealizado, totalMeta, cfg) : { liquido:0 }

    // Dados para gráfico de evolução (últimos 4 meses)
    const evolucao = []
    for (let i = 3; i >= 0; i--) {
      let m = mes - i; let a = ano
      if (m <= 0) { m += 12; a -= 1 }
      const ini = `${a}-${String(m).padStart(2,'0')}-01`
      const fim = `${a}-${String(m).padStart(2,'0')}-${new Date(a, m, 0).getDate()}`
      const { data: vv } = await supabase.from('vendas').select('valor').gte('data_venda', ini).lte('data_venda', fim)
      const { data: mm } = await supabase.from('metas').select('valor_meta').eq('mes', m).eq('ano', a)
      evolucao.push({
        mes: MESES[m-1],
        Realizado: (vv||[]).reduce((s,v) => s + Number(v.valor), 0),
        Meta: (mm||[]).reduce((s,v) => s + Number(v.valor_meta), 0),
      })
    }

    // Ranking por vendedor para gráfico de barras
    const ranking = (membros||[]).map(m => {
      const real = (vendas||[]).filter(v => v.vendedor_id === m.id).reduce((s,v) => s + Number(v.valor), 0)
      const meta = Number((metas||[]).find(mt => mt.vendedor_id === m.id)?.valor_meta || 0)
      const ating = meta > 0 ? (real/meta)*100 : 0
      return { nome: m.nome.split(' ')[0], Realizado: real, Meta: meta, ating }
    }).sort((a,b) => b.Realizado - a.Realizado)

    setDados({ perfil, totalRealizado, totalMeta, totalVendas: (vendas||[]).length, ritmoNec, projecao, comissao, vendas: vendas||[], evolucao, ranking })
    setLoading(false)
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%' }}>
      <div className="spin" style={{ width:32, height:32, border:'3px solid var(--bg3)', borderTop:'3px solid var(--accent)', borderRadius:'50%' }}/>
    </div>
  )

  const p   = dados.totalMeta > 0 ? (dados.totalRealizado / dados.totalMeta) * 100 : 0
  const cor = corAtingimento(p)

  return (
    <div style={{ padding:32, maxWidth:1100, animation:'fadeIn 0.25s ease' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28 }}>
        <div>
          <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em' }}>
            {dados.perfil?.empresas?.nome}
          </div>
          <h1 style={{ fontSize:22, fontWeight:500, marginTop:2 }}>Dashboard</h1>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <select value={mes} onChange={e => setMes(Number(e.target.value))} className="input" style={{ width:100, padding:'6px 10px' }}>
            {MESES.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
          <select value={ano} onChange={e => setAno(Number(e.target.value))} className="input" style={{ width:90, padding:'6px 10px' }}>
            {[2024,2025,2026].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:14, marginBottom:22 }}>
        <KpiCard titulo="Realizado"     valor={fmt(dados.totalRealizado)} sub={`${p.toFixed(1)}% da meta`} cor={cor} destaque />
        <KpiCard titulo="Meta do mês"   valor={fmt(dados.totalMeta)}      sub={`${MESES[mes-1]} / ${ano}`} />
        <KpiCard titulo="Projeção"      valor={fmt(dados.projecao)}       sub={dados.projecao >= dados.totalMeta ? 'Vai bater a meta' : 'Abaixo do ritmo'} cor={dados.projecao >= dados.totalMeta ? 'var(--accent)' : 'var(--warn)'} />
        <KpiCard titulo="Comissão est." valor={fmt(dados.comissao.liquido)} sub="líquida estimada" cor="var(--accent)" />
        <KpiCard titulo="Vendas"        valor={dados.totalVendas}          sub="lançadas no período" />
      </div>

      {/* Barra de progresso */}
      <div className="card" style={{ marginBottom:22 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <span style={{ fontSize:13, color:'var(--text2)' }}>Progresso da meta — {MESES[mes-1]} / {ano}</span>
          <span style={{ fontSize:22, fontWeight:600, color: cor }}>{p.toFixed(1)}%</span>
        </div>
        <div className="progress-bar" style={{ height:10 }}>
          <div className="progress-fill" style={{ width:`${Math.min(p,100)}%`, background: cor }}/>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:8, fontSize:12, color:'var(--text3)' }}>
          <span>Realizado: {fmt(dados.totalRealizado)}</span>
          <span>Ritmo necessário hoje: {fmt(dados.ritmoNec)}</span>
          <span>Meta: {fmt(dados.totalMeta)}</span>
        </div>
      </div>

      {/* Gráficos */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:22 }}>
        {/* Evolução mensal */}
        <div className="card">
          <div style={{ fontSize:12, fontWeight:500, color:'var(--text2)', marginBottom:16 }}>Evolução — últimos 4 meses</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={dados.evolucao}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
              <XAxis dataKey="mes" tick={{ fill:'var(--text3)', fontSize:11 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill:'var(--text3)', fontSize:10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false}/>
              <Tooltip formatter={v => fmt(v)} contentStyle={tooltipStyle}/>
              <Legend wrapperStyle={{ fontSize:11, color:'var(--text2)' }}/>
              <Line type="monotone" dataKey="Meta"      stroke="rgba(255,255,255,0.2)" strokeWidth={2} dot={false} strokeDasharray="5 4"/>
              <Line type="monotone" dataKey="Realizado" stroke="#00c896" strokeWidth={2.5} dot={{ fill:'#00c896', r:4 }}/>
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Ranking por vendedor */}
        <div className="card">
          <div style={{ fontSize:12, fontWeight:500, color:'var(--text2)', marginBottom:16 }}>Ranking por vendedor</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dados.ranking} layout="vertical" margin={{ left:0, right:16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false}/>
              <XAxis type="number" tick={{ fill:'var(--text3)', fontSize:10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false}/>
              <YAxis type="category" dataKey="nome" tick={{ fill:'var(--text2)', fontSize:12 }} axisLine={false} tickLine={false} width={70}/>
              <Tooltip formatter={v => fmt(v)} contentStyle={tooltipStyle}/>
              <Bar dataKey="Meta"      fill="rgba(255,255,255,0.06)" radius={[0,4,4,0]}/>
              <Bar dataKey="Realizado" radius={[0,4,4,0]}>
                {dados.ranking.map((d,i) => <Cell key={i} fill={corAtingimento(d.ating)}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Últimas vendas */}
      <div className="card">
        <div style={{ fontSize:13, fontWeight:500, marginBottom:16, color:'var(--text2)' }}>Últimas vendas</div>
        {dados.vendas.length === 0 ? (
          <div style={{ textAlign:'center', padding:'32px 0', color:'var(--text3)', fontSize:13 }}>Nenhuma venda lançada neste período.</div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ borderBottom:'1px solid var(--border)' }}>
                {['Data','Produto','Valor'].map(h => (
                  <th key={h} style={{ textAlign:'left', padding:'8px 12px', fontSize:11, color:'var(--text3)', fontWeight:500, textTransform:'uppercase', letterSpacing:'0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dados.vendas.slice(0,8).map((v,i) => (
                <tr key={i} style={{ borderBottom:'1px solid var(--border)' }}>
                  <td style={{ padding:'10px 12px', fontSize:13, color:'var(--text2)' }}>{new Date(v.data_venda+'T12:00:00').toLocaleDateString('pt-BR')}</td>
                  <td style={{ padding:'10px 12px', fontSize:13 }}>{v.produtos?.nome || '—'}</td>
                  <td style={{ padding:'10px 12px', fontSize:13, color:'var(--accent)', fontWeight:500 }}>{fmt(v.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
