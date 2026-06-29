# Roadmap do Projeto: Sistema Municipal de Gestão Educacional

Este arquivo será nosso guia. Ele contém o status atual de tudo o que foi solicitado nas especificações do projeto, separando o que já funciona do que ainda precisamos implementar. Atualizaremos este arquivo conforme avançarmos.

## 🟢 O que já está funcionando (Concluído ou Fundações Sólidas)
- [x] Estrutura base de Progressive Web App (PWA) (manifest, service-worker).
- [x] Sistema de roteamento em Single Page Application (SPA) carregando HTMLs dinamicamente.
- [x] Conexão base com o Supabase (Autenticação e Banco de Dados).
- [x] Login de Usuários.
- [x] Cadastro de Escolas (Básico).
- [x] Cadastro de Funcionários (Básico).
- [x] Cadastro de Alunos (Básico).
- [x] Gestão de Turmas e vinculação de alunos.
- [x] Sistema de Permissões baseado em Níveis (1, 2, 3, etc.).
- [x] Telas e layout de relatórios de impressão (Boletim, Ficha Individual).
- [x] Mural de avisos escolar.

## 🟡 O que precisa ser Expandido (Refatoração e Evolução)
- [ ] **Controle de Acesso e Perfis (Híbrido RBAC + ABAC):** Mapear e separar claramente Secretaria (Nível 1), Gestor, Coordenador, Professor e equipes. Implementar estrutura de RBAC (Role-Based Access Control) para os níveis de acesso tradicionais (1 a 6) combinada com ABAC (Attribute-Based Access Control) para avaliar restrições contextuais baseadas em atributos (como a lotação em `escola_id` e o array de `cargos_gerenciados` para o Nível 5).
- [ ] **Dashboard da Secretaria:** Trazer métricas reais em tempo real para a `home.html`.
- [ ] **Sistema de Avaliações (Boletins):** Transformar o visual atual em uma tela de lançamento real de notas (bimestres, trimestres).
- [ ] **Relatórios:** Ampliar os relatórios estatísticos para incluir reprovação, aprovação e gráficos.
- [ ] **Gestão Global de 360 Graus:** Remover as "travas antigas" que exigem a presença de `escolaAtual` para carregar UI/Funções (`auth.js`, `turmas.js`). Isso permitirá que a Secretaria cadastre alunos, gerencie turmas e visualize operações diretamente do painel global, escolhendo a escola em uma lista flutuante.
- [ ] **Adequação à Portaria 671/MTE (Sistema de Ponto):** Ajustar o módulo operacional mobile (Nível 6) para cumprir as normas legais de controle de jornada, com assinatura eletrônica de espelho de ponto, comprovante do trabalhador e exportação segura dos registros.

## 🔴 O que FALTA ser Implementado (Novos Módulos)
- [ ] **Diário de Classe Digital & Chamada Digital:** Interface rápida para professores registrarem presença, conteúdo e atividades no dia a dia.
- [ ] **Programas Educacionais:** Cadastro de programas (Educação Integral, Reforço, etc.) e vinculação de alunos/professores a eles.
- [ ] **Gestão de Ocorrências:** Registro permanente de advertências, elogios e histórico disciplinar.
- [ ] **Cadastros Globais Estruturais:** Modalidades, Turnos, e Calendário Letivo.
- [ ] **Business Intelligence (BI):** Painel analítico com gráficos avançados para a Secretaria.
- [ ] **Inteligência Artificial (IA) Educacional:** Algoritmo para alertar risco de evasão e baixo rendimento.
- [ ] **Módulos Futuros (WhatsApp):** Bot integrado para consulta de notas e comunicados.

---

## 🗺️ Arquitetura de Expansão (Módulos e Planos)

O diagrama radial abaixo ilustra como o licenciamento do cliente controla as permissões de visualização no front-end e a segurança das tabelas no banco de dados, liberando recursos de forma modular conforme o plano ativo:

```mermaid
graph TD
    %% Núcleo Central (Core)
    Core((("🏢 NÚCLEO CENTRAL\nAssinatura do Cliente\n(Tabela Escolas/Tenants)")))
    
    %% Camada de Orquestração (Irradiação)
    OrqFront["⚙️ ORQUESTRADOR FRONT-END\n(Menu Lateral Dinâmico / js/sidebar.js)"]
    OrqBack["🔒 ORQUESTRADOR BACK-END\n(Políticas de Linha RLS / PostgreSQL)"]
    
    %% Conexões do Core para os Orquestradores
    Core ==>|Lê 'plano' ou 'modulos_ativos'| OrqFront
    Core ==>|Valida Token JWT + Escola| OrqBack
    
    %% Sub-grupo: Módulo Básico (Sempre Ativo)
    subgraph Módulos Básicos (Gratuito)
        ModBase1["📌 Mural de Avisos"]
        ModBase2["🏫 Gestão de Turmas"]
    end
    
    %% Sub-grupo: Módulo Intermediário (Upgrade 1)
    subgraph Módulos Intermediários (Gestão)
        ModInt1["🎓 Ficha de Alunos"]
        ModInt2["👥 Funcionários"]
    end
    
    %% Sub-grupo: Módulo Premium (Upgrade 2)
    subgraph Módulos Premium (Operacional)
        ModPrem1["📲 Ponto Mobile (Portaria 671)"]
        ModPrem2["📊 Relatórios Estatísticos & BI"]
    end

    %% Conexões do Front-End para os Módulos (Visualização)
    OrqFront -->|Sempre Visível| ModBase1
    OrqFront -->|Sempre Visível| ModBase2
    
    OrqFront -.->|Se plano >= Intermediário| ModInt1
    OrqFront -.->|Se plano >= Intermediário| ModInt2
    
    OrqFront -.->|Se plano = Premium| ModPrem1
    OrqFront -.->|Se plano = Premium| ModPrem2
    
    %% Conexões do Back-End para os Módulos (Segurança das Tabelas)
    ModBase1 --- OrqBack
    ModBase2 --- OrqBack
    ModInt1 -.->|RLS bloqueia se não assinado| OrqBack
    ModInt2 -.->|RLS bloqueia se não assinado| OrqBack
    ModPrem1 -.->|RLS bloqueia se não assinado| OrqBack
    ModPrem2 -.->|RLS bloqueia se não assinado| OrqBack

    %% Estilos Visuais
    classDef coreClass fill:#1e3a8a,stroke:#3b82f6,stroke-width:4px,color:#fff;
    classDef orqClass fill:#0f172a,stroke:#64748b,stroke-width:2px,color:#fff;
    classDef baseClass fill:#064e3b,stroke:#059669,stroke-width:2px,color:#fff;
    classDef interClass fill:#7c2d12,stroke:#ea580c,stroke-width:2px,color:#fff;
    classDef premClass fill:#581c87,stroke:#9333ea,stroke-width:2px,color:#fff;
    
    class Core coreClass;
    class OrqFront,OrqBack orqClass;
    class ModBase1,ModBase2 baseClass;
    class ModInt1,ModInt2 interClass;
    class ModPrem1,ModPrem2 premClass;
```
