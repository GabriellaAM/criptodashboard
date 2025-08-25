# Crypto & Macro Dashboard

Um dashboard interativo para análise de criptomoedas e dados macroeconômicos, construído com React, Next.js e Recharts.

## 🚀 Funcionalidades

- **Widgets Interativos**: Iframe, gráficos, tabelas e KPIs
- **Múltiplos Dashboards**: Crie e gerencie diferentes dashboards
- **Dados CSV/JSON**: Importe dados via colagem ou URL
- **Tema Escuro/Claro**: Interface adaptável
- **Responsivo**: Funciona em desktop e mobile
- **Exportar/Importar**: Salve e compartilhe seus dashboards

## 📦 Instalação

1. **Clone o repositório**:
```bash
git clone <url-do-repositorio>
cd criptodashboard
```

2. **Instale as dependências**:
```bash
npm install
```

3. **Execute o projeto**:
```bash
npm run dev
```

4. **Acesse no navegador**:
```
http://localhost:3000
```

## 🛠️ Como Usar

### Dashboards Pré-configurados

O projeto vem com dois dashboards de exemplo:

1. **Cripto**: Gráficos do Bitcoin/ETH e tabela de top moedas
2. **Macro**: Indicadores de inflação e desemprego

### Adicionando Widgets

1. Clique em **"Adicionar widget"**
2. Escolha o tipo:
   - **Iframe**: Para embeds do TradingView ou outros sites
   - **Chart**: Para gráficos com dados CSV/JSON
   - **Table**: Para tabelas de dados
   - **KPI**: Para indicadores simples
   - **HTML Embed**: Para snippets personalizados

### Configurando Gráficos

1. Selecione **"Chart"** como tipo
2. Cole dados CSV ou JSON no campo de dados
3. Configure:
   - **Campo X**: Eixo horizontal (ex: data)
   - **Campos Y**: Valores a serem plotados
   - **Tipo**: Linha, área ou barras

### Exemplo de Dados CSV

```csv
date,btc,eth
2024-01-01,45000,2800
2024-01-02,46000,2850
2024-01-03,47000,2900
```

## 🎨 Personalização

### Temas
- Clique no botão ☀️/🌙 para alternar entre tema claro e escuro

### Layout
- Use o modo edição para reorganizar widgets
- Ajuste largura (colunas) e altura de cada widget
- Mova widgets para cima/baixo na lista

### Exportar/Importar
- Use **"Exportar"** para salvar seus dashboards
- Use **"Importar"** para carregar dashboards salvos

## 🔧 Tecnologias

- **React 18**: Interface de usuário
- **Next.js 14**: Framework React
- **Recharts**: Biblioteca de gráficos
- **PapaParse**: Parser CSV
- **Tailwind CSS**: Estilização
- **LocalStorage**: Persistência local

## 📁 Estrutura do Projeto

```
criptodashboard/
├── app/                    # App Router do Next.js
│   ├── globals.css        # Estilos globais
│   ├── layout.js          # Layout principal
│   └── page.js            # Página inicial
├── components/            # Componentes React
│   ├── DashboardBuilderApp.jsx
│   ├── WidgetCard.jsx
│   ├── WidgetRenderer.jsx
│   ├── ChartWidget.jsx
│   ├── TableWidget.jsx
│   ├── KPIWidget.jsx
│   └── WidgetEditorModal.jsx
├── package.json           # Dependências
├── next.config.js         # Configuração Next.js
├── tailwind.config.js     # Configuração Tailwind
└── README.md              # Este arquivo
```

## 🚀 Deploy

### Vercel (Recomendado)
```bash
npm run build
# Conecte seu repositório ao Vercel
```

### Outros
```bash
npm run build
npm run start
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

MIT License - veja o arquivo LICENSE para detalhes.

## 🆘 Suporte

Se encontrar problemas:
1. Verifique se todas as dependências estão instaladas
2. Certifique-se de que está usando Node.js 18+
3. Limpe o cache: `npm run dev -- --clear`
4. Abra uma issue no repositório




