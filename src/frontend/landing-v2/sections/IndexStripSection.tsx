import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollReelTestimonials } from "@/components/ui/scroll-reel-testimonials";

const AGENTS = [
  {
    quote:
      "Discovers opportunities across multiple job platforms, analyzes job descriptions, and intelligently ranks the best matches.",
    author: "Job Discovery Engine",
    image:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80&auto=format&fit=crop",
    alt: "Job Discovery Engine",
  },
  {
    quote:
      "Creates ATS-optimized resumes tailored to specific job descriptions and career goals.",
    author: "Resume Studio",
    image:
      "https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=400&q=80&auto=format&fit=crop",
    alt: "Resume Studio",
  },
  {
    quote:
      "Tracks applications, interview stages, hiring progress, and application history from a unified dashboard.",
    author: "Application Tracker",
    image:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&q=80&auto=format&fit=crop",
    alt: "Application Tracker",
  },
  {
    quote:
      "Executes browser automation, form filling, data extraction, and workflow automation directly on the user's machine.",
    author: "Local Agent",
    image:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&q=80&auto=format&fit=crop",
    alt: "Local Agent",
  },
];

/** Section 3 — Agent Showcase using ScrollReelTestimonials. */
export function IndexStripSection() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!ref.current) return;
      const el = ref.current;
      gsap.from(el, {
        y: 40,
        opacity: 0,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 75%", once: true },
      });
      return () =>
        ScrollTrigger.getAll().forEach((t) => {
          if (t.trigger === el) t.kill();
        });
    },
    { scope: ref },
  );

  return (
    <section ref={ref} data-section={3} className="lv2-section lv2-indexstrip">
      <span className="lv2-sec-index">— 03 / 12</span>

      <div className="lv2-agents-header">
        <h2 className="lv2-agents-title">Meet The Agents</h2>
        <p className="lv2-agents-subtitle">
          Specialized AI agents working together under a single command system.
        </p>
      </div>

      <ScrollReelTestimonials
        testimonials={AGENTS}
        className="lv2-agents-reel"
      />
    </section>
  );
}
