# Referência: Webhook n8n para Viabilidade

O app envia um **POST** para a URL do webhook n8n (`VITE_N8N_WEBHOOK_URL`) e espera um **JSON** na resposta. Os dados da resposta são salvos na tabela `consultas` e exibidos na página **Resultado**.

---

## 1. Dados que o sistema ENVIA para o n8n (body do POST)

O body é um JSON com os campos do questionário e o ID do usuário:

| Campo               | Tipo           | Exemplo / descrição                                      |
|---------------------|----------------|----------------------------------------------------------|
| `userId`            | string (UUID)   | ID do usuário no Supabase Auth                           |
| `especialidade`     | string         | `"consultorio-medico"`, `"odontologia"`, `"estetica-avancada"`, `"pequenas-cirurgias"`, `"diagnostico-imagem"`, `"outros"` |
| `procedimentos`     | string         | Texto livre (ex.: "consultas, profilaxia, pequenas cirurgias") |
| `numeroSalas`       | number         | Número de salas                                          |
| `areaImovel`        | number         | Área útil do imóvel em m²                                |
| `funcionariosTurno` | number         | Funcionários por turno                                   |
| `pacientesEspera`   | number         | Pacientes em espera                                      |
| `permiteReforma`    | boolean \| null| Se o imóvel permite reforma                              |
| `permiteHidraulica` | boolean \| null| Se permite alteração hidráulica                           |
| `permiteClimatizacao` | boolean \| null | Se permite climatização                               |

**Exemplo de payload enviado:**

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "especialidade": "odontologia",
  "procedimentos": "consultas, profilaxia, pequenas cirurgias",
  "numeroSalas": 2,
  "areaImovel": 45,
  "funcionariosTurno": 4,
  "pacientesEspera": 6,
  "permiteReforma": true,
  "permiteHidraulica": true,
  "permiteClimatizacao": true
}
```

---

## 2. Resposta que o n8n deve RETORNAR (JSON)

**Importante:** O fluxo no n8n precisa **devolver a resposta HTTP** para o navegador. Use o nó **"Respond to Webhook"** (ou equivalente) no **fim** do workflow, retornando o JSON abaixo. Se o n8n não enviar essa resposta, a tela do app fica em loading até dar timeout (2 min). Pode retornar um objeto `{ ... }` ou um array com um item `[{ ... }]` — o sistema aceita os dois.

O n8n deve responder com **status HTTP 200** e um JSON com os campos abaixo. O sistema grava esses valores na tabela `consultas` e mostra na tela de Resultado.

| Campo (na resposta)   | Tipo   | Obrigatório | Uso no sistema |
|-----------------------|--------|-------------|----------------|
| `areaRecomendada`     | number | Sim         | Área total recomendada em m² — exibida como "Área recomendada: X m²" |
| `relatório`           | string | Sim         | Texto do relatório (usado para definir se é "viável" ou "não atende") |
| `imagemUrl`           | string | Sim         | **URL pública** da imagem (ex.: link direto de um bucket S3/Supabase Storage ou CDN). A imagem é exibida na página Resultado. |
| `instalacoesTecnicas` | string | Não         | Texto em **Markdown** com instalações técnicas; renderizado na seção "Instalações técnicas" |

**Importante:** os nomes dos campos devem ser exatamente esses (camelCase; `relatório` com acento).

**Exemplo de resposta que o n8n deve devolver:**

```json
{
  "areaRecomendada": 52,
  "relatório": "O espaço analisado atende aos requisitos da norma SOMASUS para o perfil informado. A área útil é compatível com 2 salas e circulação adequada.",
  "imagemUrl": "https://exemplo.com/imagens/viabilidade-sala-123.png",
  "instalacoesTecnicas": "## Pontos de atenção\n\n- **Ventilação:** Necessária renovação de ar conforme RDC.\n- **Piso:** Revestimento lavável em toda a área clínica.\n- **Lavatório:** Previsão de lavatório na área de preparo."
}
```

### Sobre a imagem

- `imagemUrl` deve ser uma **URL pública** (qualquer origem que o navegador consiga carregar).
- Pode ser gerada pelo n8n (ex.: integração com DALL·E, Stable Diffusion ou outro serviço) e hospedada em Storage (Supabase, S3, etc.) ou CDN; o app só exibe com `<img src={imagemUrl} />`.
- Se não tiver imagem, pode enviar `""`; a página Resultado só mostra o bloco da imagem quando `imagem_url` não é vazio.

### Sobre o status “viável” / “não viável”

A página Resultado define o badge com base no **texto** de `relatorio` e `instalacoes_tecnicas`:

- **“Não atende às normas”** (âmbar): se aparecer “não funciona”, “inviável” ou “reprovado”.
- **“Espaço viável”** (verde): se aparecer “funciona”, “viável” ou “aprovado”.
- Caso contrário: **“Análise de viabilidade”** (neutro).

Ou seja: o n8n pode influenciar o status escrevendo essas palavras no relatório ou nas instalações técnicas.

---

## 3. Resumo rápido para configurar o n8n

1. **Trigger:** Webhook (POST), corpo em JSON.
2. **Entrada:** use os campos do body (userId, especialidade, numeroSalas, areaImovel, etc.) nas próximas etapas (cálculo, IA, geração de imagem).
3. **Saída:** responda ao webhook com um JSON contendo:
   - `areaRecomendada` (number)
   - `relatório` (string)
   - `imagemUrl` (string — URL pública da imagem)
   - `instalacoesTecnicas` (string, opcional — Markdown)

Com isso o sistema consegue salvar a consulta e exibir área, imagem e instalações técnicas na tela de Resultado.
