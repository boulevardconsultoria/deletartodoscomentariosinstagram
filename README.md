# Instagram Comment Bulk Deletion Script

Script JavaScript para o navegador que automatiza a exclusão de comentários feitos pela própria conta através da página **Sua atividade → Comentários** do Instagram.

O script funciona diretamente no navegador, utilizando o DOM da página e os elementos que o Instagram disponibiliza na interface.

> ⚠️ Aviso: este script depende da estrutura atual do Instagram. Como o Instagram altera frequentemente o HTML e os componentes da página, o script pode parar de funcionar sem aviso.

---

## ✨ Recursos

- Exclusão de comentários em lote
- Não precisa instalar programas adicionais
- Não utiliza API externa
- Não solicita senha ou credenciais
- Executado diretamente pelo Console do navegador
- Processamento em lotes para reduzir a quantidade de ações simultâneas
- Aguarda o carregamento da interface entre as operações
- Detecta automaticamente os botões de seleção e exclusão
- Continua processando enquanto houver comentários disponíveis

---

## 📌 Requisitos

- Conta do Instagram
- Navegador baseado em Chromium ou Firefox
- Estar logado na conta do Instagram
- Acesso à página de comentários da seção Sua atividade

Recomenda-se utilizar a interface do Instagram em português, pois a versão atual do script procura o botão:

```text
Creditos: https://instagram.com/jedersonsantoss
