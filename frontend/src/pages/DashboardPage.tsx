import { useEffect, useMemo, useRef } from "react";
import { useBooks } from "../hooks/useBooks";
import BookUploadCard from "../components/BookUploadCard";
import BookCard from "../components/BookCard";
import EmptyState from "../components/ui/EmptyState";
import Spinner from "../components/ui/Spinner";
import { useAuth } from "../context/AuthContext";
import { loadGsap } from "../utils/gsap";

type HeroIcon = {
  src: string;
  alt: string;
  className: string;
};

const HERO_ICONS: HeroIcon[] = [
  {
    src: "https://icons.iconarchive.com/icons/microsoft/fluentui-emoji-3d/128/Open-Book-3d-icon.png",
    alt: "Open book 3D icon",
    className: "left-4 top-10 w-24 md:w-28",
  },
  {
    src: "https://icons.iconarchive.com/icons/microsoft/fluentui-emoji-3d/128/Books-3d-icon.png",
    alt: "Books stack 3D icon",
    className: "left-[38%] top-20 w-24 md:w-28",
  },
  {
    src: "https://icons.iconarchive.com/icons/microsoft/fluentui-emoji-3d/128/Laptop-3d-icon.png",
    alt: "Laptop 3D icon",
    className: "right-2 top-12 w-24 md:w-28",
  },
];

export default function DashboardPage() {
  const { isAdmin, user } = useAuth();
  const { data: books, isLoading, isError } = useBooks();
  const heroRef = useRef<HTMLDivElement | null>(null);
  const uploadRef = useRef<HTMLDivElement | null>(null);
  const booksSectionRef = useRef<HTMLDivElement | null>(null);
  const iconRefs = useRef<(HTMLImageElement | null)[]>([]);

  const greeting = useMemo(
    () => (isAdmin ? "Build Better Courses Faster" : "Keep Learning Momentum"),
    [isAdmin],
  );

  useEffect(() => {
    const runningTweens: Array<{ kill: () => void }> = [];
    let isCancelled = false;

    void loadGsap().then((gsap) => {
      if (!gsap || isCancelled) return;

      if (heroRef.current) {
        runningTweens.push(
          gsap.fromTo(
            heroRef.current,
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.75, ease: "power2.out" },
          ),
        );
      }

      if (uploadRef.current) {
        runningTweens.push(
          gsap.fromTo(
            uploadRef.current,
            { opacity: 0, y: 16 },
            { opacity: 1, y: 0, duration: 0.6, delay: 0.12, ease: "power2.out" },
          ),
        );
      }

      if (booksSectionRef.current) {
        const cards =
          booksSectionRef.current.querySelectorAll("[data-book-card]");
        if (cards.length) {
          runningTweens.push(
            gsap.fromTo(
              cards,
              { opacity: 0, y: 30 },
              {
                opacity: 1,
                y: 0,
                duration: 0.7,
                stagger: 0.09,
                ease: "power2.out",
              },
            ),
          );
        }
      }

      iconRefs.current.forEach((icon, index) => {
        if (!icon) return;
        runningTweens.push(
          gsap.to(icon, {
            y: index % 2 === 0 ? -12 : 12,
            rotation: index % 2 === 0 ? -4 : 5,
            duration: 2.8 + index * 0.25,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
          }),
        );
      });
    });

    return () => {
      isCancelled = true;
      runningTweens.forEach((tween) => tween.kill());
    };
  }, [books?.length]);

  return (
    <div>
      <div
        ref={heroRef}
        className="grain-overlay relative overflow-hidden rounded-3xl border border-white/70 bg-gradient-to-br from-white/95 via-white/90 to-emerald-50/85 p-6 shadow-[0_14px_50px_-24px_rgba(15,118,110,0.45)] md:p-8"
      >
        <div className="relative grid items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="meta-font text-xs uppercase tracking-[0.22em] text-teal-700">
              AI Learning Studio
            </p>
            <h1 className="mt-3 text-3xl font-bold text-gray-950 md:text-4xl">
              {greeting}
            </h1>
            <p className="mt-3 max-w-xl text-sm text-ink-soft md:text-base">
              Turn textbook PDFs into a structured study journey with chapter
              roadmap, AI quizzes, and focused video explainers.
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-white/85 px-3 py-1 text-gray-700">
                Upload textbook
              </span>
              <span className="rounded-full bg-white/85 px-3 py-1 text-gray-700">
                Auto unit map
              </span>
              <span className="rounded-full bg-white/85 px-3 py-1 text-gray-700">
                Practice quizzes
              </span>
            </div>
          </div>

          <div className="relative min-h-[220px] rounded-2xl border border-white/70 bg-white/40 p-3">
            <div className="absolute right-3 top-3 rounded-xl border border-white/80 bg-white/90 px-3 py-2 shadow-sm">
              <p className="meta-font text-[11px] uppercase tracking-wider text-gray-500">
                Smart Workflow
              </p>
              <p className="text-sm font-semibold text-gray-900">
                {"Upload -> Process -> Learn"}
              </p>
            </div>

            {HERO_ICONS.map((icon, index) => (
              <img
                key={icon.src}
                ref={(node) => {
                  iconRefs.current[index] = node;
                }}
                src={icon.src}
                alt={icon.alt}
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
                className={`absolute drop-shadow-[0_18px_20px_rgba(15,23,42,0.18)] ${icon.className}`}
              />
            ))}
          </div>
        </div>
      </div>

      {!user?.book_limit_reached && !(books && books.length > 0) && (
        <div ref={uploadRef} className="mt-6">
          <BookUploadCard />
        </div>
      )}

      <div ref={booksSectionRef} className="mt-10">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-950">
              {isAdmin ? "All Books" : "My Books"}
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              Pick a book to continue the roadmap and unlock unit quizzes.
            </p>
          </div>
          <span className="meta-font rounded-full bg-white/85 px-3 py-1 text-xs font-medium text-gray-600">
            {books?.length ?? 0} total
          </span>
        </div>

        {isLoading && (
          <div className="flex justify-center py-12">
            <Spinner className="h-8 w-8" />
          </div>
        )}

        {isError && (
          <p className="text-center text-sm text-red-600">
            Failed to load books. Please try again.
          </p>
        )}

        {books && books.length === 0 && (
          <EmptyState
            title="No books yet"
            description="Upload your first PDF textbook to get started."
          />
        )}

        {books && books.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {books.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
