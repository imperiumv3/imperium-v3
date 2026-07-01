import { useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useSession } from "@frontend/auth/session";
import {
  FaReact, FaAws, FaDocker, FaNodeJs, FaGithub,
  FaTwitter, FaLinkedin, FaInstagram, FaGoogle, FaApple
} from "react-icons/fa";
import {
  SiNextdotjs, SiVercel, SiRedux, SiTypescript, SiFacebook
} from "react-icons/si";

const fallbackUrls = [
  "https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg",
  "https://upload.wikimedia.org/wikipedia/commons/9/96/Among_Us_icon.png"
];

const iconConfigs = [
  { Icon: FaReact, color: "#61DAFB" },
  { Icon: FaAws, color: "#FF9900" },
  { Icon: FaDocker, color: "#2496ED" },
  { Icon: FaNodeJs, color: "#339933" },
  { Icon: SiNextdotjs, color: "#000000" },
  { Icon: SiVercel, color: "#000000" },
  { Icon: SiRedux, color: "#764ABC" },
  { Icon: SiTypescript, color: "#3178C6" },
  { Icon: FaGithub, color: "#181717" },
  { Icon: FaTwitter, color: "#1DA1F2" },
  { Icon: FaLinkedin, color: "#0077B5" },
  { Icon: FaInstagram, color: "#E1306C" },
  { Icon: FaGoogle, color: "#DB4437" },
  { Icon: FaApple, color: "#000000" },
  { Icon: SiFacebook, color: "#1877F2" },
  { Icon: null, img: fallbackUrls[0] },
  { Icon: null, img: fallbackUrls[1] },
];

/** Section 12 — Build Your Dream with IMPERIUM (Stack Feature layout). */
export function EnterImperiumSection() {
  const ref = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const session = useSession();

  const orbitCount = 3;
  const orbitGap = 8;
  const iconsPerOrbit = Math.ceil(iconConfigs.length / orbitCount);

  useGSAP(
    () => {
      if (!ref.current) return;
      const leftContent = ref.current.querySelector(".lv2s12-left");
      if (leftContent) {
        gsap.from(leftContent.children, {
          y: 30,
          opacity: 0,
          duration: 0.8,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: { trigger: ref.current, start: "top 60%", once: true },
        });
      }
      return () => {
        ScrollTrigger.getAll().forEach((t) => {
          if (t.trigger === ref.current) t.kill();
        });
      };
    },
    { scope: ref },
  );

  function onBuildDream() {
    navigate({ to: session ? "/jobs" : "/auth" });
  }

  function onStartJourney() {
    const el = document.querySelector("[data-section=\"2\"]");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section ref={ref} data-section={12} className="lv2s12-stack">
      <div className="lv2s12-stack-inner">
        {/* Left side: Heading and Text */}
        <div className="lv2s12-left">
          <h2 className="lv2s12-heading">
            Build Your Dream
            <br />
            <span className="lv2s12-heading-accent">With IMPERIUM</span>
          </h2>
          <p className="lv2s12-desc">
            "The journey to your dream career starts here. Let IMPERIUM guide
            every step from discovery to success."
          </p>
          <div className="lv2s12-btns">
            <button
              type="button"
              className="lv2s12-btn lv2s12-btn-primary"
              onClick={onBuildDream}
            >
              Build Your Dream
            </button>
            <button
              type="button"
              className="lv2s12-btn lv2s12-btn-secondary"
              onClick={onStartJourney}
            >
              Start Your Journey
            </button>
          </div>
        </div>

        {/* Right side: Orbit animation */}
        <div className="lv2s12-right">
          <div className="lv2s12-orbit-wrap">
            {/* Center Circle */}
            <div className="lv2s12-center">
              <FaReact className="lv2s12-center-icon" />
            </div>

            {/* Generate Orbits */}
            {[...Array(orbitCount)].map((_, orbitIdx) => {
              const size = `${12 + orbitGap * (orbitIdx + 1)}rem`;
              const angleStep = (2 * Math.PI) / iconsPerOrbit;

              return (
                <div
                  key={orbitIdx}
                  className="lv2s12-orbit"
                  style={{
                    width: size,
                    height: size,
                    animationDuration: `${12 + orbitIdx * 6}s`,
                  }}
                >
                  {iconConfigs
                    .slice(orbitIdx * iconsPerOrbit, orbitIdx * iconsPerOrbit + iconsPerOrbit)
                    .map((cfg, iconIdx) => {
                      const angle = iconIdx * angleStep;
                      const x = 50 + 50 * Math.cos(angle);
                      const y = 50 + 50 * Math.sin(angle);

                      return (
                        <div
                          key={iconIdx}
                          className="lv2s12-orbit-icon"
                          style={{
                            left: `${x}%`,
                            top: `${y}%`,
                          }}
                        >
                          {cfg.Icon ? (
                            <cfg.Icon className="lv2s12-orbit-svg" style={{ color: cfg.color }} />
                          ) : (
                            <img
                              src={cfg.img}
                              alt="icon"
                              className="lv2s12-orbit-img"
                            />
                          )}
                        </div>
                      );
                    })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
