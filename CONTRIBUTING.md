# Contributing to CargoLedger Backend

Thank you for your interest in contributing! CargoLedger is part of the Stellar open-source ecosystem and welcomes contributions from developers, logistics domain experts, and Web3 builders.

## Getting Started

1. Fork the repository and clone your fork
2. Install dependencies: `npm install`
3. Copy the environment file: `cp .env.example .env`
4. Run in development mode: `npm run dev`
5. Run tests: `npm test`

## Development Workflow

- Create a feature branch from `main`: `git checkout -b feat/your-feature`
- Write code and tests
- Run `npm run typecheck && npm run lint && npm test` before pushing
- Open a pull request against `main`

## Code Standards

- TypeScript strict mode is enforced
- All new behaviour must have corresponding tests in `tests/`
- Follow the [Decimal String Serialization Policy](README.md#decimal-string-serialization-policy) for any amount fields
- Structured JSON logging only — no plain `console.log` strings in production paths
- Stellar public keys must be validated against the `G...` format before persistence

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add shipment tracking webhook endpoint
fix: reject stale timestamps in signature verification
docs: update WebSocket protocol table
chore: bump helmet to v8
```

## Pull Request Checklist

- [ ] Tests pass (`npm test`)
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] No lint errors (`npm run lint`)
- [ ] README updated if behaviour changed
- [ ] Security implications considered (see `SECURITY.md`)
- [ ] Decimal string policy respected for any new amount fields

## Domain Glossary

| Term | Meaning |
|------|---------|
| Shipment | A freight job tracked from origin to destination |
| Sender | Stellar account initiating the freight payment |
| Recipient | Stellar account receiving the freight payment |
| freightAmount | Total freight value as a decimal string |
| ratePerKg | Per-kilogram rate as a decimal string |
| Indexer | Service that ingests Stellar ledger events and updates shipment state |

## Reporting Issues

Open a GitHub issue with a clear description, reproduction steps, and expected vs actual behaviour. Use the provided issue templates where available.

## License

By contributing, you agree your contributions will be licensed under the [Apache 2.0 License](LICENSE).
