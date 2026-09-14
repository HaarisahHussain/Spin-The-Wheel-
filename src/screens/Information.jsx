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
          v1.1.0 · Version history
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
            <p className="text-xs text-[#62625C]">Arcade v1.1.0 · Updated 14 September 2026</p>
            <Section title="Playing">
              <p>
                Scan the QR to get a browser account. Choose a public username under Account; your
                real name is optional and visible only to the host. No email or password is
                required.
              </p>
              <p>
                One queue place gives one solo session. Join again at the back to keep playing, or
                join a Live lobby. There are no attempt limits, Ranked modes or physical prizes.
                Multiple accounts are allowed.
              </p>
              <p>
                Your best solo or Live session appears on one leaderboard, on a 0–9 scale. Live
                scores account for the number and difficulty of rounds. Equal scores share a rank.
                Play yourself, avoid automated requests and keep usernames respectful.
              </p>
            </Section>
            <Section title="Your browser account">
              <p>
                An essential cookie keeps your account on this browser for up to seven days.
                Clearing cookies, using a different browser or letting the session expire creates a
                new account. Knowing a username does not give access to it, and accounts cannot be
                recovered by name.
              </p>
            </Section>
            <Section title="Your information">
              <p>
                BCUSCA operates this Arcade. We store your generated account ID, username, optional
                name, game results and session records to run games and show scores. Connection
                addresses and security records protect the service. Authorised hosts can view event
                records; usernames and scores are public.
              </p>
              <p>
                The app uses essential cookies and browser storage for sessions and controller
                ownership. It includes no advertising or analytics trackers and sends no emails.
                Hosting and database providers process the data needed to operate the service.
              </p>
            </Section>
            <Section title="Retention & support">
              <p>
                The organiser deletes event accounts, names and scores after the configured cleanup
                date. Exported files and backups need separate deletion. Ask the host for the
                event’s retention date, access or correction of your information, deletion, or help
                with a privacy concern. You can also contact the{' '}
                <a className="underline" href="https://ico.org.uk/make-a-complaint/">
                  Information Commissioner’s Office
                </a>
                .
              </p>
            </Section>
            <Section title="Accessibility">
              <p>
                Keyboard focus, touch controls, labelled markers and reduced-motion wheel support
                are included. Timed reading and spatial puzzles may still present barriers. Speak to
                the host for help with controls or to report a problem. No formal accessibility
                certification is claimed.
              </p>
            </Section>
          </>
        )}
      </main>
      <InformationLinks />
    </div>
  );
}
