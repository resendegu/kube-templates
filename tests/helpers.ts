import { spawn, spawnSync } from "child_process";
import deasync from "deasync";
import { unlinkSync, writeFileSync } from "fs";

function rawKubectl(...args: string[]) {
  var result = spawnSync("kubectl", ["--kubeconfig=.test-kubeconfig", ...args]);

  if (result.status === 0) {
    return result.stdout.toString();
  } else {
    throw new Error(result.stderr.toString());
  }
}

export function kubectl(...args: string[]) {
  return JSON.parse(rawKubectl("--output=json", ...args));
}

export function deleteObject(kind: string, name: string) {
  rawKubectl("delete", kind, name);
}

export function apply({ yaml }: { readonly yaml: string }) {
  const path = `/tmp/kube.${randomSuffix()}.yaml`;
  writeFileSync(path, yaml);
  try {
    return kubectl("apply", "-f", path);
  } finally {
    unlinkSync(path);
    sleep(2);
  }
}

export function randomSuffix() {
  return `${new Date().getTime()}-${Math.floor(Math.random() * 100000)}`;
}

export function waitPodReady(namespace: string, pod: string, timeout = 60) {
  const start = new Date().getTime();
  while (true) {
    const podInfo = kubectl("-n", namespace, "get", "pod", pod);
    if (!podInfo) {
      throw new Error(`pod ${pod} does not exist`);
    }
    console.log(`POD -> ${JSON.stringify(podInfo)}`);
    if (
      podInfo.status.containerStatuses &&
      podInfo.status.containerStatuses.every((x: any) => x.ready)
    ) {
      return;
    }
    if (new Date().getTime() - start > timeout * 1000) {
      throw new Error(`timeout while waiting for pod ${pod} to become ready`);
    }
    sleep(1);
  }
}

export function waitJobComplete(namespace: string, job: string, timeout = 60) {
  const start = new Date().getTime();
  while (true) {
    const jobInfo = kubectl("-n", namespace, "get", "job", job);

    if (!jobInfo) {
      throw new Error(`Job ${job} does not exist`);
    }

    console.log(`JOB -> ${JSON.stringify(jobInfo)}`);

    if (jobInfo.status.succeeded === 1) {
      return;
    }

    if (new Date().getTime() - start > timeout * 1000) {
      throw new Error(`timeout while waiting for Job ${job} to become ready`);
    }

    sleep(1);
  }
}

export function sleep(seconds: number) {
  deasync.sleep(seconds * 1000);
}

export function portForward(
  namespace: string,
  pod: string,
  containerPort: number
) {
  const port = 63317 + parseInt(process.env.JEST_WORKER_ID!, 10);
  const proc = spawn("kubectl", [
    "--kubeconfig=.test-kubeconfig",
    "-n",
    namespace,
    "port-forward",
    pod,
    `${port}:${containerPort}`,
  ]);

  let stdout = "";
  let stderr = "";
  let exitCode: number | null = null;

  proc.stdout.on("data", (data) => {
    stdout += data;
  });

  proc.stderr.on("data", (data) => {
    stderr += data;
  });

  proc.addListener("exit", (code) => {
    exitCode = code;
  });

  for (let i = 0; i < 30; ++i) {
    if (
      stdout.includes(`Forwarding from 127.0.0.1:${port} -> ${containerPort}`)
    )
      break;
    sleep(0.1);
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
