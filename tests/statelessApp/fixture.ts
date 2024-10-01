import type { ObjectMeta } from "../../src/kubernetes";
import type { StatelessAppSpec } from "../../src/statelessapp";

export const basicAppMetadataConfig: ObjectMeta = {
  name: "stateless-app",
  namespace: "default",
};

export const basicAppSpecConfig: StatelessAppSpec = {
  image: "nginx:latest",
  cpu: {
    limit: "500m",
    request: "200m",
  },
  memory: {
    limit: "512Mi",
    request: "256Mi",
  },
};
