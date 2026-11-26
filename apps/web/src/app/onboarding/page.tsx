import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";

export const metadata: Metadata = { title: "Thiết lập – LoopEdu" };

export default function OnboardingPage() {
  return (
    <AuthShell>
      <OnboardingForm />
    </AuthShell>
  );
}
