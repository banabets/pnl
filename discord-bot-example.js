// Discord Bot Example - Token Lookup by Mint Address
// Install: npm install discord.js
// Usage: node discord-bot-example.js

const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Your server API URL (change this to your deployed URL)
const API_URL = process.env.API_URL || 'http://localhost:3001';

// Command prefix
const PREFIX = '!';

client.once('ready', () => {
  console.log(`✅ Discord bot logged in as ${client.user.tag}`);
  console.log(`📡 API URL: ${API_URL}`);
});

client.on('messageCreate', async (message) => {
  // Ignore bot messages
  if (message.author.bot) return;
  
  // Check if message starts with prefix
  if (!message.content.startsWith(PREFIX)) return;
  
  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();
  
  // Command: !token <mint_address>
  if (command === 'token' || command === 't') {
    if (args.length === 0) {
      return message.reply('❌ Por favor proporciona una dirección de mint. Ejemplo: `!token <mint_address>`');
    }
    
    const mint = args[0];
    
    // Validate mint address format (basic check)
    if (mint.length < 32 || mint.length > 44) {
      return message.reply('❌ Dirección de mint inválida. Debe tener entre 32 y 44 caracteres.');
    }
    
    // Show typing indicator
    message.channel.sendTyping();
    
    try {
      // Fetch token data from API
      const response = await fetch(`${API_URL}/api/tokens/${mint}`);
      const data = await response.json();
      
      if (!data.success || !data.token) {
        return message.reply(`❌ Token no encontrado: \`${mint.substring(0, 8)}...\``);
      }
      
      const token = data.token;
      
      // Create embed
      const embed = new EmbedBuilder()
        .setTitle(`${token.name || 'Unknown Token'} (${token.symbol || 'UNK'})`)
        .setDescription(`Información completa del token`)
        .setColor(token.isNew ? 0x00ff00 : token.isGraduating ? 0xffaa00 : 0x0099ff)
        .setThumbnail(token.imageUrl || null)
        .addFields(
          {
            name: '💰 Precio',
            value: `$${token.price?.toFixed(6) || '0.000000'}`,
            inline: true
          },
          {
            name: '📊 Market Cap',
            value: `$${(token.marketCap / 1000).toFixed(1)}K`,
            inline: true
          },
          {
            name: '💧 Liquidez',
            value: `$${(token.liquidity / 1000).toFixed(1)}K`,
            inline: true
          },
          {
            name: '📈 Cambio 24h',
            value: `${token.priceChange24h >= 0 ? '🟢' : '🔴'} ${token.priceChange24h?.toFixed(2) || '0.00'}%`,
            inline: true
          },
          {
            name: '📈 Cambio 1h',
            value: `${token.priceChange1h >= 0 ? '🟢' : '🔴'} ${token.priceChange1h?.toFixed(2) || '0.00'}%`,
            inline: true
          },
          {
            name: '👥 Holders',
            value: token.holders?.toString() || 'N/A',
            inline: true
          },
          {
            name: '📊 Volumen 24h',
            value: `$${(token.volume24h / 1000).toFixed(1)}K`,
            inline: true
          },
          {
            name: '🔄 Transacciones 24h',
            value: `${(token.txns24h?.buys || 0) + (token.txns24h?.sells || 0)}`,
            inline: true
          },
          {
            name: '⏰ Edad',
            value: token.age < 60 ? `${token.age} min` : `${(token.age / 60).toFixed(1)} horas`,
            inline: true
          },
          {
            name: '🏷️ DEX',
            value: token.dexId?.toUpperCase() || 'UNKNOWN',
            inline: true
          },
          {
            name: '⚠️ Risk Score',
            value: `${token.riskScore || 50}/100`,
            inline: true
          },
          {
            name: '🏅 Estado',
            value: [
              token.isNew ? '🆕 Nuevo' : '',
              token.isGraduating ? '🎓 Graduando' : '',
              token.isTrending ? '🔥 Trending' : ''
            ].filter(Boolean).join(' ') || 'Normal',
            inline: true
          }
        )
        .addFields(
          {
            name: '🔗 Enlaces',
            value: [
              `[DexScreener](${token.dexScreenerUrl})`,
              `[Birdeye](${token.birdeyeUrl})`,
              `[Solscan](${token.solscanUrl})`
            ].join(' • '),
            inline: false
          }
        )
        .setFooter({ 
          text: `Mint: ${token.mint.substring(0, 8)}...${token.mint.slice(-4)}`,
          iconURL: token.imageUrl || undefined
        })
        .setTimestamp();
      
      // Send embed
      await message.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error fetching token:', error);
      message.reply('❌ Error al buscar el token. Intenta de nuevo más tarde.');
    }
  }
  
  // Command: !help
  if (command === 'help' || command === 'h') {
    const helpEmbed = new EmbedBuilder()
      .setTitle('🤖 Comandos del Bot')
      .setDescription('Comandos disponibles para buscar información de tokens')
      .addFields(
        {
          name: '`!token <mint_address>` o `!t <mint_address>`',
          value: 'Busca información completa de un token por su dirección de mint',
          inline: false
        },
        {
          name: 'Ejemplo',
          value: '`!token 6LhgaTr4dDsJzLczhmHodmUXnnrVdB6XmR7havWWpump`',
          inline: false
        }
      )
      .setColor(0x0099ff)
      .setTimestamp();
    
    message.reply({ embeds: [helpEmbed] });
  }
});

// Login to Discord
client.login(process.env.DISCORD_BOT_TOKEN);

