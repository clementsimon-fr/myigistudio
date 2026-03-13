import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/home/HeroSection";
import ServicesGrid from "@/components/home/ServicesGrid";
import TeamSection from "@/components/home/TeamSection";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <ServicesGrid />
        <TeamSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
