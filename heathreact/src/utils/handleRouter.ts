export function loadView(featureName: string, view: string) {
  return () => import(`@/features/${featureName}/pages/${view}`);
}
