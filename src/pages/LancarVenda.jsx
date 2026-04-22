import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function fmt(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
}

export default function LancarVenda() {
  const [produtos, setProdutos] = useState([])
  const [form, setForm] = useState({ produto_id: '', valor: '', data_venda: new Date().toISOString().split('T')[0], observacao: '' })
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState('')
  const [vendas, setVendas] = useState([])
  const [perfil, setPerfil] = useState(null)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: p } = await supabase.from('perfis').select('*, empresas(nome)').eq('id', user.id).single()
    setPerfil(p)
    if (p?.empresa_id) {
      const { data: prods } = await supabase.from('produtos').select('*').eq('empresa_id', p.empresa_id).eq('ativo', true)
      setProdutos(prods || [])
      const hoje = new Date()
      const inicio = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}-01`
      const { data: vs } = await supabase.from('vendas').select('*, produtos(nome)').eq('vendedor_id', user.id).gte('data_venda', inicio).order('data_venda', { ascending: false }).limit(20)
      setVendas(vs || [])
    }
  }

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function lancar(e) {
    e.preventDefault()
    setErro(''); setLoading(true)
    if (!form.valor || isNaN(Number(form.valor.replace(',','.'))) || Number(form.valor.replace(',','.')) <= 0) {
      setErro('Informe um valor válido.'); setLoading(false); return
    }
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('vendas').insert({
      empresa_id: perfil.empresa_id,
      vendedor_id: user.id,
      produto_id: form.produto_id || null,
      valor: Number(form.valor.replace(',','.')),
      data_venda: form.data_venda,
      observacao: form.observacao || null,
    })
    if (error) { setErro('Erro ao lançar: ' + error.message); setLoading(false); return }
    setSucesso(true)
    setForm({ produto_id: '', valor: '', data_venda: new Date().toISOString().split('T')[0], observacao: '' })
    setTimeout(() => setSucesso(false), 3000)
    init()
    setLoading(false)
  }

  return (
    <div style={{ padding: 32, maxWidth: 900, animation: 'fadeIn 0.25s ease' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Registro</div>
        <h1 style={{ fontSize: 22, fontWeight: 500, marginTop: 2 }}>Lançar Venda</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
        {/* Formulário */}
        <div className="card">
          <form onSubmit={lancar}>
            <div style={{ marginBottom: 16 }}>
              <label className="label">Produto / Serviço</label>
              <select className="input" value={form.produto_id} onChange={e => set('produto_id', e.target.value)}>
                <option value="">Selecionar produto (opcional)</option>
                {produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="label">Valor da venda *</label>
              <input className="input" type="text" inputMode="decimal"
                placeholder="0,00" value={form.valor}
                onChange={e => set('valor', e.target.value)} required />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="label">Data</label>
              <input className="input" type="date" value={form.data_venda}
                onChange={e => set('data_venda', e.target.value)} required />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label className="label">Observação</label>
              <textarea className="input" rows={3} placeholder="Cliente, detalhes..."
                value={form.observacao} onChange={e => set('observacao', e.target.value)}
                style={{ resize: 'vertical' }} />
            </div>

            {erro && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--danger)', marginBottom: 16 }}>
                {erro}
              </div>
            )}
            {sucesso && (
              <div style={{ background: 'var(--accent-dim)', border: '1px solid rgba(0,200,150,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--accent)', marginBottom: 16 }}>
                Venda lancada com sucesso!
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '12px 0' }}>
              {loading ? 'Salvando...' : 'Confirmar venda'}
            </button>
          </form>

          {produtos.length === 0 && perfil && (
            <div style={{ marginTop: 16, padding: '12px 14px', background: 'var(--bg3)', borderRadius: 8, fontSize: 12, color: 'var(--text3)' }}>
              Nenhum produto cadastrado ainda. Peça ao administrador para cadastrar os produtos da sua empresa.
            </div>
          )}
        </div>

        {/* Histórico */}
        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 16, color: 'var(--text2)' }}>
            Minhas vendas este mês
          </div>
          {vendas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)', fontSize: 13 }}>
              Nenhuma venda lançada este mês ainda.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {vendas.map(v => (
                <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg3)', borderRadius: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{v.produtos?.nome || 'Venda avulsa'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                      {new Date(v.data_venda + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--accent)' }}>
                    {fmt(v.valor)}
                  </div>
                </div>
              ))}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--text2)' }}>Total do mês</span>
                <span style={{ fontWeight: 600, color: 'var(--accent)' }}>
                  {fmt(vendas.reduce((s, v) => s + Number(v.valor), 0))}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
