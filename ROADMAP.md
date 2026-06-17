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
- [ ] **Controle de Acesso e Perfis:** Mapear e separar claramente Secretaria (Nível 1), Gestor Escolar, Coordenador Pedagógico e Professor.
- [ ] **Dashboard da Secretaria:** Trazer métricas reais em tempo real para a `home.html`.
- [ ] **Sistema de Avaliações (Boletins):** Transformar o visual atual em uma tela de lançamento real de notas (bimestres, trimestres).
- [ ] **Relatórios:** Ampliar os relatórios estatísticos para incluir reprovação, aprovação e gráficos.

## 🔴 O que FALTA ser Implementado (Novos Módulos)
- [ ] **Diário de Classe Digital & Chamada Digital:** Interface rápida para professores registrarem presença, conteúdo e atividades no dia a dia.
- [ ] **Programas Educacionais:** Cadastro de programas (Educação Integral, Reforço, etc.) e vinculação de alunos/professores a eles.
- [ ] **Gestão de Ocorrências:** Registro permanente de advertências, elogios e histórico disciplinar.
- [ ] **Cadastros Globais Estruturais:** Modalidades, Turnos, e Calendário Letivo.
- [ ] **Business Intelligence (BI):** Painel analítico com gráficos avançados para a Secretaria.
- [ ] **Inteligência Artificial (IA) Educacional:** Algoritmo para alertar risco de evasão e baixo rendimento.
- [ ] **Módulos Futuros (WhatsApp):** Bot integrado para consulta de notas e comunicados.
