import { Wordmark } from '../components/ui';
import { releases } from '../../shared/releases';

export function InformationLinks() {
  return (
    <footer className="mt-10 border-t border-[#DDDDD5] pt-5">
      <nav
        aria-label="About the Arcade"
        className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-[#62625C]"
      >
        <a className="inline-flex min-h-11 items-center underline underline-offset-4" href="/about">
          About BCUSCA & SWE
        </a>
        <a className="inline-flex min-h-11 items-center underline underline-offset-4" href="/legal">
          Legal & accessibility
        </a>
        <a
          className="inline-flex min-h-11 items-center underline underline-offset-4"
          href="/versions"
        >
          v1.0.0 · Version history
        </a>
      </nav>
    </footer>
  );
}
function Section({ title, children }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-medium">{title}</h2>
      <div className="space-y-3 text-sm leading-7 text-[#50504B]">{children}</div>
    </section>
  );
}
export function Information() {
  const page = location.pathname;
  return (
    <div className="mx-auto min-h-svh max-w-2xl px-5 py-7">
      <header className="mb-10 flex items-center justify-between gap-4">
        <Wordmark />
        <a className="min-h-11 py-3 text-sm underline" href="/">
          Back to Arcade
        </a>
      </header>
      <main className="space-y-8" id="main-content">
        {page === '/about' ? (
          <>
            <h1 className="text-3xl font-medium">Computing, together.</h1>
            <Section title="About BCUSCA">
              <p>
                The BCU Student Computing Association brings students together around computing,
                shared projects and learning from each other.
              </p>
              <p>
                The Welcome Week Arcade is a way to meet us and try a few programming-inspired
                challenges. You do not need to be an experienced programmer to join in.
              </p>
            </Section>
            <Section title="Software Engineering division">
              <p>
                Our SWE division focuses on building software: solving problems, designing useful
                experiences and turning ideas into working projects. This Arcade is one of those
                projects.
              </p>
              <p>
                Interested in getting involved? Speak to the team at the stall about the division
                and its upcoming activities.
              </p>
            </Section>
          </>
        ) : page === '/versions' ? (
          <>
            <h1 className="text-3xl font-medium">How the Arcade grew</h1>
            <p className="text-sm text-[#62625C]">From a wheel prototype to Welcome Week.</p>
            <ol className="space-y-7">
              {releases.map((r) => (
                <li key={r.version} className="border-t border-[#DDDDD5] pt-5">
                  <p className="mb-2 text-xs text-[#62625C]">v{r.version}</p>
                  <h2 className="text-xl font-medium">{r.name}</h2>
                  <p className="mt-3 text-sm leading-7 text-[#50504B]">{r.summary}</p>
                </li>
              ))}
            </ol>
            <p className="text-xs text-[#62625C]">
              Earlier wheel and room prototypes preceded v0.3.0; their release numbers are not
              documented here.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-medium">Legal & accessibility</h1>
            <p className="text-xs text-[#62625C]">Arcade v1.0.0 · Updated 14 September 2026</p>
            <Section title="Playing fairly">
              <p>
                The Arcade is free to play. Use your own BCU email ending in @mail.bcu.ac.uk or
                @bcu.ac.uk. Email verification may be required by the host. Do not share accounts,
                automate answers or create extra accounts to gain more Ranked attempts.
              </p>
              <p>
                One queue place gives one session. Practice is unlimited; Ranked allows three game
                starts and keeps your best score. A started Ranked attempt cannot be voided or
                refunded. If interrupted, the host can close it with the points already earned. Live
                games are unranked.
              </p>
            </Section>
            <Section title="Prizes">
              <p>
                The leaderboard is provisional until the host finalises it. Up to three Ranked
                winners receive grand prizes. An exact tie across the prize boundary is resolved by
                a witnessed draw recorded by the host. Live prizes depend on available stock, with
                at most one collection per account per UK calendar day.
              </p>
              <p>
                Confirmed winners see collection instructions in their account and are emailed. Show
                your signed-in account to the host when collecting. Ask the host about collection
                deadlines or any disputed result before finalisation.
              </p>
            </Section>
            <Section title="Your information">
              <p>
                BCUSCA operates this Arcade. We collect your name, BCU email, course, academic year,
                password hash, verification status, game results and prize records to run the event,
                enforce attempt limits and contact winners. Connection addresses and security
                records help protect accounts and the service.
              </p>
              <p>
                Your generated alias and results appear on public screens and leaderboards. Names,
                email addresses and course details are visible only to authorised hosts, not other
                players. Hosting, database and email providers process the information needed to
                deliver the service.
              </p>
              <p>
                We use event data to administer fair play and protect the service. The optional
                membership email is a separate choice; declining it does not affect play. Ask the
                host to withdraw that choice before the email is sent.
              </p>
            </Section>
            <Section title="Retention & your choices">
              <p>
                Personal event records are deleted by the organiser after prize distribution and the
                configured cleanup date. Anonymous course/year attendance totals can remain; small
                groups are combined. Exported files and backups require separate deletion by the
                organiser.
              </p>
              <p>
                Ask the BCUSCA host to access or correct your information, request deletion, object
                to its use or raise a privacy concern. Some requests may affect your account or
                prize eligibility. You can also contact the{' '}
                <a className="underline" href="https://ico.org.uk/make-a-complaint/">
                  Information Commissioner’s Office
                </a>
                .
              </p>
            </Section>
            <Section title="Cookies & device storage">
              <p>
                Essential session cookies keep you signed in. Browser storage supports controller
                ownership and interface preferences. This app does not include advertising or
                analytics trackers.
              </p>
            </Section>
            <Section title="Accessibility & support">
              <p>
                Controls support keyboard focus and touch. Reduced-motion preferences are respected
                by the wheel; labels and numbered markers supplement colour. Timed challenges, code
                reading and spatial puzzles may still present barriers. We do not claim a completed
                accessibility certification.
              </p>
              <p>
                If a screen or game is difficult to use, speak to the host for help before starting
                Ranked. Practice can help you learn the controls without consuming a Ranked attempt.
              </p>
            </Section>
          </>
        )}
      </main>
      <InformationLinks />
    </div>
  );
}
