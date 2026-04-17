# 💎 ProDesign - Moteur Créatif Haut de Gamme

![ProDesign Status](https://img.shields.io/badge/Statut-Stable-brightgreen?style=for-the-badge)
![Sécurité-Snyk](https://img.shields.io/badge/S%C3%A9curit%C3%A9-Snyk_Prot%C3%A9g%C3%A9-blueviolet?style=for-the-badge)
![Licence-Propriétaire](https://img.shields.io/badge/Licence-Propri%C3%A9taire-red?style=for-the-badge)

**ProDesign** est une plateforme d'automatisation créative à la pointe de la technologie, alliant la performance de **Rust**, la flexibilité de l'**IA Python**, et une interface **React** moderne. Conçu pour les agences et les directeurs de création qui exigent puissance, rapidité et fiabilité absolue.

---

## 🚀 Fonctionnalités Clés

- 🦀 **Moteur Graphique Rust** : Composition d'images ultra-rapide utilisant `tiny-skia` et `printpdf`.
- 🤖 **Automation Pilotée par l'IA** : Suppression intelligente de l'arrière-plan et optimisation d'images avec les modèles IA les plus récents.
- 📊 **Reporting Dynamique** : Dashboard intégré avec Telegram et Redis pour des KPIs en temps réel.
- 🛡️ **Sécurité de Grade Militaire** : Conteneurs Docker durcis avec des profils "zéro-privilège".
- ☁️ **Stockage S3 Natif** : Intégration MinIO pour une gestion fiable des actifs numériques.

## 🛠️ Stack Technique

| Composant | Technologie | Description |
| :--- | :--- | :--- |
| **Backend** | Rust (Axum / SQLx) | API de haute performance |
| **Worker** | Python (OpenCV / rembg) | Traitement IA & Média |
| **Queue** | Redis 7 | Gestion des tâches en temps réel |
| **Base de données** | PostgreSQL 17 | Persistance relationnelle |
| **Stockage** | MinIO | API Object Storage compatible S3 |
| **Proxy** | Nginx Alpine | Proxy inverse à faible latence |

---

## 🛡️ Hardening & Sécurité

Ce projet suit une architecture stricte de "Security-by-Design" :

- **Zéro-Tolérance Secrets** : Scanné par **Gitleaks** et protégé par des hooks **Husky**.
- **Audit de Dépendances** : Surveillance continue via **Snyk** et **OSV-Scanner**.
- **SAST** : Scans automatisés de la qualité du code avec **Semgrep**.
- **Durcissement Docker** : Options `no-new-privileges` et `cap_drop` activées sur tous les services critiques.

## 📦 Mise en Route

### Prérequis
- Docker & Docker Compose
- GitHub `act` (pour tester les actions localement)

### Installation
1. Cloner le dépôt (Accès restreint).
2. Créer votre fichier `.env` à partir de `.env.example`.
3. Lancer l'infrastructure avec Docker Compose :
```bash
docker compose up -d
```

---

## 📜 Propriété Intellectuelle

**Copyright © 2026 Ayena Michel.**  
Ce projet est **Propriétaire**. Tous droits réservés. Aucune partie de ce code source ne peut être reproduite ou utilisée sans une autorisation écrite expresse.

---

*Propulsé par le moteur IA ProDesign.*
