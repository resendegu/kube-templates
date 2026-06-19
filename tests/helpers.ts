import { spawn, spawnSync } from "node:child_process";
import { unlinkSync, writeFileSync } from "node:fs";

function rawKubectl(...args: string[]) {
  const result = spawnSync("kubectl", [
    "--kubeconfig=kind-kubeconfig",
    ...args,
  ]);

  if (result.status === 0) {
    return result.stdout.toString();
  }

  throw new Error(result.stderr.toString());
}

export function sleep(seconds: number) {
  return new Promise<void>(resolve => {
    setTimeout(resolve, seconds * 1000);
  });
}

export function kubectl(...args: string[]) {
  return JSON.parse(rawKubectl("--output=json", ...args));
}

export function deleteObject(kind: string, name: string, namespace?: string) {
  // --wait=false so cleanup doesn't block the worker thread for the whole
  // (potentially minute-long) namespace teardown; each test uses a unique
  // namespace, so leaving it to delete in the background is fine.
  if (namespace) {
    return rawKubectl(
      `--namespace=${namespace}`,
      "delete",
      "--wait=false",
      kind,
      name,
    );
  }

  return rawKubectl("delete", "--wait=false", kind, name);
}

export function randomSuffix() {
  return `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

export async function apply({ yaml }: { readonly yaml: string }) {
  const path = `/tmp/kube.${randomSuffix()}.yaml`;

  writeFileSync(path, yaml);
  try {
    return kubectl("apply", "-f", path);
  } finally {
    unlinkSync(path);
    await sleep(2);
  }
}

export async function waitPodReady(
  namespace: string,
  pod: string,
  timeout = 180,
) {
  const start = Date.now();

  for (;;) {
    const podInfo = kubectl("-n", namespace, "get", "pod", pod);

    if (!podInfo) {
      throw new Error(`pod ${pod} does not exist`);
    }

    if (podInfo.status.containerStatuses?.every((x: any) => x.ready)) {
      return;
    }

    if (Date.now() - start > timeout * 1000) {
      throw new Error(`timeout while waiting for pod ${pod} to become ready`);
    }

    await sleep(1);
  }
}

export async function waitJobComplete(
  namespace: string,
  job: string,
  timeout = 180,
) {
  const start = Date.now();

  for (;;) {
    const jobInfo = kubectl("-n", namespace, "get", "job", job);

    if (!jobInfo) {
      throw new Error(`Job ${job} does not exist`);
    }

    if (jobInfo.status.succeeded === 1) {
      return;
    }

    if (Date.now() - start > timeout * 1000) {
      throw new Error(`timeout while waiting for Job ${job} to become ready`);
    }

    await sleep(1);
  }
}

export async function portForward(
  namespace: string,
  pod: string,
  containerPort: number,
) {
  const port = 63317 + parseInt(process.env.VITEST_WORKER_ID!, 10);
  const proc = spawn("kubectl", [
    "--kubeconfig=kind-kubeconfig",
    "-n",
    namespace,
    "port-forward",
    pod,
    `${port}:${containerPort}`,
  ]);

  let stdout = "";
  let stderr = "";
  let exitCode: number | null = null;

  proc.stdout.on("data", data => {
    stdout += data;
  });

  proc.stderr.on("data", data => {
    stderr += data;
  });

  proc.addListener("exit", code => {
    exitCode = code;
  });

  for (let i = 0; i < 30; ++i) {
    if (
      stdout.includes(`Forwarding from 127.0.0.1:${port} -> ${containerPort}`)
    ) {
      break;
    }

    await sleep(0.1);
    if (exitCode !== null) {
      throw new Error(stderr);
    }
  }

  return {
    port,
    close() {
      proc.kill("SIGINT");
    },
  };
}
