export default function StoryMode({ story }) {
  return (
    <section className="panel panel-story">
      <header className="panel-head">
        <div>
          <span className="eyebrow cyan">Narrative</span>
          <h2>Hacker Story Mode</h2>
        </div>
      </header>
      <div className="panel-body story-box">
        {story || "Complete a simulation to see the attack narrative here."}
      </div>
    </section>
  );
}
