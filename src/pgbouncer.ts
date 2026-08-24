import { createHash } from "node:crypto";

import type { io } from "./generated";
import { generateYaml } from "./helpers";
import type { ObjectMeta } from "./kubernetes";
import { ConfigMap, Deployment, Secret, Service } from "./kubernetes";

export interface PgBouncerDatabase {
  name: string;
  host: string;
  port?: number;
  dbname?: string;
  user?: string;
  password?: string;
  authUser?: string;
  authQuery?: string;
  authDbname?: string;
  poolSize?: number;
  minPoolSize?: number;
  reservePoolSize?: number;
  connectQuery?: string;
  poolMode?: PgBouncerPoolMode;
  loadBalanceHosts?: "round-robin" | "disable";
  maxDbConnections?: number;
  maxDbClientConnections?: number;
  serverLifetime?: number;
  clientEncoding?: string;
  datestyle?: string;
  timezone?: string;
}

export interface PgBouncerUser {
  username: string;
  password: string;
  poolSize?: number;
  reservePoolSize?: number;
  poolMode?: PgBouncerPoolMode;
  maxUserConnections?: number;
  queryTimeout?: number;
  idleTransactionTimeout?: number;
  transactionTimeout?: number;
  clientIdleTimeout?: number;
  maxUserClientConnections?: number;
}

export type PgBouncerPoolMode = "session" | "transaction" | "statement";

export type PgBouncerAuthType =
  | "cert"
  | "md5"
  | "scram-sha-256"
  | "plain"
  | "trust"
  | "any"
  | "hba"
  | "ldap"
  | "pam";

export type TlsSslMode =
  | "disable"
  | "allow"
  | "prefer"
  | "require"
  | "verify-ca"
  | "verify-full";

export type SyslogFacility =
  | "auth"
  | "authpriv"
  | "daemon"
  | "user"
  | "local0"
  | "local1"
  | "local2"
  | "local3"
  | "local4"
  | "local5"
  | "local6"
  | "local7";

export interface PgBouncerOptions {
  logfile?: string;
  pidfile?: string;
  listenAddr?: string;
  listenPort?: number;
  unixSocketDir?: string;
  unixSocketMode?: string;
  unixSocketGroup?: string;
  user?: string;
  poolMode?: PgBouncerPoolMode;
  maxClientConn?: number;
  defaultPoolSize?: number;
  minPoolSize?: number;
  reservePoolSize?: number;
  reservePoolTimeout?: number;
  maxDbConnections?: number;
  maxDbClientConnections?: number;
  maxUserConnections?: number;
  maxUserClientConnections?: number;
  serverRoundRobin?: boolean;
  trackExtraParameters?: string;
  ignoreStartupParameters?: string;
  peerId?: number;
  disablePqexec?: boolean;
  applicationNameAddHost?: boolean;
  statsPeriod?: number;
  maxPreparedStatements?: number;
  scramIterations?: number;
  authType?: PgBouncerAuthType;
  authHbaFile?: string;
  authIdentFile?: string;
  authFile?: string;
  authUser?: string;
  authQuery?: string;
  authDbname?: string;
  authLdapOptions?: string;
  syslog?: boolean;
  syslogIdent?: string;
  syslogFacility?: SyslogFacility;
  logConnections?: boolean;
  logDisconnections?: boolean;
  logPoolerErrors?: boolean;
  logStats?: boolean;
  verbose?: number;
  adminUsers?: string;
  statsUsers?: string;
  serverResetQuery?: string;
  serverResetQueryAlways?: boolean;
  serverCheckDelay?: number;
  serverCheckQuery?: string;
  serverFastClose?: boolean;
  serverLifetime?: number;
  serverIdleTimeout?: number;
  serverConnectTimeout?: number;
  serverLoginRetry?: number;
  clientLoginTimeout?: number;
  autodbIdleTimeout?: number;
  dnsMaxTtl?: number;
  dnsNxdomainTtl?: number;
  dnsZoneCheckPeriod?: number;
  resolvConf?: string;
  queryWaitNotify?: number;
  queryTimeout?: number;
  queryWaitTimeout?: number;
  cancelWaitTimeout?: number;
  clientIdleTimeout?: number;
  idleTransactionTimeout?: number;
  transactionTimeout?: number;
  suspendTimeout?: number;
  pktBuf?: number;
  maxPacketSize?: number;
  listenBacklog?: number;
  sbufLoopcnt?: number;
  soReuseport?: boolean;
  tcpDeferAccept?: boolean;
  tcpSocketBuffer?: number;
  tcpKeepalive?: boolean;
  tcpKeepcnt?: number;
  tcpKeepidle?: number;
  tcpKeegintvl?: number;
  tcpUserTimeout?: number;
  clientTlsSslmode?: TlsSslMode;
  clientTlsKeyFile?: string;
  clientTlsCertFile?: string;
  clientTlsCaFile?: string;
  clientTlsProtocols?: string;
  clientTlsCiphers?: string;
  clientTls13Ciphers?: string;
  clientTlsEcdhcurve?: string;
  clientTlsDheparams?: string;
  serverTlsSslmode?: TlsSslMode;
  serverTlsCaFile?: string;
  serverTlsKeyFile?: string;
  serverTlsCertFile?: string;
  serverTlsProtocols?: string;
  serverTlsCiphers?: string;
  serverTls13Ciphers?: string;
}

export interface PgBouncerPeer {
  peerId: number;
  host: string;
  port?: number;
  poolSize?: number;
}

export interface PgBouncerExporterOptions {
  image?: string;
  port?: number;
  user?: string;
  password?: string;
  connectionString?: string;
  cpu?: {
    request: string | number;
    limit: string | number;
  };
  memory?: {
    request: string | number;
    limit: string | number;
  };
}

export interface PgBouncerSpec {
  image?: string;
  replicas?: number;
  cpu: {
    request: string | number;
    limit: string | number;
  };
  memory: {
    request: string | number;
    limit: string | number;
  };
  port?: number;
  databases: PgBouncerDatabase[];
  users: PgBouncerUser[];
  options?: PgBouncerOptions;
  peers?: PgBouncerPeer[];
  imagePullPolicy?: "Always" | "Never" | "IfNotPresent";
  imagePullSecrets?: string[];
  nodeSelector?: Record<string, string>;
  affinity?: io.k8s.api.core.v1.Affinity;
  tolerations?: io.k8s.api.core.v1.Toleration[];
  envs?: Record<
    string,
    | string
    | number
    | { secretName: string; key: string }
    | { fieldPath: string }
  >;
  serviceAnnotations?: Record<string, string>;
  serviceType?: "ClusterIP" | "NodePort" | "LoadBalancer";
  command?: string[];
  configPath?: string;
  userlistPath?: string;
  logDir?: string;
  minAvailable?: number;
  rawConfig?: string;
  rawUserlist?: string;
  enableExporter?: boolean;
  exporterOptions?: PgBouncerExporterOptions;
}

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/gu, letter => `_${letter.toLowerCase()}`);
}

function formatValue(value: unknown): string {
  if (typeof value === "boolean") {
    return value ? "1" : "0";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return value.toString();
  }

  return String(value);
}

function generateDatabaseEntry(db: PgBouncerDatabase): string {
  const parts: string[] = [];

  if (db.host) {
    parts.push(`host=${db.host}`);
  }

  if (db.port) {
    parts.push(`port=${db.port}`);
  }

  if (db.dbname) {
    parts.push(`dbname=${db.dbname}`);
  }

  if (db.user) {
    parts.push(`user=${db.user}`);
  }

  if (db.password) {
    parts.push(`password=${db.password}`);
  }

  if (db.authUser) {
    parts.push(`auth_user=${db.authUser}`);
  }

  if (db.authQuery) {
    parts.push(`auth_query='${db.authQuery}'`);
  }

  if (db.authDbname) {
    parts.push(`auth_dbname=${db.authDbname}`);
  }

  if (db.poolSize) {
    parts.push(`pool_size=${db.poolSize}`);
  }

  if (db.minPoolSize) {
    parts.push(`min_pool_size=${db.minPoolSize}`);
  }

  if (db.reservePoolSize) {
    parts.push(`reserve_pool_size=${db.reservePoolSize}`);
  }

  if (db.connectQuery) {
    parts.push(`connect_query='${db.connectQuery}'`);
  }

  if (db.poolMode) {
    parts.push(`pool_mode=${db.poolMode}`);
  }

  if (db.loadBalanceHosts) {
    parts.push(`load_balance_hosts=${db.loadBalanceHosts}`);
  }

  if (db.maxDbConnections) {
    parts.push(`max_db_connections=${db.maxDbConnections}`);
  }

  if (db.maxDbClientConnections) {
    parts.push(`max_db_client_connections=${db.maxDbClientConnections}`);
  }

  if (db.serverLifetime) {
    parts.push(`server_lifetime=${db.serverLifetime}`);
  }

  if (db.clientEncoding) {
    parts.push(`client_encoding=${db.clientEncoding}`);
  }

  if (db.datestyle) {
    parts.push(`datestyle=${db.datestyle}`);
  }

  if (db.timezone) {
    parts.push(`timezone=${db.timezone}`);
  }

  return parts.join(" ");
}

function generateUserEntry(user: PgBouncerUser): string | null {
  const parts: string[] = [];

  if (user.poolSize) {
    parts.push(`pool_size=${user.poolSize}`);
  }

  if (user.reservePoolSize) {
    parts.push(`reserve_pool_size=${user.reservePoolSize}`);
  }

  if (user.poolMode) {
    parts.push(`pool_mode=${user.poolMode}`);
  }

  if (user.maxUserConnections) {
    parts.push(`max_user_connections=${user.maxUserConnections}`);
  }

  if (user.queryTimeout) {
    parts.push(`query_timeout=${user.queryTimeout}`);
  }

  if (user.idleTransactionTimeout) {
    parts.push(`idle_transaction_timeout=${user.idleTransactionTimeout}`);
  }

  if (user.transactionTimeout) {
    parts.push(`transaction_timeout=${user.transactionTimeout}`);
  }

  if (user.clientIdleTimeout) {
    parts.push(`client_idle_timeout=${user.clientIdleTimeout}`);
  }

  if (user.maxUserClientConnections) {
    parts.push(`max_user_client_connections=${user.maxUserClientConnections}`);
  }

  return parts.length > 0 ? parts.join(" ") : null;
}

function generatePeerEntry(peer: PgBouncerPeer): string {
  const parts: string[] = [];

  parts.push(`host=${peer.host}`);
  if (peer.port) {
    parts.push(`port=${peer.port}`);
  }

  if (peer.poolSize) {
    parts.push(`pool_size=${peer.poolSize}`);
  }

  return parts.join(" ");
}

function generateUserlist(users: PgBouncerUser[]): string {
  return users.map(user => `"${user.username}" "${user.password}"`).join("\n");
}

function generateConfig(spec: PgBouncerSpec): string {
  const lines: string[] = [];

  lines.push("[databases]");
  for (const db of spec.databases) {
    lines.push(`${db.name}=${generateDatabaseEntry(db)}`);
  }

  lines.push("");

  const userEntries = spec.users
    .map(user => ({ username: user.username, entry: generateUserEntry(user) }))
    .filter(({ entry }) => entry !== null);

  if (userEntries.length > 0) {
    lines.push("[users]");
    for (const { username, entry } of userEntries) {
      lines.push(`${username} = ${entry}`);
    }

    lines.push("");
  }

  if (spec.peers && spec.peers.length > 0) {
    lines.push("[peers]");
    for (const peer of spec.peers) {
      lines.push(`${peer.peerId} = ${generatePeerEntry(peer)}`);
    }

    lines.push("");
  }

  lines.push("[pgbouncer]");

  const port = spec.port ?? 6432;
  const userlistPath = spec.userlistPath ?? "/etc/pgbouncer/userlist.txt";
  const logDir = spec.logDir ?? "/var/log/pgbouncer";

  lines.push(`listen_port=${port}`);
  lines.push(`listen_addr=0.0.0.0`);
  lines.push(`auth_file=${userlistPath}`);
  lines.push(`logfile=${logDir}/pgbouncer.log`);

  if (spec.options) {
    const optionKeys = Object.keys(spec.options) as Array<
      keyof PgBouncerOptions
    >;

    for (const key of optionKeys) {
      const value = spec.options[key];

      if (value !== undefined) {
        const snakeKey = camelToSnake(key);

        lines.push(`${snakeKey}=${formatValue(value)}`);
      }
    }
  }

  return lines.join("\n");
}

export class PgBouncer {
  constructor(
    private metadata: ObjectMeta,
    private spec: PgBouncerSpec,
  ) {}

  get yaml() {
    const port = this.spec.port ?? 6432;
    const image = this.spec.image ?? "docker.io/edoburu/pgbouncer:latest";
    const replicas = this.spec.replicas ?? 1;
    const configPath = this.spec.configPath ?? "/etc/pgbouncer/pgbouncer.ini";
    const userlistPath =
      this.spec.userlistPath ?? "/etc/pgbouncer/userlist.txt";

    const exporterEnabled = this.spec.enableExporter ?? false;
    const exporterPort = this.spec.exporterOptions?.port ?? 9127;
    const exporterUser = this.spec.exporterOptions?.user ?? "pgbouncer_exporter";
    const exporterConnectionStringOverride =
      this.spec.exporterOptions?.connectionString;
    const existingExporterUser = this.spec.users.find(
      user => user.username === exporterUser,
    );
    // The generated userlist is the source of truth for the exporter's
    // password: an entry already declared in spec.users wins over
    // exporterOptions.password, otherwise the connection string would not
    // match the credentials pgbouncer actually loads. With rawUserlist the
    // explicit exporterOptions credentials are the only truth available.
    const exporterPassword =
      this.spec.rawUserlist === undefined && existingExporterUser
        ? existingExporterUser.password
        : (this.spec.exporterOptions?.password ??
          createHash("sha256")
            .update(`${JSON.stringify(this.metadata)}:pgbouncer-exporter`)
            .digest("hex"));

    if (
      exporterEnabled &&
      (this.spec.rawConfig !== undefined ||
        this.spec.rawUserlist !== undefined) &&
      exporterConnectionStringOverride === undefined &&
      (this.spec.exporterOptions?.user === undefined ||
        this.spec.exporterOptions?.password === undefined)
    ) {
      throw new Error(
        "enableExporter with rawConfig/rawUserlist requires explicit exporterOptions credentials (user and password, or connectionString)",
      );
    }

    // A caller-supplied connectionString may reference credentials that
    // have nothing to do with `exporterUser`/`exporterPassword` (or with
    // spec.users/spec.options at all) — auto-provisioning a user/stats_users
    // entry in that case would ship a stray, unused credential. Only
    // provision when we are the ones building the connection string.
    const shouldProvisionCredentials =
      exporterEnabled && exporterConnectionStringOverride === undefined;

    // rawConfig and rawUserlist are independent escape hatches: whichever
    // one is NOT set still gets the exporter user/stats wiring injected, so
    // a mixed rawConfig-only (or rawUserlist-only) setup still authenticates.
    const effectiveUsers =
      shouldProvisionCredentials &&
      this.spec.rawUserlist === undefined &&
      !existingExporterUser
        ? [
            ...this.spec.users,
            { username: exporterUser, password: exporterPassword },
          ]
        : this.spec.users;

    let effectiveOptions = this.spec.options;

    if (shouldProvisionCredentials && this.spec.rawConfig === undefined) {
      const options = this.spec.options ?? {};
      const statsUsersList = options.statsUsers
        ? options.statsUsers.split(",").map(user => user.trim())
        : [];
      const statsUsers = statsUsersList.includes(exporterUser)
        ? options.statsUsers
        : [...statsUsersList, exporterUser].join(",");
      const ignoreParamsList = options.ignoreStartupParameters
        ? options.ignoreStartupParameters.split(",").map(param => param.trim())
        : [];
      const ignoreStartupParameters = ignoreParamsList.includes(
        "extra_float_digits",
      )
        ? options.ignoreStartupParameters
        : [...ignoreParamsList, "extra_float_digits"].join(",");

      effectiveOptions = { ...options, statsUsers, ignoreStartupParameters };
    }

    const effectiveListenPort =
      this.spec.options?.listenPort ?? this.spec.port ?? 6432;
    const exporterConnectionString =
      exporterConnectionStringOverride ??
      `postgres://${encodeURIComponent(exporterUser)}:${encodeURIComponent(exporterPassword)}@127.0.0.1:${effectiveListenPort}/pgbouncer?sslmode=disable`;

    const configContent =
      this.spec.rawConfig ??
      generateConfig({
        ...this.spec,
        options: effectiveOptions,
        users: effectiveUsers,
      });
    const userlistContent =
      this.spec.rawUserlist ?? generateUserlist(effectiveUsers);

    const env: io.k8s.api.core.v1.EnvVar[] = [];

    if (this.spec.envs) {
      for (const [name, value] of Object.entries(this.spec.envs)) {
        if (typeof value === "object" && "secretName" in value) {
          env.push({
            name,
            valueFrom: {
              secretKeyRef: {
                name: value.secretName,
                key: value.key,
              },
            },
          });
        } else if (typeof value === "object" && "fieldPath" in value) {
          env.push({
            name,
            valueFrom: {
              fieldRef: {
                fieldPath: value.fieldPath,
              },
            },
          });
        } else {
          env.push({
            name,
            value: String(value),
          });
        }
      }
    }

    const additionalContainers: io.k8s.api.core.v1.Container[] = [];

    if (exporterEnabled) {
      additionalContainers.push({
        name: "pgbouncer-exporter",
        image:
          this.spec.exporterOptions?.image ??
          "docker.io/prometheuscommunity/pgbouncer-exporter:v0.12.1",
        imagePullPolicy: this.spec.imagePullPolicy ?? "IfNotPresent",
        args:
          exporterPort === 9127
            ? undefined
            : [`--web.listen-address=:${exporterPort}`],
        ports: [
          {
            name: "metrics",
            containerPort: exporterPort,
            protocol: "TCP",
          },
        ],
        env: [
          {
            name: "PGBOUNCER_EXPORTER_CONNECTION_STRING",
            valueFrom: {
              secretKeyRef: {
                name: this.metadata.name,
                key: "exporter-connection-string",
              },
            },
          },
        ],
        resources: {
          requests: {
            cpu: this.spec.exporterOptions?.cpu?.request ?? "10m",
            memory: this.spec.exporterOptions?.memory?.request ?? "32Mi",
          },
          limits: {
            cpu: this.spec.exporterOptions?.cpu?.limit ?? "100m",
            memory: this.spec.exporterOptions?.memory?.limit ?? "64Mi",
          },
        },
        readinessProbe: {
          tcpSocket: {
            port: exporterPort,
          },
          initialDelaySeconds: 5,
          periodSeconds: 10,
          failureThreshold: 3,
        },
        livenessProbe: {
          tcpSocket: {
            port: exporterPort,
          },
          initialDelaySeconds: 10,
          periodSeconds: 10,
          failureThreshold: 3,
        },
      });
    }

    const podSpec: io.k8s.api.core.v1.PodSpec = {
      automountServiceAccountToken: false,
      containers: [
        {
          name: "pgbouncer",
          image,
          imagePullPolicy: this.spec.imagePullPolicy ?? "IfNotPresent",
          command: this.spec.command ?? ["pgbouncer"],
          args: [configPath],
          ports: [
            {
              name: "pgbouncer",
              containerPort: port,
              protocol: "TCP",
            },
          ],
          env: env.length > 0 ? env : undefined,
          resources: {
            requests: {
              cpu: this.spec.cpu.request,
              memory: this.spec.memory.request,
            },
            limits: {
              cpu: this.spec.cpu.limit,
              memory: this.spec.memory.limit,
            },
          },
          volumeMounts: [
            {
              name: "config",
              mountPath: configPath,
              subPath: "pgbouncer.ini",
            },
            {
              name: "userlist",
              mountPath: userlistPath,
              subPath: "userlist.txt",
            },
          ],
          readinessProbe: {
            tcpSocket: {
              port,
            },
            initialDelaySeconds: 5,
            periodSeconds: 10,
            failureThreshold: 3,
          },
          livenessProbe: {
            tcpSocket: {
              port,
            },
            initialDelaySeconds: 10,
            periodSeconds: 10,
            failureThreshold: 3,
          },
        },
        ...additionalContainers,
      ],
      volumes: [
        {
          name: "config",
          configMap: {
            name: this.metadata.name,
          },
        },
        {
          name: "userlist",
          secret: {
            secretName: this.metadata.name,
          },
        },
      ],
      nodeSelector: this.spec.nodeSelector,
      affinity: this.spec.affinity,
      tolerations: this.spec.tolerations,
      imagePullSecrets: this.spec.imagePullSecrets?.map(name => ({ name })),
    };

    const objects: any[] = [
      new Service(
        {
          ...this.metadata,
          annotations: this.spec.serviceAnnotations,
        },
        {
          type: this.spec.serviceType ?? "ClusterIP",
          selector: {
            app: this.metadata.name,
          },
          ports: [
            {
              name: "pgbouncer",
              port,
              targetPort: port,
              protocol: "TCP",
            },
          ],
        },
      ),

      new Deployment(this.metadata, {
        replicas,
        selector: {
          matchLabels: {
            app: this.metadata.name,
          },
        },
        template: {
          metadata: {
            labels: {
              app: this.metadata.name,
              ...this.metadata.labels,
            },
            annotations: exporterEnabled
              ? {
                  "prometheus.io/scrape": "true",
                  "prometheus.io/port": String(exporterPort),
                  "prometheus.io/path": "/metrics",
                  ...this.metadata.annotations,
                }
              : this.metadata.annotations,
          },
          spec: podSpec,
        },
      }),

      new ConfigMap(
        {
          name: this.metadata.name,
          namespace: this.metadata.namespace,
        },
        {
          "pgbouncer.ini": configContent,
        },
      ),

      new Secret(
        {
          name: this.metadata.name,
          namespace: this.metadata.namespace,
        },
        {
          "userlist.txt": userlistContent,
          ...(exporterEnabled
            ? { "exporter-connection-string": exporterConnectionString }
            : {}),
        },
      ),
    ];

    if (this.spec.minAvailable !== undefined && replicas > 1) {
      objects.push({
        apiVersion: "policy/v1",
        kind: "PodDisruptionBudget",
        metadata: {
          name: this.metadata.name,
          namespace: this.metadata.namespace,
        },
        spec: {
          minAvailable: this.spec.minAvailable,
          selector: {
            matchLabels: {
              app: this.metadata.name,
            },
          },
        },
      });
    }

    return generateYaml(objects);
  }
}
