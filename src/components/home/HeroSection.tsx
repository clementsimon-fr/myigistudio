import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-secondary/30 py-20 md:py-32">
      {/* Decorative circles */}
      <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full bg-accent/10 blur-3xl" />

      <div className="container relative">
        <div className="max-w-2xl mx-auto text-center">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-sm font-medium uppercase tracking-widest text-primary-dark mb-4"
          >
            Bienvenue chez
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl font-display font-bold text-primary-dark mb-6"
          >
            MyIgi<span className="text-primary italic">Studio</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground mb-10 leading-relaxed"
          >
            Yoga, Pilates, Poterie & Bien-être.<br />
            Réservez vos cours et ateliers en quelques clics.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link to="/calendrier">
              <Button size="lg" className="bg-primary-dark text-primary-dark-foreground hover:bg-primary-dark/90 gap-2 px-8">
                Réserver un cours
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/calendrier">
              <Button size="lg" variant="outline" className="border-primary-dark text-primary-dark hover:bg-primary-dark/5 px-8">
                Découvrir le planning
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
