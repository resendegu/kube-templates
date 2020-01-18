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
  // ports?: ContainerPort[]
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

export class Deployment {
  constructor(private metadata: ObjectMeta, private spec: DeploymentSpec) {}

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
