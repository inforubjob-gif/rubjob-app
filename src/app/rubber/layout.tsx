import RubberAuthGate from "@/components/rubber/RubberAuthGate";

export default function RubberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RubberAuthGate>{children}</RubberAuthGate>;
}
