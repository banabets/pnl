# Security Policy

## 🔒 Security Best Practices

### Private Keys and Keypairs
- **NEVER** commit private keys or keypairs to the repository
- All keypairs are stored locally in the `keypairs/` directory (which is gitignored)
- Use environment variables for RPC URLs and API keys
- Never share your master wallet keypair

### API Keys
- Store API keys in `.env` files (which are gitignored)
- Never hardcode API keys in source code
- Rotate API keys regularly
- Use different keys for development and production

### Environment Variables
- Create a `.env.example` file with placeholder values
- Document all required environment variables
- Never commit actual `.env` files

## 🛡️ Security Features

### Built-in Protections
- Keypair files are automatically excluded from git
- Environment variables are loaded securely
- No private keys are transmitted over the network
- All transactions are signed locally

### Recommendations
- Use a hardware wallet for the master wallet (if possible)
- Enable 2FA on all external services
- Regularly audit wallet balances
- Monitor for unauthorized transactions
- Keep dependencies up to date

## 🚨 Reporting Security Issues

If you discover a security vulnerability, please:
1. **DO NOT** open a public issue
2. Email the maintainers directly
3. Provide detailed information about the vulnerability
4. Allow time for the issue to be addressed before public disclosure

## ⚠️ Disclaimer

This software is provided "as is" without warranty. Use at your own risk. Always:
- Test with minimal amounts first
- Understand the risks involved
- Keep your private keys secure
- Monitor your wallets regularly
- Use reputable RPC providers

