# Badminton Backend

Build with TypeScirpt, Express.js

This project is based on the BadminStar service from this [repo](https://github.com/tontong1412/badminton-service.git) with the goal of enhancing automation, maintainability, and reliability by:

Migrating to TypeScript for improved type safety and developer experience.
Implementing unit and end-to-end (e2e) testing to ensure code quality and robustness.
Integrating GitHub Actions for CI/CD to streamline development workflows and automate testing and deployment.

## To run the project

This project requires MongoDB as database. For development, MongoDB and Redis container is included in `docker-compose.yaml` so to run the project is simply run

```bash
docker compose up
```

The app can be access through http://localhost:8080
