import { generateYaml } from "./helpers";

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

export interface DeploymentSpec {
  minReadySeconds?: number;
  paused?: boolean;
  progressDeadlineSeconds?: number;
  replicas?: number;
  revisionHistoryLimit?: number;
  selector?: LabelSelector;
  strategy?: DeploymentStrategy;
  template: PodTemplateSpec;
}

export interface LabelSelector {
  matchExpressions?: LabelSelectorRequirement[];
  matchLabels?: {
    [label: string]: string;
  };
}

export interface LabelSelectorRequirement {
  key: string;
  operator: "In" | "NotIn" | "Exists" | "DoesNotExist";
  values: string[];
}

export interface DeploymentStrategy {
  maxSurge?: number | string;
  maxUnavailable?: number | string;
}

export interface PodTemplateSpec {
  metadata: BasicObjectMeta;
  spec: PodSpec;
}

export interface PodSpec {
  activeDeadlineSeconds?: number;
  affinity?: Affinity;
  automountServiceAccountToken?: boolean;
  containers: Container[];
  // dnsConfig?: PodDNSConfig
  dnsPolicy?: "ClusterFirstWithHostNet" | "ClusterFirst" | "Default" | "None";
  enableServiceLinks?: boolean;
  // ephemeralContainers?: EphemeralContainer[]
  // hostAliases?: HostAlias[]
  hostIPC?: boolean;
  hostNetwork?: boolean;
  hostPID?: boolean;
  hostname?: string;
  imagePullSecrets?: LocalObjectReference[];
  initContainers?: Container[];
  nodeName?: string;
  nodeSelector?: {
    [annotation: string]: string;
  };
  priority?: number;
  priorityClassName?: string;
  // readinessGates?: PodReadinessGate[]
  preemptionPolicy?: "Never" | "PreemptLowerPriority";
  restartPolicy?: "Always" | "OnFailure" | "Never";
  runtimeClassName?: string;
  schedulerName?: string;
  // securityContext?: PodSecurityContext
  serviceAccountName?: string;
  shareProcessNamespace?: boolean;
  subdomain?: string;
  terminationGracePeriodSeconds?: number;
  // tolerations?: Toleration[]
  // topologySpreadConstraints?: TopologySpreadConstraint[]
  // volumes?: Volume[]
}

export interface Affinity {
  nodeAffinity?: NodeAffinity;
  podAffinity?: PodAffinity;
  podAntiAffinity?: PodAntiAffinity;
}

export interface NodeAffinity {
  preferredDuringSchedulingIgnoredDuringExecution?: PreferredSchedulingTerm[];
  requiredDuringSchedulingIgnoredDuringExecution?: NodeSelector;
}

export interface PodAffinity {
  preferredDuringSchedulingIgnoredDuringExecution?: WeightedPodAffinityTerm[];
  requiredDuringSchedulingIgnoredDuringExecution?: PodAffinityTerm[];
}

export interface PodAntiAffinity {
  preferredDuringSchedulingIgnoredDuringExecution?: WeightedPodAffinityTerm[];
  requiredDuringSchedulingIgnoredDuringExecution?: PodAffinityTerm[];
}

export interface NodeSelector {
  nodeSelectorTerms?: NodeSelectorTerm[];
}

export interface PreferredSchedulingTerm {
  preference?: NodeSelectorTerm;
  weight: number;
}

export interface WeightedPodAffinityTerm {
  podAffinityTerm?: PodAffinityTerm;
  weight: number;
}

export interface PodAffinityTerm {
  labelSelector?: LabelSelector;
  namespaces: string[];
  topologyKey: string;
}

export interface NodeSelectorTerm {
  matchExpressions?: NodeSelectorRequirement[];
  matchFields?: NodeSelectorRequirement[];
}

export interface NodeSelectorRequirement {
  key: string;
  operator: "In" | "NotIn" | "Exists" | "DoesNotExist" | "Gt" | "Lt";
  values: string[];
}

export interface Container {
  args?: string[];
  command?: string[];
  env?: EnvVar[];
  // envFrom?: EnvFromSource[]
  image: string;
  imagePullPolicy?: "Always" | "Never" | "IfNotPresent";
  // lifecycle?: Lifecycle
  // livenessProbe?: Probe
  name: string;
  ports?: ContainerPort[];
  // readinessProbe?: Probe
  resources?: ResourceRequirements;
  // securityContext?: SecurityContext
  // startupProbe?: Probe
  stdin?: boolean;
  stdinOnce?: boolean;
  terminationMessagePath?: string;
  terminationMessagePolicy?: string;
  tty?: boolean;
  // volumeDevices?: VolumeDevice[]
  // volumeMounts?: VolumeMount[]
  workingDir?: string;
}

export interface ContainerPort {
  containerPort: number
  hostIP?: string
  hostPort?: number
  name?: string
  protocol?: "TCP" | "UDP" | "SCTP"
}

export interface ResourceRequirements {
  limits?: {
    memory?: string | number;
    cpu?: string | number;
  };
  requests?: {
    memory?: string | number;
    cpu?: string | number;
  };
}

export type EnvVar = EnvVarWithValue | EnvVarWithFrom;

interface EnvVarWithValue {
  name: string;
  value: string;
}

interface EnvVarWithFrom {
  name: string;
  valueFrom: EnvVarSource;
}

export type EnvVarSource =
  | {
      configMapKeyRef: ConfigMapKeySelector;
    }
  | {
      fieldRef: ObjectFieldSelector;
    }
  | {
      resourceFieldRef: ResourceFieldSelector;
    }
  | {
      secretKeyRef: SecretKeySelector;
    };

export interface ConfigMapKeySelector {
  key: string;
  name: string;
  optional?: boolean;
}

export interface SecretKeySelector {
  key: string;
  name: string;
  optional?: boolean;
}

export interface ObjectFieldSelector {
  apiVersion?: string;
  fieldPath: string;
}

export interface ResourceFieldSelector {
  containerName?: string;
  divisor?: number | string;
  resource: string;
}

export interface LocalObjectReference {
  name: string;
}

export interface ServiceSpec {
  clusterIP?: string;
  externalIPs?: string[];
  externalName?: string;
  externalTrafficPolicy?: "Local" | "Cluster";
  healthCheckNodePort?: number;
  ipFamily?: string;
  loadBalancerIP?: string;
  loadBalancerSourceRanges?: string[];
  ports: ServicePort[];
  publishNotReadyAddresses?: boolean;
  selector: { [label: string]: string };
  sessionAffinity?: "ClientIP" | "None";
  sessionAffinityConfig?: SessionAffinityConfig;
  topologyKeys?: string[];
  type?: "ExternalName" | "ClusterIP" | "NodePort" | "LoadBalancer";
}

export interface SessionAffinityConfig {
  clientIP: ClientIPConfig;
}

export interface ClientIPConfig {
  timeoutSeconds: number;
}

export interface ServicePort {
  name: string;
  nodePort?: number;
  port: number;
  protocol?: "TCP" | "UDP" | "SCTP";
  targetPort?: number;
}

export interface IngressSpec {
  backend?: IngressBackend
  rules?: IngressRule[]
  tls?: IngressTLS[]
}

export interface IngressBackend {
  serviceName: string
  servicePort: number
}

export interface IngressRule {
  host: string
  http: HTTPIngressRuleValue
}

export interface IngressTLS {
  hosts?: string[]
  secretName: string
}

export interface HTTPIngressRuleValue {
  paths: HTTPIngressPath[]
}

export interface HTTPIngressPath {
  backend: IngressBackend
  path: string
}

export class Deployment {
  constructor(public metadata: ObjectMeta, public spec: DeploymentSpec) {}

  get yaml() {
    return generateYaml([
      {
        apiVersion: "apps/v1",
        kind: "Deployment",
        metadata: this.metadata,
        spec: this.spec
      }
    ]);
  }
}

export class Service {
  constructor(public metadata: ObjectMeta, public spec: ServiceSpec) {}

  get yaml() {
    return generateYaml([
      {
        apiVersion: "core/v1",
        kind: "Service",
        metadata: this.metadata,
        spec: this.spec
      }
    ]);
  }
}

export class Ingress {
  constructor(public metadata: ObjectMeta, public spec: IngressSpec) {}

  get yaml() {
    return generateYaml([
      {
        apiVersion: "networking.k8s.io/v1beta1",
        kind: "Ingress",
        metadata: this.metadata,
        spec: this.spec
      }
    ]);
  }
}
