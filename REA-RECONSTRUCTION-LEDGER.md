# Architecture & Static Verification Ledger — BALAKOTUWA: Citadel of Heladiva

Verified using **`rea@6.4.0`** (`analyze-javascript-application`).

---

## 1. Static Verification Summary
- **CLI Version**: `rea@6.4.0` (`Node.js v24.15.0` on `win32 x64`)
- **JavaScript / Semantic Graph Analyzer**: `rea analyze-javascript-application` — 15-phase AST & semantic graph verification passed on `game.js` and `index.html`.

---

## 2. Core Engine Subsystems

| Subsystem | Design Specification | Implementation in `game.js` |
| :--- | :--- | :--- |
| **Isometric Projection** | 2:1 dimetric diamond tile ratio (`64×32` px base tile) with painter's algorithm depth sort `(gx + gy)` and vertical `z` elevation offset for walls/towers. | `gridToIso`, `isoToGrid`, `renderIsoWorld` |
| **Gama Sabhawa & Villager Loop** | Idle *Govi* villagers gather at the hearth; placing an industry/farm building assigns 1 villager who physically walks `Workshop → Resource Node → Badagara / Vee Bissa`. | `updateWorkersAndWildlife`, `drawIsoBuilding` |
| **Badagara Visual Stacking** | The *Badagara* is a 2×2 ground courtyard where physical 3D stacks of Kumbuk planks and Kalugal granite blocks render incrementally as inventory counts rise. | `drawIsoBuilding` (`stockpile`) |
| **Bastion Elevation Bonus** | Ranged warriors (`Dunuvaya` / `Hevaya`) climbing a *Mura Atuwa* Watchtower (`z = 38`) receive a `+45%` range multiplier and parabolic arrow trajectory. | `updateUnitsAndProjectiles` |
