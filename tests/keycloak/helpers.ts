import type { AxiosInstance } from "axios";
import axios from "axios";

import { portForward } from "../helpers";

export function getAxiosClient(
  namespace: string,
  pod: string,
  port: number
): [AxiosInstance, () => void] {
  const forward = portForward(namespace, pod, port);

  return [
    axios.create({ baseURL: `http://localhost:${forward.port}` }),
    forward.close,
  ];
}
