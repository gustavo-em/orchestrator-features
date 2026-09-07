Implementar autenticação com Firebase Auth usando email e senha.

Escopo da menor versão que completa o trabalho do usuário:

- Tela de login com email e senha.
- Tela de cadastro (email, senha, confirmação) e tela de recuperação de senha por email.
- Estados de loading, erro de credencial inválida e erro de rede, cada um com mensagem
  clara em português que não culpa o usuário.
- Sessão persistida: quem já entrou abre o app direto na tela principal; logout disponível
  em ajustes/perfil volta para o login.
- Dados locais existentes do usuário continuam visíveis após o login (nada de perder as
  tarefas já cadastradas na migração para conta).

Fora do escopo desta versão: login social (Google/Apple), verificação de email obrigatória,
multi-conta, e qualquer sincronização de dados entre dispositivos — sync é feature própria.

Pré-requisito provisionado pelo dono do app (não tente criar): projeto no console do
Firebase com Email/Password habilitado e `android/app/google-services.json` presente no
repositório. Se o arquivo não existir, pare com BLOCKED explicando exatamente o que falta.

Observação do dono: o provedor Google também já está habilitado no console do Firebase.
Isso NÃO muda o escopo desta tarefa — login social continua fora; é preparação para uma
tarefa futura.
