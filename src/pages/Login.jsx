import React, { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail]   = useState('')
  const [senha, setSenha]   = useState('')
  const [erro, setErro]     = useState('')
  const [loading, setLoading] = useState(false)
  const [modo, setModo]     = useState('login')
  const [sucesso, setSucesso] = useState('')

  async function entrar(e) {
    e.preventDefault()
    setErro(''); setSucesso(''); setLoading(true)
    if (modo === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
      if (error) setErro('E-mail ou senha incorretos.')
    } else if (modo === 'cadastro') {
      const { error } = await supabase.auth.signUp({ email, password: senha })
      if (error) setErro('Erro ao criar conta: ' + error.message)
      else setSucesso('Conta criada! Verifique seu e-mail para confirmar.')
    } else if (modo === 'reset') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/configuracoes',
      })
      if (error) setErro('Erro ao enviar e-mail: ' + error.message)
      else setSucesso('E-mail de redefinição enviado! Verifique sua caixa de entrada.')
    }
    setLoading(false)
  }

  const modos = [
    { id:'login',    label:'Entrar' },
    { id:'cadastro', label:'Criar conta' },
    { id:'reset',    label:'Esqueci a senha' },
  ]

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', padding:20 }}>
      <div style={{ position:'fixed', top:'20%', left:'50%', transform:'translateX(-50%)', width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle, rgba(0,200,150,0.04) 0%, transparent 70%)', pointerEvents:'none' }}/>

      <div style={{ width:'100%', maxWidth:400, animation:'fadeIn 0.3s ease' }}>
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <div style={{ fontSize:11, color:'var(--text3)', letterSpacing:'0.14em', textTransform:'uppercase', marginBottom:8 }}>Scanplore.ia</div>
          <div style={{ fontSize:36, fontWeight:600, color:'var(--accent)', letterSpacing:'-0.03em' }}>Bussola</div>
          <div style={{ fontSize:13, color:'var(--text3)', marginTop:8 }}>Gestão comercial inteligente</div>
        </div>

        <div className="card" style={{ padding:32 }}>
          <div style={{ display:'flex', gap:6, marginBottom:28, flexWrap:'wrap' }}>
            {modos.map(m => (
              <button key={m.id} onClick={() => { setModo(m.id); setErro(''); setSucesso('') }}
                style={{ flex:1, padding:'8px 4px', borderRadius:8, fontSize:12, fontWeight:500, minWidth:80,
                  background: modo === m.id ? 'var(--accent-dim)' : 'transparent',
                  color: modo === m.id ? 'var(--accent)' : 'var(--text3)',
                  border: modo === m.id ? '1px solid rgba(0,200,150,0.3)' : '1px solid var(--border)',
                  cursor:'pointer', transition:'all 0.15s' }}>
                {m.label}
              </button>
            ))}
          </div>

          <form onSubmit={entrar}>
            <div style={{ marginBottom:16 }}>
              <label className="label">E-mail</label>
              <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required/>
            </div>
            {modo !== 'reset' && (
              <div style={{ marginBottom:24 }}>
                <label className="label">{modo === 'cadastro' ? 'Senha (mín. 6 caracteres)' : 'Senha'}</label>
                <input className="input" type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="••••••••" required/>
              </div>
            )}
            {modo === 'reset' && <div style={{ marginBottom:24 }}/>}

            {erro && (
              <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:8, padding:'10px 14px', fontSize:13, color:'var(--danger)', marginBottom:16 }}>
                {erro}
              </div>
            )}
            {sucesso && (
              <div style={{ background:'var(--accent-dim)', border:'1px solid rgba(0,200,150,0.3)', borderRadius:8, padding:'10px 14px', fontSize:13, color:'var(--accent)', marginBottom:16 }}>
                {sucesso}
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width:'100%', justifyContent:'center', padding:'12px 0', fontSize:14 }}>
              {loading ? 'Aguarde...' : modo === 'login' ? 'Entrar no Bussola' : modo === 'cadastro' ? 'Criar minha conta' : 'Enviar e-mail de redefinição'}
            </button>
          </form>
        </div>

        <div style={{ textAlign:'center', marginTop:20, fontSize:12, color:'var(--text3)' }}>
          Bussola by Scanplore.ia — Todos os direitos reservados
        </div>
      </div>
    </div>
  )
}
