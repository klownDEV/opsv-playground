import { submitChallenge } from "@/lib/actions";

export function SubmissionForm({
  challengeId,
  challengeSlug,
  disabled,
  submitted,
  error,
}: {
  challengeId: string;
  challengeSlug: string;
  disabled?: boolean;
  submitted?: boolean;
  error?: boolean;
}) {
  return <div>
    {submitted && <p className="form-success" role="status">BIDRAGET ÄR MOTTAGET OCH VÄNTAR PÅ GRANSKNING.</p>}
    {error && <p className="auth-error" role="alert">KONTROLLERA ATT DU HAR FYLLT I MINST ETT RESULTAT OCH ATT ALLA LÄNKAR ÄR GILTIGA.</p>}
    <form className="submission-form" action={submitChallenge}>
      <input type="hidden" name="challengeId" value={challengeId}/>
      <input type="hidden" name="challengeSlug" value={challengeSlug}/>
      <div className="field"><label htmlFor="githubUrl">GitHub-URL <span>VALFRITT</span></label><input id="githubUrl" name="githubUrl" type="url" inputMode="url" placeholder="https://github.com/du/projekt" disabled={disabled}/></div>
      <div className="field"><label htmlFor="demoUrl">Demo-URL <span>VALFRITT</span></label><input id="demoUrl" name="demoUrl" type="url" inputMode="url" placeholder="https://din-demo.se" disabled={disabled}/></div>
      <div className="field"><label htmlFor="claimedScore">Uppmätt resultat <span>VALFRITT</span></label><input id="claimedScore" name="claimedScore" type="number" inputMode="numeric" min="0" max="1000000" placeholder="0" disabled={disabled}/></div>
      <div className="field field-wide"><label htmlFor="submissionNotes">Anteckningar / resultat</label><textarea id="submissionNotes" name="content" rows={5} maxLength={4000} placeholder="Vad byggde, mätte eller lärde du dig?" disabled={disabled}/></div>
      <button className="button button-accent" type="submit" disabled={disabled}>{disabled ? "LOGGA IN FÖR ATT SKICKA IN" : "SKICKA IN BIDRAG"}<span>→</span></button>
      <p className="form-note">Poängen granskas på serversidan. Skicka aldrig in hemligheter eller privat källkod.</p>
    </form>
  </div>;
}
