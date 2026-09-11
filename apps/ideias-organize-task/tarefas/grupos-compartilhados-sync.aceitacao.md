1. Teste de ida e volta verde: espaço com um grupo e uma tarefa dentro dele,
   push seguido de pull num workspace limpo, e o resultado tem o grupo e a
   tarefa com o mesmo `groupId`.
2. O mesmo teste **falha** com o código anterior à correção — mostre no
   summary que ele foi rodado contra o `push` antigo e reprovou. Sem isso o
   teste não prova nada.
3. Teste que varre a `updateMask` de cada escrita do gateway e exige que toda
   chave mascarada exista no corpo.
4. O duplo de teste do gateway respeita a semântica do PATCH (máscara sem
   corpo apaga); a mudança está no arquivo do mock e comentada.
5. Numa conta só, no aparelho: criar grupo num espaço compartilhado, criar
   tarefa dentro dele, fechar e abrir o app — o grupo continua lá e a tarefa
   continua dentro. Evidência de tela e árvore.
6. Nenhuma mudança de formato no documento remoto além de `groups` voltar a
   ser escrito; nenhuma regra do Firestore precisa ser republicada (diga isso
   no summary).
7. O summary explica como um espaço já quebrado se recupera sozinho.
8. `npm run validate` verde.
