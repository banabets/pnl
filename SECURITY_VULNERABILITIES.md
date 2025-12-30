# Security Vulnerabilities

## Known Vulnerabilities

### High Severity (5 vulnerabilities)

These vulnerabilities are in Solana SDK dependencies and do not have available fixes:

1. **@solana/spl-token** (via @raydium-io/raydium-sdk)
   - Severity: High
   - Status: No fix available
   - Impact: Dependency of Raydium SDK

2. **@solana/buffer-layout-utils** (via bigint-buffer)
   - Severity: High
   - Status: No fix available
   - Impact: Used by @solana/spl-token

### Notes

- These are transitive dependencies from Solana ecosystem libraries
- No fixes are currently available from the maintainers
- The vulnerabilities are in low-level buffer handling code
- For production use, monitor for updates to:
  - `@raydium-io/raydium-sdk`
  - `@solana/spl-token`
  - `@solana/web3.js`

### Recommendations

1. Regularly check for updates: `npm audit`
2. Monitor Solana SDK releases for security patches
3. Consider using dependency overrides if fixes become available
4. These vulnerabilities are in dependencies, not in our code

### Checking for Updates

```bash
npm audit
npm outdated
```

### Updating Dependencies

When fixes become available:

```bash
npm update @raydium-io/raydium-sdk
npm update @solana/spl-token
npm update @solana/web3.js
```



