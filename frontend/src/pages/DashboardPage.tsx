import { useEffect, useMemo, useRef } from "react";
import { useBooks } from "../hooks/useBooks";
import BookUploadCard from "../components/BookUploadCard";
import BookCard from "../components/BookCard";
import EmptyState from "../components/ui/EmptyState";
import Spinner from "../components/ui/Spinner";
import { useAuth } from "../context/AuthContext";
import { loadGsap } from "../utils/gsap";
import usePageTitle from "../hooks/usePageTitle";

export default function DashboardPage() {
  const { isAdmin, user } = useAuth();
  usePageTitle(isAdmin ? "Command Deck" : "Learning Launchpad");
  const { data: books, isLoading, isError } = useBooks();
  const heroRef = useRef<HTMLDivElement | null>(null);
  const uploadRef = useRef<HTMLDivElement | null>(null);
  const booksSectionRef = useRef<HTMLDivElement | null>(null);

  const greeting = useMemo(
    () => (isAdmin ? "Build Better Courses Faster" : "Keep Learning Momentum"),
    [isAdmin],
  );
  const canUploadBook = isAdmin || (!user?.book_limit_reached && !(books && books.length > 0));

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
        className="grain-overlay relative overflow-hidden surface-card p-6 shadow-sm md:p-8"
      >
        <div className="relative">
          <p className="meta-font text-xs uppercase tracking-[0.22em] text-[var(--primary)]">
            AI Learning Studio
          </p>
          <h1 className="mt-3 text-3xl font-bold text-[var(--text-primary)] md:text-4xl">
            {greeting}
          </h1>
          <p className="mt-3 max-w-xl text-sm text-ink-soft md:text-base">
            Turn textbook PDFs into a structured study journey with chapter
            roadmap, AI quizzes, and focused video explainers.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-[var(--bg-muted)] px-3 py-1 text-[var(--text-secondary)]">
              Upload textbook
            </span>
            <span className="rounded-full bg-[var(--bg-muted)] px-3 py-1 text-[var(--text-secondary)]">
              Auto unit map
            </span>
            <span className="rounded-full bg-[var(--bg-muted)] px-3 py-1 text-[var(--text-secondary)]">
              Practice quizzes
            </span>
          </div>
        </div>
      </div>

      {canUploadBook && (
        <div ref={uploadRef} className="mt-6">
          <BookUploadCard />
        </div>
      )}

      <div ref={booksSectionRef} className="mt-10">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">
              {isAdmin ? "All Books" : "My Books"}
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              Pick a book to continue the roadmap and unlock unit quizzes.
            </p>
          </div>
          <span className="meta-font rounded-full bg-[var(--bg-muted)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
            {books?.length ?? 0} total
          </span>
        </div>

        {isLoading && (
          <div className="flex justify-center py-12">
            <Spinner className="h-8 w-8" />
          </div>
        )}

        {isError && (
          <p className="text-center text-sm text-[var(--error)]">
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
