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
  configPath?: string;
  userlistPath?: string;
  logDir?: string;
  pidDir?: string;
  minAvailable?: number;
  rawConfig?: string;
  rawUserlist?: string;
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
  const userlistPath =
    spec.userlistPath ?? "/bitnami/pgbouncer/conf/userlist.txt";
  const logDir = spec.logDir ?? "/opt/bitnami/pgbouncer/logs";
  const pidDir = spec.pidDir ?? "/opt/bitnami/pgbouncer/tmp";

  lines.push(`listen_port=${port}`);
  lines.push(`listen_addr=0.0.0.0`);
  lines.push(`auth_file=${userlistPath}`);
  lines.push(`logfile=${logDir}/pgbouncer.log`);
  lines.push(`pidfile=${pidDir}/pgbouncer.pid`);

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
    const image = this.spec.image ?? "docker.io/cleanstart/pgbouncer:latest";
    const replicas = this.spec.replicas ?? 1;
    const configPath =
      this.spec.configPath ?? "/bitnami/pgbouncer/conf/pgbouncer.ini";
    const userlistPath =
      this.spec.userlistPath ?? "/bitnami/pgbouncer/conf/userlist.txt";

    const configContent = this.spec.rawConfig ?? generateConfig(this.spec);
    const userlistContent =
      this.spec.rawUserlist ?? generateUserlist(this.spec.users);

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

    const podSpec: io.k8s.api.core.v1.PodSpec = {
      automountServiceAccountToken: false,
      containers: [
        {
          name: "pgbouncer",
          image,
          imagePullPolicy: this.spec.imagePullPolicy ?? "Always",
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
            annotations: this.metadata.annotations,
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
