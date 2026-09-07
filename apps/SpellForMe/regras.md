Decisões já fechadas para o Lesingo. Valem em toda tarefa.

## Contexto do dono

- O dono é **desenvolvedor solo**, sem equipe, sem CI e sem backend próprio. Nunca
  proponha serviço, servidor ou pipeline que exija time.
- O app roda **100% no device**: inferência local, sem backend. Não introduza
  chamada de rede nova para funcionar.
- Idioma do produto: interface em inglês. **Todo commit, comentário de código e
  documento do repositório é escrito em inglês.**

## Release e build (invariantes)

- A versão do Android vive em `.env` (`VERSION_CODE`, `VERSION_NAME`), lida pelo
  `android/app/build.gradle`. `.env` é gitignored: alterá-lo é esperado e não entra
  em commit.
- `VERSION_CODE` **só sobe, nunca desce**. Na dúvida entre dois números, use o maior.
- O AAB de loja é gerado por `npm run android:bundle` (`scripts/release-android.sh`),
  que já valida chave de assinatura e versão antes de gastar minutos de build.
- A chave de upload e as senhas vivem no `.env` do dono e **já estão configuradas**.
  Nunca peça credencial, nunca gere build assinado com a chave de debug para a loja,
  nunca bloqueie a tarefa por "falta credencial" sem antes conferir o `.env`.
- Versão iOS 1.0 (5) já foi enviada para review na Apple. **Não mexa em
  `MARKETING_VERSION` nem em `CURRENT_PROJECT_VERSION` do projeto iOS** a menos que a
  tarefa peça isso com todas as letras.

## Como trabalhar

- Passo que só o dono pode executar num console (subir o AAB na Play Console,
  responder a review): implemente tudo que dá do lado do repositório, deixe o
  artefato pronto no lugar combinado e liste o passo manual no summary — nunca
  BLOCKED por isso.
- Prefira mexer no que já existe (`scripts/`, `docs/`) a criar estrutura nova.
- Não faça refactor de produto numa tarefa de release ou de documentação.
