Polimento da marca Aluza no app — dois problemas apontados pelo dono:

1. LOGO SERRILHADA no launcher/splash. Diagnóstico provável: PNG rasterizado em
   resolução errada (ou upscaled) na geração dos ícones. Correção:
   - Regenerar TODOS os raster (ícone adaptive por densidade, splash) a partir
     dos SVGs do kit (`assets/brand/*.svg`) — nunca de PNG para PNG, nunca
     upscale. Cada densidade rasterizada no tamanho exato (mdpi→xxxhdpi), com
     anti-aliasing do rasterizador (rsvg/resvg/inkscape ou ffmpeg com scale de
     alta qualidade; escolher a ferramenta disponível e versionar o script).
   - Referência de fidelidade: o quadro de marca aprovado pelo dono — bordas
     perfeitamente lisas, traço preto contínuo, raio amarelo nítido. O critério
     é o screenshot com zoom do ícone no launcher e da splash não mostrar
     degrau/serrilhado perceptível.
   - Proporções sagradas continuam: escala uniforme, ajuste só por padding.

2. SPLASH MAIS PROFISSIONAL. A atual ficou aquém. $design-director dirige uma
   animação curta e sofisticada com a logo do kit — direção sugerida (o
   design_director pode superar): fundo creme do kit; o símbolo "a" surge com
   máscara/traço se completando OU estático com o raio de sol acendendo em
   sequência (os três traços do raio, stagger de ~80ms) + um settle sutil de
   escala (1.02→1.0); tipografia "aluza" entra por fade depois do símbolo.
   Total 1.2-1.6s, easing de qualidade (curvas do motion.ts), sem bounce, sem
   girar, sem gimmick. Reduced motion: logo estática. A animação nunca atrasa o
   startup real (roda sobre o carregamento).

Fora do escopo: qualquer mudança no desenho do logo em si (o kit é a fonte) e
em qualquer outra tela.
