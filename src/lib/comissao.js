// Motor de cálculo de comissões — 4 regras combinadas
export function calcularComissao(realizado, meta, config) {
  if (!config || !meta || meta === 0) return { bruto: 0, liquido: 0, percentualEfetivo: 0 }
  const pct = (realizado / meta) * 100

  let percentual = 0

  if (config.usa_escalonado) {
    if (pct <= config.faixa1_limite)       percentual = config.faixa1_percentual
    else if (pct <= config.faixa2_limite)  percentual = config.faixa2_percentual
    else                                   percentual = config.faixa3_percentual
  } else {
    percentual = config.percentual_fixo
  }

  let bruto = realizado * (percentual / 100)

  // Bônus ao bater 100%
  if (config.bonus_meta_ativo && pct >= 100) {
    bruto += Number(config.bonus_meta_valor)
  }

  const liquido = bruto * 0.727 // desconto ~27.3% INSS+IR estimado

  return { bruto, liquido, percentualEfetivo: percentual, atingimento: pct }
}

export function corAtingimento(pct) {
  if (pct >= 100) return 'var(--accent)'
  if (pct >= 80)  return 'var(--warn)'
  return 'var(--danger)'
}

export function diasUteisNoMes(ano, mes) {
  const ultimo = new Date(ano, mes, 0).getDate()
  let uteis = 0
  for (let d = 1; d <= ultimo; d++) {
    const dow = new Date(ano, mes - 1, d).getDay()
    if (dow !== 0 && dow !== 6) uteis++
  }
  return uteis
}

export function diasUteisAteHoje(ano, mes) {
  const hoje = new Date()
  const ehMesAtual = hoje.getMonth() + 1 === mes && hoje.getFullYear() === ano
  const ultimo = ehMesAtual ? hoje.getDate() : new Date(ano, mes, 0).getDate()
  let uteis = 0
  for (let d = 1; d <= ultimo; d++) {
    const dow = new Date(ano, mes - 1, d).getDay()
    if (dow !== 0 && dow !== 6) uteis++
  }
  return uteis
}

export function fmt(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
}
