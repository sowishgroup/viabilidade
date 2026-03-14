export type ViabilidadeInput = {
  numSalas: number
  temAnestesia: boolean
  equipeAdmin: number
}

export type ViabilidadeResult = {
  areaTotal: number
  markdown: string
}

const AREA_POR_SALA = 9 // m²
const CIRCULACAO_PERCENT = 0.3 // +30%
const AREA_ANESTESIA = 12 // m² (fixo)

function getAreaAdmin(equipeAdmin: number): number {
  if (equipeAdmin <= 0) return 0
  if (equipeAdmin <= 3) return 10
  if (equipeAdmin <= 7) return 18
  return 25
}

/**
 * Calcula a área total de viabilidade com base em salas, anestesia e equipe administrativa.
 * Regras:
 * - Cada sala = 9 m²
 * - Circulação = +30% do total de salas
 * - Se anestesia = +12 m² fixos
 * - Admin: 1-3 pessoas = 10 m², 4-7 = 18 m², 8+ = 25 m²
 */
export function calculateViabilidade(data: ViabilidadeInput): ViabilidadeResult {
  const areaSalas = data.numSalas * AREA_POR_SALA
  const areaCirculacao = areaSalas * CIRCULACAO_PERCENT
  const areaAnestesia = data.temAnestesia ? AREA_ANESTESIA : 0
  const areaAdmin = getAreaAdmin(data.equipeAdmin)

  const areaTotal = areaSalas + areaCirculacao + areaAnestesia + areaAdmin

  const circulacaoPercentual = (CIRCULACAO_PERCENT * 100).toFixed(0)
  const areaCirculacaoFormatada =
    areaCirculacao % 1 === 0 ? areaCirculacao : areaCirculacao.toFixed(1)
  const areaTotalFormatada =
    areaTotal % 1 === 0 ? areaTotal : Number(areaTotal.toFixed(1))

  const faixaAdmin =
    data.equipeAdmin <= 0
      ? '0 pessoa(s)'
      : data.equipeAdmin <= 3
        ? '1 a 3 pessoas'
        : data.equipeAdmin <= 7
          ? '4 a 7 pessoas'
          : '8 ou mais pessoas'

  const markdown = `# Cálculo de Viabilidade

## Dados de entrada

| Item | Valor |
|------|--------|
| Número de salas | ${data.numSalas} |
| Anestesia | ${data.temAnestesia ? 'Sim' : 'Não'} |
| Equipe administrativa | ${data.equipeAdmin} pessoa(s) |

---

## Detalhamento dos cálculos

### 1. Área das salas

Cada sala = **${AREA_POR_SALA} m²**.

\`${data.numSalas} salas × ${AREA_POR_SALA} m² = **${areaSalas} m²**\`

### 2. Circulação (+${circulacaoPercentual}%)

Sobre o total da área de salas: +${circulacaoPercentual}% para circulação.

\`${areaSalas} m² × ${circulacaoPercentual}% = **${areaCirculacaoFormatada} m²**\`

### 3. Área de anestesia

${data.temAnestesia ? `Inclusão de área fixa para anestesia: **${AREA_ANESTESIA} m²**.` : 'Não aplicável (sem anestesia). **0 m²**.'}

### 4. Área administrativa

Equipe: **${faixaAdmin}** → área destinada: **${areaAdmin} m²**.

| Faixa (pessoas) | Área (m²) |
|-----------------|-----------|
| 1 a 3 | 10 |
| 4 a 7 | 18 |
| 8 ou mais | 25 |

---

## Resultado

| Conceito | Área (m²) |
|----------|-----------|
| Salas | ${areaSalas} |
| Circulação | ${areaCirculacaoFormatada} |
| Anestesia | ${areaAnestesia} |
| Administrativo | ${areaAdmin} |
| **Total** | **${areaTotalFormatada} m²** |
`

  return {
    areaTotal: areaTotalFormatada,
    markdown,
  }
}
