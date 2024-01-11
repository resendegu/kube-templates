import type { GitHubDirectory } from "./GitHubDirectory";

type GitHubItems = GitHubDirectory["tree"]["items"];

export interface KustomizeInput {
  items: GitHubItems;
  directoryUrl: string;
  pathname?: string;
}
