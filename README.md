# 💎 ProDesign - High-End Creative Engine

![ProDesign Banner](https://img.shields.io/badge/Status-Stable-brightgreen?style=for-the-badge)
![Security-Snyk](https://img.shields.io/badge/Security-Snyk_Protected-blueviolet?style=for-the-badge)
![License-Proprietary](https://img.shields.io/badge/License-Proprietary-red?style=for-the-badge)

**ProDesign** is a state-of-the-art creative automation platform combining the performance of **Rust**, the flexibility of **Python IA**, and a modern **React** interface. Designed for agencies and creative leads who need power, speed, and absolute reliability.

---

## 🚀 Key Features

- 🦀 **Rust Graphics Engine**: Blazing fast image composition using `tiny-skia` and `printpdf`.
- 🤖 **AI-Driven Automation**: Intelligent background removal and image optimization worker.
- 📊 **Dynamic Reporting**: Telegram & Redis integrated dashboard for real-time KPIs.
- 🛡️ **Military Grade Security**: Hardened Docker containers with zero-privilege profiles.
- ☁️ **S3 Compatible Storage**: Native MinIO integration for reliable asset management.

## 🛠️ Technology Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Backend** | Rust (Axum / SQLx) | Core High-Performance API |
| **Worker** | Python (OpenCV / rembg) | AI & Media Processing |
| **Queue** | Redis 7 | Real-time Job Management |
| **Database** | PostgreSQL 17 | Relational persistence |
| **Storage** | MinIO | S3 Object Storage API |
| **Proxy** | Nginx Alpine | Low-latency Reverse Proxy |

---

## 🛡️ Security Hardening

This project follows a strict security-first architecture:

- **Secret Zero-Tolerance**: Scanned by **Gitleaks** and **Husky** hooks.
- **Dependency Audit**: Continuous monitoring via **Snyk** and **OSV-Scanner**.
- **SAST**: Automated code quality scans with **Semgrep**.
- **Container Hardening**: `no-new-privileges` and `cap_drop` enabled on all critical services.

## 📦 Getting Started

### Prerequisites
- Docker & Docker Compose
- GitHub `act` (for local action testing)

### Installation
1. Clone the repository (Access restricted).
2. Create your `.env` from `.env.example`.
3. Launch with Docker Compose:
```bash
docker compose up -d
```

---

## 📜 Intellectual Property

**Copyright © 2026 Ayena Michel.**  
This project is **Proprietary**. All rights are reserved. No part of this codebase may be reproduced or used without express written permission.

---

*Powered by ProDesign AI Engine.*
