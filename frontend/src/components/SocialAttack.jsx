import { forwardRef, useImperativeHandle, useState } from "react";

const SocialAttack = forwardRef(function SocialAttack({ info, setInfo }, ref) {
  const [result, setResult] = useState("");

  const run = (forcedInfo, guesses) => {
    const name = forcedInfo?.name || info.name;
    const pet = forcedInfo?.pet || info.pet;
    const birth = forcedInfo?.birth || info.birth;
    if (forcedInfo) setInfo({ name, pet, birth });

    const list =
      guesses ||
      [`${pet}${birth}`, `${name}${birth}`, `${pet}@123`, `${name}123!`, birth].filter(Boolean);
    const top = list[0] || "petname2001";

    setResult(
      `Try #1: ${list[0] || "—"} ❌\nTry #2: ${top} ✅ MATCH\n\nGuesses: ${list.map((g) => "→ " + g).join("\n")}`
    );
  };

  useImperativeHandle(ref, () => ({ run }));

  return (
    <section className="panel">
      <header className="panel-head">
        <div>
          <span className="eyebrow orange">Social Attack</span>
          <h2>Engineering Demo</h2>
        </div>
      </header>
      <div className="panel-body">
        <label className="field">
          Name
          <input value={info.name} onChange={(e) => setInfo({ ...info, name: e.target.value })} />
        </label>
        <label className="field">
          Pet
          <input value={info.pet} onChange={(e) => setInfo({ ...info, pet: e.target.value })} />
        </label>
        <label className="field">
          Birth year
          <input value={info.birth} onChange={(e) => setInfo({ ...info, birth: e.target.value })} />
        </label>
        <button type="button" className="btn btn-primary full" onClick={() => run()}>
          Simulate Attack
        </button>
        {result && <pre className="social-result">{result}</pre>}
      </div>
    </section>
  );
});

export default SocialAttack;
