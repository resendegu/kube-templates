import { generateYaml } from "./helpers";

export interface BasicObjectMeta {
  annotations?: {
    [annotation: string]: string;
  };
  labels?: {
    [label: string]: string;
  };
}

interface NonNamespacedObjectMeta extends BasicObjectMeta {
  name: string;
}

export interface ObjectMeta extends NonNamespacedObjectMeta {
  namespace: string;
}

interface DeploymentSpec {
  minReadySeconds?: number;
  paused?: boolean;
  progressDeadlineSeconds?: number;
  replicas?: number;
  revisionHistoryLimit?: number;
  selector?: LabelSelector;
  strategy?: DeploymentStrategy;
  template: PodTemplateSpec;
}

interface LabelSelector {
  matchExpressions?: LabelSelectorRequirement[];
  matchLabels?: {
    [label: string]: string;
  };
}

interface LabelSelectorRequirement {
  key: string;
  operator: "In" | "NotIn" | "Exists" | "DoesNotExist";
  values: string[];
}

interface DeploymentStrategy {
  maxSurge?: number | string;
  maxUnavailable?: number | string;
}

interface PodTemplateSpec {
  metadata: BasicObjectMeta;
  spec: PodSpec;
}

interface PodSpec {
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

interface PodSecurityContext {
  fsGroup?: number;
  runAsGroup?: number;
  runAsNonRoot?: boolean;
  runAsUser?: number;
  seLinuxOptions?: {
    level?: string;
    role?: string;
    type?: string;
    user?: string;
  };
  supplementalGroups?: number[];
}

interface Toleration {
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
        defaultMode?: string;
        items: KeyToPath[];
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
  // | {
  //     hostPath: HostPathVolumeSource;
  //   }
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
        defaultMode?: string;
        items: KeyToPath[];
        optional?: boolean;
        secretName: string;
      };
    }
  // | {
  //     storageos: StorageOSVolumeSource;
  //   }
  // | {
  //     vsphereVolume: VsphereVirtualDiskVolumeSource;
  //   }
);

interface Affinity {
  nodeAffinity?: NodeAffinity;
  podAffinity?: PodAffinity;
  podAntiAffinity?: PodAntiAffinity;
}

interface NodeAffinity {
  preferredDuringSchedulingIgnoredDuringExecution?: PreferredSchedulingTerm[];
  requiredDuringSchedulingIgnoredDuringExecution?: NodeSelector;
}

interface PodAffinity {
  preferredDuringSchedulingIgnoredDuringExecution?: WeightedPodAffinityTerm[];
  requiredDuringSchedulingIgnoredDuringExecution?: PodAffinityTerm[];
}

interface PodAntiAffinity {
  preferredDuringSchedulingIgnoredDuringExecution?: WeightedPodAffinityTerm[];
  requiredDuringSchedulingIgnoredDuringExecution?: PodAffinityTerm[];
}

interface NodeSelector {
  nodeSelectorTerms?: NodeSelectorTerm[];
}

interface PreferredSchedulingTerm {
  preference?: NodeSelectorTerm;
  weight: number;
}

interface WeightedPodAffinityTerm {
  podAffinityTerm?: PodAffinityTerm;
  weight: number;
}

interface PodAffinityTerm {
  labelSelector?: LabelSelector;
  namespaces: string[];
  topologyKey: string;
}

interface NodeSelectorTerm {
  matchExpressions?: NodeSelectorRequirement[];
  matchFields?: NodeSelectorRequirement[];
}

interface NodeSelectorRequirement {
  key: string;
  operator: "In" | "NotIn" | "Exists" | "DoesNotExist" | "Gt" | "Lt";
  values: string[];
}

interface SecretEnvSource {
  name: string;
  optional?: boolean;
}

interface ConfigMapEnvSource {
  name: string;
  optional?: boolean;
}

interface EnvFromSource {
  configMapRef?: ConfigMapEnvSource;
  prefix?: string;
  secretRef?: SecretEnvSource;
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
  // securityContext?: SecurityContext
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

interface ExecAction {
  command: string[];
}

interface TCPSocketAction {
  host?: string;
  port: number;
}

interface HTTPGetAction {
  host?: string;
  httpHeaders?: HTTPHeader[];
  path: string;
  port?: number;
  scheme?: "HTTP" | "HTTPS";
}

interface HTTPHeader {
  name: string;
  value: string;
}

interface ContainerPort {
  containerPort: number;
  hostIP?: string;
  hostPort?: number;
  name?: string;
  protocol?: "TCP" | "UDP" | "SCTP";
}

type EnvVar = EnvVarWithValue | EnvVarWithFrom;

interface EnvVarWithValue {
  name: string;
  value: string;
}

interface EnvVarWithFrom {
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

interface ConfigMapKeySelector {
  key: string;
  name: string;
  optional?: boolean;
}

interface SecretKeySelector {
  key: string;
  name: string;
  optional?: boolean;
}

interface ObjectFieldSelector {
  apiVersion?: string;
  fieldPath: string;
}

interface ResourceFieldSelector {
  containerName?: string;
  divisor?: number | string;
  resource: string;
}

interface LocalObjectReference {
  name: string;
}

interface ServiceSpec {
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

interface SessionAffinityConfig {
  clientIP: ClientIPConfig;
}

interface ClientIPConfig {
  timeoutSeconds: number;
}

interface ServicePort {
  name: string;
  nodePort?: number;
  port: number;
  protocol?: "TCP" | "UDP" | "SCTP";
  targetPort?: number;
}

interface IngressSpec {
  backend?: IngressBackend;
  rules?: IngressRule[];
  tls?: IngressTLS[];
}

interface IngressBackend {
  serviceName: string;
  servicePort: number;
}

interface IngressRule {
  host: string;
  http?: HTTPIngressRuleValue;
}

interface IngressTLS {
  hosts?: string[];
  secretName: string;
}

interface HTTPIngressRuleValue {
  paths: HTTPIngressPath[];
}

interface HTTPIngressPath {
  backend: IngressBackend;
  path: string;
}

interface HorizontalPodAutoscalerSpec {
  maxReplicas: number;
  minReplicas: number;
  scaleTargetRef: CrossVersionObjectReference;
  targetCPUUtilizationPercentage: number;
}

interface CrossVersionObjectReference {
  apiVersion: string;
  kind: string;
  name: string;
}

interface StatefulSetSpec {
  podManagementPolicy?: "OrderedReady" | "Parallel";
  replicas?: number;
  revisionHistoryLimit?: number;
  selector: LabelSelector;
  serviceName: string;
  template: PodTemplateSpec;
  updateStrategy?: StatefulSetUpdateStrategy;
  volumeClaimTemplates: {
    metadata: NonNamespacedObjectMeta;
    spec: PersistentVolumeClaimSpec;
  }[];
}

interface StatefulSetUpdateStrategy {
  rollingUpdate: RollingUpdateStatefulSetStrategy;
  type: "RollingUpdate";
}

interface RollingUpdateStatefulSetStrategy {
  partition: number;
}

interface PersistentVolumeClaimSpec {
  accessModes: ("ReadWriteOnce" | "ReadOnlyMany" | "ReadWriteMany")[];
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

interface TypedLocalObjectReference {
  apiGroup: string;
  kind: string;
  name: string;
}

interface JobSpec {
  activeDeadlineSeconds?: number;
  backoffLimit?: number;
  completions?: number;
  manualSelector?: boolean;
  parallelism?: number;
  selector: LabelSelector;
  template: PodTemplateSpec;
  ttlSecondsAfterFinished?: number;
}

interface JobTemplateSpec {
  metadata?: Omit<ObjectMeta, "name" | "namespace">;
  spec: JobSpec;
}

interface CronJobSpec {
  concurrencyPolicy?: "Allow" | "Forbid" | "Replace";
  failedJobsHistoryLimit?: number;
  jobTemplate: JobTemplateSpec;
  schedule: string;
  startingDeadlineSeconds?: number;
  successfulJobsHistoryLimit?: number;
  suspend?: boolean;
}

interface NamespaceSpec {
  finalizers?: string[];
}

export class Namespace {
  constructor(
    public metadata: NonNamespacedObjectMeta,
    public spec?: NamespaceSpec
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
    public spec: HorizontalPodAutoscalerSpec
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
    public data?: { [key: string]: string | Buffer }
  ) {}

  get yaml() {
    let data: any = undefined;
    const targetData = this.data;
    if (targetData) {
      data = {};
      for (const key in targetData) {
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
        data: data,
        kind: "Secret",
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
