export const PathSanitizer = (path: string) => {
  // check for .. attempts to escape the directory
  if (path.includes("..")) {
    return path.replace(/\.{2,}/g, "");
  }
  return path;
};
