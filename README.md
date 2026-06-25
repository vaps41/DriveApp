![Texto descritivo](src/logo.png)
ServApp - Marketplace de Serviços sob Demanda

O ServApp é um protótipo funcional de um aplicativo de prestação de serviços (no estilo "Uber para Serviços"), construído com foco numa excelente experiência de utilizador e interface moderna.

O aplicativo simula as duas pontas do ecossistema de serviços:

O Cliente: Que precisa de um serviço rápido (ex: Eletricista, Encanador), visualiza preços fixos e encontra profissionais próximos em tempo real.

O Prestador: Que fica online para receber pedidos, aceita corridas/serviços e gere os seus ganhos diários num dashboard financeiro próprio.

🌟 Funcionalidades Principais

Design Premium e Mobile-First: Interface fluida, construída com Tailwind CSS, focada na usabilidade de dispositivos móveis.

Alternância de Perfis em Tempo Real: Permite trocar entre a visão do "Cliente" e do "Prestador" com um clique para fins de demonstração.

Fluxo de Solicitação (Cliente):

Escolha de categorias (Eletricista, Encanador, Limpeza).

Exibição transparente de preços.

Animação de radar na procura de profissionais.

Tela de "Match" com confirmação de chegada do prestador.

Dashboard do Profissional:

Modo Online/Offline.

Tela de recebimento de novos pedidos com cálculo de ganhos.

Fluxo de navegação até ao cliente.

Simulação de finalização de serviço via PIN de segurança.

Sistema de Notificações (Toasts): Feedback visual em tempo real para ações como "Pedido Aceite" ou "Serviço Concluído".

Formatação de Moeda Nativa: Valores exibidos no padrão BRL (R$).

🛠️ Tecnologias Utilizadas

Este projeto foi construído utilizando as seguintes tecnologias:

React: Biblioteca JavaScript para construção da interface de utilizador.

Vite: Ferramenta de build rápida e otimizada.

Tailwind CSS: Framework de CSS utilitário para estilização rápida e responsiva.

Lucide React: Biblioteca de ícones SVG limpos e modernos.

🚀 Como Rodar o Projeto Localmente

Siga os passos abaixo para instalar e testar o projeto no seu computador:

Pré-requisitos

Ter o Node.js instalado no seu computador.

Passo a passo

Clone o repositório:

git clone [https://github.com/SEU_USUARIO/servapp.git](https://github.com/SEU_USUARIO/servapp.git)
cd servapp


Instale as dependências:

npm install


Inicie o servidor de desenvolvimento:

npm run dev


Acesse no navegador:
Abra o link fornecido no terminal (geralmente http://localhost:5173).

🌐 Como fazer Deploy na Vercel

O projeto está otimizado para ser publicado gratuitamente e em poucos cliques através da Vercel.

Faça login na sua conta Vercel.

Clique em Add New... > Project.

Importe este repositório do seu GitHub.

As configurações padrão da Vercel (Framework Preset: Vite, Build Command: npm run build, Output Directory: dist) já estão corretas.

Clique em Deploy.

Nota: Certifique-se de que a imagem da logo na pasta src se chama exatamente logo.png (ou atualize o import no ficheiro App.jsx para coincidir com o nome exato da imagem no seu repositório, respeitando maiúsculas e minúsculas).

👨‍💻 Próximos Passos (Evolução para Produção)

Para transformar este Mockup num aplicativo real para o mercado:

[ ] Substituir o Mock Data por um backend real (ex: Node.js/Express ou Firebase/Supabase).

[ ] Implementar autenticação real para Clientes e Prestadores.

[ ] Integrar geolocalização nativa (Google Maps API ou Mapbox).

[ ] Integrar gateway de pagamentos (ex: Stripe ou Pagar.me) utilizando a lógica de Escrow (refeção de pagamento).

[ ] Migrar a interface para React Native para gerar aplicativos nativos nas lojas (App Store e Google Play).

Projeto criado para validação de conceito de Marketplace de Serviços.
