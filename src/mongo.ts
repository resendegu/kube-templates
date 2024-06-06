import * as _ from "lodash";

import { generateYaml } from "./helpers";
import type { BasicObjectMeta, ObjectMeta } from "./kubernetes";
import { Service, StatefulSet } from "./kubernetes";

interface MongoSpec {
  // readReplicas?: number;
  version: string;
  cpu: {
    request: string | number;
    limit: string | number;
  };
  memory: string | number;
  auth?: {
    username: string;
    password: string;
  };
  serviceType?: "ExternalName" | "ClusterIP" | "NodePort" | "LoadBalancer";
  serviceMetadata?: BasicObjectMeta;
  storageClassName?: string;
}

export class Mongo {
  constructor(private metadata: ObjectMeta, private spec: MongoSpec) {}

  get yaml() {
    return generateYaml([
      new Service(_.merge(this.metadata, this.spec.serviceMetadata), {
        selector: {
          app: this.metadata.name,
        },
        type: this.spec.serviceType ?? "ClusterIP",
        ports: [
          {
            name: "mongo",
            port: 27017,
          },
        ],
      }),
      new StatefulSet(this.metadata, {
        serviceName: this.metadata.name,
        replicas: 1,
        selector: {
          matchLabels: {
            app: this.metadata.name,
          },
        },
        template: {
          metadata: {
            labels: {
              app: this.metadata.name,
            },
          },
          spec: {
            automountServiceAccountToken: false,
            volumes: [
              {
                name: "config",
                emptyDir: {},
              },
            ],
            initContainers: this.spec.auth && [
              {
                name: "setup",
                image: `mongo:${this.spec.version}`,
                imagePullPolicy: "Always",
                command: [
                  "bash",
                  "-ec",
                  `
                    mongod &
                    pid=$!

                    echo Wait for Mongo to be ready.
                    until mongo --eval "db.adminCommand('ping')"
                    do
                    echo Not ready yet. Trying again...
                    sleep 1
                    done
                    echo Mongo is ready.

                    mongo --eval "db.getSiblingDB('admin').dropAllUsers()"
                    mongo --eval "db.getSiblingDB('admin').createUser({ user: '${this.spec.auth.username}', pwd: '${this.spec.auth.password}', roles: [{ role: 'root', db: 'admin' }] })"

                    kill -TERM $pid
                    wait $pid
                  `,
                ],
                volumeMounts: [
                  {
                    mountPath: "/data/db",
                    name: "datadir",
                  },
                  {
                    mountPath: "/data/configdb",
                    name: "config",
                  },
                ],
              },
            ],
            containers: [
              {
                name: "mongo",
                image: `mongo:${this.spec.version}`,
                imagePullPolicy: "Always",
                args: [
                  "mongod",
                  "--bind_ip=0.0.0.0",
                  ...(this.spec.auth ? ["--auth"] : []),
                ],
                ports: [
                  {
                    name: "mongo",
                    containerPort: 27017,
                  },
                ],
                volumeMounts: [
                  {
                    mountPath: "/data/db",
                    name: "datadir",
                  },
                  {
                    mountPath: "/data/configdb",
                    name: "config",
                  },
                ],
                resources: {
                  limits: {
                    cpu: this.spec.cpu.limit,
                    memory: this.spec.memory,
                  },
                  requests: {
                    cpu: this.spec.cpu.request,
                    memory: this.spec.memory,
                  },
                },
                readinessProbe: {
                  exec: {
                    command: ["mongo", "--eval", "db.adminCommand('ping')"],
                  },
                  failureThreshold: 1,
                  periodSeconds: 3,
                },
                livenessProbe: {
                  exec: {
                    command: ["mongo", "--eval", "db.adminCommand('ping')"],
                  },
                  failureThreshold: 2,
                  periodSeconds: 5,
                  initialDelaySeconds: 10,
                },
              },
            ],
          },
        },
        volumeClaimTemplates: [
          {
            metadata: {
              name: "datadir",
            },
            spec: {
              accessModes: ["ReadWriteOnce"],
              resources: {
                requests: {
                  storage: "2Gi",
                },
              },
              storageClassName: this.spec.storageClassName,
            },
          },
        ],
      }),
    ]);
  }
}
