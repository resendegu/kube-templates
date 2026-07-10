import type { AxiosInstance } from "axios";
import axios from "axios";

import { portForward } from "../helpers";

export async function getAxiosClient(
  namespace: string,
  pod: string,
  port: number,
): Promise<[AxiosInstance, () => void]> {
  const forward = await portForward(namespace, pod, port);

  return [
    axios.create({ baseURL: `http://localhost:${forward.port}` }),
    forward.close,
  ];
}
