// Same layout for every question tab (plan.md section 2):
// question, one-line answer, D3 view(s), how to read it, what it shows, caveats, AI notice, code link.
export default function Question({ title, question, answer, read, shows = [], caveats = [], ai, code, children }) {
  return (
    <article className="question">
      <h2>{title}</h2>
      <p className="question-text"><strong>Question.</strong> {question}</p>
      <p className="answer"><strong>Short answer.</strong> {answer}</p>
      <div className="views">{children}</div>
      {read && (
        <section>
          <h3>How to read it</h3>
          <p>{read}</p>
        </section>
      )}
      {shows.length > 0 && (
        <section>
          <h3>What it shows</h3>
          <ul>{shows.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </section>
      )}
      {caveats.length > 0 && (
        <section className="caveats">
          <h3>Caveats</h3>
          <ul>{caveats.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </section>
      )}
      {ai && <p className="ai-note"><strong>AI assistance.</strong> {ai}</p>}
      {code && <p className="code-link">Code: <code>{code}</code></p>}
    </article>
  );
}
