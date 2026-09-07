1. Login com Google com foto → avatar aparece automaticamente no perfil e nos
   chips (evidência; em emulador sem Play Services, validar via conta com
   photoURL simulado/fixture e registrar observação).
2. Trocar foto pela galeria funciona com Storage habilitado; sem Storage,
   erro tratado e app segue com Google/iniciais.
3. Iniciais como fallback em todo lugar que exibia antes; nenhuma quebra de
   layout nos chips/pilhas/faixa.
4. Imagem redimensionada no cliente antes do upload.
5. Regras de Storage e Firestore atualizadas e versionadas; passos manuais
   listados no summary.
6. Tema claro/escuro; a11y; `npm run validate` verde.
