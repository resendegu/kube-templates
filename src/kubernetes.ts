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
  metadata?: BasicObjectMeta;
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
  securityContext?: PodSecurityContext;
  serviceAccountName?: string;
  shareProcessNamespace?: boolean;
  subdomain?: string;
  terminationGracePeriodSeconds?: number;
  tolerations?: Toleration[];
  // topologySpreadConstraints?: TopologySpreadConstraint[]
  volumes?: Volume[];
}

export interface PodDisruptionBudgetSpec {
  selector: LabelSelector;
  maxUnavailable: number;
}

export interface Toleration {
  effect: string;
  key: string;
  operator?: "Exists" | "Equal";
  tolerationSeconds?: number;
  value?: string;
}

interface KeyToPath {
  key: string;
  path: string;
  mode?: string;
}

export type Volume = {
  name: string;
} & (
  | // | {
  //     awsElasticBlockStore: AWSElasticBlockStoreVolumeSource;
  //   }
  // | {
  //     azureDisk: AzureDiskVolumeSource;
  //   }
  // | {
  //     azureFile: AzureFileVolumeSource;
  //   }
  // | {
  //     cephfs: CephFSVolumeSource;
  //   }
  // | {
  //     cinder: CinderVolumeSource;
  //   }
  {
      configMap: {
        defaultMode?: number;
        items?: KeyToPath[];
        name: string;
        optional?: boolean;
      };
    }
  // | {
  //     downwardAPI: DownwardAPIVolumeSource;
  //   }
  | {
      emptyDir: {
        medium?: "" | "Memory";
        sizeLimit?: number | string;
      };
    }
  // | {
  //     fc: FCVolumeSource;
  //   }
  // | {
  //     flexVolume: FlexVolumeSource;
  //   }
  // | {
  //     flocker: FlockerVolumeSource;
  //   }
  // | {
  //     gcePersistentDisk: GCEPersistentDiskVolumeSource;
  //   }
  // | {
  //     gitRepo: GitRepoVolumeSource;
  //   }
  // | {
  //     glusterfs: GlusterfsVolumeSource;
  //   }
  | {
      hostPath: {
        path: string;
        type?:
          | ""
          | "DirectoryOrCreate"
          | "Directory"
          | "FileOrCreate"
          | "File"
          | "Socket"
          | "CharDevice"
          | "BlockDevice";
      };
    }
  // | {
  //     iscsi: ISCSIVolumeSource;
  //   }
  // | {
  //     nfs: NFSVolumeSource;
  //   }
  | {
      persistentVolumeClaim: {
        claimName: string;
        readonly?: boolean;
      };
    }
  // | {
  //     photonPersistentDisk: PhotonPersistentDiskVolumeSource;
  //   }
  // | {
  //     portworxVolume: PortworxVolumeSource;
  //   }
  // | {
  //     projected: ProjectedVolumeSource;
  //   }
  // | {
  //     quobyte: QuobyteVolumeSource;
  //   }
  // | {
  //     rbd: RBDVolumeSource;
  //   }
  // | {
  //     scaleIO: ScaleIOVolumeSource;
  //   }
  | {
      secret: {
        defaultMode?: number;
        items?: KeyToPath[];
        optional?: boolean;
        secretName: string;
      };
    }
);
// | {
//     storageos: StorageOSVolumeSource;
//   }
// | {
//     vsphereVolume: VsphereVirtualDiskVolumeSource;
//   }

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
  namespaces?: string[];
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

export interface SecretEnvSource {
  name: string;
  optional?: boolean;
}

export interface ConfigMapEnvSource {
  name: string;
  optional?: boolean;
}

export interface EnvFromSource {
  configMapRef?: ConfigMapEnvSource;
  prefix?: string;
  secretRef?: SecretEnvSource;
}

export interface SELinuxOptions {
  user?: string;
  role?: string;
  type?: string;
  level?: string;
}

export interface WindowsSecurityContextOptions {
  gmsaCredentialSpec?: string;
  gmsaCredentialSpecName?: string;
  hostProcess?: boolean;
  runAsUserName?: string;
}

export interface SecurityContext {
  allowPrivilegeEscalation?: boolean;
  capabilities?: {
    add?: string[];
    drop?: string[];
  };
  privileged?: boolean;
  procMount?: "Default" | "Unmasked";
  readOnlyRootFilesystem?: boolean;
  runAsGroup?: number;
  runAsNonRoot?: boolean;
  runAsUser?: number;
  seLinuxOptions?: SELinuxOptions;
  seccompProfile?: {
    localhostProfile?: string;
    type?: "Unconfined" | "Localhost" | "RuntimeDefault";
  };
  windowsOptions?: WindowsSecurityContextOptions;
}

export interface PodSecurityContext {
  fsGroup?: number;
  runAsGroup?: number;
  runAsNonRoot?: boolean;
  runAsUser?: number;
  seLinuxOptions?: SELinuxOptions;
  supplementalGroups?: number[];
  sysctls?: Array<{ name: string; value: string }>;
  windowsOptions?: WindowsSecurityContextOptions;
}

export interface Container {
  args?: string[];
  command?: string[];
  env?: EnvVar[];
  envFrom?: EnvFromSource[];
  image: string;
  imagePullPolicy?: "Always" | "Never" | "IfNotPresent";
  // lifecycle?: Lifecycle
  livenessProbe?: Probe;
  name: string;
  ports?: ContainerPort[];
  readinessProbe?: Probe;
  resources?: {
    limits?: {
      memory?: string | number;
      cpu?: string | number;
    };
    requests?: {
      memory?: string | number;
      cpu?: string | number;
    };
  };
  securityContext?: SecurityContext;
  startupProbe?: Probe;
  stdin?: boolean;
  stdinOnce?: boolean;
  terminationMessagePath?: string;
  terminationMessagePolicy?: string;
  tty?: boolean;
  // volumeDevices?: VolumeDevice[]
  volumeMounts?: VolumeMount[];
  workingDir?: string;
}

export interface VolumeMount {
  mountPath: string;
  mountPropagation?: string;
  name: string;
  readOnly?: boolean;
  subPath?: string;
}

type Probe = (
  | {
      exec: ExecAction;
    }
  | {
      tcpSocket: TCPSocketAction;
    }
  | {
      httpGet: HTTPGetAction;
    }
) & {
  failureThreshold?: number;
  initialDelaySeconds?: number;
  periodSeconds?: number;
  successThreshold?: number;
  timeoutSeconds?: number;
};

export interface ExecAction {
  command: string[];
}

export interface TCPSocketAction {
  host?: string;
  port: number;
}

export interface HTTPGetAction {
  host?: string;
  httpHeaders?: HTTPHeader[];
  path: string;
  port?: number;
  scheme?: "HTTP" | "HTTPS";
}

export interface HTTPHeader {
  name: string;
  value: string;
}

export interface ContainerPort {
  containerPort: number;
  hostIP?: string;
  hostPort?: number;
  name?: string;
  protocol?: "TCP" | "UDP" | "SCTP";
}

type EnvVar = EnvVarWithValue | EnvVarWithFrom;

export interface EnvVarWithValue {
  name: string;
  value: string;
}

export interface EnvVarWithFrom {
  name: string;
  valueFrom: EnvVarSource;
}

type EnvVarSource =
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
  ports?: ServicePort[];
  publishNotReadyAddresses?: boolean;
  selector?: { [label: string]: string };
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

export interface HorizontalPodAutoscalerSpec {
  maxReplicas: number;
  minReplicas: number;
  scaleTargetRef: CrossVersionObjectReference;
  targetCPUUtilizationPercentage: number;
}

export interface CrossVersionObjectReference {
  apiVersion: string;
  kind: string;
  name: string;
}

export interface StatefulSetSpec {
  podManagementPolicy?: "OrderedReady" | "Parallel";
  replicas?: number;
  revisionHistoryLimit?: number;
  selector: LabelSelector;
  serviceName: string;
  template: PodTemplateSpec;
  updateStrategy?: StatefulSetUpdateStrategy;
  volumeClaimTemplates: Array<{
    metadata: NonNamespacedObjectMeta;
    spec: PersistentVolumeClaimSpec;
  }>;
}

export interface StatefulSetUpdateStrategy {
  rollingUpdate?: RollingUpdateStatefulSetStrategy;
  type: "RollingUpdate";
}

export interface RollingUpdateStatefulSetStrategy {
  partition: number;
}

export interface PersistentVolumeClaimSpec {
  accessModes: Array<"ReadWriteOnce" | "ReadOnlyMany" | "ReadWriteMany">;
  dataSource?: TypedLocalObjectReference;
  resources: {
    requests: {
      storage: string | number;
    };
  };
  selector?: LabelSelector;
  storageClassName?: string;
  volumeMode?: "Filesystem" | "Block";
  volumeName?: string;
}

export interface TypedLocalObjectReference {
  apiGroup: string;
  kind: string;
  name: string;
}

export interface JobSpec {
  activeDeadlineSeconds?: number;
  backoffLimit?: number;
  completions?: number;
  manualSelector?: boolean;
  parallelism?: number;
  selector: LabelSelector;
  template: PodTemplateSpec;
  ttlSecondsAfterFinished?: number;
}

export interface JobTemplateSpec {
  metadata?: ObjectMeta;
  spec: Omit<JobSpec, "selector">;
}

export interface CronJobSpec {
  concurrencyPolicy?: "Allow" | "Forbid" | "Replace";
  failedJobsHistoryLimit?: number;
  jobTemplate: JobTemplateSpec;
  schedule: string;
  startingDeadlineSeconds?: number;
  successfulJobsHistoryLimit?: number;
  suspend?: boolean;
}

export interface NamespaceSpec {
  finalizers?: string[];
}

export interface DaemonSetSpec {
  minReadySeconds?: number;
  revisionHistoryLimit?: number;
  selector: LabelSelector;
  template: PodTemplateSpec;
  updateStrategy?: DaemonSetUpdateStrategy;
}

type DaemonSetUpdateStrategy =
  | {
      rollingUpdate: RollingUpdateDaemonSet;
      type: "RollingUpdate";
    }
  | { type: "OnDelete" };

export interface RollingUpdateDaemonSet {
  maxSurge: number;
  maxUnavailable: number;
}

export interface NetworkPolicySpec {
  egress?: NetworkPolicyEgressRule[];
  ingress?: NetworkPolicyIngressRule[];
  podSelector: LabelSelector;
  policyTypes: Array<"Ingress" | "Egress">;
}

export interface NetworkPolicyEgressRule {
  ports: NetworkPolicyPort[];
  to: NetworkPolicyPeer[];
}

export interface NetworkPolicyIngressRule {
  from: NetworkPolicyPeer[];
  ports: NetworkPolicyPort[];
}

export interface NetworkPolicyPeer {
  ipBlock?: {
    cidr: string;
    except: string[];
  };
  podSelector?: LabelSelector;
  namespaceSelector?: LabelSelector;
}

export interface NetworkPolicyPort {
  port: number;
  protocol?: "TCP" | "UDP" | "SCTP";
}

export class Namespace {
  constructor(
    public metadata: NonNamespacedObjectMeta,
    public spec?: NamespaceSpec,
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

export class Deployment {
  constructor(public metadata: ObjectMeta, public spec: DeploymentSpec) {}

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
  constructor(public metadata: ObjectMeta, public spec: StatefulSetSpec) {}

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
  constructor(public metadata: ObjectMeta, public spec: ServiceSpec) {}

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

export class Ingress {
  constructor(public metadata: ObjectMeta, public spec: IngressSpec) {}

  get yaml() {
    return generateYaml([
      {
        apiVersion: "networking.k8s.io/v1beta1",
        kind: "Ingress",
        metadata: this.metadata,
        spec: this.spec,
      },
    ]);
  }
}

export class HorizontalPodAutoscaler {
  constructor(
    public metadata: ObjectMeta,
    public spec: HorizontalPodAutoscalerSpec,
  ) {}

  get yaml() {
    return generateYaml([
      {
        apiVersion: "autoscaling/v1",
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
    public data?: { [key: string]: string },
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
  constructor(public metadata: ObjectMeta, public spec: CronJobSpec) {}

  get yaml() {
    return generateYaml([
      {
        apiVersion: "batch/v1beta1",
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
    public spec: PodDisruptionBudgetSpec,
  ) {}

  get yaml() {
    return generateYaml([
      {
        apiVersion: "policy/v1beta1",
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
    public spec: Omit<JobSpec, "selector">,
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
    public spec: PersistentVolumeClaimSpec,
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
  constructor(public metadata: ObjectMeta, public spec: DaemonSetSpec) {}

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
  constructor(public metadata: ObjectMeta, public spec: NetworkPolicySpec) {}

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
