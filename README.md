# @resendegu/kube-templates

> ⚠️ **Disclaimer**: This project was originally developed and is actively maintained by [**Cubos Tecnologia**](https://cubos.io). This repository is a fork for testing and experimental purposes only. For the official version, please refer to the original project at [https://git.cubos.io/cubos/kube-templates](https://git.cubos.io/cubos/kube-templates).

A TypeScript library that encapsulates Kubernetes resources into strongly-typed, reusable classes. It enables developers to programmatically define and deploy infrastructure components for applications running on Kubernetes, with full type safety and IntelliSense support.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Available Resources](#available-resources)
  - [Core Kubernetes Resources](#core-kubernetes-resources)
  - [Database Resources](#database-resources)
  - [Application Resources](#application-resources)
  - [Scaling & Scheduling](#scaling--scheduling)
  - [Certificates & Security](#certificates--security)
- [Usage Examples](#usage-examples)
  - [StatelessApp](#statelessapp)
  - [Postgres Database](#postgres-database)
  - [Redis](#redis)
  - [Cron Jobs](#cron-jobs)
  - [PgBouncer](#pgbouncer)
- [Helper Functions](#helper-functions)
- [TypeScript Support](#typescript-support)
- [Development](#development)
- [License](#license)

## Features

- 🔒 **Type-Safe**: Full TypeScript support with strongly-typed interfaces for all Kubernetes resources
- 📦 **Batteries Included**: Pre-configured templates for databases, applications, cron jobs, and more
- 🎯 **Best Practices**: Built-in sensible defaults following Kubernetes best practices
- 🔧 **Customizable**: Flexible configuration options for all resources
- 📝 **YAML Output**: Generates valid Kubernetes YAML manifests ready for `kubectl apply`

## Installation

```bash
npm install @resendegu/kube-templates
```

Or using yarn:

```bash
yarn add @resendegu/kube-templates
```

## Quick Start

```typescript
import { StatelessApp, Namespace } from "@resendegu/kube-templates";

// Create a namespace
const namespace = new Namespace({
  name: "my-app",
});

// Create a stateless application
const app = new StatelessApp(
  {
    name: "api",
    namespace: "my-app",
  },
  {
    image: "my-registry/my-api:latest",
    replicas: 3,
    cpu: {
      request: "100m",
      limit: "500m",
    },
    memory: {
      request: "128Mi",
      limit: "512Mi",
    },
    ports: [
      {
        type: "http",
        port: 8080,
        publicUrl: "https://api.example.com",
        tlsCert: "api-tls-cert",
      },
    ],
    envs: {
      NODE_ENV: "production",
      DATABASE_URL: { secretName: "db-credentials", key: "url" },
    },
  }
);

// Output YAML manifests
console.log(namespace.yaml);
console.log(app.yaml);
```

## Available Resources

### Core Kubernetes Resources

| Class | Description |
|-------|-------------|
| `Namespace` | Kubernetes namespace |
| `Deployment` | Deployment workload |
| `StatefulSet` | StatefulSet workload |
| `Service` | Kubernetes service |
| `IngressV1` | Ingress resource (networking.k8s.io/v1) |
| `ConfigMap` | ConfigMap for configuration data |
| `Secret` | Secret for sensitive data |
| `Job` | One-time job execution |
| `CronJob` | Scheduled job execution |
| `HorizontalPodAutoscaler` | HPA for auto-scaling |
| `PodDisruptionBudget` | PDB for high availability |

### Database Resources

| Class | Description |
|-------|-------------|
| `Postgres` | PostgreSQL database with extensive configuration options |
| `Redis` | Redis in-memory data store |
| `Mongo` | MongoDB NoSQL database |
| `MariaDB` | MariaDB database |
| `MySQL` | MySQL database |
| `MSSQL` | Microsoft SQL Server |
| `Cockroach` | CockroachDB distributed database |
| `PgBouncer` | PostgreSQL connection pooler |
| `StackGres` | StackGres PostgreSQL cluster operator |

### Application Resources

| Class | Description |
|-------|-------------|
| `StatelessApp` | Complete stateless application with deployment, service, ingress, HPA, and PDB |
| `StaticSite` | Static website hosted on GCS or S3 |
| `WordPress` | WordPress installation with database connection |
| `Cron` | Cron job with simplified configuration |

### Scaling & Scheduling

| Class | Description |
|-------|-------------|
| `ScaledObject` | KEDA ScaledObject for event-driven autoscaling |
| `ScaledJob` | KEDA ScaledJob for event-driven job scaling |

### Certificates & Security

| Class | Description |
|-------|-------------|
| `CertManagerV1Certificate` | cert-manager Certificate resource |
| `CertificateV1` | Kubernetes native certificate |
| `ReplicatedSecret` | Secret replication across namespaces |

## Usage Examples

### StatelessApp

The `StatelessApp` class is a high-level abstraction that creates a complete application deployment including Deployment, Service, Ingress, HPA, and PDB.

```typescript
import { StatelessApp } from "@resendegu/kube-templates";

const app = new StatelessApp(
  {
    name: "my-api",
    namespace: "production",
  },
  {
    image: "my-registry/api:v1.0.0",
    replicas: [2, 10], // min: 2, max: 10 replicas
    cpuUtilizationToScale: 70, // Scale at 70% CPU usage

    cpu: {
      request: "100m",
      limit: "1",
    },
    memory: {
      request: "256Mi",
      limit: "512Mi",
    },

    ports: [
      {
        type: "http",
        port: 3000,
        publicUrl: "https://api.example.com",
        tlsCert: "api-tls",
        timeout: 60,
        maxBodySize: "10Mi",
      },
    ],

    envs: {
      NODE_ENV: "production",
      LOG_LEVEL: "info",
      // Reference secrets
      DATABASE_URL: { secretName: "db-secret", key: "connection-string" },
      // Reference pod fields
      POD_NAME: { fieldPath: "metadata.name" },
    },

    // Forward environment variables from build time
    forwardEnvs: ["BUILD_VERSION"],

    // Health checks
    check: {
      port: 3000,
      httpGetPath: "/health",
      initialDelay: 10,
      period: 5,
    },

    // Mount secrets/configmaps as files
    volumes: [
      {
        type: "secret",
        name: "tls-certs",
        mountPath: "/etc/certs",
      },
    ],

    // Pod disruption budget
    minAvailable: 1,

    // Cron jobs that share the same image
    crons: [
      {
        name: "cleanup",
        schedule: "0 2 * * *",
        command: ["node"],
        args: ["cleanup.js"],
      },
    ],
  }
);

console.log(app.yaml);
```

### Postgres Database

```typescript
import { Postgres } from "@resendegu/kube-templates";

const db = new Postgres(
  {
    name: "main-db",
    namespace: "production",
  },
  {
    version: "15",
    postgresUserPassword: "secure-password",
    cpu: {
      request: "500m",
      limit: "2",
    },
    memory: "2Gi",
    storage: "100Gi",
    storageClassName: "ssd",

    // PostgreSQL configuration options
    options: {
      maxConnections: 200,
      sharedBuffers: "512MB",
      effectiveCacheSize: "1536MB",
      workMem: "8MB",
    },

    // Backup configuration
    backup: {
      schedule: "0 3 * * *",
      bucket: "gs://my-backups",
    },
  }
);

console.log(db.yaml);
```

### Redis

```typescript
import { Redis } from "@resendegu/kube-templates";

const cache = new Redis(
  {
    name: "cache",
    namespace: "production",
  },
  {
    version: "7-alpine",
    cpu: {
      request: "100m",
      limit: "500m",
    },
    memory: "256Mi",
    options: {
      maxmemory: "200mb",
      maxmemoryPolicy: "allkeys-lru",
    },
  }
);

console.log(cache.yaml);
```

### Cron Jobs

```typescript
import { Cron } from "@resendegu/kube-templates";

const cronJob = new Cron(
  {
    name: "daily-report",
    namespace: "production",
  },
  {
    schedule: "0 8 * * *", // Every day at 8 AM
    image: "my-registry/report-generator:latest",
    command: ["node"],
    args: ["generate-report.js"],
    cpu: {
      request: "100m",
      limit: "500m",
    },
    memory: {
      request: "128Mi",
      limit: "256Mi",
    },
    envs: {
      REPORT_TYPE: "daily",
      SMTP_PASSWORD: { secretName: "smtp", key: "password" },
    },
    timeoutSeconds: 3600,
  }
);

console.log(cronJob.yaml);
```

### PgBouncer

```typescript
import { PgBouncer } from "@resendegu/kube-templates";

const pooler = new PgBouncer(
  {
    name: "pgbouncer",
    namespace: "production",
  },
  {
    databases: [
      {
        name: "mydb",
        host: "postgres.production.svc.cluster.local",
        port: 5432,
        poolMode: "transaction",
        poolSize: 20,
      },
    ],
    users: [
      {
        username: "app",
        password: "app-password",
      },
    ],
    options: {
      maxClientConn: 1000,
      defaultPoolSize: 20,
      poolMode: "transaction",
    },
    cpu: {
      request: "100m",
      limit: "500m",
    },
    memory: "128Mi",
  }
);

console.log(pooler.yaml);
```

## Helper Functions

The library exports several utility functions:

```typescript
import { env, configFactory, parseMemory } from "@resendegu/kube-templates";

// Access environment variables with validation
const databaseUrl = env.DATABASE_URL; // Throws if not defined

// Create a typed configuration object
const config = configFactory(process.env, "Config");
const apiKey = config.API_KEY; // Throws with descriptive error if not defined

// Parse memory strings to bytes
parseMemory("1Gi"); // 1073741824
parseMemory("512Mi"); // 536870912
parseMemory("256M"); // 256000000
```

## TypeScript Support

This library is written in TypeScript and provides full type definitions for all resources. The types are automatically generated from Kubernetes OpenAPI specifications, ensuring accuracy and completeness.

```typescript
import type { io } from "@resendegu/kube-templates/src/generated";

// Use Kubernetes types directly
const containerSpec: io.k8s.api.core.v1.Container = {
  name: "my-container",
  image: "nginx:latest",
  // Full IntelliSense support
};
```

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
# Install dependencies
npm install

# Generate types from Kubernetes CRDs
npm run generate

# Run tests (requires a Kubernetes cluster)
npm test

# Lint code
npm run eslint:check

# Fix linting issues
npm run eslint:fix
```

### Running Tests

Tests require a Kubernetes cluster. The test suite uses [kind](https://kind.sigs.k8s.io/) for local testing:

```bash
# Setup test environment
npm run test
```

## License

ISC

---

**Note**: For production use, please consider using the official package maintained by Cubos Tecnologia.
