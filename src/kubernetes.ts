import type { io } from "./generated/kubernetes";
import { clone, generateYaml } from "./helpers";

export interface BasicObjectMeta {
  annotations?: {
    [annotation: string]: string;
  };
  labels?: {
    [label: string]: string;
  };
}

export interface NonNamespacedObjectMeta extends BasicObjectMeta {
  name: string;
}

export interface ObjectMeta extends NonNamespacedObjectMeta {
  namespace: string;
}

export class Namespace {
  constructor(
    public metadata: NonNamespacedObjectMeta,
    public spec?: io.k8s.api.core.v1.NamespaceSpec,
  ) {}

  get yaml() {
    return generateYaml([
      {
        apiVersion: "v1",
        kind: "Namespace",
        metadata: this.metadata,
        spec: this.spec,
      },
    ]);
  }
}

// region Ingress v1beta1 for compatibility purposes
export interface IngressSpec {
  backend?: IngressBackend;
  rules?: IngressRule[];
  tls?: IngressTLS[];
}

export interface IngressBackend {
  serviceName: string;
  servicePort: number;
}

export interface IngressRule {
  host: string;
  http?: HTTPIngressRuleValue;
}

export interface IngressTLS {
  hosts?: string[];
  secretName: string;
}

export interface HTTPIngressRuleValue {
  paths: HTTPIngressPath[];
}

export interface HTTPIngressPath {
  backend: IngressBackend;
  path: string;
}

// endregion

export class Deployment {
  constructor(
    public metadata: ObjectMeta,
    public spec: io.k8s.api.apps.v1.DeploymentSpec,
  ) {}

  get yaml() {
    return generateYaml([
      {
        apiVersion: "apps/v1",
        kind: "Deployment",
        metadata: this.metadata,
        spec: this.spec,
      },
    ]);
  }
}

export class StatefulSet {
  constructor(
    public metadata: ObjectMeta,
    public spec: io.k8s.api.apps.v1.StatefulSetSpec,
  ) {}

  get yaml() {
    return generateYaml([
      {
        apiVersion: "apps/v1",
        kind: "StatefulSet",
        metadata: this.metadata,
        spec: this.spec,
      },
    ]);
  }
}

export class Service {
  constructor(
    public metadata: ObjectMeta,
    public spec: io.k8s.api.core.v1.ServiceSpec,
  ) {}

  get yaml() {
    return generateYaml([
      {
        apiVersion: "v1",
        kind: "Service",
        metadata: this.metadata,
        spec: this.spec,
      },
    ]);
  }
}

export class IngressV1 {
  constructor(
    public metadata: ObjectMeta,
    public spec: io.k8s.api.networking.v1.IngressSpec,
  ) {}

  get yaml() {
    return generateYaml([
      {
        apiVersion: "networking.k8s.io/v1",
        kind: "Ingress",
        metadata: this.metadata,
        spec: this.spec,
      },
    ]);
  }
}

export class Ingress {
  constructor(public metadata: ObjectMeta, public spec: IngressSpec) {}

  get yaml() {
    let spec: IngressSpec | io.k8s.api.networking.v1.IngressSpec = clone(
      this.spec,
    );

    if (!process.env.FF_KUBE_TEMPLATES_DISABLE_INGRESS_V1) {
      spec = {
        ingressClassName:
          // eslint-disable-next-line
          this.metadata.annotations?.["kubernetes.io/ingress-class"] ||
          undefined,
        tls: spec.tls,
        rules: spec.rules?.map(rule => ({
          host: rule.host,
          http: rule.http
            ? {
                paths: rule.http.paths.map(
                  path =>
                    ({
                      backend: {
                        service: {
                          name: path.backend.serviceName,
                          port: {
                            number: path.backend.servicePort,
                          },
                        },
                      },
                      path: path.path,
                      pathType: "Prefix",
                    } as io.k8s.api.networking.v1.HTTPIngressPath),
                ),
              }
            : undefined,
        })),
      } as io.k8s.api.networking.v1.IngressSpec;
    }

    return generateYaml([
      {
        apiVersion: process.env.FF_KUBE_TEMPLATES_DISABLE_INGRESS_V1
          ? "networking.k8s.io/v1beta1"
          : "networking.k8s.io/v1",
        kind: "Ingress",
        metadata: this.metadata,
        spec,
      },
    ]);
  }
}

export class HorizontalPodAutoscaler {
  constructor(
    public metadata: ObjectMeta,
    public spec: io.k8s.api.autoscaling.v2beta2.HorizontalPodAutoscalerSpec,
  ) {}

  get yaml() {
    return generateYaml([
      {
        apiVersion: "autoscaling/v2beta2",
        kind: "HorizontalPodAutoscaler",
        metadata: this.metadata,
        spec: this.spec,
      },
    ]);
  }
}

export class Secret {
  constructor(
    public metadata: ObjectMeta,
    public data?: { [key: string]: string | Buffer },
    public type?: string,
  ) {}

  get yaml() {
    let data: any;
    const targetData = this.data;

    if (targetData) {
      data = {};
      for (const key in targetData) {
        if (!targetData.hasOwnProperty(key)) {
          continue;
        }

        let value = targetData[key];

        if (!(value instanceof Buffer)) {
          value = Buffer.from(value);
        }

        data[key] = value.toString("base64");
      }
    }

    return generateYaml([
      {
        apiVersion: "v1",
        data,
        kind: "Secret",
        metadata: this.metadata,
        ...(this.type ? { type: this.type } : {}),
      },
    ]);
  }
}

export class ConfigMap {
  constructor(
    public metadata: ObjectMeta,
    public data?: Record<string, string>,
  ) {}

  get yaml() {
    return generateYaml([
      {
        apiVersion: "v1",
        data: this.data,
        kind: "ConfigMap",
        metadata: this.metadata,
      },
    ]);
  }
}

export class CronJob {
  constructor(
    public metadata: ObjectMeta,
    public spec: io.k8s.api.batch.v1.CronJobSpec,
  ) {}

  get yaml() {
    return generateYaml([
      {
        apiVersion: "batch/v1",
        kind: "CronJob",
        metadata: this.metadata,
        spec: this.spec,
      },
    ]);
  }
}

export class PodDisruptionBudget {
  constructor(
    public metadata: ObjectMeta,
    public spec: io.k8s.api.policy.v1.PodDisruptionBudgetSpec,
  ) {}

  get yaml() {
    return generateYaml([
      {
        apiVersion: "policy/v1",
        kind: "PodDisruptionBudget",
        metadata: this.metadata,
        spec: this.spec,
      },
    ]);
  }
}

export class Job {
  constructor(
    public metadata: ObjectMeta,
    public spec: Omit<io.k8s.api.batch.v1.JobSpec, "selector">,
  ) {}

  get yaml() {
    return generateYaml([
      {
        apiVersion: "batch/v1",
        kind: "Job",
        metadata: this.metadata,
        spec: this.spec,
      },
    ]);
  }
}

export class PersistentVolumeClaim {
  constructor(
    public metadata: ObjectMeta,
    public spec: io.k8s.api.core.v1.PersistentVolumeClaimSpec,
  ) {}

  get yaml() {
    return generateYaml([
      {
        apiVersion: "v1",
        kind: "PersistentVolumeClaim",
        metadata: this.metadata,
        spec: this.spec,
      },
    ]);
  }
}

export class DaemonSet {
  constructor(
    public metadata: ObjectMeta,
    public spec: io.k8s.api.apps.v1.DaemonSetSpec,
  ) {}

  get yaml() {
    return generateYaml([
      {
        apiVersion: "apps/v1",
        kind: "DaemonSet",
        metadata: this.metadata,
        spec: this.spec,
      },
    ]);
  }
}

export class NetworkPolicy {
  constructor(
    public metadata: ObjectMeta,
    public spec: io.k8s.api.networking.v1.NetworkPolicySpec,
  ) {}

  get yaml() {
    return generateYaml([
      {
        apiVersion: "networking.k8s.io/v1",
        kind: "NetworkPolicy",
        metadata: this.metadata,
        spec: this.spec,
      },
    ]);
  }
}
