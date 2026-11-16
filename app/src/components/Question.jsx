// Same layout for every question tab (plan.md section 2):
// question, one-line answer, D3 view(s), how to read it, what it shows, caveats.
export default function Question({ title, question, answer, read, shows = [], caveats = [], children }) {
  return (
    <article className="question">
      <h1 className="question-title">{title}</h1>
      <p className="question-text"><strong>Question.</strong> {question}</p>
      <p className="answer"><strong>Short answer.</strong> {answer}</p>
      <div className="views">{children}</div>
      {read && (
        <section>
          <h2>How to read it</h2>
          <p>{read}</p>
        </section>
      )}
      {shows.length > 0 && (
        <section>
          <h2>What it shows</h2>
          <ul>{shows.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </section>
      )}
      {caveats.length > 0 && (
        <section className="caveats">
          <h2>Caveats</h2>
          <ul>{caveats.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </section>
      )}
    </article>
  );
}
