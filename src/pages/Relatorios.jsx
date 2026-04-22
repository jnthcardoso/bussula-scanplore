import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { calcularComissao, diasUteisNoMes, diasUteisAteHoje, fmt, corAtingimento } from '../lib/comissao'

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

export default function Relatorios() {
  const hoje = new Date()
  const [mes, setMes]     = useState(hoje.getMonth() + 1)
  const [ano, setAno]     = useState(hoje.getFullYear())
  const [dados, setDados] = useState([])
  const [totais, setTotais] = useState({})
  const [config, setConfig] = useState(null)
  const [empresa, setEmpresa] = useState('')
  const [loading, setLoading] = useState(true)
  const [exportando, setExportando] = useState(false)

  useEffect(() => { carregar() }, [mes, ano])

  async function carregar() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: p } = await supabase.from('perfis').select('*, empresas(nome)').eq('id', user.id).single()
    setEmpresa(p?.empresas?.nome || '')

    const { data: cfg } = await supabase.from('config_comissao').select('*').eq('empresa_id', p.empresa_id).single()
    setConfig(cfg)

    const inicioMes = `${ano}-${String(mes).padStart(2,'0')}-01`
    const fimMes    = `${ano}-${String(mes).padStart(2,'0')}-${new Date(ano, mes, 0).getDate()}`

    const { data: membros } = await supabase.from('perfis').select('id, nome, papel').eq('empresa_id', p.empresa_id).eq('ativo', true).order('nome')
    const { data: vendas }  = await supabase.from('vendas').select('valor, vendedor_id, data_venda').gte('data_venda', inicioMes).lte('data_venda', fimMes)
    const { data: metasDB } = await supabase.from('metas').select('valor_meta, vendedor_id').eq('mes', mes).eq('ano', ano).eq('empresa_id', p.empresa_id)

    const uteisMes   = diasUteisNoMes(ano, mes)
    const uteisHoje  = diasUteisAteHoje(ano, mes)

    const lista = (membros || []).map(m => {
      const realizado  = (vendas || []).filter(v => v.vendedor_id === m.id).reduce((s,v) => s + Number(v.valor), 0)
      const meta       = Number((metasDB || []).find(mt => mt.vendedor_id === m.id)?.valor_meta || 0)
      const metaDiaria = uteisMes > 0 ? meta / uteisMes : 0
      const projecao   = uteisHoje > 0 ? (realizado / uteisHoje) * uteisMes : 0
      const ritmo      = uteisHoje > 0 ? (realizado / uteisHoje) : 0
      const falta      = Math.max(0, meta - realizado)
      const comissao   = cfg ? calcularComissao(realizado, meta, cfg) : { bruto:0, liquido:0 }
      const ating      = meta > 0 ? (realizado / meta) * 100 : 0
      return { ...m, realizado, meta, metaDiaria, projecao, ritmo, falta, comissao, ating }
    }).sort((a,b) => b.realizado - a.realizado)

    const tot = {
      meta:       lista.reduce((s,v) => s + v.meta, 0),
      realizado:  lista.reduce((s,v) => s + v.realizado, 0),
      projecao:   lista.reduce((s,v) => s + v.projecao, 0),
      comissao:   lista.reduce((s,v) => s + v.comissao.liquido, 0),
      falta:      lista.reduce((s,v) => s + v.falta, 0),
    }
    tot.ating = tot.meta > 0 ? (tot.realizado / tot.meta) * 100 : 0

    setDados(lista)
    setTotais(tot)
    setLoading(false)
  }

  function exportarCSV() {
    const cabecalho = ['Vendedor','Perfil','Meta Mensal','Realizado','Atingimento %','Falta','Projecao','Comissao Bruta','Comissao Liquida']
    const linhas = dados.map(d => [
      d.nome, d.papel,
      d.meta.toFixed(2), d.realizado.toFixed(2),
      d.ating.toFixed(1), d.falta.toFixed(2),
      d.projecao.toFixed(2), d.comissao.bruto.toFixed(2), d.comissao.liquido.toFixed(2)
    ])
    const csv = [cabecalho, ...linhas].map(r => r.join(';')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `bussola-relatorio-${MESES[mes-1]}-${ano}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportarPDF() {
    setExportando(true)
    const conteudo = `
      <html><head><meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a1a; padding: 32px; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        .sub { color: #666; font-size: 12px; margin-bottom: 24px; }
        .kpis { display: flex; gap: 16px; margin-bottom: 24px; }
        .kpi { flex: 1; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
        .kpi-label { font-size: 10px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
        .kpi-val { font-size: 18px; font-weight: 700; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th { background: #f9fafb; padding: 8px 10px; text-align: left; font-size: 10px; text-transform: uppercase; color: #6b7280; border-bottom: 2px solid #e5e7eb; }
        td { padding: 8px 10px; border-bottom: 1px solid #f3f4f6; font-size: 11px; }
        tr:last-child td { border-bottom: none; }
        .green { color: #059669; font-weight: 700; }
        .warn  { color: #d97706; font-weight: 700; }
        .red   { color: #dc2626; font-weight: 700; }
        .footer { margin-top: 32px; text-align: center; font-size: 10px; color: #9ca3af; }
      </style></head><body>
      <h1>Bussola — Relatorio Executivo</h1>
      <div class="sub">${empresa} · ${MESES[mes-1]} / ${ano} · Gerado em ${new Date().toLocaleDateString('pt-BR')}</div>
      <div class="kpis">
        <div class="kpi"><div class="kpi-label">Meta total</div><div class="kpi-val">${fmt(totais.meta)}</div></div>
        <div class="kpi"><div class="kpi-label">Realizado</div><div class="kpi-val">${fmt(totais.realizado)}</div></div>
        <div class="kpi"><div class="kpi-label">Atingimento</div><div class="kpi-val">${totais.ating?.toFixed(1)}%</div></div>
        <div class="kpi"><div class="kpi-label">Projecao</div><div class="kpi-val">${fmt(totais.projecao)}</div></div>
        <div class="kpi"><div class="kpi-label">Comissoes liq.</div><div class="kpi-val">${fmt(totais.comissao)}</div></div>
      </div>
      <table>
        <thead><tr><th>Vendedor</th><th>Meta</th><th>Realizado</th><th>Ating.</th><th>Falta</th><th>Projecao</th><th>Comissao Liq.</th></tr></thead>
        <tbody>
          ${dados.map(d => `<tr>
            <td><b>${d.nome}</b><br><span style="color:#9ca3af;font-size:10px">${d.papel}</span></td>
            <td>${fmt(d.meta)}</td>
            <td>${fmt(d.realizado)}</td>
            <td class="${d.ating>=100?'green':d.ating>=80?'warn':'red'}">${d.ating.toFixed(1)}%</td>
            <td>${fmt(d.falta)}</td>
            <td>${fmt(d.projecao)}</td>
            <td class="green">${fmt(d.comissao.liquido)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      <div class="footer">Bussola by Scanplore.ia — bussula-scanplore.vercel.app</div>
      </body></html>
    `
    const win = window.open('', '_blank')
    win.document.write(conteudo)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); setExportando(false) }, 500)
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%' }}>
      <div className="spin" style={{ width:32, height:32, border:'3px solid var(--bg3)', borderTop:'3px solid var(--accent)', borderRadius:'50%' }}/>
    </div>
  )

  return (
    <div style={{ padding:32, maxWidth:1050, animation:'fadeIn 0.25s ease' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28 }}>
        <div>
          <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Exportação</div>
          <h1 style={{ fontSize:22, fontWeight:500, marginTop:2 }}>Relatórios</h1>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <select value={mes} onChange={e => setMes(Number(e.target.value))} className="input" style={{ width:100, padding:'6px 10px' }}>
            {MESES.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
          <select value={ano} onChange={e => setAno(Number(e.target.value))} className="input" style={{ width:90, padding:'6px 10px' }}>
            {[2024,2025,2026].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <button onClick={exportarCSV} className="btn btn-ghost">CSV</button>
          <button onClick={exportarPDF} disabled={exportando} className="btn btn-primary">
            {exportando ? 'Gerando...' : 'Exportar PDF'}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:24 }}>
        {[
          { label:'Meta total',    val: fmt(totais.meta) },
          { label:'Realizado',     val: fmt(totais.realizado) },
          { label:'Atingimento',   val: `${totais.ating?.toFixed(1)}%`, cor: corAtingimento(totais.ating) },
          { label:'Projeção',      val: fmt(totais.projecao), cor: totais.projecao >= totais.meta ? 'var(--accent)' : 'var(--warn)' },
          { label:'Comissões liq.',val: fmt(totais.comissao), cor: 'var(--accent)' },
        ].map((k,i) => (
          <div key={i} className="card" style={{ padding:'14px 16px' }}>
            <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>{k.label}</div>
            <div style={{ fontSize:18, fontWeight:600, color: k.cor || 'var(--text)' }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Tabela detalhada */}
      <div className="card">
        <div style={{ fontSize:13, fontWeight:500, color:'var(--text2)', marginBottom:16 }}>
          Detalhamento por vendedor — {MESES[mes-1]} / {ano}
        </div>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ borderBottom:'1px solid var(--border)' }}>
              {['Vendedor','Meta','Realizado','Ating.','Falta','Projeção','Comissão liq.'].map(h => (
                <th key={h} style={{ textAlign:'left', padding:'8px 12px', fontSize:11, color:'var(--text3)', fontWeight:500, textTransform:'uppercase', letterSpacing:'0.06em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dados.map((d,i) => {
              const cor = corAtingimento(d.ating)
              return (
                <tr key={d.id} style={{ borderBottom:'1px solid var(--border)' }}>
                  <td style={{ padding:'11px 12px' }}>
                    <div style={{ fontSize:13, fontWeight:500 }}>{d.nome}</div>
                    <div style={{ fontSize:11, color:'var(--text3)' }}>{d.papel}</div>
                  </td>
                  <td style={{ padding:'11px 12px', fontSize:13 }}>{fmt(d.meta)}</td>
                  <td style={{ padding:'11px 12px', fontSize:13, fontWeight:500 }}>{fmt(d.realizado)}</td>
                  <td style={{ padding:'11px 12px' }}>
                    <span style={{ fontSize:13, fontWeight:600, color: cor }}>{d.ating.toFixed(1)}%</span>
                    <div style={{ marginTop:4, height:4, background:'var(--bg3)', borderRadius:99, width:60 }}>
                      <div style={{ width:`${Math.min(d.ating,100)}%`, height:'100%', background: cor, borderRadius:99 }}/>
                    </div>
                  </td>
                  <td style={{ padding:'11px 12px', fontSize:13, color:'var(--warn)' }}>{fmt(d.falta)}</td>
                  <td style={{ padding:'11px 12px', fontSize:13, color: d.projecao >= d.meta ? 'var(--accent)' : 'var(--warn)' }}>{fmt(d.projecao)}</td>
                  <td style={{ padding:'11px 12px', fontSize:13, fontWeight:600, color:'var(--accent)' }}>{fmt(d.comissao.liquido)}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr style={{ borderTop:'2px solid var(--border2)' }}>
              <td style={{ padding:'11px 12px', fontSize:13, fontWeight:600 }}>Total</td>
              <td style={{ padding:'11px 12px', fontSize:13, fontWeight:600 }}>{fmt(totais.meta)}</td>
              <td style={{ padding:'11px 12px', fontSize:13, fontWeight:600 }}>{fmt(totais.realizado)}</td>
              <td style={{ padding:'11px 12px', fontSize:13, fontWeight:600, color: corAtingimento(totais.ating) }}>{totais.ating?.toFixed(1)}%</td>
              <td style={{ padding:'11px 12px', fontSize:13, fontWeight:600, color:'var(--warn)' }}>{fmt(totais.falta)}</td>
              <td style={{ padding:'11px 12px', fontSize:13, fontWeight:600 }}>{fmt(totais.projecao)}</td>
              <td style={{ padding:'11px 12px', fontSize:13, fontWeight:600, color:'var(--accent)' }}>{fmt(totais.comissao)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
