Foto de perfil por usuário.

- LOGIN COM GOOGLE: se a conta tem foto (photoURL do provider), adotá-la
  automaticamente como foto de perfil inicial — sem pedir nada ao usuário.
- UPLOAD PRÓPRIO: na tela/edição de perfil, trocar a foto pegando da galeria
  (image picker; crop quadrado simples se barato). Armazenamento no Firebase
  Storage em avatars/{uid}.jpg, redimensionada no cliente (ex.: 256-512px) para
  não subir foto de 10MB.
- Passo manual do dono: habilitar o Firebase Storage no console, se ainda não
  estiver. Regras do Storage versionadas em docs/firebase/storage.rules
  (leitura autenticada; escrita só no próprio avatars/{uid}) — publicar é passo
  do dono, listado sem bloquear. Sem Storage habilitado, o upload mostra erro
  tratado e o photoURL do Google continua funcionando.
- EXIBIÇÃO: onde hoje aparecem iniciais (MemberChip, pilha de membros, linha de
  identidade na aba Você, faixa do combinado, atribuições), mostrar a foto
  quando existir, com as iniciais como fallback imediato enquanto carrega ou
  quando não há foto. A prop `inverted` e os tamanhos existentes continuam
  valendo.
- O documento users/{uid} ganha photoURL (regra atualizada em
  docs/firebase/firestore.rules — mesmo pacote de republicação pendente).
- Privacidade: foto visível para quem já pode ver o perfil (membros); nada de
  foto em documento público.
