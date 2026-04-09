# Scripts

## Game Scripts

### run-games.ts — Batch game runner

```bash
pnpm tsx scripts/run-games.ts --gameType prisoner-dilemma --personaIds 1,2 --count 5 --parallel 2
```

### seed-game-personas.ts — Seed test personas

```bash
pnpm tsx scripts/seed-game-personas.ts
```

### admintool.ts — User management

```bash
pnpm tsx scripts/admintool.ts create-user email@example.com password123
pnpm tsx scripts/admintool.ts list-users
pnpm tsx scripts/admintool.ts reset-password email@example.com newpass
```

## Monitoring

### _poll-game.ts — Poll a running game session

```bash
pnpm tsx scripts/_poll-game.ts <token>
```

### _check-tournament.ts — Check tournament state

```bash
pnpm tsx scripts/_check-tournament.ts
```

### _check-personas.ts — Verify persona data

```bash
pnpm tsx scripts/_check-personas.ts
```

## Infrastructure

### mock-server-only.ts

Mocks the `server-only` module so scripts can import server-side code in a CLI context. Import at the top of any script that needs it:

```typescript
import "./mock-server-only";
```
