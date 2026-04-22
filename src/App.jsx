import React, { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import LancarVenda from './pages/LancarVenda'
import Vendedores from './pages/Vendedores'
import Metas from './pages/Metas'
import Comissoes from './pages/Comissoes'
import Relatorios from './pages/Relatorios'
import Configuracoes from './pages/Configuracoes'
import Layout from './components/Layout'

export default function App() {
  const [session, setSession] = useState(undefined)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}>
      <div className="spin" style={{ width:32, height:32, border:'3px solid var(--bg3)', borderTop:'3px solid var(--accent)', borderRadius:'50%' }}/>
    </div>
  )

  if (!session) return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )

  return (
    <Layout session={session}>
      <Routes>
        <Route path="/"               element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard"      element={<Dashboard />} />
        <Route path="/lancar"         element={<LancarVenda />} />
        <Route path="/vendedores"     element={<Vendedores />} />
        <Route path="/metas"          element={<Metas />} />
        <Route path="/comissoes"      element={<Comissoes />} />
        <Route path="/relatorios"     element={<Relatorios />} />
        <Route path="/configuracoes"  element={<Configuracoes />} />
        <Route path="*"               element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  )
}
