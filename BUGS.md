# 🐛 Bugs y Problemas Conocidos

## 🔴 Bugs Críticos

### 1. Tokens Genéricos "pump fun" Aparecen en Explorer
**Estado**: Parcialmente resuelto
**Descripción**: Algunos tokens genéricos con nombres como "pump fun", "pump.fun", "pumpfun" aún aparecen en el Token Explorer a pesar de los filtros implementados.

**Ubicación**:
- `server/index.ts` líneas 1394-1408 (filtro backend)
- `web/src/components/TokenExplorer.tsx` líneas 480-496 (filtro frontend)

**Causa Posible**:
- Los filtros son case-sensitive en algunos casos
- Los tokens pueden tener variaciones en el nombre (espacios, puntos, mayúsculas)
- Los datos pueden venir de diferentes fuentes (pump.fun API, DexScreener, WebSocket) y no todos aplican el filtro

**Solución Propuesta**:
- Mejorar el filtro para ser más robusto y detectar variaciones
- Aplicar el filtro en todas las fuentes de datos antes de combinar
- Agregar validación adicional para nombres muy cortos o genéricos

### 2. Datos Faltantes (liquidity, holders) en Tokens
**Estado**: Parcialmente resuelto
**Descripción**: Algunos tokens no muestran información de liquidez, holders, o volumen_24h.

**Ubicación**:
- `server/index.ts` líneas 1418-1428 (enriquecimiento de datos)

**Causa Posible**:
- Las APIs externas no siempre devuelven todos los campos
- El enriquecimiento con valores por defecto puede no estar aplicándose en todos los casos

**Solución Propuesta**:
- Asegurar que todos los tokens siempre tengan valores por defecto
- Mejorar la lógica de enriquecimiento desde múltiples fuentes

## 🟡 Bugs Menores

### 3. Muchos console.log en Producción
**Estado**: Mejorable
**Descripción**: Hay muchos `console.log`, `console.error`, `console.warn` en el código de producción que deberían ser removidos o reemplazados por un sistema de logging apropiado.

**Ubicación**:
- `server/index.ts`: ~29 instancias
- `web/src/components/TokenExplorer.tsx`: ~10 instancias
- `web/src/components/TokenTerminal.tsx`: ~5 instancias
- Otros componentes frontend

**Solución Propuesta**:
- Implementar un sistema de logging (winston, pino, etc.)
- Usar variables de entorno para controlar el nivel de logging
- Remover console.logs de producción

### 4. Directorio Extraño "keypairsRPC_URL=https:/"
**Estado**: Error de sistema
**Descripción**: Existe un directorio con nombre incorrecto que parece ser un error de creación de archivo/directorio.

**Ubicación**: `/Users/g/Desktop/bund/keypairsRPC_URL=https:/`

**Solución**: Eliminar este directorio y verificar que no se vuelva a crear.

### 5. Archivos Compilados en Repositorio
**Estado**: Resuelto (en .gitignore)
**Descripción**: Hay archivos `.js`, `.d.ts`, `.js.map` compilados en `server/` que no deberían estar en el repositorio.

**Ubicación**: `server/*.js`, `server/*.d.ts`, `server/*.js.map`

**Solución**: Ya están en `.gitignore`, pero deberían limpiarse antes del commit inicial.

### 6. Archivos Temporales No Ignorados
**Estado**: Parcialmente resuelto
**Descripción**: `server.log` y `.DS_Store` existen pero deberían estar en `.gitignore`.

**Solución**: Ya están en `.gitignore`, pero deberían eliminarse antes del commit.

## 🟢 Mejoras Sugeridas

### 7. Manejo de Errores Mejorado
**Descripción**: Algunos bloques try-catch no manejan errores de manera específica o informativa.

**Solución Propuesta**:
- Implementar tipos de error personalizados
- Mejorar mensajes de error para debugging
- Agregar logging estructurado de errores

### 8. Validación de Datos de Entrada
**Descripción**: Falta validación robusta de datos de entrada en algunos endpoints.

**Solución Propuesta**:
- Implementar validación con librerías como `zod` o `joi`
- Validar tipos y rangos de valores
- Retornar errores descriptivos

### 9. TypeScript Strict Mode
**Descripción**: El proyecto podría beneficiarse de habilitar `strict: true` en `tsconfig.json` para mejor type safety.

**Solución Propuesta**:
- Habilitar strict mode gradualmente
- Corregir errores de tipos resultantes
- Mejorar definiciones de tipos

### 10. Testing
**Descripción**: No hay tests unitarios o de integración.

**Solución Propuesta**:
- Agregar Jest o Vitest
- Escribir tests para funciones críticas
- Implementar CI/CD con tests automáticos

## 📝 Notas Adicionales

- El filtro de tokens genéricos funciona en la mayoría de los casos, pero puede fallar con variaciones inesperadas
- Los datos de tokens pueden venir de múltiples fuentes (pump.fun API, DexScreener, WebSocket, on-chain search) y cada una tiene diferentes formatos
- El sistema de enriquecimiento de datos intenta normalizar estos formatos, pero puede haber casos edge

## 🔄 Próximos Pasos

1. ✅ Documentar bugs conocidos
2. ⏳ Mejorar filtro de tokens genéricos
3. ⏳ Limpiar console.logs
4. ⏳ Eliminar archivos temporales
5. ⏳ Implementar sistema de logging
6. ⏳ Agregar validación de datos
7. ⏳ Escribir tests básicos



