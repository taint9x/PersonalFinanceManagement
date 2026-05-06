---
trigger: model_decision
description: Specification of Compose File and Project Name.
---

Explicit File: Use the -f flag to point to the environment-specific file (e.g., docker-compose.dev.yml for development/local).

Project Name: Use the -p flag followed by a unique prefix (e.g., dev_personalfinance) to prevent resource naming collisions with other projects.

example: docker compose -f docker-compose.dev.yml -p dev_personalfinance up -d --build