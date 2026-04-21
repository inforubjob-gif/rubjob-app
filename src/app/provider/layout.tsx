import ProviderAuthGate from "@/components/provider/ProviderAuthGate";

export default function ProviderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProviderAuthGate>{children}</ProviderAuthGate>;
}
