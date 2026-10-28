# Sim Labs — Laboratórios Didáticos Offline (HTML/CSS/JS)

Simulador educacional modular e 100% offline para práticas de Redes e Segurança. Estrutura separa motor de simulação (engine) e interface (ui), com cenários configuráveis via JSON. Inclui métricas, logs, controles, teoria por etapa, quiz, gráficos e exportação de resultados.

**[▶ Testar online](https://jhordanleandro.github.io/sim-labs/)**. Na demonstração, os cenários funcionam completos; só o login e o envio de resultados ao servidor ficam desativados.

## Como Usar
- Use a [demonstração online](https://jhordanleandro.github.io/sim-labs/) ou sirva a pasta localmente: `python3 -m http.server 8000` e abra `http://localhost:8000`.
- Abrir o `index.html` direto do disco não funciona: o navegador bloqueia o carregamento dos cenários em JSON.
- Login e envio de resultados exigem o servidor PHP (veja [Hospedagem](#hospedagem-hostinger-e-acompanhamento)).
- Escolha um cenário no seletor, informe um alvo (quando aplicável) e inicie.
- Acompanhe painéis de Métricas, Logs, Teoria e Quiz. A qualquer momento, exporte os resultados.

## Arquitetura
- `core/engine.js`: motor de simulação; processa passos, aplica controles, emite callbacks (`onLog`, `onMetrics`, `onControls`, `onTheory`, `onQuiz`).
- `core/ui.js`: renderiza UI, gráficos em Canvas e interações.
- `core/utils.js`: utilitários e tradução (`t()`), suporte a `pt` e `en`.
- `scenarios/*.json`: cenários declarativos com passos, métricas, controles, teoria, quizzes e dicas por limiar (`metricHints`).
- `assets/`: estilos e ícones.

## Cenários Atuais
- `ddos-basic.json`: volume de requisições, latência e erros; controles: WAF, rate-limit, CDN; alvo digitável e simulação de queda.
- `sqli-basic.json`: exposição de registros; controles: validação de parâmetros, WAF, sanitização.
- `arp-spoof.json`: pacotes ARP falsificados; controles: Port Security, DHCP Snooping.

## Alinhamento Curricular
Com base nos cronogramas das disciplinas do curso técnico:
- Redes de Computadores (60h): fundamentos, topologias, modelo OSI/TCP-IP, protocolos (HTTP/DNS/DHCP/SMTP/FTP/SSH), Ethernet, ARP/ICMP, VPN, VLAN, Firewall, NAT, IPv4/IPv6, endereçamento/sub-redes, serviços (Web/FTP/BD).
- Segurança em SI (40h): introdução, requisitos (CIA + privacidade, autenticidade, legalidade), controle de acesso, varreduras, IDS, invasores e ameaças, criptografia (simétrica/assimétrica/hash/assinatura), LGPD, ISO 27001, plano de ação.

### Mapeamento sugerido (exemplos)
- OSI/TCP-IP → módulos de camada (Aplicação: HTTP/DNS; Transporte: TCP vs UDP; Rede: ICMP/TTL; Enlace: ARP/Ethernet).
- VLAN/Firewall/NAT/VPN → cenários de segmentação, regras e tradução de endereços com impacto em métricas.
- CIA/Controle de Acesso → trade-offs disponibilidade vs segurança; políticas e perfis.
- Criptografia → demonstrações de hash, assinatura e cifragem com métricas de tempo e tamanho.
- LGPD/ISO 27001 → atividade orientada a políticas, classificação e riscos.

## Melhorias Propostas (Roadmap)
1) Camadas de Rede (Redes)
- `tcp-udp-basic`: comparar latência, perdas e throughput entre TCP/UDP sob perda/jitter.
- `icmp-mapper`: ping/traceroute, TTL e ICMP; bloqueio por firewall.
- `vlan-segmentation`: broadcast/isolamento, vazamento por misconfiguração, impacto em ARP.
- `nat-firewall`: regras de NAT (SNAT/DNAT) e firewall; exposição indevida por porta liberada.
- `vpn-throughput`: túnel VPN, overhead e latência; efeito de criptografia e MTU.

2) Segurança Aplicada (Segurança)
- `ids-scans`: varreduras (SYN, UDP, ping sweep) e tuning de IDS (sensibilidade vs falsos positivos).
- `auth-access-control`: DAC/MAC/RBAC; perfis e permissões, logs de acesso.
- `crypto-basics`: AES vs RSA (tempo de cifragem/decifragem simulado), tamanhos de chave.
- `hash-signature`: hash de arquivos, colisões teóricas, assinatura e verificação.
- `privacy-lgpd`: classificação de dados, minimização, pseudonimização; impacto em risco.

3) Aperfeiçoamentos Transversais
- Pré/Pós-quiz por cenário; modo desafio sem dicas.
- Rubricas configuráveis e export alinhado a A1/A2.
- Dicas contextuais por limiar mais granulares (delta por janela, tendência).
- UI: seletor de idioma, acessibilidade (teclado, contraste), impressão de relatório.

## Estrutura de Cenário (resumo)
- `dict`: textos `pt`/`en` para títulos, teoria e mensagens.
- `metrics`: estado inicial e unidades.
- `controls`: esquema e efeitos (funções serializadas) que alteram métricas/logs.
- `steps`: sequência de ações (delays, deltas, eventos especiais).
- `theory`: listas de chaves do `dict` por etapa e `final`.
- `questions`: quiz por etapa (enunciado, alternativas, correta, feedback).
- `metricHints`: limiares/deltas e mensagens didáticas automáticas.

## Avaliação e Exportação
- Exporta JSON com métricas, logs, respostas e decisões de controle para facilitar correção.
- Sugestão: agregar nota por rubrica (acertos no quiz, configuração adequada de controles e análise do relatório).

## Como Estender
- Duplique um arquivo em `scenarios/` e ajuste `dict`, `metrics`, `controls`, `steps`, `theory`, `questions` e `metricHints`.
- Use `teacher-config.template.json` para mapear objetivos, limiares e rubricas sem alterar código.

## Sugerir Sequência (exemplo)
- Redes: usar `arp-spoof` próximo às Aulas 32–33 (ARP/RARP); `icmp-mapper` nas Aulas 34 (ICMP) e 29 (Ethernet); `vlan-segmentation` em 36 (VLAN) e 37 (Firewall); `nat-firewall` nas Aulas 38–42 (NAT/Gateway); `vpn-throughput` nas Aulas 35 e 50–51.
- Segurança: `ddos-basic` para requisitos de Disponibilidade (Aulas 5–6); `sqli-basic` para Integridade/Confidencialidade (Aulas 5–7 e 19); `ids-scans` nas Aulas 9–10; `crypto-basics` e `hash-signature` nas Aulas 23–29; `privacy-lgpd` nas Aulas 34–35.

## Próximos Passos
- Implementar os cenários do roadmap priorizando: `tcp-udp-basic`, `ids-scans`, `vlan-segmentation` e `crypto-basics`.
- Adicionar seletor de idioma na UI.
- Publicar guia do professor a partir do template.

## Hospedagem (Hostinger) e acompanhamento
- Envie `sim-labs/` para `public_html/`.
- Rode a migração: acesse `https://SEU_DOMINIO/sim-labs/api/migrate.php` uma vez.
- Garanta permissão de escrita para `sim-labs/data/`.
- Segurança: `.htaccess` em `sim-labs/data/` bloqueia acesso direto aos arquivos.
- Compatibilidade: `index.php` serve o `index.html` automaticamente se a hospedagem priorizar PHP.
- Acesso:
  - Professor: o primeiro cadastro feito no sistema recebe o papel de professor. Faça esse cadastro logo após a migração.
  - Aluno: cadastrado pelo professor (matrícula + data de nascimento AAAA-MM-DD) e entra com esses mesmos dados.
  - Resultados: “Exportar Resultados” envia ao servidor quando logado; painel “Resultados” lista, filtra, mostra e permite baixar cada tentativa.

### Acompanhamento (professor)
- Painel “Resultados” com filtros por cenário e período (data inicial/final).
- Clique em “ver” para expandir o JSON na página ou “baixar” para salvar.
- No painel do professor, cadastre alunos e veja a lista de cadastrados.

### Relatórios em PDF
- No painel “Resultados”, clique em “PDF” para abrir o relatório.
- Use o botão “Imprimir / Salvar em PDF” do navegador para gerar o arquivo.
- O relatório inclui cabeçalho com matrícula, cenário, data, tabela de métricas e controles, e logs.

## Licença
Distribuído sob a [licença MIT](LICENSE).
