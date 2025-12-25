# 🔴 GUÍA DE RECUPERACIÓN DE FONDOS

## Situación Actual

**El dinero NO se perdió** - está seguro en estas wallets:
- `5sFf9yM7e5S15pmi7FLknHBbeaLmUqRTib3d2BsekPJL` - 0.026647 SOL
- `DPZR2a4TXyvAm3LNwFqwxRXYbGn3SDUa3mARos3FWZ8e` - 0.013323 SOL

**Total: ~0.04 SOL**

## Problema

Las private keys de estas wallets no están en el sistema actual. Las wallets fueron sobrescritas cuando se generaron nuevas wallets después de la distribución.

## Soluciones

### Opción 1: Buscar Backups
1. **Time Machine (si usas Mac)**: Restaurar archivos de `keypairs/` del 24 de diciembre antes de las 1:34 AM
2. **Backups manuales**: Buscar en otros lugares donde guardaste las wallets
3. **Otra computadora**: Si usaste el sistema en otra máquina, las wallets pueden estar ahí

### Opción 2: Usar el Endpoint de Recuperación de Emergencia

Si encuentras las private keys (en formato base64 o array), puedes usar:

```bash
curl -X POST http://localhost:3001/api/funds/emergency-recover \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddresses": [
      "5sFf9yM7e5S15pmi7FLknHBbeaLmUqRTib3d2BsekPJL",
      "DPZR2a4TXyvAm3LNwFqwxRXYbGn3SDUa3mARos3FWZ8e"
    ],
    "privateKeys": [
      "BASE64_PRIVATE_KEY_1",
      "BASE64_PRIVATE_KEY_2"
    ]
  }'
```

### Opción 3: Usar Phantom/Solflare

Si tienes las private keys, puedes:
1. Importar las wallets en Phantom o Solflare
2. Transferir los fondos manualmente al master wallet

## Transacciones en Blockchain

Puedes verificar las transacciones en Solscan:
- Wallet 1: https://solscan.io/account/5sFf9yM7e5S15pmi7FLknHBbeaLmUqRTib3d2BsekPJL
- Wallet 2: https://solscan.io/account/DPZR2a4TXyvAm3LNwFqwxRXYbGn3SDUa3mARos3FWZ8e

## Prevención Futura

Para evitar esto en el futuro:
1. **Backup automático**: El sistema ahora guarda el historial de transacciones en `transaction-history.json`
2. **No sobrescribir wallets**: Antes de generar nuevas wallets, recuperar fondos primero
3. **Exportar private keys**: Guardar las private keys en un lugar seguro antes de hacer cleanup

## Contacto

Si encuentras las private keys, puedo ayudarte a recuperar los fondos inmediatamente.



