# Relatório de Arquitetura e Segurança de Sistema Escolar

Abaixo apresento a minha análise de segurança focada na topologia atual do sistema (Painel Escolar vs. Super Painel) sob a ótica de um SaaS (Software as a Service) educacional corporativo.

Para garantirmos integridade, segurança contra falhas humanas (mal uso) e ataques, as seguintes funcionalidades deveriam ser estranguladas no Painel Escolar e movidas ou restringidas ao **Super Painel Administrativo**:

---

## 1. Criação e Exclusão Definitiva de Escolas (`escolas.js`)
**Situação Atual:** As funções `salvarEscola()` e `excluirEscolaConfirmado()` parecem estar altamente acessíveis ou engatadas nas telas comuns de controle escolar. 
**O Risco:** Um gestor de escola NUNCA deve ter a capacidade de deletar a sua própria instituição, apagando de forma cascateada alunos, notas e diários. Da mesma forma, um diretor não tem autoridade legal para "inaugurar/criar" uma escola nova no sistema da prefeitura.
**Como deve ser:**
- **No Super Painel:** Exclusividade total para Adicionar uma nova escola, Inativar ou Deletar.
- **No Painel Escolar:** O Diretor deve conseguir acessar uma página de "Configurações da Unidade", onde só poderá editar dados estéticos (upload de logomarca da escola) ou contatos rápidos (telefone, e-mail da secretaria).

## 2. Delegação de Permissões Críticas (`permissoes.js`)
**Situação Atual:** O formulário de concessão de acessos permite delegar o Nível de Acesso (1 a 6) para um funcionário. 
**O Risco:** "Escalonamento de Privilégios". Um Diretor de Escola (Nível 2) não pode ter o botão no dropdown dele para transformar o Vigia em um Super Administrador (Nível 1) ou em outro Diretor (Nível 2).
**Como deve ser:**
- **No Super Painel:** O Super Admin é quem cria Diretores (Nível 2) e eleva outras pessoas a Nível 1.
- **No Painel Escolar:** O formulário de permissões visto pelo diretor só pode permitir do Nível 3 (Secretaria) para baixo (Nível 4, 5 e 6).

## 3. Gestão e Exclusão Global de Funcionários (`funcionarios.js`)
**Situação Atual:** A base de funcionários é global (um funcionário de CPF único trabalha na prefeitura inteira e é "vinculado" em várias escolas).
**O Risco:** Se um Diretor se irritar com um funcionário e clicar no botão "Excluir Funcionário" no cadastro, ele pode deletar o funcionário do banco de dados global, apagando essa pessoa do sistema e quebrando os vínculos dela em todas as outras escolas onde ela trabalha.
**Como deve ser:**
- **No Super Painel:** O Super RH gerencia o "Cadastro Único" do CPF (editar dados base do indivíduo, inativar globalmente ou deletar).
- **No Painel Escolar:** O Diretor apenas "Contrata" (Adiciona Vínculo) ou "Demite" (Remove Vínculo) da sua escola. A ficha base global da pessoa permanece intacta para as outras escolas.

## 4. Configurações Globais de Ano Letivo
**O Risco:** Se o painel da escola permitir configurar as datas de encerramento de bimestres ou semestres, cada escola seguirá um calendário diferente.
**Como deve ser:**
- **No Super Painel:** O calendário letivo oficial do município (quando acaba o 1º bimestre e quando o diário eletrônico trava) deve ser definido centralizadamente. As escolas apenas obedecem às travas de tempo estipuladas globalmente.

## 5. Exclusões Hard-Delete de Registros Sensíveis (Notas, Alunos e Frequência)
**O Risco:** Botões de "Lixeira" que enviam o comando `delete()` direto no Supabase. O banco de dados escolar é material probatório jurídico. 
**Como deve ser:**
- **No Painel Escolar:** Os botões de lixeira não devem deletar nada; devem apenas mudar o status do registro para `inativo = true` ou `status = 'Transferido / Cancelado'`, fazendo o registro sumir da visão da escola ("Soft Delete").
- **No Super Painel:** Uma aba dedicada ao "Gerenciamento de Lixeira / Banco" onde o Super Admin pode revisar as exclusões e aplicar o expurgo (`delete()`) em caráter definitivo, caso não seja erro humano.

---

### Conclusão
O princípio geral da segurança RBAC (Controle de Acesso Baseado em Papéis) dita que o **Painel Escolar deve ser um ambiente de OPERAÇÃO**, focado estritamente em gerir alunos e lançamentos. Qualquer ação de **ESTRUTURAÇÃO** (tabelas base, cargos, inauguração de escola, hierarquias máximas) deve ser obrigatoriamente sugada para o **Super Painel**.
