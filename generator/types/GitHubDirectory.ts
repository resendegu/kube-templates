export interface GitHubDirectory {
  tree: {
    items: Array<{
      name: string;
      path: string;
      contentType: "file" | "directory";
    }>;
  };
}
