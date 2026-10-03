import { ClusterPage, clusterMetadata } from "@/components/seo/ClusterPage";

export const metadata = clusterMetadata("pdf-converter");

export default function Page() {
  return <ClusterPage id="pdf-converter" />;
}
