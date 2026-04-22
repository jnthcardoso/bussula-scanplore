import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const NAV = [
  { to:'/dashboard',  label:'Dashboard',    icon:'◈' },
  { to:'/lancar',     label:'Lançar Venda', icon:'+' },
  { to:'/vendedores', label:'Vendedores',   icon:'◎' },
  { to:'/metas',      label:'Metas',        icon:'◇' },
  { to:'/comissoes',  label:'Comissões',    icon:'$' },
  { to:'/relatorios', label:'Relatórios',   icon:'≡' },
]

export default function Layout({ children, session }) {
  const navigate = useNavigate()
  const [saindo, setSaindo] = useState(false)

  async function sair() {
    setSaindo(true)
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden' }}>
      <aside style={{ width:220, minWidth:220, background:'var(--bg2)', borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', padding:'24px 0' }}>
        <div style={{ padding:'0 20px 28px' }}>
          <div style={{ fontSize:11, color:'var(--text3)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:4 }}>Scanplore.ia</div>
          <div style={{ fontSize:22, fontWeight:600, color:'var(--accent)', letterSpacing:'-0.02em' }}>Bussola</div>
        </div>
        <nav style={{ flex:1, padding:'0 10px' }}>
          {NAV.map(({ to, label, icon }) => (
            <NavLink key={to} to={to} style={({ isActive }) => ({
              display:'flex', alignItems:'center', gap:10,
              padding:'10px 12px', borderRadius:8, marginBottom:2,
              fontSize:14, fontWeight: isActive ? 500 : 400,
              color: isActive ? 'var(--accent)' : 'var(--text2)',
              background: isActive ? 'var(--accent-dim)' : 'transparent',
              transition:'all 0.15s', textDecoration:'none',
            })}>
              <span style={{ fontSize:15, fontFamily:'monospace' }}>{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>
        <div style={{ padding:'16px 20px', borderTop:'1px solid var(--border)' }}>
          <div style={{ fontSize:12, color:'var(--text3)', marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{session?.user?.email}</div>
          <button onClick={sair} disabled={saindo} style={{ fontSize:12, color:'var(--text3)', background:'none', padding:0, marginTop:6, cursor:'pointer', border:'none' }}>
            {saindo ? 'Saindo...' : 'Sair'}
          </button>
        </div>
      </aside>
      <main style={{ flex:1, overflow:'auto', background:'var(--bg)' }}>{children}</main>
    </div>
  )
}
