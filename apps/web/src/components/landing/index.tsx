import { Footer, Header } from "./chrome";
import { Hero } from "./hero";
import { Leaderboard } from "./leaderboard";
import { Faq, Features, FinalCta, HowItWorks, Personas, Pricing, Problems } from "./sections";

/** Landing chưa đăng nhập. Thiết kế gốc: Documents/temp_doc/landing-v1.html. */
export function Landing() {
  return (
    <>
      <Header />
      <main id="top">
        <Hero />
        <Leaderboard />
        <Problems />
        <HowItWorks />
        <Features />
        <Personas />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
