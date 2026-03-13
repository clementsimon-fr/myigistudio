import { motion } from "framer-motion";
import { teamMembers } from "@/data/mockData";

export default function TeamSection() {
  return (
    <section className="py-20">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-primary-dark mb-3">
            L'Équipe
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Des passionné·e·s à votre service pour vous accompagner dans votre pratique.
          </p>
        </div>

        <div className="flex justify-center">
          {teamMembers.map((member, i) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="text-center max-w-sm"
            >
              <div className="w-40 h-40 mx-auto mb-4 rounded-full overflow-hidden border-4 border-secondary">
                <img
                  src={member.image}
                  alt={member.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <h3 className="text-xl font-display font-semibold text-primary-dark">
                {member.name}
              </h3>
              <p className="text-sm font-medium text-primary mb-2">{member.role}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{member.bio}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
