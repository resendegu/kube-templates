export const apiSpecs: Record<
  string,
  {
    type: "OpenAPIv3" | "GitHubDirectory" | "CRD";
    url: string;
  }
> = {
  stackgres: {
    type: "CRD",
    url: "https://github.com/ongres/stackgres/tree/1.5.0/stackgres-k8s/src/common/src/main/resources/crds/",
  },
  kubernetes: {
    type: "GitHubDirectory",
    url: "https://github.com/kubernetes/kubernetes/tree/release-1.28/api/openapi-spec/v3/",
  },
  certManager: {
    type: "GitHubDirectory",
    url: "https://github.com/cert-manager/cert-manager/tree/release-1.13/deploy/crds/",
  },
};
