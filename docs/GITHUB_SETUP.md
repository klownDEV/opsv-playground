# Säker GitHub-konfiguration

Koden är förberedd för publicering, men följande repositoryinställningar måste aktiveras i GitHub efter första push.

## Grundinställningar

1. Skapa repositoryt som publikt utan att automatiskt lägga till README, licens eller `.gitignore`.
2. Lägg till den lokala remote-URL:en och pusha `main`.
3. Aktivera **Private vulnerability reporting** under Security.
4. Aktivera **Dependabot alerts**, **Dependabot security updates**, **Secret scanning** och **Push protection**.
5. Tillåt inte Actions att skapa eller godkänna pull requests om det inte uttryckligen behövs.

## Branch protection för main

- Kräv pull request före merge.
- Kräv minst en godkänd granskning.
- Avvisa gamla godkännanden när nya commits pushas.
- Kräv att statuskontrollen `verify` passerar.
- Kräv att diskussioner är lösta.
- Blockera force push och radering.
- Begränsa bypass till betrodda maintainers.

## Hemligheter

GitHub-repot behöver inga produktionshemligheter för CI. Lägg inte Vercels, Discords eller databasens uppgifter i GitHub Actions Secrets om arbetsflödet inte senare får ett tydligt, avgränsat behov.

Vercel-deploymenten ska använda Vercels Environment Variables. Kontrollera särskilt att preview-deployments inte får produktionsdatabas eller produktions-OAuth om obetrodda pull requests kan skapa previews.

## Första push

```bash
git commit -m "Initial open source release"
git remote add origin <REPOSITORY-URL>
git push -u origin main
```

Commitens verkliga tidsstämpel ska behållas. Projektets dokumenterade startdatum är 24 augusti 2026 och finns i README, changelog, paketmetadata och miljömallen.
